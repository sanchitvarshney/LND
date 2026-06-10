# LearnGuard — AI Training Management Platform

A full-stack enterprise **learning & compliance training** application: secure login, **unskippable video tracking with server-verified completion**, admin-authored assessments (4 question types), automatic certification with public verification, role-based dashboards, and audit logging.

This is a runnable reference implementation of the system described in the accompanying SRS (`../AI_Training_Platform_SRS.pdf`).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, lucide-react |
| Backend | Node.js + Express + TypeScript, JWT (access + httpOnly refresh), bcryptjs, Zod validation |
| Data | **Switchable driver** — zero-setup JSON store *or* a real database via **Prisma** (SQLite locally, PostgreSQL in production). See `DATABASE.md`. |

> **Two data drivers, one codebase.** By default `DB_DRIVER=file` uses a JSON store so the app runs anywhere with just `npm install` — no database server. To use a real database, run `npm run db:setup` (Prisma + SQLite, no server) or point it at PostgreSQL. Full instructions in **`DATABASE.md`**; the schema lives in `server/prisma/schema.prisma`.

---

## Quick start

You need **Node.js 18+**. Open two terminals.

### 1) Backend (port 4000)

```bash
cd server
npm install
npm run dev
```

On first run it auto-seeds demo data and prints the login accounts. The API is at `http://localhost:4000`.

### 2) Frontend (port 5173)

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend automatically.

### Demo accounts (click to fill on the login screen)

| Role | Email | Password |
|------|-------|----------|
| Learner | `learner@acme.com` | `Learner@123` |
| Manager | `manager@acme.com` | `Manager@123` |
| Admin | `admin@acme.com` | `Admin@123` |

---

## Try the signature flow (as the Learner)

1. Sign in as the learner → **My Dashboard** shows two assigned modules.
2. Open **Information Security Awareness** → **Start training**.
3. In the player, **try to drag the progress bar forward** — it snaps back ("You can't skip ahead"). Forward seeking is disabled; backward review is allowed.
4. Watch to 100%. Completion is **verified on the server** from your watch history — the *Continue to Assessment* button only unlocks when the server confirms full coverage.
5. Take the assessment — it contains all four question types (**MCQ, multiple-select, true/false, short answer**). Answers are graded server-side; answer keys are never sent to the browser.
6. Pass (≥70%) → a **certificate** is issued automatically. Open it, then scan/visit the QR link to see the **public verification** page (`/verify/:hash`).

Then sign in as **Manager** to see team compliance tracking, or **Admin** to see org-wide reports, author new modules/questions, and view the audit log.

---

## How "unskippable" is enforced (defense in depth)

**Client (UX):** the player tracks a high-water mark; a seek-guard snaps playback back if you jump ahead, the native timeline is disabled, right-click is blocked, and accrual pauses when the tab loses focus.

**Server (trust):** the browser is untrusted. The client posts the 1-second bins it has covered; the server maintains the authoritative coverage bitmap per `(user, video)` and **only marks a video complete when it independently confirms 100% coverage** (`POST /videos/:id/complete` returns `409` otherwise). A tampered client cannot mark training complete without the watch evidence existing server-side.

---

## Project structure

```
LearnGuard/
├── server/                     # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts            # app wiring, auto-seed on first boot
│   │   ├── db.ts               # Prisma-compatible file store + mini-ORM
│   │   ├── seed.ts             # demo users, modules, videos, questions
│   │   ├── auth.ts             # JWT sign/verify
│   │   ├── middleware/         # requireAuth, requireRole (RBAC), audit
│   │   └── routes/             # auth, training, progress, assessments,
│   │                           #   certificates, admin/reports, public/verify
│   └── docs/schema.prisma.reference   # production data model (Postgres)
└── client/                     # React + Vite SPA
    └── src/
        ├── components/
        │   ├── SecureVideoPlayer.tsx   # the unskippable player
        │   ├── QuestionRenderer.tsx    # 4 question types
        │   └── Layout.tsx, ui/         # shell + design system
        ├── pages/              # login, dashboards, catalog, player,
        │                       #   assessment, result, certificate, admin…
        └── lib/                # api client (token refresh), auth context
```

## Key API endpoints

```
POST /api/v1/auth/login | /refresh | /logout        Authentication
GET  /api/v1/modules | /modules/:id                 Catalog (role-scoped)
GET/POST /api/v1/videos/:id/progress                Watch-progress sync
POST /api/v1/videos/:id/complete                    Server-verified completion gate
GET  /api/v1/assessments/:id/questions              Sanitized (no answer keys)
POST /api/v1/assessments/:id/attempts               Start (gated on videos done)
POST /api/v1/attempts/:id/submit                    Server-side grading → cert
GET  /api/v1/certificates/me | /certificates/:id    Certificates
GET  /api/v1/verify/:hash                            Public certificate verification
GET  /api/v1/reports/team | /reports/compliance     Manager / admin reporting
GET  /api/v1/audit-logs                              Audit trail (admin)
```

## Production build

```bash
cd client && npm run build      # outputs client/dist (static SPA)
cd server && npm run build      # compiles to server/dist; run with npm start
```

## Notes & next steps

- Seed data lives in `server/data.json` (created on first run, file driver). Delete it to re-seed.
- **Use a real database:** `npm run db:setup` then `npm run db:dev` — see `DATABASE.md` (SQLite locally, PostgreSQL for production).
- For production: use PostgreSQL + Prisma (schema provided), move videos to S3 + CloudFront with signed URLs and HLS, add SSO/MFA, and deploy per Section I of the SRS.
- Sample videos stream from Google's public sample bucket; replace `sourceUrl` values in `seed.ts` with your own content.

© 2026 LearnGuard — reference implementation.
