import express from 'express';
import {
  addTaskComment,
  addTaskSubtask,
  updateTask,
  updateTaskSubtask,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/:id')
  .put(updateTask);

router.route('/:id/comments')
  .post(addTaskComment);

router.route('/:id/subtasks')
  .post(addTaskSubtask);

router.route('/:taskId/subtasks/:subtaskId')
  .patch(updateTaskSubtask);

export default router;
