import pool from '../config/db.js';

export async function getUsers(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, username, email FROM users ORDER BY username ASC');
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving users list'
    });
  }
}
