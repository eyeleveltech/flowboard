import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import clientsRouter from './routes/clients.js';
import postsRouter from './routes/posts.js';
import checklistRouter from './routes/checklist.js';
import commentsRouter from './routes/comments.js';
import notificationsRouter from './routes/notifications.js';
import activitiesRouter from './routes/activities.js';
import hashtagsRouter from './routes/hashtags.js';
import aiRouter from './routes/ai.js';
import bulkRouter from './routes/bulk.js';
import bioRouter from './routes/bio.js';
import calendarRouter from './routes/calendar.js';

const app = express();

app.use(cors({ origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://flowboard-frontend-rho.vercel.app'].filter(Boolean) }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/clients', clientsRouter);
app.use('/posts', postsRouter);
app.use('/posts/:postId/checklist', checklistRouter);
app.use('/posts/:postId/comments', commentsRouter);
app.use('/notifications', notificationsRouter);
app.use('/activities', activitiesRouter);
app.use('/hashtags', hashtagsRouter);
app.use('/ai', aiRouter);
app.use('/bulk', bulkRouter);
app.use('/bio', bioRouter);
app.use('/calendar', calendarRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
