import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

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
  const filtered = u.role === 'learner' ? result.filter((m) => m.assignment) : result;
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
  const a = await prisma.assignment.upsert({
    where: { userId_moduleId: { userId: p.data.userId, moduleId: p.data.moduleId } },
    update: { dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined, status: 'assigned' },
    create: { userId: p.data.userId, moduleId: p.data.moduleId, assignedById: req.user!.sub, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
  });
  await prisma.notification.create({ data: { userId: p.data.userId, type: 'assignment', title: 'New training assigned', body: 'You have a new training module to complete.' } });
  await audit(req, 'assignment.create', 'assignment', a.id);
  res.status(201).json({ data: a });
});

export default router;
