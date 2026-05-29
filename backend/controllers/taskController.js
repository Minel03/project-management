import pool from '../config/db.js';
import { isTeamLeader } from './teamController.js';

const normalizeAssignees = (assignedTo) => {
  if (assignedTo === undefined || assignedTo === null) return [];
  const ids = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  return ids.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const fetchTaskComments = async (taskId) => {
  const [rows] = await pool.query(
    `SELECT tc.id, tc.task_id, tc.user_id, tc.comment, tc.created_at, u.username
     FROM task_comments tc
     JOIN users u ON tc.user_id = u.id
     WHERE tc.task_id = ?
     ORDER BY tc.created_at ASC`,
    [taskId],
  );
  return rows;
};

const fetchTaskSubtasks = async (taskId) => {
  const [rows] = await pool.query(
    `SELECT ts.id, ts.task_id, ts.title, ts.assigned_to, ts.is_done, ts.created_by,
            ts.created_at, ts.updated_at, u.username as assignee_name
     FROM task_subtasks ts
     LEFT JOIN users u ON ts.assigned_to = u.id
     WHERE ts.task_id = ?
     ORDER BY ts.created_at ASC`,
    [taskId],
  );
  return rows;
};

const fetchTaskDetails = async (taskId) => {
  const [taskRows] = await pool.query(
    `
    SELECT t.*, u.username as assignee_name, starter.username as started_by_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users starter ON t.started_by = starter.id
    WHERE t.id = ?
  `,
    [taskId],
  );

  if (taskRows.length === 0) return null;

  const [assignees, comments, subtasks] = await Promise.all([
    fetchTaskAssignees(taskId),
    fetchTaskComments(taskId),
    fetchTaskSubtasks(taskId),
  ]);

  return {
    ...taskRows[0],
    assignees,
    comments,
    subtasks,
  };
};

const canAccessTask = async (taskId, user) => {
  if (user.role === 'admin') return true;

  const [rows] = await pool.query(
    `SELECT 1
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?
       AND (
        p.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM tasks project_task
          LEFT JOIN task_assignees ta ON ta.task_id = project_task.id
          WHERE project_task.project_id = t.project_id
            AND (project_task.assigned_to = ? OR ta.user_id = ?)
        )
      )
     LIMIT 1`,
    [taskId, user.id, user.id, user.id],
  );

  return rows.length > 0;
};

// @desc    Create a new task under a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private
export async function createTask(req, res) {
  try {
    const projectId = req.params.projectId;
    const { title, description, status, assignedTo, dueDate, remark } = req.body;
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
    const taskDueDate = normalizeDate(dueDate);
    const [result] = await pool.query(
      'INSERT INTO tasks (project_id, title, description, status, assigned_to, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [projectId, title, description, taskStatus, primaryAssignee, taskDueDate],
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
    const newTask = await fetchTaskDetails(newTaskId);
    return res.status(201).json({
      success: true,
      data: newTask,
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
    const { title, description, status, assignedTo, dueDate, remark } = req.body;
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
    const newDueDate =
      dueDate !== undefined ? normalizeDate(dueDate) : currentTask.due_date;
    const assignedUsers =
      assignedTo !== undefined ? normalizeAssignees(assignedTo) : null;
    const primaryAssignee =
      assignedUsers !== null && assignedUsers.length > 0
        ? assignedUsers[0]
        : null;
    const newAssignedTo =
      assignedUsers !== null ? primaryAssignee : currentTask.assigned_to;
    const newStartedBy =
      !currentTask.started_by && newStatus === 'In Progress'
        ? userId
        : currentTask.started_by;

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
      'UPDATE tasks SET title = ?, description = ?, status = ?, assigned_to = ?, started_by = ?, due_date = ? WHERE id = ?',
      [
        newTitle,
        newDescription,
        newStatus,
        newAssignedTo,
        newStartedBy,
        newDueDate,
        taskId,
      ],
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
      if (dueDate !== undefined) {
        const currentDueDate = normalizeDate(currentTask.due_date);
        if (currentDueDate !== newDueDate) {
          modifiedFields.push('due date');
        }
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
    const updatedTask = await fetchTaskDetails(taskId);
    return res.status(200).json({
      success: true,
      message:
        changes.length > 0
          ? `Task updated successfully (${changes.join(' & ')})`
          : 'No changes detected',
      data: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating task',
    });
  }
}

// @desc    Delete a task and its related collaboration data
// @route   DELETE /api/tasks/:id
// @access  Private
export async function deleteTask(req, res) {
  try {
    const taskId = req.params.id;

    const [taskRows] = await pool.query(
      `SELECT t.id, t.title, t.project_id, p.user_id as project_owner_id,
              teams.leader_id as team_leader_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams ON p.team_id = teams.id
       WHERE t.id = ?`,
      [taskId],
    );

    if (taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRows[0];
    const canDelete =
      req.user.role === 'admin' ||
      task.project_owner_id === req.user.id ||
      task.team_leader_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and project team leaders can delete tasks',
      });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {
        id: Number(taskId),
        title: task.title,
        project_id: task.project_id,
      },
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting task',
    });
  }
}

// @desc    Add a comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private
export async function addTaskComment(req, res) {
  try {
    const taskId = req.params.id;
    const { comment } = req.body;

    if (!comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required',
      });
    }

    const task = await fetchTaskDetails(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }
    if (!(await canAccessTask(taskId, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, req.user.id, comment.trim()],
    );

    await pool.query(
      'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
      [taskId, req.user.id, task.status, task.status, 'Comment added'],
    );

    const [rows] = await pool.query(
      `SELECT tc.id, tc.task_id, tc.user_id, tc.comment, tc.created_at, u.username
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      task: await fetchTaskDetails(taskId),
    });
  } catch (error) {
    console.error('Add task comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding task comment',
    });
  }
}

// @desc    Add a subtask/checklist item
// @route   POST /api/tasks/:id/subtasks
// @access  Private
export async function addTaskSubtask(req, res) {
  try {
    const taskId = req.params.id;
    const { title, assignedTo } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subtask title is required',
      });
    }

    const task = await fetchTaskDetails(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }
    if (!(await canAccessTask(taskId, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add subtasks to this task',
      });
    }

    const assigneeId = assignedTo ? parseInt(assignedTo, 10) : null;
    const [result] = await pool.query(
      'INSERT INTO task_subtasks (task_id, title, assigned_to, created_by) VALUES (?, ?, ?, ?)',
      [taskId, title.trim(), assigneeId || null, req.user.id],
    );

    await pool.query(
      'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
      [
        taskId,
        req.user.id,
        task.status,
        task.status,
        `Subtask added: ${title.trim()}`,
      ],
    );

    const [rows] = await pool.query(
      `SELECT ts.id, ts.task_id, ts.title, ts.assigned_to, ts.is_done, ts.created_by,
              ts.created_at, ts.updated_at, u.username as assignee_name
       FROM task_subtasks ts
       LEFT JOIN users u ON ts.assigned_to = u.id
       WHERE ts.id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      task: await fetchTaskDetails(taskId),
    });
  } catch (error) {
    console.error('Add task subtask error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding subtask',
    });
  }
}

