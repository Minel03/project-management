import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pool from './config/db.js';
import dbRoutes from './routes/dbRoutes.js';
import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import logRoutes from './routes/logRoutes.js';
import userRoutes from './routes/userRoutes.js';

// App Config
const app = express();
const port = process.env.PORT || 5000;

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register attempts per IP per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      'Too many authentication attempts, please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(express.json());
app.use(cors());

// API Endpoints
app.use('/api/db', dbRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/teams', apiLimiter, teamRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/logs', apiLimiter, logRoutes);
app.use('/api/users', apiLimiter, userRoutes);

app.get('/', (req, res) => {
  res.send('API Working');
});

const ensureTaskAssigneesTable = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS task_assignees (
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );
    await pool.query(
      'INSERT IGNORE INTO task_assignees (task_id, user_id) SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL',
    );
  } catch (error) {
    console.error('Could not ensure task_assignees table exists:', error);
  }
};

const startServer = async () => {
  await ensureTaskAssigneesTable();
  app.listen(port, () => {
    console.log(`Server started on PORT: ${port}`);
  });
};

startServer();
