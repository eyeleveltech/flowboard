import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// POST /bulk/posts — update or delete multiple posts
router.post('/posts', async (req, res) => {
  const { ids, action, data: actionData } = req.body;
  if (!ids?.length || !action) return res.status(400).json({ error: 'ids and action required' });

  if (action === 'delete') {
    await prisma.post.deleteMany({ where: { id: { in: ids } } });
    req.app.get('io')?.emit('posts:bulk_deleted', { ids });
    return res.json({ affected: ids.length });
  }

  if (action === 'update') {
    const allowed = ['status', 'assignedToId', 'scheduledAt'];
    const updateData = {};
    for (const key of allowed) {
      if (actionData[key] !== undefined) {
        updateData[key] = key === 'scheduledAt' && actionData[key]
          ? new Date(actionData[key])
          : actionData[key];
      }
    }
    if (!Object.keys(updateData).length) return res.status(400).json({ error: 'No valid fields to update' });

    await prisma.post.updateMany({ where: { id: { in: ids } }, data: updateData });

    // Log activity for status changes
    if (actionData.status) {
      await prisma.postActivity.createMany({
        data: ids.map((postId) => ({
          postId,
          userId: req.user.id,
          action: 'bulk_status_change',
          detail: `Status set to ${actionData.status} (bulk)`,
        })),
      });
    }

    req.app.get('io')?.emit('posts:bulk_updated', { ids, data: updateData });
    return res.json({ affected: ids.length });
  }

  res.status(400).json({ error: 'Unknown action' });
});

export default router;
