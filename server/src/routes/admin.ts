import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

// Users list (admin) / team (manager)
router.get('/users', requireRole('manager'), async (req, res) => {
  const me = req.user!;
  const where = me.role === 'manager' ? { managerId: me.sub } : {};
  const users = await prisma.user.findMany({ where, orderBy: { fullName: 'asc' } });
  res.json({ data: users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, department: u.department, managerId: u.managerId })) });
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
  await audit(req, 'user.create', 'user', user.id, { role: user.role });
  res.status(201).json({ data: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department } });
});

export default router;
