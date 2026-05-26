import pool from '../config/db.js';

export async function isTeamLeader(userId) {
  const [rows] = await pool.query('SELECT id FROM teams WHERE leader_id = ?', [
    userId,
  ]);
  return rows.length > 0;
}

export async function createTeam(req, res) {
  try {
    const { name, leaderId } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required',
      });
    }

    const teamLeaderId =
      req.user.role === 'admin' && leaderId ? leaderId : userId;

    const [leaderRows] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [teamLeaderId],
    );
    if (leaderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Specified leader user not found',
      });
    }
    if (leaderRows[0].role !== 'leader') {
      return res.status(400).json({
        success: false,
        message: 'Selected team leader must have the leader role',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO teams (name, leader_id) VALUES (?, ?)',
      [name, teamLeaderId],
    );

    const teamId = result.insertId;
    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
      [teamId, teamLeaderId],
    );

    const [teamRows] = await pool.query(
      'SELECT t.id, t.name, t.leader_id, u.username as leader_name FROM teams t JOIN users u ON t.leader_id = u.id WHERE t.id = ?',
      [teamId],
    );

    return res.status(201).json({
      success: true,
      data: teamRows[0],
    });
  } catch (error) {
    console.error('Create team error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating team',
    });
  }
}

export async function getTeams(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role === 'admin') {
      const [allTeams] = await pool.query(
        `SELECT t.id, t.name, t.leader_id, u.username AS leader_name
         FROM teams t
         JOIN users u ON t.leader_id = u.id
         ORDER BY t.name ASC`,
      );

      return res.status(200).json({
        success: true,
        data: {
          allTeams,
        },
      });
    }

    const [leaderOf] = await pool.query(
      'SELECT id, name FROM teams WHERE leader_id = ?',
      [userId],
    );

    const [memberOf] = await pool.query(
      `SELECT t.id, t.name, t.leader_id, u.username AS leader_name
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       JOIN users u ON t.leader_id = u.id
       WHERE tm.user_id = ?`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: {
        leaderOf,
        memberOf,
      },
    });
  } catch (error) {
    console.error('Fetch teams error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching teams',
    });
  }
}

export async function getTeamById(req, res) {
  try {
    const teamId = req.params.id;

    const [teamRows] = await pool.query(
      `SELECT t.id, t.name, t.leader_id, u.username AS leader_name
       FROM teams t
       JOIN users u ON t.leader_id = u.id
       WHERE t.id = ?`,
      [teamId],
    );

    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [teamId],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...teamRows[0],
        members,
      },
    });
  } catch (error) {
    console.error('Fetch team error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching team details',
    });
  }
}

export async function addTeamMember(req, res) {
  try {
    const teamId = req.params.id;
    const { userId } = req.body;
    const requesterId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to add a member',
      });
    }

    const [teamRows] = await pool.query(
      'SELECT leader_id FROM teams WHERE id = ?',
      [teamId],
    );
    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const teamLeaderId = teamRows[0].leader_id;
    if (req.user.role !== 'admin' && requesterId !== teamLeaderId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage this team',
      });
    }

    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [
      userId,
    ]);
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await pool.query(
      'INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)',
      [teamId, userId],
    );

    return res.status(200).json({
      success: true,
      message: 'Member added to team successfully',
    });
  } catch (error) {
    console.error('Add team member error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding member to team',
    });
  }
}

export async function removeTeamMember(req, res) {
  try {
    const teamId = req.params.id;
    const userId = parseInt(req.params.userId, 10);
    const requesterId = req.user.id;

    const [teamRows] = await pool.query(
      'SELECT leader_id FROM teams WHERE id = ?',
      [teamId],
    );
    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const teamLeaderId = teamRows[0].leader_id;
    if (req.user.role !== 'admin' && requesterId !== teamLeaderId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage this team',
      });
    }

    await pool.query(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId],
    );

    return res.status(200).json({
      success: true,
      message: 'Member removed from team successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing member from team',
    });
  }
}
