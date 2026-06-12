"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
router.get('/certificates/me', async (req, res) => {
    const certs = await db_js_1.prisma.certificate.findMany({ where: { userId: req.user.sub }, include: { module: true }, orderBy: { issuedAt: 'desc' } });
    res.json({ data: certs });
});
router.get('/certificates/:id', async (req, res) => {
    const cert = await db_js_1.prisma.certificate.findUnique({ where: { id: req.params.id }, include: { user: true, module: true } });
    if (!cert)
        return res.status(404).json({ error: 'Not found' });
    if (cert.userId !== req.user.sub && req.user.role === 'learner')
        return res.status(403).json({ error: 'Forbidden' });
    res.json({ data: cert });
});
exports.default = router;
