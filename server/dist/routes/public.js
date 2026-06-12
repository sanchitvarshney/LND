"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const router = (0, express_1.Router)();
// Public certificate verification — no authentication required
router.get('/verify/:hash', async (req, res) => {
    const cert = await db_js_1.prisma.certificate.findUnique({ where: { verificationHash: req.params.hash }, include: { user: true, module: true } });
    if (!cert)
        return res.status(404).json({ valid: false, error: 'Certificate not found' });
    const expired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;
    res.json({
        valid: !cert.revoked && !expired,
        status: cert.revoked ? 'revoked' : expired ? 'expired' : 'valid',
        data: { serialNo: cert.serialNo, recipient: cert.user.fullName, module: cert.module.title, score: cert.score, issuedAt: cert.issuedAt, expiresAt: cert.expiresAt },
    });
});
exports.default = router;
