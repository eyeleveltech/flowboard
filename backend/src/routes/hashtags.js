import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { clientId } = req.query;
  const where = {};
  if (clientId) where.clientId = clientId;
  const sets = await prisma.hashtagSet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(sets);
});

router.post('/', async (req, res) => {
  const { name, tags, clientId, platform } = req.body;
  if (!name || !tags?.length) return res.status(400).json({ error: 'name and tags required' });
  const set = await prisma.hashtagSet.create({
    data: { name, tags, clientId: clientId || null, platform: platform || null },
  });
  res.status(201).json(set);
});

router.put('/:id', async (req, res) => {
  const { name, tags, platform } = req.body;
  try {
    const set = await prisma.hashtagSet.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(tags !== undefined && { tags }),
        ...(platform !== undefined && { platform }),
      },
    });
    res.json(set);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.hashtagSet.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    throw err;
  }
});

export default router;
