import pool from '../config/db.js';
import { isTeamLeader } from './teamController.js';

const normalizeAssignees = (assignedTo) => {
  if (assignedTo === undefined || assignedTo === null) return [];
  const ids = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  return ids.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
};

const fetchTaskAssignees = async (taskId) => {
  const [rows] = await pool.query(
    `SELECT ta.task_id, u.id, u.username
     FROM task_assignees ta
     JOIN users u ON ta.user_id = u.id
     WHERE ta.task_id = ?`,
    [taskId],
  );
  return rows.map((row) => ({ id: row.id, username: row.username }));
};

// @desc    Create a new task under a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private
export async function createTask(req, res) {
  try {
    const projectId = req.params.projectId;
    const { title, description, status, assignedTo, remark } = req.body;
    const userId = req.user.id; // Logged-in user who creates it
    const canCreateTask =
      req.user.role === 'admin' || (await isTeamLeader(userId));
    if (!canCreateTask) {
      return res.status(403).json({
        success: false,
        message: 'Only admins or team leaders can create new tasks',
      });
    }
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    const assignedUsers = normalizeAssignees(assignedTo);
    const primaryAssignee = assignedUsers.length > 0 ? assignedUsers[0] : null;

    // Check if project exists
    const [projectRows] = await pool.query(
      'SELECT id FROM projects WHERE id = ?',
      [projectId],
    );
    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Insert task
    const taskStatus = status || 'Todo';
    const [result] = await pool.query(
      'INSERT INTO tasks (project_id, title, description, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
      [projectId, title, description, taskStatus, primaryAssignee],
    );

    const newTaskId = result.insertId;

    if (assignedUsers.length > 0) {
      const values = assignedUsers.map(() => '(?, ?)').join(', ');
      const params = assignedUsers.flatMap((userId) => [newTaskId, userId]);
      await pool.query(
        `INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES ${values}`,
        params,
      );
    }

    // Create change log entry for creation
    await pool.query(
      'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
      [
        newTaskId,
        userId,
        taskStatus,
        taskStatus,
        remark || `Task created: "${title}"`,
      ],
    );

    // Fetch the newly created task with assignee name if available
    const [newTaskRows] = await pool.query(
      `
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `,
      [newTaskId],
    );

    const assignees = await fetchTaskAssignees(newTaskId);
    return res.status(201).json({
      success: true,
      data: {
        ...newTaskRows[0],
        assignees,
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating task',
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
    const [taskRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [
      taskId,
    ]);
    if (taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const currentTask = taskRows[0];
    const [projectRows] = await pool.query(
      'SELECT user_id FROM projects WHERE id = ?',
      [currentTask.project_id],
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Associated project not found',
      });
    }

    const projectOwnerId = projectRows[0].user_id;
    const [assigneeRows] = await pool.query(
      'SELECT user_id FROM task_assignees WHERE task_id = ?',
      [taskId],
    );
    const isAssignedMember = assigneeRows.some(
      (row) => row.user_id === req.user.id,
    );

    if (
      req.user.role !== 'admin' &&
      projectOwnerId !== req.user.id &&
      currentTask.assigned_to !== req.user.id &&
      !isAssignedMember
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task',
      });
    }

    // Prepare fields to update (fallback to current if not provided in req.body)
    const newTitle = title !== undefined ? title : currentTask.title;
    const newDescription =
      description !== undefined ? description : currentTask.description;
    const newStatus = status !== undefined ? status : currentTask.status;
    const assignedUsers =
      assignedTo !== undefined ? normalizeAssignees(assignedTo) : null;
    const primaryAssignee =
      assignedUsers !== null && assignedUsers.length > 0
        ? assignedUsers[0]
        : null;
    const newAssignedTo =
      assignedUsers !== null ? primaryAssignee : currentTask.assigned_to;

    // Validate Status if it was updated
    if (
      status !== undefined &&
      !['Todo', 'In Progress', 'Done'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of "Todo", "In Progress", or "Done"',
      });
    }

    // 2. Perform updates in DB
    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, assigned_to = ? WHERE id = ?',
      [newTitle, newDescription, newStatus, newAssignedTo, taskId],
    );

    if (assignedUsers !== null) {
      await pool.query('DELETE FROM task_assignees WHERE task_id = ?', [
        taskId,
      ]);
      if (assignedUsers.length > 0) {
        const values = assignedUsers.map(() => '(?, ?)').join(', ');
        const params = assignedUsers.flatMap((userId) => [taskId, userId]);
        await pool.query(
          `INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES ${values}`,
          params,
        );
      }
    }

    // 3. Detect changes and write appropriate change logs
    const changes = [];
    if (status !== undefined && currentTask.status !== newStatus) {
      await pool.query(
        'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
        [
          taskId,
          userId,
          currentTask.status,
          newStatus,
          remark || `Moved task from ${currentTask.status} to ${newStatus}`,
        ],
      );
      changes.push(`status to ${newStatus}`);
    } else {
      const modifiedFields = [];
      if (title !== undefined && currentTask.title !== newTitle) {
        modifiedFields.push('title');
      }
      if (
        description !== undefined &&
        currentTask.description !== newDescription
      ) {
        modifiedFields.push('description');
      }
      if (assignedUsers !== null) {
        const currentAssignedIds = assigneeRows.map((row) => row.user_id);
        const newAssignedIds = assignedUsers;
        if (
          currentAssignedIds.length !== newAssignedIds.length ||
          currentAssignedIds.some((id) => !newAssignedIds.includes(id))
        ) {
          modifiedFields.push('assignees');
        }
      }

      if (modifiedFields.length > 0 || remark) {
        await pool.query(
          'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
          [
            taskId,
            userId,
            currentTask.status,
            currentTask.status,
            remark || `Modified task fields: ${modifiedFields.join(', ')}`,
          ],
        );
        changes.push(`fields modified: ${modifiedFields.join(', ')}`);
      }
    }

    // 4. Fetch updated task with details
    const [updatedTaskRows] = await pool.query(
      `
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `,
      [taskId],
    );

    const assignees = await fetchTaskAssignees(taskId);
    return res.status(200).json({
      success: true,
      message:
        changes.length > 0
          ? `Task updated successfully (${changes.join(' & ')})`
          : 'No changes detected',
      data: {
        ...updatedTaskRows[0],
        assignees,
      },
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating task',
    });
  }
}
