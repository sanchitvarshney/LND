"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const audit_js_1 = require("../middleware/audit.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
function bins(durationSeconds, binSize) {
    return Math.max(1, Math.ceil(durationSeconds / binSize));
}
function emptyBitmap(n) { return '0'.repeat(n); }
function coverage(bitmap) {
    if (!bitmap.length)
        return 0;
    const filled = bitmap.split('').filter((c) => c === '1').length;
    return (filled / bitmap.length) * 100;
}
// Merge: OR two bitmaps of equal length
function mergeBitmap(a, b) {
    const n = Math.max(a.length, b.length);
    a = a.padEnd(n, '0');
    b = b.padEnd(n, '0');
    let out = '';
    for (let i = 0; i < n; i++)
        out += (a[i] === '1' || b[i] === '1') ? '1' : '0';
    return out;
}
// GET current progress for a video
router.get('/videos/:id/progress', async (req, res) => {
    const video = await db_js_1.prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video)
        return res.status(404).json({ error: 'Video not found' });
    let p = await db_js_1.prisma.userProgress.findUnique({ where: { userId_videoId: { userId: req.user.sub, videoId: video.id } } });
    if (!p) {
        p = await db_js_1.prisma.userProgress.create({
            data: { userId: req.user.sub, videoId: video.id, watchedBitmap: emptyBitmap(bins(video.durationSeconds, video.binSizeSeconds)) },
        });
    }
    res.json({ data: { ...p, totalBins: bins(video.durationSeconds, video.binSizeSeconds), binSize: video.binSizeSeconds } });
});
// POST progress delta: client sends the set of bin indices it has covered since last sync
const progressSchema = zod_1.z.object({
    coveredBins: zod_1.z.array(zod_1.z.number().int().nonnegative()),
    maxPositionSeconds: zod_1.z.number().nonnegative(),
});
router.post('/videos/:id/progress', async (req, res) => {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input' });
    const video = await db_js_1.prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video)
        return res.status(404).json({ error: 'Video not found' });
    const total = bins(video.durationSeconds, video.binSizeSeconds);
    let p = await db_js_1.prisma.userProgress.findUnique({ where: { userId_videoId: { userId: req.user.sub, videoId: video.id } } });
    let bitmap = (p?.watchedBitmap || emptyBitmap(total)).padEnd(total, '0').slice(0, total);
    // Apply covered bins (server is the authority; it only ever ADDS coverage — cannot be "skipped" forward)
    const arr = bitmap.split('');
    for (const idx of parsed.data.coveredBins) {
        if (idx >= 0 && idx < total)
            arr[idx] = '1';
    }
    bitmap = arr.join('');
    const pct = coverage(bitmap);
    // status only advances to video_completed via the /complete endpoint (server-verified)
    const nextStatus = p?.status === 'video_completed' ? 'video_completed' : 'in_progress';
    p = await db_js_1.prisma.userProgress.upsert({
        where: { userId_videoId: { userId: req.user.sub, videoId: video.id } },
        update: {
            watchedBitmap: bitmap, percentComplete: pct,
            maxPositionSeconds: Math.max(p?.maxPositionSeconds ?? 0, Math.floor(parsed.data.maxPositionSeconds)),
            status: nextStatus,
            firstStartedAt: p?.firstStartedAt ?? new Date(),
        },
        create: {
            userId: req.user.sub, videoId: video.id, watchedBitmap: bitmap, percentComplete: pct,
            maxPositionSeconds: Math.floor(parsed.data.maxPositionSeconds), status: 'in_progress', firstStartedAt: new Date(),
        },
    });
    res.json({ data: { percentComplete: pct, maxPositionSeconds: p.maxPositionSeconds, status: p.status, totalBins: total } });
});
// POST complete: server INDEPENDENTLY verifies full coverage before granting completion
router.post('/videos/:id/complete', async (req, res) => {
    const video = await db_js_1.prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video)
        return res.status(404).json({ error: 'Video not found' });
    const total = bins(video.durationSeconds, video.binSizeSeconds);
    const p = await db_js_1.prisma.userProgress.findUnique({ where: { userId_videoId: { userId: req.user.sub, videoId: video.id } } });
    const pct = p ? coverage(p.watchedBitmap.padEnd(total, '0').slice(0, total)) : 0;
    if (pct < 99.999) {
        return res.status(409).json({ error: 'Video not fully watched', percentComplete: pct, message: 'Server records show the full video has not been watched. Completion denied.' });
    }
    const updated = await db_js_1.prisma.userProgress.update({
        where: { userId_videoId: { userId: req.user.sub, videoId: video.id } },
        data: { status: 'video_completed', percentComplete: 100, completedAt: new Date() },
    });
    // mark assignment in_progress
    await db_js_1.prisma.assignment.updateMany({ where: { userId: req.user.sub, moduleId: video.moduleId, status: 'assigned' }, data: { status: 'in_progress' } });
    await (0, audit_js_1.audit)(req, 'video.completed', 'video', video.id, { pct });
    res.json({ data: updated });
});
exports.default = router;
