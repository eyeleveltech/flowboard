import { Queue, Worker } from 'bullmq';
import prisma from '../lib/prisma.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

const queue = new Queue('reminders', { connection });

export async function enqueueReminder(postId, userId, scheduledAt) {
  const delay = new Date(scheduledAt).getTime() - Date.now() - 60 * 60 * 1000;
  if (delay <= 0) return;
  await queue.add('reminder', { postId, userId }, {
    jobId: `reminder-${postId}`,
    delay,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function cancelReminder(postId) {
  const job = await queue.getJob(`reminder-${postId}`);
  if (job) await job.remove();
}

export function startReminderWorker(io) {
  new Worker('reminders', async (job) => {
    const { postId, userId } = job.data;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { client: { select: { name: true } } },
    });
    if (!post) return;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'post_reminder',
        payload: {
          postId,
          postTitle: post.title,
          clientName: post.client.name,
          scheduledAt: post.scheduledAt,
        },
      },
    });

    io?.to(`user:${userId}`).emit('notification:new', notification);
  }, { connection });
}
