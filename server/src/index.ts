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
import { initDb } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
const allowedOrigins = ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins, credentials: true }));
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
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`)))
  .catch((e) => { console.error('Startup failed:', e); process.exit(1); });
