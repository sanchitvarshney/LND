import { prisma } from '../db.js';
import { Request } from 'express';

export async function audit(req: Request, action: string, entityType?: string, entityId?: string, meta?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.sub ?? null,
        action, entityType, entityId,
        metaJson: meta ? JSON.stringify(meta) : null,
        ip: req.ip,
      },
    });
  } catch { /* never block request on audit failure */ }
}
