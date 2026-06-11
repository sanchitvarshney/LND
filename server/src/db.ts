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
    // Auto-create tables on first boot (the running app has DATABASE_URL in its env).
    try {
      await prisma.user.count();
    } catch {
      console.log('[db] tables missing — running `prisma db push` to create the schema...');
      const { execSync } = await import('node:child_process');
      try {
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
        console.log('[db] schema created.');
      } catch (e) {
        console.error('[db] prisma db push failed:', e);
      }
    }
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
