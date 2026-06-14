import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import { sendMail, brandEmail, appUrl } from '../mailer.js';

const router = Router();
router.use(requireAuth);

// Users list (admin) / team (manager)
router.get('/users', requireRole('manager'), async (req, res) => {
  const me = req.user!;
  const where = me.role === 'manager' ? { managerId: me.sub } : {};
  const users = await prisma.user.findMany({ where, orderBy: { fullName: 'asc' } });
  res.json({ data: users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, department: u.department, managerId: u.managerId, status: u.status })) });
});

// Manager team compliance rollup
router.get('/reports/team', requireRole('manager'), async (req, res) => {
  const me = req.user!;
  const team = me.role === 'manager'
    ? await prisma.user.findMany({ where: { managerId: me.sub } })
    : await prisma.user.findMany({ where: { role: 'learner' } });

  const rows: any[] = [];
  for (const u of team) {
    const assignments = await prisma.assignment.findMany({ where: { userId: u.id }, include: { module: true } });
    const completed = assignments.filter((a) => a.status === 'completed').length;
    const overdue = assignments.filter((a) => a.dueAt && a.dueAt < new Date() && a.status !== 'completed').length;
    rows.push({
      userId: u.id, name: u.fullName, email: u.email, department: u.department,
      assigned: assignments.length, completed, overdue,
      compliance: assignments.length ? Math.round((completed / assignments.length) * 100) : 100,
      modules: assignments.map((a) => ({ title: a.module.title, status: a.status, dueAt: a.dueAt })),
    });
  }
  res.json({ data: rows });
});

// Org-wide compliance (admin)
router.get('/reports/compliance', requireRole('admin'), async (req, res) => {
  const totalAssignments = await prisma.assignment.count();
  const completed = await prisma.assignment.count({ where: { status: 'completed' } });
  const overdue = await prisma.assignment.count({ where: { dueAt: { lt: new Date() }, status: { not: 'completed' } } });
  const modules = await prisma.trainingModule.count();
  const learners = await prisma.user.count({ where: { role: 'learner' } });
  const certs = await prisma.certificate.count({ where: { revoked: false } });
  const byModule = await prisma.trainingModule.findMany({ include: { assignments: true } });
  res.json({
    data: {
      totalAssignments, completed, overdue, modules, learners, certificates: certs,
      compliancePct: totalAssignments ? Math.round((completed / totalAssignments) * 100) : 0,
      modules_breakdown: byModule.map((m) => ({
        title: m.title,
        assigned: m.assignments.length,
        completed: m.assignments.filter((a) => a.status === 'completed').length,
      })),
    },
  });
});

router.get('/notifications', async (req, res) => {
  const notes = await prisma.notification.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json({ data: notes });
});
router.post('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.sub, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.post('/notifications/:id/read', async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.sub }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.get('/audit-logs', requireRole('admin'), async (req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { actor: true } });
  res.json({ data: logs.map((l) => ({ id: l.id, action: l.action, entityType: l.entityType, actor: l.actor?.fullName ?? 'system', createdAt: l.createdAt })) });
});


// Admin: create a user (learner / manager / admin) with a password
const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'manager', 'learner']),
  password: z.string().min(8),
  department: z.string().optional(),
  managerId: z.string().optional(),
});
router.post('/users', requireRole('admin'), async (req, res) => {
  const p = createUserSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input (password min 8 chars).' });
  const existing = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'A user with that email already exists.' });
  const user = await prisma.user.create({ data: {
    email: p.data.email.toLowerCase(), passwordHash: bcrypt.hashSync(p.data.password, 10),
    fullName: p.data.fullName, role: p.data.role, department: p.data.department ?? null, managerId: p.data.managerId ?? null,
  }});
  { const url = appUrl(); await sendMail(user.email, 'Your Learning & Development Portal account', brandEmail('Welcome to the L&D Portal', `An account has been created for you (role: <b>${user.role}</b>). Please sign in with the credentials provided by your administrator and change your password.`, url ? { text: 'Sign in', url } : undefined)); }
  await audit(req, 'user.create', 'user', user.id, { role: user.role });
  res.status(201).json({ data: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department } });
});

// Admin: change/reset a user's password
const setPasswordSchema = z.object({ password: z.string().min(8) });
router.patch('/users/:id/password', requireRole('admin'), async (req, res) => {
  const p = setPasswordSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(p.data.password, 10) } });
  await audit(req, 'user.password_reset', 'user', user.id, {});
  res.json({ data: { id: user.id, email: user.email } });
});

// Admin: edit a user (profile, role, department, manager, active/inactive)
const userEditSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'learner']).optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
router.patch('/users/:id', requireRole('admin'), async (req, res) => {
  const p = userEditSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  const demoting = (p.data.status === 'inactive') || (p.data.role && p.data.role !== 'admin');
  if (req.params.id === req.user!.sub && demoting) return res.status(400).json({ error: 'You cannot deactivate or demote your own account.' });
  if (demoting && target.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin', status: 'active' } });
    if (admins <= 1) return res.status(400).json({ error: 'Cannot deactivate or demote the last active admin.' });
  }
  const u = await prisma.user.update({ where: { id: target.id }, data: p.data as any });
  await audit(req, 'user.update', 'user', u.id, { role: u.role, status: u.status });
  res.json({ data: { id: u.id, email: u.email, fullName: u.fullName, role: u.role, department: u.department, managerId: u.managerId, status: u.status } });
});

// Admin: delete a user (hard delete, guarded — prefer deactivate when records exist)
router.delete('/users/:id', requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user!.sub) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin', status: 'active' } });
    if (admins <= 1) return res.status(400).json({ error: 'Cannot delete the last admin.' });
  }
  const certs = await prisma.certificate.count({ where: { userId: target.id } });
  if (certs > 0) return res.status(409).json({ error: 'User has issued certificates. Deactivate instead of deleting (keeps compliance records).' });
  await prisma.user.delete({ where: { id: target.id } });
  await audit(req, 'user.delete', 'user', target.id);
  res.json({ data: { deleted: true } });
});

export default router;
