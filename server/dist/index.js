"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const training_js_1 = __importDefault(require("./routes/training.js"));
const progress_js_1 = __importDefault(require("./routes/progress.js"));
const assessments_js_1 = __importDefault(require("./routes/assessments.js"));
const certificates_js_1 = __importDefault(require("./routes/certificates.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const public_js_1 = __importDefault(require("./routes/public.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const db_js_1 = require("./db.js");
const seed_js_1 = require("./seed.js");
const scheduler_js_1 = require("./scheduler.js");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
// Flexible CORS: allow configured origin(s), any localhost (dev), and any *.vercel.app (prod + previews).
const allowedExact = ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const corsOrigin = (origin, cb) => {
    if (!origin)
        return cb(null, true); // same-origin / curl / server-to-server
    if (allowedExact.includes(origin))
        return cb(null, true);
    try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app'))
            return cb(null, true);
    }
    catch { /* ignore */ }
    return cb(new Error('Not allowed by CORS'), false);
};
app.use((0, cors_1.default)({ origin: corsOrigin, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use('/api/v1', public_js_1.default);
app.use('/api/v1/auth', auth_js_1.default);
app.use('/api/v1', training_js_1.default);
app.use('/api/v1', progress_js_1.default);
app.use('/api/v1', assessments_js_1.default);
app.use('/api/v1', certificates_js_1.default);
app.use('/api/v1', admin_js_1.default);
app.use('/api/v1', ai_js_1.default);
// Optionally serve a built frontend from the same origin (if present).
const clientDist = process.env.CLIENT_DIST || node_path_1.default.join(__dirname, '..', '..', 'client', 'dist');
if (node_fs_1.default.existsSync(clientDist)) {
    app.use(express_1.default.static(clientDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health')
            return next();
        res.sendFile(node_path_1.default.join(clientDist, 'index.html'));
    });
    console.log(`[web] serving SPA from ${clientDist}`);
}
app.use((err, _req, res, _next) => {
    console.error(err);
    const status = Number(err?.status) || 500;
    res.status(status).json({ error: status === 503 ? 'AI is not configured on this server' : status === 502 ? 'AI provider request failed' : 'Internal server error' });
});
(0, db_js_1.initDb)()
    .then(() => (0, seed_js_1.bootstrapFirstAdmin)())
    .then(() => app.listen(PORT, () => { console.log(`API listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`); (0, scheduler_js_1.startScheduler)(); }))
    .catch((e) => { console.error('Startup failed:', e); process.exit(1); });
