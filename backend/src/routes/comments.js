import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body is required' });

  const comment = await prisma.comment.create({
    data: { postId: req.params.postId, userId: req.user.id, body: body.trim() },
    include: { user: { select: { id: true, name: true } } },
  });
  req.app.get('io')?.emit('post:comment', { postId: req.params.postId, comment });
  res.status(201).json(comment);
});

router.delete('/:commentId', async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.comment.delete({ where: { id: req.params.commentId } });
  res.status(204).end();
});

export default router;
