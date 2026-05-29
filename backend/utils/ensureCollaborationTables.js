export async function ensureCollaborationTables(pool) {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS task_assignees (
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );
    await pool.query(
      'INSERT IGNORE INTO task_assignees (task_id, user_id) SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL',
    );
    const [taskColumns] = await pool.query(
      "SHOW COLUMNS FROM tasks LIKE 'started_by'",
    );
    if (taskColumns.length === 0) {
      await pool.query('ALTER TABLE tasks ADD COLUMN started_by INT NULL');
      await pool.query(
        'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_started_by FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL',
      );
    }
    const [dueDateColumns] = await pool.query(
      "SHOW COLUMNS FROM tasks LIKE 'due_date'",
    );
    if (dueDateColumns.length === 0) {
      await pool.query('ALTER TABLE tasks ADD COLUMN due_date DATE NULL');
    }

    // Migration: Add team_id to projects if it does not exist
    const [projectColumns] = await pool.query(
      "SHOW COLUMNS FROM projects LIKE 'team_id'",
    );
    if (projectColumns.length === 0) {
      // 1. Add it as a nullable column first
      await pool.query('ALTER TABLE projects ADD COLUMN team_id INT NULL');

      // 2. Resolve default team or create one if projects exist
      const [[{ count: projectCount }]] = await pool.query('SELECT COUNT(*) as count FROM projects');
      if (projectCount > 0) {
        const [firstTeam] = await pool.query('SELECT id FROM teams LIMIT 1');
        let defaultTeamId;
        if (firstTeam.length > 0) {
          defaultTeamId = firstTeam[0].id;
        } else {
          const [firstUser] = await pool.query('SELECT id FROM users LIMIT 1');
          if (firstUser.length > 0) {
            const [result] = await pool.query(
              'INSERT INTO teams (name, leader_id) VALUES (?, ?)',
              ['Default Team', firstUser[0].id]
            );
            defaultTeamId = result.insertId;
            await pool.query(
              'INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)',
              [defaultTeamId, firstUser[0].id]
            );
          }
        }

        if (defaultTeamId) {
          await pool.query('UPDATE projects SET team_id = ? WHERE team_id IS NULL', [
            defaultTeamId,
          ]);
          // Modify to NOT NULL
          await pool.query('ALTER TABLE projects MODIFY COLUMN team_id INT NOT NULL');
        }
      }

      // 3. Add the foreign key constraint
      try {
        await pool.query(
          'ALTER TABLE projects ADD CONSTRAINT fk_projects_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE',
        );
      } catch (err) {
        console.warn('Could not add fk_projects_team_id constraint during startup migration:', err.message);
      }
    }
    await pool.query(
      `CREATE TABLE IF NOT EXISTS task_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );
    await pool.query(
      `CREATE TABLE IF NOT EXISTS task_subtasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        assigned_to INT NULL,
        is_done BOOLEAN NOT NULL DEFAULT FALSE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );
  } catch (error) {
    console.error('Could not ensure collaboration tables exist:', error);
    throw error;
  }
}

export default ensureCollaborationTables;
