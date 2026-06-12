"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_js_1 = require("../auth.js");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token)
        return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = (0, auth_js_1.verifyAccess)(token);
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
// Role hierarchy: super_admin > admin > manager > learner
const RANK = { super_admin: 4, admin: 3, manager: 2, learner: 1 };
function requireRole(...allowed) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Authentication required' });
        if (allowed.includes(req.user.role))
            return next();
        // allow higher-ranked roles implicitly
        const minRank = Math.min(...allowed.map((r) => RANK[r] ?? 99));
        if ((RANK[req.user.role] ?? 0) >= minRank)
            return next();
        return res.status(403).json({ error: 'Insufficient permissions' });
    };
}
