import express from 'express';
import { getLogs, createLog, updateLog } from '../controllers/logController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLogs)
  .post(createLog)
  .patch(updateLog);

router.route('/:id')
  .patch(updateLog);

export default router;