// @desc    Update a subtask/checklist item
// @route   PATCH /api/tasks/:taskId/subtasks/:subtaskId
// @access  Private
export async function updateTaskSubtask(req, res) {
  try {
    const { taskId, subtaskId } = req.params;
    const { title, assignedTo, isDone } = req.body;

    const task = await fetchTaskDetails(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }
    if (!(await canAccessTask(taskId, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this subtask',
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM task_subtasks WHERE id = ? AND task_id = ?',
      [subtaskId, taskId],
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found',
      });
    }

    const current = rows[0];
    const nextTitle = title !== undefined ? title : current.title;
    const nextAssignedTo =
      assignedTo !== undefined
        ? assignedTo
          ? parseInt(assignedTo, 10)
          : null
        : current.assigned_to;
    const nextIsDone = isDone !== undefined ? Boolean(isDone) : current.is_done;

    await pool.query(
      'UPDATE task_subtasks SET title = ?, assigned_to = ?, is_done = ? WHERE id = ? AND task_id = ?',
      [nextTitle, nextAssignedTo, nextIsDone, subtaskId, taskId],
    );

    if (isDone !== undefined && Boolean(current.is_done) !== nextIsDone) {
      await pool.query(
        'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
        [
          taskId,
          req.user.id,
          task.status,
          task.status,
          `${nextIsDone ? 'Completed' : 'Reopened'} subtask: ${nextTitle}`,
        ],
      );
    }

    return res.status(200).json({
      success: true,
      task: await fetchTaskDetails(taskId),
    });
  } catch (error) {
    console.error('Update task subtask error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating subtask',
    });
  }
}
