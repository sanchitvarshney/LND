import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import crypto from 'node:crypto';
import { sendMail, brandEmail, appUrl } from '../mailer.js';

const router = Router();
router.use(requireAuth);

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Get questions for an assessment. Learners get a SANITIZED version (no answer keys).
router.get('/assessments/:id/questions', async (req, res) => {
  const a = await prisma.assessment.findUnique({ where: { id: req.params.id }, include: { questions: { orderBy: { orderIndex: 'asc' } }, module: true } });
  if (!a) return res.status(404).json({ error: 'Assessment not found' });
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';

  const questions = a.questions.map((q) => {
    const base = { id: q.id, type: q.type, prompt: q.prompt, points: q.points, orderIndex: q.orderIndex };
    const options = q.optionsJson ? JSON.parse(q.optionsJson) : [];
    if (isAdmin) {
      return { ...base, explanation: q.explanation, options, answerKey: q.answerKeyJson ? JSON.parse(q.answerKeyJson) : null, requiresManual: q.requiresManual };
    }
    // learner view: strip isCorrect + answer keys
    return { ...base, options: options.map((o: any) => ({ id: o.id, label: o.label })) };
  });
  let outQuestions = questions;
  if (!isAdmin && a.shuffleQuestions) {
    outQuestions = shuffle(questions).map((q: any) => (q.options ? { ...q, options: shuffle(q.options) } : q));
  }
  res.json({ data: { id: a.id, title: a.title, passingScore: a.passingScore, maxAttempts: a.maxAttempts, timeLimitSeconds: a.timeLimitSeconds, shuffleQuestions: a.shuffleQuestions, moduleId: a.moduleId, showAnswers: a.showAnswers, questions: outQuestions } });
});

// Start an attempt — gated on all module videos completed + attempt limit
router.post('/assessments/:id/attempts', async (req, res) => {
  const a = await prisma.assessment.findUnique({ where: { id: req.params.id }, include: { module: { include: { videos: true } } } });
  if (!a) return res.status(404).json({ error: 'Assessment not found' });

  const progress = await prisma.userProgress.findMany({ where: { userId: req.user!.sub, videoId: { in: a.module.videos.map((v) => v.id) } } });
  const allWatched = a.module.videos.length > 0 && a.module.videos.every((v) => progress.find((p) => p.videoId === v.id)?.status === 'video_completed');
  if (!allWatched) return res.status(403).json({ error: 'You must watch all videos before taking the assessment.' });

  const prior = await prisma.quizAttempt.count({ where: { userId: req.user!.sub, assessmentId: a.id } });
  if (prior >= a.maxAttempts) return res.status(403).json({ error: 'Maximum attempts reached.' });

  const attempt = await prisma.quizAttempt.create({ data: { userId: req.user!.sub, assessmentId: a.id, attemptNo: prior + 1, status: 'in_progress' } });
  await audit(req, 'attempt.start', 'attempt', attempt.id);
  res.status(201).json({ data: { attemptId: attempt.id, attemptNo: attempt.attemptNo, timeLimitSeconds: a.timeLimitSeconds } });
});

// Grade helpers
function gradeChoice(q: any, response: string[]): { correct: boolean } {
  const opts = JSON.parse(q.optionsJson || '[]');
  const correctIds = opts.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
  const given = [...response].sort();
  return { correct: correctIds.length === given.length && correctIds.every((id: string, i: number) => id === given[i]) };
}
function gradeShort(q: any, text: string): { correct: boolean } {
  if (!q.answerKeyJson) return { correct: false };
  const key = JSON.parse(q.answerKeyJson);
  let hay = text || ''; let needle = key.value || '';
  if (!key.caseSensitive) { hay = hay.toLowerCase(); needle = needle.toLowerCase(); }
  if (key.matchType === 'exact') return { correct: hay.trim() === needle.trim() };
  if (key.matchType === 'regex') { try { return { correct: new RegExp(key.value, key.caseSensitive ? '' : 'i').test(text) }; } catch { return { correct: false }; } }
  return { correct: hay.includes(needle) }; // keyword
}

const submitSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), response: z.union([z.array(z.string()), z.string(), z.boolean()]) })),
});

router.post('/attempts/:id/submit', async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: req.params.id }, include: { assessment: { include: { questions: true, module: true } } } });
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.userId !== req.user!.sub) return res.status(403).json({ error: 'Forbidden' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already submitted' });

  const questions = attempt.assessment.questions;
  let totalPoints = 0, earned = 0;
  const responseRows = [] as any[];

  for (const q of questions) {
    totalPoints += q.points;
    const given = parsed.data.answers.find((x) => x.questionId === q.id);
    let correct = false;
    let responseVal: any = given?.response ?? null;
    if (given) {
      if (q.type === 'short_answer') {
        correct = gradeShort(q, String(given.response)).correct;
      } else if (q.type === 'true_false') {
        const r = Array.isArray(given.response) ? given.response : [String(given.response)];
        correct = gradeChoice(q, r).correct;
        responseVal = r;
      } else {
        const r = Array.isArray(given.response) ? given.response : [String(given.response)];
        correct = gradeChoice(q, r).correct;
        responseVal = r;
      }
    }
    const pts = correct ? q.points : 0;
    earned += pts;
    responseRows.push({ attemptId: attempt.id, questionId: q.id, responseJson: JSON.stringify(responseVal), isCorrect: correct, pointsAwarded: pts });
  }

  const score = totalPoints ? Math.round((earned / totalPoints) * 100) : 0;
  const passed = score >= attempt.assessment.passingScore;

  await prisma.quizResponse.createMany({ data: responseRows });
  await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { score, passed, status: 'graded', submittedAt: new Date() } });

  let certificate: any = null;
  if (passed) {
    // mark assignment complete
    await prisma.assignment.updateMany({ where: { userId: req.user!.sub, moduleId: attempt.assessment.moduleId }, data: { status: 'completed', completedAt: new Date() } });
    // issue certificate (idempotent-ish: one per user+module)
    const existing = await prisma.certificate.findFirst({ where: { userId: req.user!.sub, moduleId: attempt.assessment.moduleId, revoked: false } });
    if (!existing) {
      const serial = 'CERT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
      const hash = crypto.createHash('sha256').update(serial + req.user!.sub + attempt.assessment.moduleId).digest('hex');
      const mod = attempt.assessment.module;
      const expiresAt = mod.validityDays ? new Date(Date.now() + mod.validityDays * 86400000) : null;
      certificate = await prisma.certificate.create({ data: { userId: req.user!.sub, moduleId: attempt.assessment.moduleId, attemptId: attempt.id, serialNo: serial, verificationHash: hash, score, expiresAt } });
      await prisma.notification.create({ data: { userId: req.user!.sub, type: 'completed', title: 'Training completed', body: `You passed ${mod.title}. Your certificate is ready.` } });
      { const learner = await prisma.user.findUnique({ where: { id: req.user!.sub } }); const url = appUrl();
        await sendMail(learner?.email, `Certificate issued: ${mod.title}`, brandEmail('Congratulations — training complete', `You passed <b>${mod.title}</b> with a score of <b>${score}%</b>. Your certificate (No. ${serial}) is ready.`, url ? { text: 'View certificate', url: url + '/certificates' } : undefined)); }
    } else {
      certificate = existing;
    }
  }
  await audit(req, 'attempt.submit', 'attempt', attempt.id, { score, passed });
  res.json({ data: { attemptId: attempt.id, score, passed, passingScore: attempt.assessment.passingScore, certificateId: certificate?.id ?? null } });
});

