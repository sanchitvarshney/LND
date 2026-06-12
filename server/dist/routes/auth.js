"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../auth.js");
const auth_js_2 = require("../middleware/auth.js");
const audit_js_1 = require("../middleware/audit.js");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) });
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { email, password } = parsed.data;
    const user = await db_js_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !bcryptjs_1.default.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status !== 'active')
        return res.status(403).json({ error: 'Account is not active' });
    const payload = { sub: user.id, role: user.role, email: user.email, name: user.fullName };
    const accessToken = (0, auth_js_1.signAccess)(payload);
    const refreshToken = (0, auth_js_1.signRefresh)(payload);
    await db_js_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const isProd = process.env.NODE_ENV === 'production';
    // COOKIE_SAMESITE: 'lax' (default, same-site) or 'none' (cross-site: Vercel frontend + separate API domain).
    // 'none' requires Secure (HTTPS). Set COOKIE_SAMESITE=none when frontend and API are on different domains.
    const sameSite = process.env.COOKIE_SAMESITE || 'lax';
    const secure = isProd || sameSite === 'none';
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite, secure, maxAge: 7 * 24 * 3600 * 1000 });
    await (0, audit_js_1.audit)(req, 'auth.login', 'user', user.id);
    res.json({ accessToken, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department } });
});
router.post('/refresh', async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token)
        return res.status(401).json({ error: 'No refresh token' });
    try {
        const u = (0, auth_js_1.verifyRefresh)(token);
        const accessToken = (0, auth_js_1.signAccess)({ sub: u.sub, role: u.role, email: u.email, name: u.name });
        res.json({ accessToken });
    }
    catch {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});
router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ ok: true });
});
router.get('/me', auth_js_2.requireAuth, async (req, res) => {
    const user = await db_js_1.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department, managerId: user.managerId });
});
// First-run setup: is an admin account still needed?
router.get('/setup-status', async (_req, res) => {
    const count = await db_js_1.prisma.user.count();
    res.json({ needsSetup: count === 0 });
});
// Create the very first admin. Allowed ONLY when there are zero users.
const setupSchema = zod_1.z.object({ email: zod_1.z.string().email(), fullName: zod_1.z.string().min(1), password: zod_1.z.string().min(8) });
router.post('/setup', async (req, res) => {
    const count = await db_js_1.prisma.user.count();
    if (count > 0)
        return res.status(403).json({ error: 'Setup already completed' });
    const p = setupSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input. Password must be at least 8 characters.' });
    const user = await db_js_1.prisma.user.create({ data: { email: p.data.email.toLowerCase(), passwordHash: bcryptjs_1.default.hashSync(p.data.password, 10), fullName: p.data.fullName, role: 'admin' } });
    await (0, audit_js_1.audit)(req, 'setup.first_admin', 'user', user.id);
    res.status(201).json({ ok: true });
});
// --- Self-service profile (supportive pages) ---
const profileSchema = zod_1.z.object({ fullName: zod_1.z.string().min(1).max(120).optional(), department: zod_1.z.string().max(120).optional() });
router.patch('/me', auth_js_2.requireAuth, async (req, res) => {
    const p = profileSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'Invalid input' });
    const data = {};
    if (p.data.fullName !== undefined)
        data.fullName = p.data.fullName;
    if (p.data.department !== undefined)
        data.department = p.data.department;
    const user = await db_js_1.prisma.user.update({ where: { id: req.user.sub }, data });
    await (0, audit_js_1.audit)(req, 'profile.update', 'user', user.id);
    res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, department: user.department });
});
const pwSchema = zod_1.z.object({ currentPassword: zod_1.z.string().min(1), newPassword: zod_1.z.string().min(8) });
router.post('/change-password', auth_js_2.requireAuth, async (req, res) => {
    const p = pwSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const user = await db_js_1.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !bcryptjs_1.default.compareSync(p.data.currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    await db_js_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash: bcryptjs_1.default.hashSync(p.data.newPassword, 10) } });
    await (0, audit_js_1.audit)(req, 'profile.change_password', 'user', user.id);
    res.json({ ok: true });
});
exports.default = router;
