"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const audit_js_1 = require("../middleware/audit.js");
const mailer_js_1 = require("../mailer.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
// Catalog: learners see assigned + published; admins see all
router.get('/modules', async (req, res) => {
    const u = req.user;
    const modules = await db_js_1.prisma.trainingModule.findMany({
        include: { videos: { orderBy: { orderIndex: 'asc' } }, assessment: { include: { questions: true } }, _count: { select: { videos: true } } },
        orderBy: { createdAt: 'asc' },
    });
    // Attach the current user's assignment + progress summary
    const assignments = await db_js_1.prisma.assignment.findMany({ where: { userId: u.sub } });
    const progress = await db_js_1.prisma.userProgress.findMany({ where: { userId: u.sub } });
    const attempts = await db_js_1.prisma.quizAttempt.findMany({ where: { userId: u.sub } });
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
    const u = req.user;
    const m = await db_js_1.prisma.trainingModule.findUnique({
        where: { id: req.params.id },
        include: { videos: { orderBy: { orderIndex: 'asc' } }, assessment: true },
    });
    if (!m)
        return res.status(404).json({ error: 'Module not found' });
    const progress = await db_js_1.prisma.userProgress.findMany({ where: { userId: u.sub, videoId: { in: m.videos.map((v) => v.id) } } });
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
const moduleSchema = zod_1.z.object({
    title: zod_1.z.string().min(2), description: zod_1.z.string().min(2), category: zod_1.z.string().default('Compliance'),
    passThreshold: zod_1.z.number().min(0).max(100).default(70), isMandatory: zod_1.z.boolean().default(true),
});
router.post('/modules', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const p = moduleSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input', details: p.error.flatten() });
    const m = await db_js_1.prisma.trainingModule.create({ data: { ...p.data, createdById: req.user.sub } });
    await db_js_1.prisma.assessment.create({ data: { moduleId: m.id, passingScore: p.data.passThreshold } });
    await (0, audit_js_1.audit)(req, 'module.create', 'module', m.id, { title: m.title });
    res.status(201).json({ data: m });
});
// Admin: add video to module
const videoSchema = zod_1.z.object({ title: zod_1.z.string().min(1), durationSeconds: zod_1.z.number().min(1), sourceUrl: zod_1.z.string().url() });
router.post('/modules/:id/videos', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const p = videoSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const count = await db_js_1.prisma.video.count({ where: { moduleId: req.params.id } });
    const v = await db_js_1.prisma.video.create({ data: { ...p.data, moduleId: req.params.id, orderIndex: count } });
    await (0, audit_js_1.audit)(req, 'video.create', 'video', v.id);
    res.status(201).json({ data: v });
});
// Assignments for current learner
router.get('/assignments/me', async (req, res) => {
    const assignments = await db_js_1.prisma.assignment.findMany({
        where: { userId: req.user.sub },
        include: { module: { include: { videos: true, assessment: { include: { questions: true } } } } },
        orderBy: { dueAt: 'asc' },
    });
    res.json({ data: assignments });
});
// Admin/Manager: assign a module
const assignSchema = zod_1.z.object({ userId: zod_1.z.string(), moduleId: zod_1.z.string(), dueAt: zod_1.z.string().optional() });
router.post('/assignments', (0, auth_js_1.requireRole)('manager'), async (req, res) => {
    const p = assignSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const mod0 = await db_js_1.prisma.trainingModule.findUnique({ where: { id: p.data.moduleId } });
    if (!mod0)
        return res.status(404).json({ error: 'Module not found' });
    if (mod0.status === 'archived')
        return res.status(400).json({ error: 'Cannot assign an archived module.' });
    if (req.user.role === 'manager') {
        const target = await db_js_1.prisma.user.findUnique({ where: { id: p.data.userId } });
        if (!target || target.managerId !== req.user.sub)
            return res.status(403).json({ error: 'You can only assign training to your own team.' });
    }
    const a = await db_js_1.prisma.assignment.upsert({
        where: { userId_moduleId: { userId: p.data.userId, moduleId: p.data.moduleId } },
        update: { dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined, status: 'assigned' },
        create: { userId: p.data.userId, moduleId: p.data.moduleId, assignedById: req.user.sub, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
    });
    await db_js_1.prisma.notification.create({ data: { userId: p.data.userId, type: 'assignment', title: 'New training assigned', body: `You have been assigned "${mod0.title}".` } });
    {
        const u = await db_js_1.prisma.user.findUnique({ where: { id: p.data.userId } });
        const url = (0, mailer_js_1.appUrl)();
        await (0, mailer_js_1.sendMail)(u?.email, `New training assigned: ${mod0.title}`, (0, mailer_js_1.brandEmail)('New training assigned', `You have been assigned <b>${mod0.title}</b>${a.dueAt ? ', due <b>' + new Date(a.dueAt).toDateString() + '</b>' : ''}. Please complete it to stay compliant.`, url ? { text: 'Start training', url } : undefined));
    }
    await (0, audit_js_1.audit)(req, 'assignment.create', 'assignment', a.id);
    res.status(201).json({ data: a });
});
// ---------------------------------------------------------------------------
// Bulk / group assignment (admin: anyone; manager: own team)
// ---------------------------------------------------------------------------
const bulkSchema = zod_1.z.object({
    moduleId: zod_1.z.string(),
    dueAt: zod_1.z.string().optional(),
    userIds: zod_1.z.array(zod_1.z.string()).optional(),
    role: zod_1.z.enum(['learner', 'manager']).optional(),
    department: zod_1.z.string().optional(),
    all: zod_1.z.boolean().optional(),
});
router.post('/assignments/bulk', (0, auth_js_1.requireRole)('manager'), async (req, res) => {
    const p = bulkSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const me = req.user;
    const mod = await db_js_1.prisma.trainingModule.findUnique({ where: { id: p.data.moduleId } });
    if (!mod)
        return res.status(404).json({ error: 'Module not found' });
    if (mod.status === 'archived')
        return res.status(400).json({ error: 'Cannot assign an archived module.' });
    const where = { status: 'active' };
    if (p.data.userIds && p.data.userIds.length)
        where.id = { in: p.data.userIds };
    else {
        where.role = p.data.role ? p.data.role : { in: ['learner', 'manager'] };
        if (p.data.department)
            where.department = p.data.department;
    }
    if (me.role === 'manager')
        where.managerId = me.sub; // managers limited to their own team
    const users = await db_js_1.prisma.user.findMany({ where });
    let assigned = 0;
    for (const u of users) {
        await db_js_1.prisma.assignment.upsert({
            where: { userId_moduleId: { userId: u.id, moduleId: p.data.moduleId } },
            update: { status: 'assigned', dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
            create: { userId: u.id, moduleId: p.data.moduleId, assignedById: me.sub, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined },
        });
        await db_js_1.prisma.notification.create({ data: { userId: u.id, type: 'assignment', title: 'New training assigned', body: `You have been assigned "${mod.title}".` } });
        {
            const url = (0, mailer_js_1.appUrl)();
            await (0, mailer_js_1.sendMail)(u.email, `New training assigned: ${mod.title}`, (0, mailer_js_1.brandEmail)('New training assigned', `You have been assigned <b>${mod.title}</b>. Please complete it to stay compliant.`, url ? { text: 'Start training', url } : undefined));
        }
        assigned++;
    }
    await (0, audit_js_1.audit)(req, 'assignment.bulk', 'module', p.data.moduleId, { assigned });
    res.status(201).json({ data: { assigned } });
});
// Unassign
router.delete('/assignments/:id', (0, auth_js_1.requireRole)('manager'), async (req, res) => {
    const a = await db_js_1.prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!a)
        return res.status(404).json({ error: 'Assignment not found' });
    await db_js_1.prisma.assignment.delete({ where: { id: a.id } });
    await (0, audit_js_1.audit)(req, 'assignment.delete', 'assignment', a.id);
    res.json({ data: { deleted: true } });
});
// ---------------------------------------------------------------------------
// Module edit / archive / delete
// ---------------------------------------------------------------------------
const moduleEditSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(), description: zod_1.z.string().min(2).optional(), category: zod_1.z.string().optional(),
    passThreshold: zod_1.z.number().min(0).max(100).optional(), isMandatory: zod_1.z.boolean().optional(),
    validityDays: zod_1.z.number().int().min(0).nullable().optional(), status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
});
router.patch('/modules/:id', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const p = moduleEditSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const exists = await db_js_1.prisma.trainingModule.findUnique({ where: { id: req.params.id } });
    if (!exists)
        return res.status(404).json({ error: 'Module not found' });
    const m = await db_js_1.prisma.trainingModule.update({ where: { id: req.params.id }, data: p.data });
    if (p.data.passThreshold !== undefined)
        await db_js_1.prisma.assessment.updateMany({ where: { moduleId: m.id }, data: { passingScore: p.data.passThreshold } });
    await (0, audit_js_1.audit)(req, 'module.update', 'module', m.id);
    res.json({ data: m });
});
router.delete('/modules/:id', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const m = await db_js_1.prisma.trainingModule.findUnique({ where: { id: req.params.id } });
    if (!m)
        return res.status(404).json({ error: 'Module not found' });
    const certs = await db_js_1.prisma.certificate.count({ where: { moduleId: m.id } });
    if (certs > 0)
        return res.status(409).json({ error: 'This module has issued certificates. Archive it instead of deleting (keeps compliance records).' });
    await db_js_1.prisma.trainingModule.delete({ where: { id: m.id } });
    await (0, audit_js_1.audit)(req, 'module.delete', 'module', m.id);
    res.json({ data: { deleted: true } });
});
// ---------------------------------------------------------------------------
// Video edit / delete
// ---------------------------------------------------------------------------
const videoEditSchema = zod_1.z.object({ title: zod_1.z.string().min(1).optional(), durationSeconds: zod_1.z.number().min(1).optional(), sourceUrl: zod_1.z.string().url().optional(), orderIndex: zod_1.z.number().int().min(0).optional() });
router.patch('/videos/:id', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const p = videoEditSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const exists = await db_js_1.prisma.video.findUnique({ where: { id: req.params.id } });
    if (!exists)
        return res.status(404).json({ error: 'Video not found' });
    const v = await db_js_1.prisma.video.update({ where: { id: req.params.id }, data: p.data });
    await (0, audit_js_1.audit)(req, 'video.update', 'video', v.id);
    res.json({ data: v });
});
router.delete('/videos/:id', (0, auth_js_1.requireRole)('admin'), async (req, res) => {
    const v = await db_js_1.prisma.video.findUnique({ where: { id: req.params.id } });
    if (!v)
        return res.status(404).json({ error: 'Video not found' });
    await db_js_1.prisma.video.delete({ where: { id: v.id } });
    await (0, audit_js_1.audit)(req, 'video.delete', 'video', v.id);
    res.json({ data: { deleted: true } });
});
exports.default = router;
