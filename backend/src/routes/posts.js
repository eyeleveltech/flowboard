import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enqueueReminder, cancelReminder } from '../jobs/reminderQueue.js';

const router = Router();

router.use(authenticate);

const POST_INCLUDE = {
  client: { select: { id: true, name: true, color: true, slug: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  checklistItems: { orderBy: { order: 'asc' } },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
  activities: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  },
};

router.get('/', async (req, res) => {
  const { clientId, status, platform, assignedToId, from, to, unscheduled, contentType, search, sort = 'newest', page = 1, limit = 50 } = req.query;
  const where = {};
  if (clientId)     where.clientId     = clientId;
  if (status)       where.status       = status;
  if (platform)     where.platforms    = { hasSome: [platform] };
  if (assignedToId) where.assignedToId = assignedToId;
  if (contentType)  where.contentType  = contentType;
  if (search)       where.title        = { contains: search, mode: 'insensitive' };
  if (unscheduled === 'true') {
    where.scheduledAt = null;
  } else if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = new Date(from);
    if (to)   where.scheduledAt.lte = new Date(to);
  }

  const orderBy = sort === 'oldest'
    ? [{ createdAt: 'asc' }]
    : sort === 'scheduled'
    ? [{ scheduledAt: 'asc' }, { createdAt: 'desc' }]
    : sort === 'title'
    ? [{ title: 'asc' }]
    : [{ createdAt: 'desc' }];

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        client:     { select: { id: true, name: true, color: true, slug: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
        _count:     { select: { checklistItems: true, comments: true } },
      },
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ posts, total, page: Number(page), limit: Number(limit) });
});

router.post('/', async (req, res) => {
  const { title, caption, hashtags, mediaUrls, platforms, contentType, category, contentPillar, assetLink, taggedPages, status, clientId, assignedToId, scheduledAt } = req.body;
  if (!title || !platforms?.length || !clientId) {
    return res.status(400).json({ error: 'title, platforms, and clientId are required' });
  }

  const post = await prisma.post.create({
    data: {
      title,
      caption: caption ?? null,
      hashtags: hashtags ?? [],
      mediaUrls: mediaUrls ?? [],
      platforms,
      contentType: contentType ?? null,
      category: category ?? null,
      contentPillar: contentPillar ?? null,
      assetLink: assetLink ?? null,
      taggedPages: taggedPages ?? null,
      status: status ?? 'IDEA',
      clientId,
      assignedToId: assignedToId ?? null,
      createdById: req.user.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
    include: POST_INCLUDE,
  });

  if (post.scheduledAt && post.assignedToId) {
    enqueueReminder(post.id, post.assignedToId, post.scheduledAt).catch(err => console.error('Failed to enqueue reminder:', err));
  }

  await prisma.postActivity.create({
    data: { postId: post.id, userId: req.user.id, action: 'created', detail: 'Post created' },
  });

  req.app.get('io')?.emit('post:updated', post);
  res.status(201).json(post);
});

router.get('/:id', async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: POST_INCLUDE });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.put('/:id', async (req, res) => {
  const { title, caption, hashtags, mediaUrls, platforms, contentType, category, contentPillar, assetLink, taggedPages, publishChecklist, status, assignedToId, scheduledAt, publishedAt, rejectionReason, clientApprovedBy, clientApprovedAt } = req.body;

  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(caption !== undefined && { caption }),
      ...(hashtags !== undefined && { hashtags }),
      ...(mediaUrls !== undefined && { mediaUrls }),
      ...(platforms !== undefined && { platforms }),
      ...(contentType !== undefined && { contentType }),
      ...(category !== undefined && { category }),
      ...(contentPillar !== undefined && { contentPillar }),
      ...(assetLink !== undefined && { assetLink }),
      ...(taggedPages !== undefined && { taggedPages }),
      ...(publishChecklist !== undefined && { publishChecklist }),
      ...(status !== undefined && { status }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
      ...(rejectionReason !== undefined && { rejectionReason }),
      ...(clientApprovedBy !== undefined && { clientApprovedBy }),
      ...(clientApprovedAt !== undefined && { clientApprovedAt: clientApprovedAt ? new Date(clientApprovedAt) : null }),
    },
    include: POST_INCLUDE,
  });

  if (post.scheduledAt && post.assignedToId) {
    cancelReminder(post.id).catch(err => console.error('Failed to cancel reminder:', err));
    enqueueReminder(post.id, post.assignedToId, post.scheduledAt).catch(err => console.error('Failed to enqueue reminder:', err));
  }

  // Log activity if status changed
  if (status !== undefined && status !== existing.status) {
    await prisma.postActivity.create({
      data: {
        postId: post.id,
        userId: req.user.id,
        action: 'status_change',
        detail: `${existing.status} → ${status}`,
      },
    });

    // Notify the assignee (if different from actor)
    const notifyUserId = post.assignedToId && post.assignedToId !== req.user.id ? post.assignedToId : null;
    if (notifyUserId) {
      const notification = await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: 'post_status_changed',
          payload: {
            postId: post.id,
            postTitle: post.title,
            clientName: post.client?.name,
            newStatus: status,
            changedBy: req.user.name,
          },
        },
      });
      req.app.get('io')?.to(`user:${notifyUserId}`).emit('notification:new', notification);
    }
  }

  // Log activity if scheduledAt changed
  if (scheduledAt !== undefined && String(existing.scheduledAt) !== String(post.scheduledAt)) {
    await prisma.postActivity.create({
      data: {
        postId: post.id,
        userId: req.user.id,
        action: 'scheduled',
        detail: post.scheduledAt
          ? `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'Schedule removed',
      },
    });
  }

  req.app.get('io')?.emit('post:updated', post);
  res.json(post);
});

router.delete('/:id', async (req, res) => {
  try {
    await cancelReminder(req.params.id);
    await prisma.post.delete({ where: { id: req.params.id } });
    req.app.get('io')?.emit('post:deleted', { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    throw err;
  }
});

/* ── Crisis mode: pause / resume all scheduled posts ───────────────── */
router.post('/crisis', async (req, res) => {
  const { action } = req.body;
  if (!['pause', 'resume'].includes(action)) {
    return res.status(400).json({ error: 'action must be "pause" or "resume"' });
  }

  if (action === 'pause') {
    const result = await prisma.post.updateMany({
      where: { status: 'SCHEDULED' },
      data:  { status: 'PAUSED' },
    });
    await prisma.postActivity.createMany({
      data: (await prisma.post.findMany({ where: { status: 'PAUSED' }, select: { id: true } }))
        .map((p) => ({ postId: p.id, userId: req.user.id, action: 'crisis_pause', detail: 'Paused via crisis mode' })),
    });
    req.app.get('io')?.emit('posts:crisis', { action: 'pause', count: result.count });
    return res.json({ action: 'pause', affected: result.count });
  }

  const result = await prisma.post.updateMany({
    where: { status: 'PAUSED' },
    data:  { status: 'SCHEDULED' },
  });
  req.app.get('io')?.emit('posts:crisis', { action: 'resume', count: result.count });
  return res.json({ action: 'resume', affected: result.count });
});

export default router;
