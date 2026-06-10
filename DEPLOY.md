# Deploying LearnGuard for real users (Render)

This guide takes the app live on **Render** — it hosts the API, serves the built
frontend from the same origin, and provides a managed PostgreSQL database, all with
automatic HTTPS. Good for a team/company pilot.

## What "going live" gives you
- A public HTTPS URL (e.g. `https://learnguard.onrender.com`) your users can open.
- A real PostgreSQL database (not the local file store).
- The frontend and API on **one origin**, so login cookies work without cross-site issues.

## Cost (verified June 2026 — prices can change)
- **Free** to test: $0. Caveats — the free service **sleeps after 15 min idle** (slow first load) and the **free Postgres is deleted after 30 days**.
- **Real pilot:** ~**$7/mo** web service (always-on) + ~**$6–7/mo** Postgres ≈ **~$14/month**. Frontend is included in the web service. Avoid the per-seat Professional fee by staying on an individual workspace for a small pilot.

---

## Step-by-step (≈15 minutes)

### 1. Put the code on GitHub
```bash
cd LearnGuard
git init && git add . && git commit -m "LearnGuard"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/learnguard.git
git push -u origin main
```

### 2. Create a Render account
Sign up at https://render.com (free, GitHub login is easiest).

### 3. Deploy with the included blueprint
- In Render: **New + → Blueprint** → connect your GitHub repo.
- Render reads `render.yaml` and creates **two** resources automatically:
  - `learnguard-db` (PostgreSQL)
  - `learnguard` (the web service — builds the frontend, builds the API, serves both)
- Secrets `JWT_SECRET` / `JWT_REFRESH_SECRET` are generated for you; `DATABASE_URL` is wired automatically.
- Click **Apply**. First build takes a few minutes.

### 4. Set one variable after the first deploy
- Copy your service URL (e.g. `https://learnguard.onrender.com`).
- In the service's **Environment** tab set `CLIENT_ORIGIN` to that URL → save (it redeploys).

### 5. Open the URL and log in
The database is auto-created (`prisma db push`) and seeded with the demo accounts on
first boot. Sign in with `admin@acme.com / Admin@123`.

> **Important — before real users:** the seed creates demo accounts with known passwords.
> Sign in as admin, create your real users, and change/remove the demo logins. (I can add a
> proper "create user + send invite" admin screen if you want.)

### 6. Keep it always-on (optional, for the pilot)
In Render, change the **web service** plan to **Starter** and the **database** plan to a
paid tier (so it isn't deleted after 30 days). No code changes.

---

## Alternative: self-host with Docker (any VPS)
A `server/Dockerfile` is included. On a server with Docker:
```bash
cd client && npm install && npm run build && cd ..
docker build -f server/Dockerfile -t learnguard .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/learnguard" \
  -e JWT_SECRET="..." -e JWT_REFRESH_SECRET="..." \
  -e CLIENT_ORIGIN="https://your-domain.com" \
  learnguard
```
Put it behind Nginx/Caddy for HTTPS + your domain.

---

## Going further (when the pilot grows)
- **Custom domain + email** notifications (SES/Postmark).
- **Video storage**: move sample videos to S3 + CloudFront with signed URLs (Section C.6 / I of the SRS).
- **SSO / MFA**, rate limiting, and migrations (`prisma migrate`) instead of `db push`.
- Scale the web service plan; add read replicas if needed.

Everything here matches the architecture in `../AI_Training_Platform_SRS.pdf`.
