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

router.use(protect);

router.route('/').get(getTeams).post(createTeam);

router.route('/:id').get(getTeamById);

router.route('/:id/members').post(addTeamMember);

router.route('/:id/members/:userId').delete(removeTeamMember);

export default router;
