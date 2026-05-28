import express from 'express';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { createTask } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getProjects);
router.post('/', protect, createProject);

router.get('/:id', protect, getProjectById);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// Mount task creation under projects
router.post('/:projectId/tasks', protect, createTask);

export default router;
