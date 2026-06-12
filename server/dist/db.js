"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.initDb = initDb;
exports.seedIfEmpty = seedIfEmpty;
/**
 * Data layer selector.
 *   DB_DRIVER=file   (default)  -> zero-dependency JSON file store (drivers/fileStore)
 *   DB_DRIVER=prisma            -> real PostgreSQL/SQLite/MySQL via Prisma (drivers/prismaClient)
 *
 * No top-level await (so the app loads under CommonJS / Phusion Passenger). Call initDb()
 * once at startup before listening.
 */
const fileStore_js_1 = require("./drivers/fileStore.js");
let prisma = fileStore_js_1.prisma;
exports.prisma = prisma;
async function initDb() {
    if (process.env.DB_DRIVER === 'prisma') {
        const { createPrismaClient } = await Promise.resolve().then(() => __importStar(require('./drivers/prismaClient.js')));
        exports.prisma = prisma = await createPrismaClient();
        // Auto-create tables on first boot (the running app has DATABASE_URL in its env).
        try {
            await prisma.user.count();
        }
        catch {
            console.log('[db] tables missing — running `prisma db push` to create the schema...');
            const { execSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
            try {
                execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
                console.log('[db] schema created.');
            }
            catch (e) {
                console.error('[db] prisma db push failed:', e);
            }
        }
        console.log('[db] using Prisma driver');
    }
    else {
        console.log('[db] using file-store driver (set DB_DRIVER=prisma to use a real database)');
    }
}
async function seedIfEmpty(seedFn) {
    const count = await prisma.user.count();
    if (count === 0)
        return seedFn();
    return Promise.resolve();
}
