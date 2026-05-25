import bcrypt from 'bcryptjs';
import { connectWithoutDB, pool } from '../config/db.js';

export async function initDatabase(req, res) {
  let connection;
  try {
    const dbName = process.env.DB_NAME;
    const reset = req.query.reset === 'true';

    // 1. Connect without selecting a database
    connection = await connectWithoutDB();

    // 2. Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    // If reset is true, drop existing tables first so they are re-created with new schema
    if (reset) {
      console.log('Reset parameter is true. Dropping existing tables...');
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('DROP TABLE IF EXISTS change_logs');
      await pool.query('DROP TABLE IF EXISTS tasks');
      await pool.query('DROP TABLE IF EXISTS projects');
      await pool.query('DROP TABLE IF EXISTS users');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 3. Setup tables
    // Use the standard connection pool to execute table creation
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('Todo', 'In Progress', 'Done') DEFAULT 'Todo',
        assigned_to INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      )`,
      // Change logs table
      `CREATE TABLE IF NOT EXISTS change_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        old_status ENUM('Todo', 'In Progress', 'Done') NOT NULL,
        new_status ENUM('Todo', 'In Progress', 'Done') NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const sql of tables) {
      await pool.query(sql);
    }

    // 4. Seeding check
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const isDbEmpty = userCount[0].count === 0;

    if (isDbEmpty || reset) {
      console.log('Seeding database with pre-defined dataset...');

      // Disable foreign key checks to safely truncate
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('TRUNCATE TABLE change_logs');
      await pool.query('TRUNCATE TABLE tasks');
      await pool.query('TRUNCATE TABLE projects');
      await pool.query('TRUNCATE TABLE users');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');

      // Seed Users
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const usersData = [
        ['john_doe', 'john@example.com', hashedPassword],
        ['jane_smith', 'jane@example.com', hashedPassword],
        ['bob_johnson', 'bob@example.com', hashedPassword]
      ];

      const userIds = [];
      for (const userData of usersData) {
        const [result] = await pool.query(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          userData
        );
        userIds.push(result.insertId);
      }

      // Seed Projects
      const projectsData = [
        ['Website Redesign', 'Overhaul the company marketing site for modern aesthetics and speed.', userIds[0]],
        ['Mobile Application', 'Develop a React Native mobile application for customer portal.', userIds[1]]
      ];

      const projectIds = [];
      for (const projData of projectsData) {
        const [result] = await pool.query(
          'INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
          projData
        );
        projectIds.push(result.insertId);
      }

      // Seed Tasks for Project 1 (Website Redesign)
      const tasksData = [
        [projectIds[0], 'Design UI mockup', 'Create Figma wireframes and high-fidelity mockups for key pages.', 'Done', userIds[0]],
        [projectIds[0], 'Setup API routes', 'Create express endpoint structures and configure DB pool connection.', 'In Progress', userIds[1]],
        [projectIds[0], 'Write testing suites', 'Configure Jest/Supertest suite for all endpoints.', 'Todo', null],
        // Seed Tasks for Project 2 (Mobile App)
        [projectIds[1], 'Configure push notifications', 'Setup APNS and FCM services with token storage.', 'Todo', userIds[2]],
        [projectIds[1], 'Integrate authentication UI', 'Implement signup, login screens and localstorage token handling.', 'Done', userIds[1]]
      ];

      const taskIds = [];
      for (const tskData of tasksData) {
        const [result] = await pool.query(
          'INSERT INTO tasks (project_id, title, description, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
          tskData
        );
        taskIds.push(result.insertId);
      }

      // Seed Change Logs
      const logsData = [
        [taskIds[0], userIds[0], 'Todo', 'Done', 'Completed initial design review'],
        [taskIds[1], userIds[1], 'Todo', 'In Progress', 'Began setting up routes and DB configuration'],
        [taskIds[4], userIds[1], 'In Progress', 'Done', 'API endpoints verified and integrated']
      ];

      for (const logData of logsData) {
        await pool.query(
          'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
          logData
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Database initialized and seeded successfully with demo data.',
        seeded: {
          users: usersData.map(u => u[0]),
          projects: projectsData.map(p => p[0]),
          tasks: tasksData.length,
          logs: logsData.length
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully. Existing tables left untouched. To force a full seed, request with ?reset=true'
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message
    });
  } finally {
    if (connection && connection.end) {
      try {
        await connection.end();
      } catch (err) {
        // Ignore close error
      }
    }
  }
}
