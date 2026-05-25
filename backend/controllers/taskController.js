import pool from '../config/db.js';

// @desc    Create a new task under a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private
export async function createTask(req, res) {
  try {
    const projectId = req.params.projectId;
    const { title, description, status, assignedTo, remark } = req.body;
    const userId = req.user.id; // Logged-in user who creates it

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Check if project exists
    const [projectRows] = await pool.query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Insert task
    const taskStatus = status || 'Todo';
    const assignedUser = assignedTo || null;

    const [result] = await pool.query(
      'INSERT INTO tasks (project_id, title, description, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
      [projectId, title, description, taskStatus, assignedUser]
    );

    const newTaskId = result.insertId;

    // Create change log entry for creation
    await pool.query(
      'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
      [newTaskId, userId, taskStatus, taskStatus, remark || `Task created: "${title}"`]
    );

    // Fetch the newly created task with assignee name if available
    const [newTaskRows] = await pool.query(`
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `, [newTaskId]);

    return res.status(201).json({
      success: true,
      data: newTaskRows[0]
    });

  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating task'
    });
  }
}

// @desc    Update a task (supports title, description, status, assignee)
// @route   PUT /api/tasks/:id
// @access  Private
export async function updateTask(req, res) {
  try {
    const taskId = req.params.id;
    const { title, description, status, assignedTo, remark } = req.body;
    const userId = req.user.id; // Logged-in user making the modification

    // 1. Fetch current task state
    const [taskRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const currentTask = taskRows[0];

    // Prepare fields to update (fallback to current if not provided in req.body)
    const newTitle = title !== undefined ? title : currentTask.title;
    const newDescription = description !== undefined ? description : currentTask.description;
    const newStatus = status !== undefined ? status : currentTask.status;
    const newAssignedTo = assignedTo !== undefined ? (assignedTo === '' ? null : assignedTo) : currentTask.assigned_to;

    // Validate Status if it was updated
    if (status !== undefined && !['Todo', 'In Progress', 'Done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of "Todo", "In Progress", or "Done"'
      });
    }

    // 2. Perform updates in DB
    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, assigned_to = ? WHERE id = ?',
      [newTitle, newDescription, newStatus, newAssignedTo, taskId]
    );

    // 3. Detect changes and write appropriate change logs
    const changes = [];

    // Check if status changed (Kanban drag-drop) or if a manual remark was passed
    if (status !== undefined && currentTask.status !== newStatus) {
      await pool.query(
        'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
        [taskId, userId, currentTask.status, newStatus, remark || `Moved task from ${currentTask.status} to ${newStatus}`]
      );
      changes.push(`status to ${newStatus}`);
    } else {
      // Check if other fields changed to log a modification log with same old/new status
      const modifiedFields = [];
      if (title !== undefined && currentTask.title !== newTitle) {
        modifiedFields.push('title');
      }
      if (description !== undefined && currentTask.description !== newDescription) {
        modifiedFields.push('description');
      }
      if (assignedTo !== undefined && currentTask.assigned_to !== newAssignedTo) {
        modifiedFields.push('assignee');
      }

      if (modifiedFields.length > 0 || remark) {
        await pool.query(
          'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
          [
            taskId,
            userId,
            currentTask.status,
            currentTask.status,
            remark || `Modified task fields: ${modifiedFields.join(', ')}`
          ]
        );
        changes.push(`fields modified: ${modifiedFields.join(', ')}`);
      }
    }

    // 4. Fetch updated task with details
    const [updatedTaskRows] = await pool.query(`
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `, [taskId]);

    return res.status(200).json({
      success: true,
      message: changes.length > 0 ? `Task updated successfully (${changes.join(' & ')})` : 'No changes detected',
      data: updatedTaskRows[0]
    });

  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating task'
    });
  }
}
