# Deployment

This app is two deployables from one repo:

| Part | Folder | Host | Why |
|------|--------|------|-----|
| Frontend (Vite/React) | `frontend/` | **Vercel** | Static SPA build, great DX |
| Backend (FastAPI) | `backend/` | **Render** (or Railway/Fly) | Needs a persistent, always-on server |

> **Why not both on Vercel?** The backend keeps state and does long work that
> serverless can't: ChromaDB writes to local disk, `BackgroundTasks` run the
> transcribe→embed→summarize pipeline *after* the HTTP response, and
> transcription exceeds serverless time limits. It needs a real server process.

Deploy the **backend first** — the frontend needs its URL.

---

## 1. Backend → Render

### Create the service
1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service** → connect `HSA2005-cloud/ai-meeting-assistant`.
2. Configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Standard (2 GB)** — see memory note below |

### Environment variables
| Key | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key |
| `DATABASE_URL` | Supabase Postgres connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FRONTEND_ORIGIN` | your Vercel URL (set after step 2; comma-separate for multiple) |
| `PYTHON_VERSION` | *(only if a build wheel fails)* match local, e.g. `3.13` |

### Persistent disk (recommended)
Add a disk (**service → Disks → Add Disk**) mounted at
`/opt/render/project/src/backend/chroma_db`, ~1 GB. Without it, the chat
embeddings (ChromaDB) are wiped on every deploy/restart and chat silently starts
answering "That wasn't covered in this meeting."

### Verify
- First build takes several minutes (PyTorch is large). Watch for `Application startup complete`.
- The **first transcription** is slow — faster-whisper downloads a ~140 MB model on first use.
- Hit `https://<service>.onrender.com/health` → `{"status":"ok"}`.
- **Copy that base URL** for the frontend's `VITE_API_URL`.

### Notes / gotchas
- **Memory:** the stack loads PyTorch + faster-whisper + a sentence-transformer + ChromaDB at once — realistically 700 MB–1.2 GB. Render **Free/Starter (512 MB) will OOM.** Use Standard (2 GB).
- **Free tier also sleeps** after 15 min idle, which can kill in-flight background jobs and reset the (non-persistent) disk. Not suitable for real use.
- **ffmpeg:** video uploads need ffmpeg. We use the pip-bundled binary via
  `imageio-ffmpeg` (see `backend/meetings.py:_resolve_ffmpeg`), so no system
  ffmpeg install is required on the host.

---

## 2. Frontend → Vercel

1. [vercel.com/new](https://vercel.com/new) → import `HSA2005-cloud/ai-meeting-assistant`.
2. **Root Directory → `frontend`** (this is the fix for `vite: command not found`). Framework auto-detects as **Vite**.
3. Environment variables:

| Key | Value |
|---|---|
| `VITE_API_URL` | your Render backend base URL (from step 1) |
| `VITE_SUPABASE_URL` | `https://<project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

4. **Deploy.** Copy the resulting `https://<project>.vercel.app` URL.

---

## 3. Wire them together

1. On **Render**, set `FRONTEND_ORIGIN` to your Vercel URL and redeploy (CORS
   otherwise blocks the browser — see `backend/main.py`).
2. In **Supabase → Auth → URL Configuration**, add the Vercel URL to the allowed
   redirect/site URLs so login works.

---

## 4. One-time database migrations

Run once in the **Supabase SQL editor** (both additive & safe; features degrade
gracefully until applied):

```sql
alter table meetings add column if not exists stage text;         -- live processing steps
alter table meetings add column if not exists content_hash text;  -- duplicate-upload detection
```

---

## Environment variable reference

**Backend (`backend/.env` locally / Render env):**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`,
`GEMINI_API_KEY`, `FRONTEND_ORIGIN`

**Frontend (`frontend/.env.local` locally / Vercel env):**
`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
