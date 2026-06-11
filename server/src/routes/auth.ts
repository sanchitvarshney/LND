import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { signAccess, signRefresh, verifyRefresh } from '../auth.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is not active' });

  const payload = { sub: user.id, role: user.role, email: user.email, name: user.fullName };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const isProd = process.env.NODE_ENV === 'production';
  // COOKIE_SAMESITE: 'lax' (default, same-site) or 'none' (cross-site: Vercel frontend + separate API domain).
  // 'none' requires Secure (HTTPS). Set COOKIE_SAMESITE=none when frontend and API are on different domains.
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || 'lax';
  const secure = isProd || sameSite === 'none';
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite, secure, maxAge: 7 * 24 * 3600 * 1000 });
  await audit(req, 'auth.login', 'user', user.id);
  res.json({ accessToken, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department } });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const u = verifyRefresh(token);
    const accessToken = signAccess({ sub: u.sub, role: u.role, email: u.email, name: u.name });
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department, managerId: user.managerId });
});


// First-run setup: is an admin account still needed?
router.get('/setup-status', async (_req, res) => {
  const count = await prisma.user.count();
  res.json({ needsSetup: count === 0 });
});

// Create the very first admin. Allowed ONLY when there are zero users.
const setupSchema = z.object({ email: z.string().email(), fullName: z.string().min(1), password: z.string().min(8) });
router.post('/setup', async (req, res) => {
  const count = await prisma.user.count();
  if (count > 0) return res.status(403).json({ error: 'Setup already completed' });
  const p = setupSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input. Password must be at least 8 characters.' });
  const user = await prisma.user.create({ data: { email: p.data.email.toLowerCase(), passwordHash: bcrypt.hashSync(p.data.password, 10), fullName: p.data.fullName, role: 'admin' } });
  await audit(req, 'setup.first_admin', 'user', user.id);
  res.status(201).json({ ok: true });
});

export default router;
