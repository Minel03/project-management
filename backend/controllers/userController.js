import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function getUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY username ASC',
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving users list',
    });
  }
}

export async function createUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create new system users',
      });
    }

    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required',
      });
    }

    const userRole =
      role === 'admin' ? 'admin' : role === 'leader' ? 'leader' : 'member';

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, userRole],
    );

    const [newUserRows] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      data: newUserRows[0],
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating user',
    });
  }
}

export async function updateUserRole(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update user roles',
      });
    }

    const userId = req.params.id;
    const { role } = req.body;
    if (!['admin', 'leader', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, leader, or member',
      });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [
      userId,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    const [updatedRows] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId],
    );
    return res.status(200).json({
      success: true,
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating user role',
    });
  }
}

export async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete users',
      });
    }

    const userId = req.params.id;
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [
      userId,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting user',
    });
  }
}
