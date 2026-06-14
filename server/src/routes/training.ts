import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import { sendMail, brandEmail, appUrl } from '../mailer.js';

const router = Router();
router.use(requireAuth);

// Catalog: learners see assigned + published; admins see all
router.get('/modules', async (req, res) => {
  const u = req.user!;
  const modules = await prisma.trainingModule.findMany({
    include: { videos: { orderBy: { orderIndex: 'asc' } }, assessment: { include: { questions: true } }, _count: { select: { videos: true } } },
    orderBy: { createdAt: 'asc' },
  });
  // Attach the current user's assignment + progress summary
  const assignments = await prisma.assignment.findMany({ where: { userId: u.sub } });
  const progress = await prisma.userProgress.findMany({ where: { userId: u.sub } });
  const attempts = await prisma.quizAttempt.findMany({ where: { userId: u.sub } });

  const result = modules.map((m) => {
    const a = assignments.find((x) => x.moduleId === m.id);
    const vids = m.videos.map((v) => progress.find((p) => p.videoId === v.id));
    const videosDone = m.videos.length > 0 && m.videos.every((v) => progress.find((p) => p.videoId === v.id)?.status === 'video_completed');
    const pct = m.videos.length ? Math.round(vids.reduce((s, p) => s + (p?.percentComplete ?? 0), 0) / m.videos.length) : 0;
    const best = attempts.filter((at) => at.assessmentId === m.assessment?.id).sort((x, y) => y.score - x.score)[0];
    return {
      id: m.id, title: m.title, description: m.description, category: m.category,
      isMandatory: m.isMandatory, passThreshold: m.passThreshold, status: m.status,
      videoCount: m._count.videos, questionCount: m.assessment?.questions.length ?? 0,
      assignment: a ? { id: a.id, dueAt: a.dueAt, status: a.status } : null,
      videosCompleted: videosDone, percentWatched: pct,
      bestScore: best?.score ?? null, passed: best?.passed ?? false,
    };
  });
  // learners only see modules assigned to them
  const filtered = u.role === 'learner' ? result.filter((m) => m.assignment && m.status !== 'archived') : result;
  res.json({ data: filtered });
});

router.get('/modules/:id', async (req, res) => {
  const u = req.user!;
  const m = await prisma.trainingModule.findUnique({
    where: { id: req.params.id },
    include: { videos: { orderBy: { orderIndex: 'asc' } }, assessment: true },
  });
  if (!m) return res.status(404).json({ error: 'Module not found' });
  const progress = await prisma.userProgress.findMany({ where: { userId: u.sub, videoId: { in: m.videos.map((v) => v.id) } } });
  res.json({
    data: {
      ...m,
      videos: m.videos.map((v) => ({
        ...v,
        progress: progress.find((p) => p.videoId === v.id) ?? null,
      })),
    },
  });
});

// Admin: create module
const moduleSchema = z.object({
  title: z.string().min(2), description: z.string().min(2), category: z.string().default('Compliance'),
  passThreshold: z.number().min(0).max(100).default(70), isMandatory: z.boolean().default(true),
});
router.post('/modules', requireRole('admin'), async (req, res) => {
  const p = moduleSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input', details: p.error.flatten() });
  const m = await prisma.trainingModule.create({ data: { ...p.data, createdById: req.user!.sub } });
  await prisma.assessment.create({ data: { moduleId: m.id, passingScore: p.data.passThreshold } });
  await audit(req, 'module.create', 'module', m.id, { title: m.title });
  res.status(201).json({ data: m });
});

// Admin: add video to module
const videoSchema = z.object({ title: z.string().min(1), durationSeconds: z.number().min(1), sourceUrl: z.string().url() });
router.post('/modules/:id/videos', requireRole('admin'), async (req, res) => {
  const p = videoSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const count = await prisma.video.count({ where: { moduleId: req.params.id } });
  const v = await prisma.video.create({ data: { ...p.data, moduleId: req.params.id, orderIndex: count } });
  await audit(req, 'video.create', 'video', v.id);
  res.status(201).json({ data: v });
});

// Assignments for current learner
router.get('/assignments/me', async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { userId: req.user!.sub },
    include: { module: { include: { videos: true, assessment: { include: { questions: true } } } } },
    orderBy: { dueAt: 'asc' },
  });
  res.json({ data: assignments });
});

