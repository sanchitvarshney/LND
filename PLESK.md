# Hosting LearnGuard on your company Plesk (mscorpres.net)

## ✅ Confirmed: your Plesk supports Node.js
Checked directly in your panel — `bperealtime.mscorpres.net` shows **Node.js v21.7.3** in Dev Tools
(your other Node apps run this way). You also have **MariaDB** (`localhost:3306`) and **Git**.
So the **backend can run on Plesk for free** using the same setup as your existing Node projects —
no need to contact the host.

> The main `mscorpres.net` domain doesn't show the Node.js card because it's configured as a PHP
> site. Node.js appears per domain/subdomain — your new subdomain will have it.

Plan: **backend → a new subdomain on Plesk (Node.js + MariaDB). Frontend → Vercel (free).**

---

## Part 1 — Backend on Plesk

### 1. Create a subdomain for the API
Websites & Domains → **Add Subdomain** → e.g. `api.mscorpres.net`. (A subdomain of mscorpres.net
also keeps cookies same-site with a Vercel custom domain later, if you use one.)

### 2. Create a MariaDB database
Databases → **Add Database** → name `learnguard`, add a DB user + password. Your connection string:
```
mysql://DBUSER:DBPASSWORD@localhost:3306/learnguard
```

### 3. Switch Prisma to MySQL
In `server/prisma/schema.prisma` change one line:
```prisma
datasource db { provider = "mysql"  url = env("DATABASE_URL") }   // was "sqlite"
```

### 4. Get the code onto the subdomain
Either **Git** (Dev Tools → Git → pull your repo) or upload the `server/` folder via **Files**
into the subdomain's directory (the folder that contains `package.json`).

### 5. Configure the Node.js app
Open the subdomain → Dev Tools → **Node.js** and set:
- **Node.js version**: 20.x or 21.x
- **Application Root**: the folder where you put `server` (contains `package.json`)
- **Application Startup File**: `dist/index.js`
- **Application Mode**: `production`
- **Environment variables** (Custom environment variables section):
  ```
  NODE_ENV=production
  DB_DRIVER=prisma
  DATABASE_URL=mysql://DBUSER:DBPASSWORD@localhost:3306/learnguard
  JWT_SECRET=<paste a long random string>
  JWT_REFRESH_SECRET=<paste another long random string>
  CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app
  COOKIE_SAMESITE=none
  ```

### 6. Install, build, create tables (one time)
On the Node.js panel use the buttons (or SSH Terminal in the same folder):
```bash
npm install
npm install @prisma/client && npm install -D prisma   # add Prisma
npx prisma generate
npx prisma db push          # creates the tables in MariaDB
npm run build               # compiles TypeScript -> dist/
```
Then click **Restart App**. (`db:seed` is optional — first boot auto-seeds the demo accounts.)

### 7. Verify
Visit `https://api.mscorpres.net/health` → should return `{"status":"ok",...}`.

---

## Part 2 — Frontend on Vercel (free)
1. Push the repo to GitHub. In Vercel → **New Project** → import it.
2. Settings:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` · **Output**: `dist`
   - **Environment Variable**: `VITE_API_URL = https://api.mscorpres.net/api/v1`
3. Deploy. Your app is live at `https://<your-app>.vercel.app`.
4. Back on Plesk, make sure `CLIENT_ORIGIN` equals that Vercel URL, then Restart App.

---

## Cross-origin note (Vercel frontend + Plesk backend)
They're different domains, so the login refresh cookie uses `SameSite=None; Secure` — already
handled by `COOKIE_SAMESITE=none`. Both are HTTPS, so it works. For the cleanest setup you can
later point a **custom domain** on Vercel (e.g. `learn.mscorpres.net`) so frontend + API are both
under `mscorpres.net` (same-site cookies).

## Notes
- The app reads `process.env.PORT` (Passenger provides it) — no change needed.
- To re-seed/reset: drop the tables (or the `learnguard` DB) and `npx prisma db push` again.
- Everything stays **$0** on your company hosting + Vercel free tier.
