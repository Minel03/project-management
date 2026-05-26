import pool from '../config/db.js';
import { isTeamLeader } from './teamController.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export async function getProjects(req, res) {
  try {
    const userId = req.user.id;

    let rows;
    if (req.user.role === 'admin') {
      const [adminRows] = await pool.query(`
        SELECT p.*, u.username as creator_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `);
      rows = adminRows;
    } else {
      const [userRows] = await pool.query(
        `
        SELECT DISTINCT p.*, u.username as creator_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN tasks t ON t.project_id = p.id
        LEFT JOIN task_assignees ta ON ta.task_id = t.id
        WHERE p.user_id = ? OR t.assigned_to = ? OR ta.user_id = ?
        ORDER BY p.created_at DESC
      `,
        [userId, userId, userId],
      );
      rows = userRows;
    }

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving projects',
    });
  }
}

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export async function createProject(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;
    const canCreateProject =
      req.user.role === 'admin' || (await isTeamLeader(userId));
    if (!canCreateProject) {
      return res.status(403).json({
        success: false,
        message: 'Only admins or team leaders can create new projects',
      });
    }
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
      [name, description, userId],
    );

    const newProjectId = result.insertId;

    // Fetch the newly created project
    const [newProj] = await pool.query(
      'SELECT p.*, u.username as creator_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      [newProjectId],
    );

    return res.status(201).json({
      success: true,
      data: newProj[0],
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating project',
    });
  }
}

// @desc    Get a single project with its tasks
// @route   GET /api/projects/:id
// @access  Private
export async function getProjectById(req, res) {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Fetch project
    const [projectRows] = await pool.query(
      `
      SELECT p.*, u.username as creator_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `,
      [projectId],
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (req.user.role !== 'admin') {
      const [accessRows] = await pool.query(
        `
        SELECT 1
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        LEFT JOIN task_assignees ta ON ta.task_id = t.id
        WHERE p.id = ? AND (p.user_id = ? OR t.assigned_to = ? OR ta.user_id = ?)
        LIMIT 1
      `,
        [projectId, userId, userId, userId],
      );

      if (accessRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project',
        });
      }
    }

    // Fetch tasks for this project
    const [taskRows] = await pool.query(
      `
      SELECT t.*, u.username as assignee_name, starter.username as started_by_name
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      LEFT JOIN users starter ON t.started_by = starter.id
      WHERE t.project_id = ?
      ORDER BY t.created_at ASC
    `,
      [projectId],
    );

    const taskIds = taskRows.map((task) => task.id);
    let assigneeMap = {};
    let commentMap = {};
    let subtaskMap = {};
    if (taskIds.length > 0) {
      const [assigneeRows] = await pool.query(
        `
        SELECT ta.task_id, u.id, u.username
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id IN (?)
      `,
        [taskIds],
      );
      assigneeRows.forEach((row) => {
        if (!assigneeMap[row.task_id]) {
          assigneeMap[row.task_id] = [];
        }
        assigneeMap[row.task_id].push({ id: row.id, username: row.username });
      });

      const [commentRows] = await pool.query(
        `
        SELECT tc.id, tc.task_id, tc.user_id, tc.comment, tc.created_at, u.username
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.task_id IN (?)
        ORDER BY tc.created_at ASC
      `,
        [taskIds],
      );
      commentRows.forEach((row) => {
        if (!commentMap[row.task_id]) {
          commentMap[row.task_id] = [];
        }
        commentMap[row.task_id].push(row);
      });

      const [subtaskRows] = await pool.query(
        `
        SELECT ts.id, ts.task_id, ts.title, ts.assigned_to, ts.is_done,
               ts.created_by, ts.created_at, ts.updated_at, u.username as assignee_name
        FROM task_subtasks ts
        LEFT JOIN users u ON ts.assigned_to = u.id
        WHERE ts.task_id IN (?)
        ORDER BY ts.created_at ASC
      `,
        [taskIds],
      );
      subtaskRows.forEach((row) => {
        if (!subtaskMap[row.task_id]) {
          subtaskMap[row.task_id] = [];
        }
        subtaskMap[row.task_id].push(row);
      });
    }

    const project = projectRows[0];
    project.tasks = taskRows.map((task) => ({
      ...task,
      assignees: assigneeMap[task.id] || [],
      comments: commentMap[task.id] || [],
      subtasks: subtaskMap[task.id] || [],
    }));

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get project by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving project details',
    });
  }
}

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
export async function updateProject(req, res) {
  try {
    const projectId = req.params.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
      });
    }

    // Check if project exists and the current user is authorized
    const [existing] = await pool.query(
      'SELECT user_id FROM projects WHERE id = ?',
      [projectId],
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const projectOwnerId = existing[0].user_id;
    if (req.user.role !== 'admin' && projectOwnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project',
      });
    }

    await pool.query(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, projectId],
    );

    // Fetch updated project
    const [updatedProj] = await pool.query(
      'SELECT p.*, u.username as creator_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      [projectId],
    );

    return res.status(200).json({
      success: true,
      data: updatedProj[0],
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating project',
    });
  }
}

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
export async function deleteProject(req, res) {
  try {
    const projectId = req.params.id;

    // Check if project exists and the current user is authorized
    const [existing] = await pool.query(
      'SELECT user_id FROM projects WHERE id = ?',
      [projectId],
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const projectOwnerId = existing[0].user_id;
    if (req.user.role !== 'admin' && projectOwnerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project',
      });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

    return res.status(200).json({
      success: true,
      message: 'Project and all associated tasks deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting project',
    });
  }
}
