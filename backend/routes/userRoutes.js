import express from 'express';
import {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getUsers);
router.post('/', protect, createUser);
router.patch('/:id/role', protect, updateUserRole);
router.delete('/:id', protect, deleteUser);

export default router;
