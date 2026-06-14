"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const audit_js_1 = require("../middleware/audit.js");
const ai_js_1 = require("../ai.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
/** Whether AI features are configured — lets the client render setup hints. */
router.get('/ai/status', (_req, res) => {
    res.json({ data: { enabled: (0, ai_js_1.aiEnabled)() } });
});
/* -------------------------------------------------------------------------
 * 1) Learning assistant — module-grounded Q&A
 * ---------------------------------------------------------------------- */
const chatSchema = zod_1.z.object({
    question: zod_1.z.string().min(1).max(2000),
    history: zod_1.z.array(zod_1.z.object({ role: zod_1.z.enum(['user', 'assistant']), content: zod_1.z.string().max(4000) })).max(12).default([]),
});
router.post('/ai/modules/:id/chat', async (req, res, next) => {
    try {
        const p = chatSchema.safeParse(req.body);
        if (!p.success)
            return res.status(400).json({ error: 'Invalid input' });
        const m = await db_js_1.prisma.trainingModule.findUnique({
            where: { id: req.params.id },
            include: { videos: { orderBy: { orderIndex: 'asc' } }, assessment: true },
        });
        if (!m)
            return res.status(404).json({ error: 'Module not found' });
        const progress = await db_js_1.prisma.userProgress.findMany({ where: { userId: req.user.sub, videoId: { in: m.videos.map((v) => v.id) } } });
        const videoLines = m.videos.map((v, i) => {
            const pr = progress.find((x) => x.videoId === v.id);
            const watched = pr?.status === 'video_completed' ? 'completed' : pr?.percentComplete ? `${Math.round(pr.percentComplete)}% watched` : 'not started';
            return `${i + 1}. "${v.title}" (${Math.round(v.durationSeconds / 60)} min, ${watched})`;
        }).join('\n');
        const system = `You are LearnGuard's learning assistant inside an enterprise compliance-training platform.
You help an employee with the training module they are currently taking. Be concise, friendly and practical (2-6 sentences unless asked for detail).

Current module:
Title: ${m.title}
Category: ${m.category}
Description: ${m.description}
Passing score: ${m.passThreshold}%
Videos:
${videoLines || '(none)'}

Rules:
- Ground answers in the module context above. For topic questions, give a helpful general explanation of the concept as it relates to this module's subject.
- You cannot reveal assessment questions or answers. If asked, decline briefly and offer to explain the underlying topics instead.
- Forward-skipping in videos is disabled by design for compliance; completion is verified server-side. Explain this if asked.
- If a question is unrelated to workplace training, politely redirect.`;
        const messages = [...p.data.history, { role: 'user', content: p.data.question }];
        const answer = await (0, ai_js_1.complete)({ system, messages, maxTokens: 600 });
        res.json({ data: { answer } });
    }
    catch (e) {
        next(e);
    }
});
/* -------------------------------------------------------------------------
 * 2) Adaptive review plan after a failed attempt
 * ---------------------------------------------------------------------- */
router.post('/ai/attempts/:id/review-plan', async (req, res, next) => {
    try {
        const attempt = await db_js_1.prisma.quizAttempt.findUnique({
            where: { id: req.params.id },
            include: { responses: true, assessment: { include: { questions: { orderBy: { orderIndex: 'asc' } }, module: { include: { videos: { orderBy: { orderIndex: 'asc' } } } } } } },
        });
        if (!attempt)
            return res.status(404).json({ error: 'Not found' });
        if (attempt.userId !== req.user.sub && req.user.role === 'learner')
            return res.status(403).json({ error: 'Forbidden' });
        const mod = attempt.assessment.module;
        const wrong = attempt.assessment.questions
            .filter((q) => attempt.responses.find((r) => r.questionId === q.id)?.isCorrect === false)
            .map((q, i) => `${i + 1}. ${q.prompt}`);
        const system = `You are a learning coach in an enterprise training platform. An employee failed an assessment and needs a short, encouraging, practical review plan. Never reveal correct answers to specific questions; coach on the underlying topics.`;
        const user = `Module: "${mod.title}" — ${mod.description}
Videos in this module:
${mod.videos.map((v, i) => `${i + 1}. ${v.title} (${Math.round(v.durationSeconds / 60)} min)`).join('\n')}

Score: ${attempt.score}% (needed ${attempt.assessment.passingScore}%).
Topics the employee got wrong (from question prompts):
${wrong.join('\n') || '(none recorded)'}

Write a focused review plan:
- Start with one encouraging sentence.
- List 2-4 specific topics to review, each mapped to the most relevant video by name.
- End with one practical tip for the retake.
Keep it under 140 words. Plain text with simple dashes for the list.`;
        const plan = await (0, ai_js_1.complete)({ system, messages: [{ role: 'user', content: user }], maxTokens: 400 });
        await (0, audit_js_1.audit)(req, 'ai.review_plan', 'attempt', attempt.id, {});
        res.json({ data: { plan } });
    }
    catch (e) {
        next(e);
    }
});
/* -------------------------------------------------------------------------
 * 3) Admin: draft assessment questions with AI
 * ---------------------------------------------------------------------- */
const genSchema = zod_1.z.object({
    count: zod_1.z.number().min(1).max(10).default(5),
    sourceText: zod_1.z.string().max(20000).optional(), // optional transcript / policy text to ground on
});
router.post('/ai/assessments/:id/generate-questions', (0, auth_js_1.requireRole)('admin'), async (req, res, next) => {
    try {
        const p = genSchema.safeParse(req.body);
        if (!p.success)
            return res.status(400).json({ error: 'Invalid input' });
        const assessment = await db_js_1.prisma.assessment.findUnique({
            where: { id: req.params.id },
            include: { module: { include: { videos: { orderBy: { orderIndex: 'asc' } } } } },
        });
        if (!assessment)
            return res.status(404).json({ error: 'Assessment not found' });
        const mod = assessment.module;
        const drafts = await (0, ai_js_1.completeJson)({
            system: `You write rigorous but fair corporate-training assessment questions. Mix types: mostly "mcq", some "true_false", at most one "multi_select" and one "short_answer". For mcq/multi_select provide exactly 4 options with ids "a","b","c","d" and isCorrect flags (mcq: exactly one correct; multi_select: 2-3 correct). true_false uses options "true"/"false" with ids "true","false". short_answer uses answerKey {matchType:"keyword", value:"<2-4 essential keywords comma-separated>", caseSensitive:false}. Each question: prompt, points (1-3 by difficulty), short explanation. Output a JSON array of question objects only.`,
            user: `Create ${p.data.count} assessment questions for this corporate training module.
Module: "${mod.title}" (${mod.category})
Description: ${mod.description}
Video topics: ${mod.videos.map((v) => v.title).join('; ') || '(none)'}
${p.data.sourceText ? `\nGround the questions in this source material:\n---\n${p.data.sourceText.slice(0, 15000)}\n---` : ''}`,
            maxTokens: 2400,
        });
        // light validation/normalisation so the admin UI gets predictable drafts
        const clean = (Array.isArray(drafts) ? drafts : []).filter((d) => d && d.prompt && d.type).slice(0, p.data.count).map((d) => ({
            type: d.type, prompt: String(d.prompt), points: Math.min(3, Math.max(1, Number(d.points) || 1)),
            explanation: d.explanation ? String(d.explanation) : undefined,
            options: Array.isArray(d.options) ? d.options.map((o, i) => {
                const id = o && o.id != null ? String(o.id) : String.fromCharCode(97 + i);
                const rawLabel = typeof o === 'string' ? o : (o.label ?? o.text ?? o.option ?? o.value ?? o.answer ?? o.choice ?? o.title ?? o.content ?? '');
                const isCorrect = !!(o && (o.isCorrect ?? o.correct ?? o.is_correct ?? o.right));
                return { id, label: String(rawLabel), isCorrect };
            }) : undefined,
            answerKey: d.answerKey ? { matchType: 'keyword', value: String(d.answerKey.value), caseSensitive: false } : undefined,
        }));
        await (0, audit_js_1.audit)(req, 'ai.generate_questions', 'assessment', assessment.id, { count: clean.length });
        res.json({ data: { questions: clean } });
    }
    catch (e) {
        next(e);
    }
});
/* -------------------------------------------------------------------------
 * 4) Manager/admin: compliance digest
 * ---------------------------------------------------------------------- */
router.get('/ai/digest', (0, auth_js_1.requireRole)('manager'), async (req, res, next) => {
    try {
        const me = req.user;
        const team = me.role === 'manager'
            ? await db_js_1.prisma.user.findMany({ where: { managerId: me.sub } })
            : await db_js_1.prisma.user.findMany({ where: { role: 'learner' } });
        const rows = [];
        for (const u of team) {
            const assignments = await db_js_1.prisma.assignment.findMany({ where: { userId: u.id }, include: { module: true } });
            const completed = assignments.filter((a) => a.status === 'completed').length;
            const overdueList = assignments.filter((a) => a.dueAt && a.dueAt < new Date() && a.status !== 'completed');
            const dueSoon = assignments.filter((a) => a.dueAt && a.dueAt >= new Date() && a.dueAt < new Date(Date.now() + 7 * 86400000) && a.status !== 'completed');
            rows.push({
                name: u.fullName, department: u.department || '-', assigned: assignments.length, completed,
                overdue: overdueList.map((a) => a.module.title), dueSoon: dueSoon.map((a) => a.module.title),
            });
        }
        const system = `You are an L&D operations analyst. Write crisp, actionable compliance digests for a manager. No fluff, no greetings.`;
        const user = `Team training status (JSON):
${JSON.stringify(rows).slice(0, 12000)}

Write a digest with:
- One-line overall health summary (compliance level, trend-free).
- "Needs attention": people with overdue items (name — module(s), why it matters). Omit if none.
- "Due this week": brief list. Omit if none.
- One recommended next action for the manager.
Under 160 words. Plain text, simple dashes.`;
        const digest = await (0, ai_js_1.complete)({ system, messages: [{ role: 'user', content: user }], maxTokens: 450 });
        res.json({ data: { digest, generatedAt: new Date().toISOString() } });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
