import express from 'express';
import { initDatabase } from '../controllers/dbController.js';

const router = express.Router();

router.get('/init', initDatabase);

export default router;
