import express from 'express';
import { initDatabase } from '../controllers/dbController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

// Protect init endpoint: only authenticated admins can initialize/reset the database
router.get('/init', protect, isAdmin, initDatabase);

export default router;
