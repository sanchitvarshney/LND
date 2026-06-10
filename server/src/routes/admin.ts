import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

export default router;
