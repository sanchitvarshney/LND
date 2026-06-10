# Connect LearnGuard to GitHub (then auto-deploy to Plesk + Vercel)

The repo is prepared (`.gitignore` is in place and verified — it excludes `node_modules`,
`dist`, `.env`, and `data.json`). You just need to push it to GitHub from **your PC**
(this needs your GitHub login, so it has to be done by you), then I'll wire the deploys.

> **First, delete the leftover `.git` folder.** My setup left a broken `.git` folder in
> `LearnGuard` that I couldn't remove. In this folder delete the hidden `.git` folder, or in
> PowerShell: `Remove-Item -Recurse -Force .git`

---

## Step 1 — Push to GitHub (pick ONE option)

### Option A — GitHub Desktop (easiest, recommended)
1. Install GitHub Desktop (desktop.github.com) and sign in to your GitHub account.
2. **File → Add Local Repository →** choose `D:\Projects\Others\Training app\LearnGuard`.
3. It'll say "this isn't a Git repository — create one?" → **Create a repository** → Create.
4. Click **Publish repository** → name it `learnguard` → choose **Private** → Publish.

Done — your code is on GitHub.

### Option B — Command line (Git for Windows)
```powershell
cd "D:\Projects\Others\Training app\LearnGuard"
git init
git add .
git commit -m "LearnGuard: AI training platform"
git branch -M main
# Create an EMPTY repo at https://github.com/new (no README/.gitignore), then:
git remote add origin https://github.com/<your-username>/learnguard.git
git push -u origin main
```

---

## Step 2 — Tell me the repo URL
Send me `https://github.com/<you>/learnguard` and I'll wire up both deploys:

### Backend → Plesk (auto-deploy on push)
In Plesk → `trainingapi.mscorpres.net` → **Git**:
- Add the repository URL (private repos: Plesk shows a **deploy key** → you add it to GitHub
  repo → Settings → Deploy keys).
- Set the deployment path to the app root and **Additional deployment actions**:
  ```
  npm install
  npm run build
  ```
  then Plesk restarts the Node app. Every `git push` will redeploy the backend.

### Frontend → Vercel (auto-deploy on push)
At vercel.com → **Add New → Project → Import Git Repository** (authorize GitHub):
- **Root Directory:** `client`
- **Framework:** Vite (auto)
- **Environment Variable:** `VITE_API_URL = https://trainingapi.mscorpres.net/api/v1`
- Deploy. Every push redeploys the frontend; you get a `*.vercel.app` URL.

### Then (one-time)
- In Plesk Node.js env vars set `CLIENT_ORIGIN` to your Vercel URL and restart (so the browser is allowed to call the API).

---

## Why I can't do Step 1 for you
Pushing code requires your GitHub credentials, and creating the repo/authorizing Vercel are
account actions only you can approve. Everything after you push (Plesk Git config, Vercel
import settings, env wiring) I can do with you in the browser.
