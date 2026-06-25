import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', async (req, res) => {
  const items = await prisma.checklistItem.findMany({
    where: { postId: req.params.postId },
    orderBy: { order: 'asc' },
    include: { completedBy: { select: { id: true, name: true } } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const { label, order } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });

  const maxOrder = await prisma.checklistItem.aggregate({
    where: { postId: req.params.postId },
    _max: { order: true },
  });

  const item = await prisma.checklistItem.create({
    data: {
      postId: req.params.postId,
      label,
      order: order ?? (maxOrder._max.order ?? -1) + 1,
    },
  });
  req.app.get('io')?.emit('post:updated', { id: req.params.postId });
  res.status(201).json(item);
});

router.patch('/:itemId', async (req, res) => {
  const existing = await prisma.checklistItem.findUnique({ where: { id: req.params.itemId } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const toggled = !existing.completed;
  const item = await prisma.checklistItem.update({
    where: { id: req.params.itemId },
    data: {
      completed: toggled,
      completedAt: toggled ? new Date() : null,
      completedById: toggled ? req.user.id : null,
    },
    include: { completedBy: { select: { id: true, name: true } } },
  });
  req.app.get('io')?.emit('post:updated', { id: req.params.postId });
  res.json(item);
});

router.delete('/:itemId', async (req, res) => {
  try {
    await prisma.checklistItem.delete({ where: { id: req.params.itemId } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
    throw err;
  }
});

export default router;
