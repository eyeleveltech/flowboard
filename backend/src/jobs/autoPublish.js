import prisma from '../lib/prisma.js';

export function startAutoPublishJob(io) {
  async function tick() {
    try {
      const now = new Date();
      const due = await prisma.post.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
        select: { id: true, title: true, platforms: true, client: { select: { name: true } } },
      });

      if (!due.length) return;

      for (const post of due) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED', publishedAt: now },
        });
        await prisma.postActivity.create({
          data: {
            postId: post.id,
            action: 'auto_published',
            detail: `Auto-published on ${post.platforms.join(', ')} at scheduled time`,
          },
        });
        io?.emit('post:updated', { id: post.id, status: 'PUBLISHED' });
        console.log(`[AutoPublish] "${post.title}" (${post.client?.name}) published`);
      }
    } catch (err) {
      console.error('[AutoPublish] Error:', err.message);
    }
  }

  // Run immediately on start, then every 60 seconds
  tick();
  const interval = setInterval(tick, 60_000);

  // Return cleanup function for graceful shutdown
  return () => clearInterval(interval);
}
