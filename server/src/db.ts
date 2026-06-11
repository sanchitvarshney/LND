/**
 * Data layer selector.
 *   DB_DRIVER=file   (default)  -> zero-dependency JSON file store (drivers/fileStore)
 *   DB_DRIVER=prisma            -> real PostgreSQL/SQLite/MySQL via Prisma (drivers/prismaClient)
 *
 * No top-level await (so the app loads under CommonJS / Phusion Passenger). Call initDb()
 * once at startup before listening.
 */
import { prisma as fileStore } from './drivers/fileStore.js';

let prisma: any = fileStore;

export async function initDb() {
  if (process.env.DB_DRIVER === 'prisma') {
    const { createPrismaClient } = await import('./drivers/prismaClient.js');
    prisma = await createPrismaClient();
    console.log('[db] using Prisma driver');
  } else {
    console.log('[db] using file-store driver (set DB_DRIVER=prisma to use a real database)');
  }
}

export async function seedIfEmpty(seedFn: () => Promise<void>) {
  const count = await prisma.user.count();
  if (count === 0) return seedFn();
  return Promise.resolve();
}

export { prisma };
