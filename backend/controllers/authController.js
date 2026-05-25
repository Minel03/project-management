import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const buildUserPayload = async (user) => {
  const [leaderOf] = await pool.query(
    'SELECT id, name FROM teams WHERE leader_id = ?',
    [user.id],
  );

  const [memberOf] = await pool.query(
    `SELECT t.id, t.name, t.leader_id, u.username AS leader_name
     FROM teams t
     JOIN team_members tm ON t.id = tm.team_id
     JOIN users u ON t.leader_id = u.id
     WHERE tm.user_id = ?`,
    [user.id],
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'member',
    leaderOf,
    memberOf,
    created_at: user.created_at,
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;

    // Validate request
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a username, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into DB
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
    );

    const userId = result.insertId;
    const [newUserRows] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId],
    );

    const payload = await buildUserPayload(newUserRows[0]);

    return res.status(201).json({
      success: true,
      data: {
        ...payload,
        token: generateToken(userId),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during user registration',
      error: error.message,
    });
  }
}

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
export async function loginUser(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    // Validate request
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password',
      });
    }

    // Check for user (by email or username)
    const [users] = await pool.query(
      'SELECT id, username, email, password, role, created_at FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const user = users[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const payload = await buildUserPayload(user);
    return res.status(200).json({
      success: true,
      data: {
        ...payload,
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during user login',
      error: error.message,
    });
  }
}

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export async function getMe(req, res) {
  try {
    // req.user is populated by protect middleware
    const payload = await buildUserPayload(req.user);
    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
    });
  }
}
