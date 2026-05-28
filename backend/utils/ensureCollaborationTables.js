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
