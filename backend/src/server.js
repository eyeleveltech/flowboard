import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { initSocket } from './socket/index.js';
import { startReminderWorker } from './jobs/reminderQueue.js';
import { startAutoPublishJob } from './jobs/autoPublish.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' },
});

app.set('io', io);

initSocket(io);
startReminderWorker(io);
startAutoPublishJob(io);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
