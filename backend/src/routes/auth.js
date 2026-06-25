import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, jobTitle: true, department: true, bio: true, avatarUrl: true,
  clientId: true, createdAt: true,
  client: { select: { id: true, name: true, slug: true } },
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Admin registers a new internal team member
router.post('/register', authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, role, clientId } = req.body;
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
      },
      select: USER_SELECT,
    });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

router.get('/setup-status', async (req, res) => {
  const count = await prisma.user.count();
  res.json({ isSetup: count > 0 });
});

// Public registration endpoint
router.post('/signup', async (req, res) => {
  const count = await prisma.user.count();
  if (count > 0) {
    return res.status(403).json({ error: 'Registration is closed. Please contact your administrator for an account.' });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name, 
        email, 
        password: hash,
        role: 'ADMIN',
      },
      select: USER_SELECT,
    });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await prisma.user.findUnique({ where: { email }, include: { client: { select: { id: true, name: true, slug: true } } } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const { password: _pw, ...safe } = user;
  res.json({ user: safe, token: signToken(user) });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: USER_SELECT,
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update own profile
router.put('/profile', authenticate, async (req, res) => {
  const { name, phone, jobTitle, department, bio, avatarUrl } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name       && { name }),
      ...(phone      !== undefined && { phone }),
      ...(jobTitle   !== undefined && { jobTitle }),
      ...(department !== undefined && { department }),
      ...(bio        !== undefined && { bio }),
      ...(avatarUrl  !== undefined && { avatarUrl }),
    },
    select: USER_SELECT,
  });
  res.json(user);
});

// Change own password
router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
  res.json({ ok: true });
});

export default router;
