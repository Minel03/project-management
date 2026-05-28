import express from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  addTeamMember,
  removeTeamMember,
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getTeams);
router.post('/', protect, createTeam);

router.get('/:id', protect, getTeamById);

router.post('/:id/members', protect, addTeamMember);

router.delete('/:id/members/:userId', protect, removeTeamMember);

export default router;