// Result detail (with correctness + explanations if enabled)
router.get('/attempts/:id', async (req, res) => {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: req.params.id }, include: { responses: true, assessment: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } } });
  if (!attempt) return res.status(404).json({ error: 'Not found' });
  if (attempt.userId !== req.user!.sub && req.user!.role === 'learner') return res.status(403).json({ error: 'Forbidden' });
  const showAnswers = attempt.assessment.showAnswers;
  const details = attempt.assessment.questions.map((q) => {
    const r = attempt.responses.find((x) => x.questionId === q.id);
    const opts = q.optionsJson ? JSON.parse(q.optionsJson) : [];
    return {
      id: q.id, type: q.type, prompt: q.prompt, points: q.points,
      yourResponse: r ? JSON.parse(r.responseJson) : null,
      isCorrect: r?.isCorrect ?? false,
      explanation: showAnswers ? q.explanation : null,
      correctOptions: showAnswers ? opts.filter((o: any) => o.isCorrect).map((o: any) => o.id) : null,
      options: opts.map((o: any) => ({ id: o.id, label: o.label })),
    };
  });
  res.json({ data: { id: attempt.id, score: attempt.score, passed: attempt.passed, attemptNo: attempt.attemptNo, questions: details } });
});

// Admin: create a question
const questionSchema = z.object({
  type: z.enum(['mcq', 'multi_select', 'true_false', 'short_answer']),
  prompt: z.string().min(2), points: z.number().min(1).default(1), explanation: z.string().optional(),
  options: z.array(z.object({ id: z.string(), label: z.string(), isCorrect: z.boolean() })).optional(),
  answerKey: z.object({ matchType: z.enum(['exact', 'keyword', 'regex']), value: z.string(), caseSensitive: z.boolean().default(false) }).optional(),
});
router.post('/assessments/:id/questions', requireRole('admin'), async (req, res) => {
  const p = questionSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input', details: p.error.flatten() });
  const count = await prisma.question.count({ where: { assessmentId: req.params.id } });
  const q = await prisma.question.create({
    data: {
      assessmentId: req.params.id, type: p.data.type, prompt: p.data.prompt, points: p.data.points,
      explanation: p.data.explanation, orderIndex: count,
      optionsJson: p.data.options ? JSON.stringify(p.data.options) : null,
      answerKeyJson: p.data.answerKey ? JSON.stringify(p.data.answerKey) : null,
      requiresManual: false,
    },
  });
  await audit(req, 'question.create', 'question', q.id);
  res.status(201).json({ data: q });
});

// Admin: assessment settings (passing score, attempts, timer, shuffle, show answers)
const assessmentSettingsSchema = z.object({
  title: z.string().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  timeLimitSeconds: z.number().int().min(0).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  showAnswers: z.boolean().optional(),
});
router.patch('/assessments/:id', requireRole('admin'), async (req, res) => {
  const p = assessmentSettingsSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const exists = await prisma.assessment.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'Assessment not found' });
  const data: any = { ...p.data };
  if (data.timeLimitSeconds === 0) data.timeLimitSeconds = null;
  const a = await prisma.assessment.update({ where: { id: req.params.id }, data });
  await audit(req, 'assessment.update', 'assessment', a.id);
  res.json({ data: a });
});

// Admin: edit a question
router.patch('/questions/:id', requireRole('admin'), async (req, res) => {
  const p = questionSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const exists = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: 'Question not found' });
  const data: any = {};
  if (p.data.type !== undefined) data.type = p.data.type;
  if (p.data.prompt !== undefined) data.prompt = p.data.prompt;
  if (p.data.points !== undefined) data.points = p.data.points;
  if (p.data.explanation !== undefined) data.explanation = p.data.explanation;
  if (p.data.options !== undefined) data.optionsJson = JSON.stringify(p.data.options);
  if (p.data.answerKey !== undefined) data.answerKeyJson = JSON.stringify(p.data.answerKey);
  const q = await prisma.question.update({ where: { id: req.params.id }, data });
  await audit(req, 'question.update', 'question', q.id);
  res.json({ data: q });
});

// Admin: delete a question
router.delete('/questions/:id', requireRole('admin'), async (req, res) => {
  const q = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: 'Question not found' });
  await prisma.question.delete({ where: { id: req.params.id } });
  await audit(req, 'question.delete', 'question', q.id);
  res.json({ data: { deleted: true } });
});

export default router;
