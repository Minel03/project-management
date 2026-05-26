import pool from '../config/db.js';

// @desc    Get all change logs (supports filtering by projectId or taskId)
// @route   GET /api/logs
// @access  Private
export async function getLogs(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view activity logs',
      });
    }

    const { projectId, taskId } = req.query;

    let query = `
      SELECT 
        cl.id,
        cl.task_id,
        cl.user_id,
        cl.old_status,
        cl.new_status,
        cl.remark,
        cl.created_at,
        t.title as task_title,
        p.name as project_name,
        p.id as project_id,
        u.username as operator_username
      FROM change_logs cl
      JOIN tasks t ON cl.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON cl.user_id = u.id
    `;

    const queryParams = [];
    const conditions = [];

    if (projectId) {
      conditions.push('p.id = ?');
      queryParams.push(projectId);
    }

    if (taskId) {
      conditions.push('cl.task_id = ?');
      queryParams.push(taskId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY cl.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving activity logs',
    });
  }
}

// @desc    Create a manual change log
// @route   POST /api/logs
// @access  Private
export async function createLog(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create activity logs',
      });
    }

    const { task_id, old_status, new_status, remark } = req.body;
    const userId = req.user.id;

    if (!task_id || !old_status || !new_status) {
      return res.status(400).json({
        success: false,
        message: 'task_id, old_status, and new_status are required',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
      [task_id, userId, old_status, new_status, remark || ''],
    );

    const [newLog] = await pool.query(
      'SELECT cl.*, u.username as operator_username FROM change_logs cl JOIN users u ON cl.user_id = u.id WHERE cl.id = ?',
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      data: newLog[0],
    });
  } catch (error) {
    console.error('Create log error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating activity log',
    });
  }
}

// @desc    Update a change log (add/modify remark and statuses)
// @route   PATCH /api/logs/:id
// @access  Private
export async function updateLog(req, res) {
  try {
    const logId = req.params.id || req.body.change_log_id;
    const { old_status, new_status, remark } = req.body;

    if (!logId) {
      return res.status(400).json({
        success: false,
        message: 'log ID is required',
      });
    }

    // Check if exists
    const [existing] = await pool.query(
      'SELECT * FROM change_logs WHERE id = ?',
      [logId],
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Change log not found',
      });
    }

    const currentLog = existing[0];
    if (req.user.id !== currentLog.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Only the remark owner can edit this log entry',
      });
    }

    const updatedOldStatus =
      old_status !== undefined ? old_status : currentLog.old_status;
    const updatedNewStatus =
      new_status !== undefined ? new_status : currentLog.new_status;
    const updatedRemark = remark !== undefined ? remark : currentLog.remark;
    const remarkChanged = remark !== undefined && remark !== currentLog.remark;

    await pool.query(
      'UPDATE change_logs SET old_status = ?, new_status = ?, remark = ? WHERE id = ?',
      [updatedOldStatus, updatedNewStatus, updatedRemark, logId],
    );

    const [updatedLog] = await pool.query(
      'SELECT cl.*, u.username as operator_username FROM change_logs cl JOIN users u ON cl.user_id = u.id WHERE cl.id = ?',
      [logId],
    );

    let auditEntry = null;
    if (remarkChanged) {
      const auditRemark = `Remark edited from "${currentLog.remark || ''}" to "${updatedRemark}"`;
      const [insertResult] = await pool.query(
        'INSERT INTO change_logs (task_id, user_id, old_status, new_status, remark) VALUES (?, ?, ?, ?, ?)',
        [
          currentLog.task_id,
          req.user.id,
          currentLog.new_status,
          currentLog.new_status,
          auditRemark,
        ],
      );
      const [insertedLog] = await pool.query(
        'SELECT cl.*, u.username as operator_username FROM change_logs cl JOIN users u ON cl.user_id = u.id WHERE cl.id = ?',
        [insertResult.insertId],
      );
      auditEntry = { ...insertedLog[0], isAudit: true };
    }

    return res.status(200).json({
      success: true,
      data: updatedLog[0],
      audit: auditEntry,
    });
  } catch (error) {
    console.error('Update log error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating activity log',
    });
  }
}
