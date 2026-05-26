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
      await pool.query('DROP TABLE IF EXISTS task_assignees');
      await pool.query('DROP TABLE IF EXISTS tasks');
      await pool.query('DROP TABLE IF EXISTS projects');
      await pool.query('DROP TABLE IF EXISTS team_members');
      await pool.query('DROP TABLE IF EXISTS teams');
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
        role ENUM('admin','leader','member') NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      // Teams table
      `CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        leader_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      // Team members join table
      `CREATE TABLE IF NOT EXISTS team_members (
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      // Task assignees join table
      `CREATE TABLE IF NOT EXISTS task_assignees (
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      )`,
    ];

    for (const sql of tables) {
      await pool.query(sql);
    }

    // Ensure role column exists for compatibility with older database states
    const [roleColumn] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [
      'role',
    ]);
    if (roleColumn.length === 0) {
      await pool.query(
        "ALTER TABLE users ADD COLUMN role ENUM('admin','leader','member') NOT NULL DEFAULT 'member'",
      );
    } else if (!roleColumn[0].Type.includes("'leader'")) {
      await pool.query(
        "ALTER TABLE users MODIFY COLUMN role ENUM('admin','leader','member') NOT NULL DEFAULT 'member'",
      );
    }

    // If task_assignees exists but is empty, migrate any legacy assigned_to values
    const [taskAssigneesTable] = await pool.query(
      "SHOW TABLES LIKE 'task_assignees'",
    );
    if (taskAssigneesTable.length > 0) {
      const [existingAssignees] = await pool.query(
        'SELECT COUNT(*) as count FROM task_assignees',
      );
      if (existingAssignees[0].count === 0) {
        await pool.query(
          'INSERT IGNORE INTO task_assignees (task_id, user_id) SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL',
        );
      }
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
      await pool.query('TRUNCATE TABLE team_members');
      await pool.query('TRUNCATE TABLE teams');
      await pool.query('TRUNCATE TABLE users');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');

      // Seed Users
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const usersData = [
        ['john_doe', 'john@example.com', hashedPassword, 'admin'],
        ['alice_lead', 'alice@example.com', hashedPassword, 'leader'],
        ['mike_lead', 'mike@example.com', hashedPassword, 'leader'],
        ['jane_smith', 'jane@example.com', hashedPassword, 'member'],
        ['bob_johnson', 'bob@example.com', hashedPassword, 'member'],
        ['lisa_green', 'lisa@example.com', hashedPassword, 'member'],
        ['tom_adams', 'tom@example.com', hashedPassword, 'member'],
        ['sam_wilson', 'sam@example.com', hashedPassword, 'member'],
      ];

      const userIds = [];
      for (const userData of usersData) {
        const [result] = await pool.query(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          userData,
        );
        userIds.push(result.insertId);
      }

      // Seed Teams
      const [alphaTeamResult] = await pool.query(
        'INSERT INTO teams (name, leader_id) VALUES (?, ?)',
        ['Alpha Squad', userIds[1]],
      );
      const alphaTeamId = alphaTeamResult.insertId;
      await pool.query(
        'INSERT INTO team_members (team_id, user_id) VALUES (?, ?), (?, ?), (?, ?)',
        [
          alphaTeamId,
          userIds[1],
          alphaTeamId,
          userIds[3],
          alphaTeamId,
          userIds[4],
        ],
      );

      const [betaTeamResult] = await pool.query(
        'INSERT INTO teams (name, leader_id) VALUES (?, ?)',
        ['Beta Force', userIds[2]],
      );
      const betaTeamId = betaTeamResult.insertId;
      await pool.query(
        'INSERT INTO team_members (team_id, user_id) VALUES (?, ?), (?, ?), (?, ?)',
        [
          betaTeamId,
          userIds[2],
          betaTeamId,
          userIds[5],
          betaTeamId,
          userIds[6],
        ],
      );

      // Seed Projects
      const projectsData = [
        [
          'Website Redesign',
          'Overhaul the company marketing site for modern aesthetics and speed.',
          userIds[1],
        ],
        [
          'Mobile Application',
          'Develop a React Native mobile application for customer portal.',
          userIds[2],
        ],
      ];

      const projectIds = [];
      for (const projData of projectsData) {
        const [result] = await pool.query(
          'INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
          projData,
        );
        projectIds.push(result.insertId);
      }

      // Seed Tasks for Project 1 (Website Redesign)
      const tasksData = [
        [
          projectIds[0],
          'Design UI mockup',
          'Create Figma wireframes and high-fidelity mockups for key pages.',
          'Done',
          userIds[1],
        ],
        [
          projectIds[0],
          'Setup API routes',
          'Create express endpoint structures and configure DB pool connection.',
          'In Progress',
          userIds[3],
        ],
        [
          projectIds[0],
          'Write testing suites',
          'Configure Jest/Supertest suite for all endpoints.',
          'Todo',
          null,
        ],
        // Seed Tasks for Project 2 (Mobile App)
        [
          projectIds[1],
          'Configure push notifications',
          'Setup APNS and FCM services with token storage.',
          'Todo',
          userIds[2],
        ],
        [
          projectIds[1],
          'Integrate authentication UI',
          'Implement signup, login screens and localstorage token handling.',
          'Done',
          userIds[5],
        ],
      ];

      const taskIds = [];
      for (const tskData of tasksData) {
        const [result] = await pool.query(
          'INSERT INTO tasks (project_id, title, description, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
          tskData,
        );
        taskIds.push(result.insertId);
      }

      for (let i = 0; i < tasksData.length; i++) {
        const taskId = taskIds[i];
        const assignedUserId = tasksData[i][4];
        if (assignedUserId !== null) {
          await pool.query(
            'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
            [taskId, assignedUserId],
          );
        }
      }

      // Seed Change Logs
      const logsData = [
        [
          taskIds[0],
          userIds[1],
          'Todo',
          'Done',
          'Completed initial design review',
        ],
        [
          taskIds[1],
          userIds[3],
          'Todo',
          'In Progress',
          'Began setting up routes and DB configuration',
        ],
        [
          taskIds[4],
          userIds[5],
          'In Progress',
          'Done',
          'Authentication UI integrated by team member',
        ],
      ];

      for (const logData of logsData) {
        await pool.query(
          'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
          logData,
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Database initialized and seeded successfully with demo data.',
        seeded: {
          users: usersData.map((u) => u[0]),
          projects: projectsData.map((p) => p[0]),
          tasks: tasksData.length,
          logs: logsData.length,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Database initialized successfully. Existing tables left untouched. To force a full seed, request with ?reset=true',
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message,
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
