import express from 'express';
import { updateTask } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/:id')
  .put(updateTask);

export default router;
