import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireManager } from '../middleware/requireAdmin.js';

const router = Router();
router.use(authenticate);

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, jobTitle: true, department: true, bio: true, avatarUrl: true,
  clientId: true, createdAt: true,
  client: { select: { id: true, name: true, slug: true } },
};

// List all team members (accessible to ADMIN_MANAGER for team visibility)
router.get('/', requireManager, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// Create internal team member
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role, clientId, phone, jobTitle, department } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name, email, password: hash,
        role: role ?? 'USER',
        clientId: clientId || null,
        phone: phone || null,
        jobTitle: jobTitle || null,
        department: department || null,
      },
      select: USER_SELECT,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// Invite a client user (CLIENT role, linked to a client record)
router.post('/invite-client', requireAdmin, async (req, res) => {
  const { name, email, password, clientId } = req.body;
  if (!name || !email || !password || !clientId) {
    return res.status(400).json({ error: 'name, email, password, and clientId are required' });
  }
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: 'CLIENT', clientId },
      select: USER_SELECT,
    });
    // Enable portal on the client
    await prisma.client.update({ where: { id: clientId }, data: { portalEnabled: true } });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// Update any user's role/profile (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id && req.body.role) {
    // Prevent self-demotion
    const ELEVATED = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
    if (ELEVATED.has(req.user.role) && !ELEVATED.has(req.body.role)) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }
  }
  const { name, email, role, phone, jobTitle, department, bio, clientId } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name       && { name }),
      ...(email      && { email }),
      ...(role       && { role }),
      ...(phone      !== undefined && { phone }),
      ...(jobTitle   !== undefined && { jobTitle }),
      ...(department !== undefined && { department }),
      ...(bio        !== undefined && { bio }),
      ...(clientId   !== undefined && { clientId: clientId || null }),
    },
    select: USER_SELECT,
  });
  res.json(user);
});

// Reset another user's password (admin only)
router.put('/:id/password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hash } });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
