import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import authRoutes from './routes/auth.js';
import trainingRoutes from './routes/training.js';
import progressRoutes from './routes/progress.js';
import assessmentRoutes from './routes/assessments.js';
import certificateRoutes from './routes/certificates.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import aiRoutes from './routes/ai.js';
import { initDb } from './db.js';
import { bootstrapFirstAdmin } from './seed.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
// Flexible CORS: allow configured origin(s), any localhost (dev), and any *.vercel.app (prod + previews).
const allowedExact = ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return cb(null, true); // same-origin / curl / server-to-server
  if (allowedExact.includes(origin)) return cb(null, true);
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return cb(null, true);
  } catch { /* ignore */ }
  return cb(new Error('Not allowed by CORS'), false);
};
app.use(cors({ origin: corsOrigin as any, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/v1', publicRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', trainingRoutes);
app.use('/api/v1', progressRoutes);
app.use('/api/v1', assessmentRoutes);
app.use('/api/v1', certificateRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', aiRoutes);

// Optionally serve a built frontend from the same origin (if present).
const clientDist = process.env.CLIENT_DIST || path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`[web] serving SPA from ${clientDist}`);
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = Number(err?.status) || 500;
  res.status(status).json({ error: status === 503 ? 'AI is not configured on this server' : status === 502 ? 'AI provider request failed' : 'Internal server error' });
});

initDb()
  .then(() => bootstrapFirstAdmin())
  .then(() => app.listen(PORT, () => { console.log(`API listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`); startScheduler(); }))
  .catch((e) => { console.error('Startup failed:', e); process.exit(1); });
