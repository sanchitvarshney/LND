import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/certificates/me', async (req, res) => {
  const certs = await prisma.certificate.findMany({ where: { userId: req.user!.sub }, include: { module: true }, orderBy: { issuedAt: 'desc' } });
  res.json({ data: certs });
});

router.get('/certificates/:id', async (req, res) => {
  const cert = await prisma.certificate.findUnique({ where: { id: req.params.id }, include: { user: true, module: true } });
  if (!cert) return res.status(404).json({ error: 'Not found' });
  if (cert.userId !== req.user!.sub && req.user!.role === 'learner') return res.status(403).json({ error: 'Forbidden' });
  res.json({ data: cert });
});

export default router;
