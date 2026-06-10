# Using a real database (Prisma → SQLite / PostgreSQL)

The backend ships with a **switchable data layer**:

| `DB_DRIVER` | Storage | Setup |
|-------------|---------|-------|
| `file` (default) | JSON file `server/data.json` | none — works out of the box |
| `prisma` | Real database via Prisma ORM | one-time `npm run db:setup` |

Routes never change — both drivers expose the same Prisma-style API (`server/src/db.ts` picks one at startup based on `DB_DRIVER`).

---

## Option A — SQLite (local, no server to run)

This is the default Prisma target and needs nothing installed besides Node.

```bash
cd server

# 1) one-time: install Prisma, generate client, create the DB, seed it
npm run db:setup

# 2) run the server using the database
npm run db:dev
```

`db:setup` runs: install `prisma` + `@prisma/client` → `prisma generate` → `prisma migrate dev` → seed.
Your data now lives in `server/dev.db` (a real SQLite database with tables, indexes, and migrations under `server/prisma/migrations/`).

Inspect it visually any time with:

```bash
npx prisma studio
```

---

## Option B — PostgreSQL (production)

1. Edit `server/prisma/schema.prisma` and change the datasource provider:

   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Point `DATABASE_URL` in `server/.env` at your Postgres instance:

   ```
   DB_DRIVER="prisma"
   DATABASE_URL="postgresql://user:password@localhost:5432/learnguard?schema=public"
   ```

3. Create the schema and seed:

   ```bash
   cd server
   npm install -D prisma cross-env && npm install @prisma/client
   npx prisma migrate dev --name init
   npm run db:seed
   npm run db:dev
   ```

No application code changes — only the provider line and the connection string.

---

## How the switch works

```
server/src/db.ts                 # selector: reads DB_DRIVER, exports `prisma`
server/src/drivers/fileStore.ts  # the zero-dependency JSON store (default)
server/src/drivers/prismaClient.ts  # real PrismaClient (loaded only when DB_DRIVER=prisma)
server/prisma/schema.prisma      # the data model (SQLite now, Postgres-ready)
```

Switch back to the no-setup file store at any time with `DB_DRIVER=file` (the default) — handy for quick demos.

> **Note:** the automated test suite (`npm test`) and all 57 assertions were validated against the file driver. The Prisma driver uses the identical query API; after `npm run db:setup` you can re-point the suite at the Prisma-backed server (`BASE=http://localhost:4000 npm test`) to confirm parity in your environment.
