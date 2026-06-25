import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  const [clients, statusGroups] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.post.groupBy({
      by: ['clientId', 'status'],
      _count: { _all: true },
    }),
  ]);

  const statusByClient = statusGroups.reduce((acc, g) => {
    if (!acc[g.clientId]) acc[g.clientId] = {};
    acc[g.clientId][g.status] = g._count._all;
    return acc;
  }, {});

  res.json(clients.map((c) => ({ ...c, statusCounts: statusByClient[c.id] ?? {} })));
});

router.post('/', async (req, res) => {
  const { name, slug, color, logoUrl, industry, notes, contactName, contactEmail, contactPhone, platforms } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const client = await prisma.client.create({
      data: {
        name, slug,
        color: color ?? '#0071E3',
        logoUrl: logoUrl || null,
        industry: industry || null,
        notes: notes || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        platforms: platforms ?? [],
      },
    });
    res.status(201).json(client);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already in use' });
    throw err;
  }
});

router.get('/:id', async (req, res) => {
  const { page = 1, limit = 50, status, platform, sort = 'newest' } = req.query;
  const where = { clientId: req.params.id };
  if (status) where.status = status;
  if (platform) where.platforms = { hasSome: [platform] };

  const orderBy = sort === 'oldest'
    ? [{ createdAt: 'asc' }]
    : sort === 'scheduled'
    ? [{ scheduledAt: 'asc' }, { createdAt: 'desc' }]
    : [{ createdAt: 'desc' }];

  const [client, posts, total, statusGroups] = await Promise.all([
    prisma.client.findUnique({ where: { id: req.params.id } }),
    prisma.post.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
        client:     { select: { id: true, name: true, color: true, slug: true } },
        _count:     { select: { checklistItems: true, comments: true } },
      },
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.post.count({ where }),
    prisma.post.groupBy({
      by: ['status'],
      where: { clientId: req.params.id },
      _count: { _all: true },
    }),
  ]);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const statusCounts = statusGroups.reduce((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});

  res.json({ client, posts, total, statusCounts, page: Number(page), limit: Number(limit) });
});

router.put('/:id', async (req, res) => {
  const { name, slug, color, logoUrl, industry, notes, contactName, contactEmail, contactPhone, platforms, strategy, associatedPages } = req.body;
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(color !== undefined && { color }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(industry !== undefined && { industry }),
        ...(notes !== undefined && { notes }),
        ...(contactName !== undefined && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(platforms !== undefined && { platforms }),
        ...(strategy !== undefined && { strategy }),
        ...(associatedPages !== undefined && { associatedPages }),
      },
    });
    res.json(client);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Client not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already in use' });
    throw err;
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Client not found' });
    throw err;
  }
});

export default router;
