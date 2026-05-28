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
import ensureCollaborationTables from './utils/ensureCollaborationTables.js';

// App Config
const app = express();
const port = process.env.PORT || 5000;

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per IP per window
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
// Mount DB init routes only when explicitly enabled via env var
if (process.env.ENABLE_DB_INIT === 'true') {
  app.use('/api/db', dbRoutes);
} else {
  console.log(
    'DB init endpoint disabled. Set ENABLE_DB_INIT=true to enable it.',
  );
}
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/teams', apiLimiter, teamRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/logs', apiLimiter, logRoutes);
app.use('/api/users', apiLimiter, userRoutes);

app.get('/', (req, res) => {
  res.send('API Working');
});

const startServer = async () => {
  await ensureCollaborationTables(pool);
  app.listen(port, () => {
    console.log(`Server started on PORT: ${port}`);
  });
};

startServer();
