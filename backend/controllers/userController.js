import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function getUsers(req, res) {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const search = req.query.search ? req.query.search.trim() : null;

    if (page && limit && page > 0 && limit > 0) {
      const offset = (page - 1) * limit;
      let countSql = 'SELECT COUNT(*) as total FROM users';
      let selectSql = 'SELECT id, username, email, role, created_at FROM users';
      const countParams = [];
      const selectParams = [];

      if (search) {
        const likePattern = `%${search}%`;
        countSql += ' WHERE username LIKE ? OR email LIKE ?';
        selectSql += ' WHERE username LIKE ? OR email LIKE ?';
        countParams.push(likePattern, likePattern);
        selectParams.push(likePattern, likePattern);
      }

      selectSql += ' ORDER BY username ASC LIMIT ? OFFSET ?';
      selectParams.push(limit, offset);

      // 1. Get total user count
      const [[{ total }]] = await pool.query(countSql, countParams);

      // 2. Get paginated users
      const [rows] = await pool.query(selectSql, selectParams);

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      let selectSql = 'SELECT id, username, email, role, created_at FROM users';
      const selectParams = [];

      if (search) {
        selectSql += ' WHERE username LIKE ? OR email LIKE ?';
        selectParams.push(`%${search}%`, `%${search}%`);
      }

      selectSql += ' ORDER BY username ASC';
      const [rows] = await pool.query(selectSql, selectParams);

      return res.status(200).json({
        success: true,
        data: rows,
      });
    }
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

export async function updateUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update users',
      });
    }

    const userId = req.params.id;
    const { username, email, password } = req.body;
    const hasUsername =
      username !== undefined && username !== null && String(username).trim();
    const hasEmail =
      email !== undefined && email !== null && String(email).trim();
    const hasPassword =
      password !== undefined && password !== null && String(password).length > 0;

    if (!hasUsername && !hasEmail && !hasPassword) {
      return res.status(400).json({
        success: false,
        message: 'Provide a username, email, and/or password to update',
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

    if (hasUsername) {
      const trimmedUsername = String(username).trim();
      const [conflict] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [trimmedUsername, userId],
      );
      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      await pool.query('UPDATE users SET username = ? WHERE id = ?', [
        trimmedUsername,
        userId,
      ]);
    }

    if (hasEmail) {
      const trimmedEmail = String(email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
      const [conflict] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [trimmedEmail, userId],
      );
      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
      await pool.query('UPDATE users SET email = ? WHERE id = ?', [
        trimmedEmail,
        userId,
      ]);
    }

    if (hasPassword) {
      if (String(password).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(String(password), salt);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [
        hashedPassword,
        userId,
      ]);
    }

    const [updatedRows] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating user',
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
