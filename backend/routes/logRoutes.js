import express from 'express';
import { getLogs, createLog, updateLog } from '../controllers/logController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLogs);
router.post('/', protect, createLog);
router.patch('/', protect, updateLog);

router.patch('/:id', protect, updateLog);

export default router;
