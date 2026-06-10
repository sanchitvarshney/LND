import { Request, Response, NextFunction } from 'express';
import { verifyAccess, JwtUser } from '../auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: JwtUser; }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role hierarchy: super_admin > admin > manager > learner
const RANK: Record<string, number> = { super_admin: 4, admin: 3, manager: 2, learner: 1 };

export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (allowed.includes(req.user.role)) return next();
    // allow higher-ranked roles implicitly
    const minRank = Math.min(...allowed.map((r) => RANK[r] ?? 99));
    if ((RANK[req.user.role] ?? 0) >= minRank) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}
