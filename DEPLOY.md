# Deployment Guide

PayrollPro is split into two deployable pieces:

| Piece | Where to deploy | Folder |
|---|---|---|
| **API + Database** | Railway or Render | `artifacts/api-server` |
| **Frontend** | Vercel or Netlify | `artifacts/payroll-pro` |

---

## 1 — Deploy the API on Railway

1. Push your repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Select this repository. Railway will auto-detect `artifacts/api-server/railway.toml`.
4. Add a **PostgreSQL** plugin inside Railway (New → Database → PostgreSQL). Railway sets `DATABASE_URL` automatically.
5. Set these environment variables in Railway → Variables:

   | Variable | Value |
   |---|---|
   | `SESSION_SECRET` | any long random string |
   | `CORS_ORIGIN` | your Vercel/Netlify frontend URL (e.g. `https://payrollpro.vercel.app`) |
   | `NODE_ENV` | `production` |

6. After deploy, run the DB migration once via Railway's shell tab:
   ```
   pnpm --filter @workspace/db run push
   ```
7. Note your Railway API URL (e.g. `https://payrollpro-api.up.railway.app`).

---

## 1-alt — Deploy the API on Render

1. Go to [render.com](https://render.com) → **New → Blueprint**.
2. Connect your GitHub repo — Render reads `render.yaml` automatically.
3. Add a **PostgreSQL** database in Render, then copy its `DATABASE_URL` into the `payrollpro-api` service's environment.
4. Set `CORS_ORIGIN` to your Vercel/Netlify frontend URL.
5. After first deploy, open the service shell and run:
   ```
   pnpm --filter @workspace/db run push
   ```

---

## 2 — Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project → Import Git Repository**.
2. Set **Root Directory** to `artifacts/payroll-pro`.
3. Vercel auto-reads `vercel.json` — no extra framework config needed.
4. Add this environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | your Railway/Render API URL (e.g. `https://payrollpro-api.up.railway.app`) |

5. Deploy.

---

## 2-alt — Deploy the Frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add New Site → Import from Git**.
2. Set **Base directory** to `artifacts/payroll-pro`. Netlify reads `netlify.toml` automatically.
3. Add this environment variable in Site Settings → Environment:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | your Railway/Render API URL |

4. Deploy.

---

## Environment variable summary

### API server (Railway / Render)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | Long random secret for JWT signing |
| `PORT` | auto | Set by platform automatically |
| `CORS_ORIGIN` | ✅ | Comma-separated list of allowed frontend origins |
| `NODE_ENV` | recommended | Set to `production` |

### Frontend (Vercel / Netlify)

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | ✅ | Full URL of your deployed API (no trailing slash) |
