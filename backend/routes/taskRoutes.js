import express from 'express';
import {
  addTaskComment,
  addTaskSubtask,
  deleteTask,
  updateTask,
  updateTaskSubtask,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.put('/:id', protect, updateTask);

router.delete('/:id', protect, deleteTask);

router.post('/:id/comments', protect, addTaskComment);

router.post('/:id/subtasks', protect, addTaskSubtask);

router.patch('/:taskId/subtasks/:subtaskId', protect, updateTaskSubtask);

export default router;
