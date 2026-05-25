import pool from '../config/db.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export async function getProjects(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.username as creator_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving projects'
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

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
      [name, description, userId]
    );

    const newProjectId = result.insertId;

    // Fetch the newly created project
    const [newProj] = await pool.query(
      'SELECT p.*, u.username as creator_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      [newProjectId]
    );

    return res.status(201).json({
      success: true,
      data: newProj[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating project'
    });
  }
}

// @desc    Get a single project with its tasks
// @route   GET /api/projects/:id
// @access  Private
export async function getProjectById(req, res) {
  try {
    const projectId = req.params.id;

    // Fetch project
    const [projectRows] = await pool.query(`
      SELECT p.*, u.username as creator_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `, [projectId]);

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Fetch tasks for this project
    const [taskRows] = await pool.query(`
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.project_id = ?
      ORDER BY t.created_at ASC
    `, [projectId]);

    const project = projectRows[0];
    project.tasks = taskRows;

    return res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get project by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving project details'
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
        message: 'Project name is required'
      });
    }

    // Check if project exists
    const [existing] = await pool.query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await pool.query(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, projectId]
    );

    // Fetch updated project
    const [updatedProj] = await pool.query(
      'SELECT p.*, u.username as creator_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      [projectId]
    );

    return res.status(200).json({
      success: true,
      data: updatedProj[0]
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating project'
    });
  }
}

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
export async function deleteProject(req, res) {
  try {
    const projectId = req.params.id;

    // Check if project exists
    const [existing] = await pool.query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

    return res.status(200).json({
      success: true,
      message: 'Project and all associated tasks deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting project'
    });
  }
}
