"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const db_js_1 = require("../db.js");
async function audit(req, action, entityType, entityId, meta) {
    try {
        await db_js_1.prisma.auditLog.create({
            data: {
                actorId: req.user?.sub ?? null,
                action, entityType, entityId,
                metaJson: meta ? JSON.stringify(meta) : null,
                ip: req.ip,
            },
        });
    }
    catch { /* never block request on audit failure */ }
}