// Admin/Manager: assign a module
const assignSchema = z.object({ userId: z.string(), moduleId: z.string(), dueAt: z.string().optional() });
router.post('/assignments', requireRole('manager'), async (req, res) => {
  const p = assignSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const mod0 = await prisma.trainingModule.findUnique({ where: { id: p.data.moduleId } });
  if (!mod0) return res.status(404).json({ error: 'Module not found' });
  if (mod0.status === 'archived') return res.status(400).json({ error: 'Cannot assign an archived module.' });
  if (req.user!.role === 'manager') {
    const target = await prisma.user.findUnique({ where: { id: p.data.userId } });
    if (!target || target.managerId !== req.user!.sub) return res.status(403).json({ error: 'You can only assign training to your own team.' });
  }
  const a = await prisma.assignment.upsert({
    where: { userId_moduleId: { userId: p.data.userId, moduleId: p.data.moduleId } },
    update: { dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined, status: 'assigned' },
    create: { userId: p.data.userId, moduleId: p.data.moduleId, assignedById: req.user!.sub, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
  });
  await prisma.notification.create({ data: { userId: p.data.userId, type: 'assignment', title: 'New training assigned', body: `You have been assigned "${mod0.title}".` } });
  { const u = await prisma.user.findUnique({ where: { id: p.data.userId } }); const url = appUrl();
    await sendMail(u?.email, `New training assigned: ${mod0.title}`, brandEmail('New training assigned', `You have been assigned <b>${mod0.title}</b>${a.dueAt ? ', due <b>' + new Date(a.dueAt).toDateString() + '</b>' : ''}. Please complete it to stay compliant.`, url ? { text: 'Start training', url } : undefined)); }
  await audit(req, 'assignment.create', 'assignment', a.id);
  res.status(201).json({ data: a });
});

// ---------------------------------------------------------------------------
// Bulk / group assignment (admin: anyone; manager: own team)
// ---------------------------------------------------------------------------
const bulkSchema = z.object({
  moduleId: z.string(),
  dueAt: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  role: z.enum(['learner', 'manager']).optional(),
  department: z.string().optional(),
  all: z.boolean().optional(),
});
router.post('/assignments/bulk', requireRole('manager'), async (req, res) => {
  const p = bulkSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const me = req.user!;
  const mod = await prisma.trainingModule.findUnique({ where: { id: p.data.moduleId } });
  if (!mod) return res.status(404).json({ error: 'Module not found' });
  if (mod.status === 'archived') return res.status(400).json({ error: 'Cannot assign an archived module.' });

  const where: any = { status: 'active' };
  if (p.data.userIds && p.data.userIds.length) where.id = { in: p.data.userIds };
  else {
    where.role = p.data.role ? p.data.role : { in: ['learner', 'manager'] };
    if (p.data.department) where.department = p.data.department;
  }
  if (me.role === 'manager') where.managerId = me.sub; // managers limited to their own team
  const users = await prisma.user.findMany({ where });

  let assigned = 0;
  for (const u of users) {
    await prisma.assignment.upsert({
      where: { userId_moduleId: { userId: u.id, moduleId: p.data.moduleId } },
      update: { status: 'assigned', dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
      create: { userId: u.id, moduleId: p.data.moduleId, assignedById: me.sub, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
    });
    await prisma.notification.create({ data: { userId: u.id, type: 'assignment', title: 'New training assigned', body: `You have been assigned "${mod.title}".` } });
    { const url = appUrl(); await sendMail(u.email, `New training assigned: ${mod.title}`, brandEmail('New training assigned', `You have been assigned <b>${mod.title}</b>. Please complete it to stay compliant.`, url ? { text: 'Start training', url } : undefined)); }
    assigned++;
  }
  await audit(req, 'assignment.bulk', 'module', p.data.moduleId, { assigned });
  res.status(201).json({ data: { assigned } });
});

// Unassign
router.delete('/assignments/:id', requireRole('manager'), async (req, res) => {
  const a = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  await prisma.assignment.delete({ where: { id: a.id } });
  await audit(req, 'assignment.delete', 'assignment', a.id);
  res.json({ data: { deleted: true } });
});

// ---------------------------------------------------------------------------
// Module edit / archive / delete
// ---------------------------------------------------------------------------
const moduleEditSchema = z.object({
  title: z.string().min(2).optional(), description: z.string().min(2).optional(), category: z.string().optional(),
  passThreshold: z.number().min(0).max(100).optional(), isMandatory: z.boolean().optional(),
  validityDays: z.number().int().min(0).nullable().optional(), status: z.enum(['draft', 'published', 'archived']).optional(),
});
router.patch('/modules/:id', requireRole('admin'), async (req, res) => {
  const p = moduleEditSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const exists = await prisma.trainingModule.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'Module not found' });
  const m = await prisma.trainingModule.update({ where: { id: req.params.id }, data: p.data });
  if (p.data.passThreshold !== undefined) await prisma.assessment.updateMany({ where: { moduleId: m.id }, data: { passingScore: p.data.passThreshold } });
  await audit(req, 'module.update', 'module', m.id);
  res.json({ data: m });
});
router.delete('/modules/:id', requireRole('admin'), async (req, res) => {
  const m = await prisma.trainingModule.findUnique({ where: { id: req.params.id } });
  if (!m) return res.status(404).json({ error: 'Module not found' });
  const certs = await prisma.certificate.count({ where: { moduleId: m.id } });
  if (certs > 0) return res.status(409).json({ error: 'This module has issued certificates. Archive it instead of deleting (keeps compliance records).' });
  await prisma.trainingModule.delete({ where: { id: m.id } });
  await audit(req, 'module.delete', 'module', m.id);
  res.json({ data: { deleted: true } });
});

// ---------------------------------------------------------------------------
// Video edit / delete
// ---------------------------------------------------------------------------
const videoEditSchema = z.object({ title: z.string().min(1).optional(), durationSeconds: z.number().min(1).optional(), sourceUrl: z.string().url().optional(), orderIndex: z.number().int().min(0).optional() });
router.patch('/videos/:id', requireRole('admin'), async (req, res) => {
  const p = videoEditSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const exists = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'Video not found' });
  const v = await prisma.video.update({ where: { id: req.params.id }, data: p.data });
  await audit(req, 'video.update', 'video', v.id);
  res.json({ data: v });
});
router.delete('/videos/:id', requireRole('admin'), async (req, res) => {
  const v = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!v) return res.status(404).json({ error: 'Video not found' });
  await prisma.video.delete({ where: { id: v.id } });
  await audit(req, 'video.delete', 'video', v.id);
  res.json({ data: { deleted: true } });
});

export default router;
