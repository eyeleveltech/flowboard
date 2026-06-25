import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/* Public — no auth required */
router.get('/:slug', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { slug: req.params.slug },
    select: {
      name: true, slug: true, logoUrl: true, color: true,
      bioTitle: true, bioDescription: true, bioLinks: true,
    },
  });
  if (!client || (!client.bioTitle && !client.bioLinks)) {
    return res.status(404).json({ error: 'Bio page not found or not configured.' });
  }
  res.json(client);
});

/* Protected — team members only */
router.put('/:slug', authenticate, async (req, res) => {
  const { bioTitle, bioDescription, bioLinks } = req.body;
  const client = await prisma.client.findUnique({ where: { slug: req.params.slug } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const updated = await prisma.client.update({
    where: { slug: req.params.slug },
    data: { bioTitle, bioDescription, bioLinks: bioLinks ?? [] },
  });
  res.json(updated);
});

export default router;
