/**
 * Data layer selector.
 *   DB_DRIVER=file   (default)  -> zero-dependency JSON file store (drivers/fileStore)
 *   DB_DRIVER=prisma            -> real PostgreSQL/SQLite via Prisma (drivers/prismaClient)
 *
 * Routes import { prisma } from './db.js' and never need to know which driver is active —
 * both expose the same Prisma-style API.
 */
import { prisma as fileStore } from './drivers/fileStore.js';

let prisma: any = fileStore;

if (process.env.DB_DRIVER === 'prisma') {
  const mod = await import('./drivers/prismaClient.js');
  prisma = mod.prisma;
  console.log('[db] using Prisma driver');
} else {
  console.log('[db] using file-store driver (set DB_DRIVER=prisma to use a real database)');
}

export { prisma };

// Seed only when there are no users yet (works for both drivers)
export async function seedIfEmpty(seedFn: () => Promise<void>) {
  const count = await prisma.user.count();
  if (count === 0) return seedFn();
  return Promise.resolve();
}
