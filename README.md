# AI Meeting & Lecture Assistant

An AI-powered web app that transcribes uploaded meeting/lecture audio and video, generates a structured summary (key points, action items, decisions), and provides a per-meeting chatbot that answers questions grounded only in that meeting's content (RAG).

Full product spec: see [`AI_Meeting_Assistant_PRD.md`](./AI_Meeting_Assistant_PRD.md) (or the PDF version) in this repo.

---

## Team

| Lane | Role | Owns |
|---|---|---|
| 🎨 Frontend | Frontend Engineer | Everything the user sees and clicks |
| ⚙️ Backend | Backend Engineer | API layer, database, storage, job orchestration |
| 🤖 AI/ML | AI/ML Engineer | Transcription, summarization, embeddings, RAG |

**Timeline:** 8 weeks, part-time. All three lanes work in parallel from Week 1 — see Section 5 and 7 of the PRD for the full schedule and integration checkpoints.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Tailwind |
| Backend | FastAPI (Python) |
| Auth / DB / Storage | Supabase (Postgres + Auth + Storage) |
| Job queue | FastAPI BackgroundTasks (MVP) → Celery + Redis (stretch) |
| Speech-to-text | Whisper (`faster-whisper`) |
| Audio extraction | FFmpeg |
| Embeddings | `sentence-transformers` |
| Vector DB | ChromaDB |
| LLM | Claude or GPT-4o (pick one, stay consistent) |
| Deployment | Vercel (frontend) + Render/Railway (backend) |

---

## Repo Structure

```
repo/
  frontend/       # React + Tailwind app
  backend/        # FastAPI app
  ai/             # Whisper, embeddings, RAG functions
  contracts/      # Shared API contract — read this before writing any code
  README.md
```

**Start here:** [`contracts/api_contract.md`](./contracts/api_contract.md) defines every function signature and endpoint the three lanes hand to each other. It exists so nobody has to guess at another lane's interface — build against it, not against assumptions.

---

## Getting Started

### 1. Clone the repo
```bash
git clone <repo-url>
cd ai-meeting-assistant
```

### 2. Read `contracts/api_contract.md` before writing any code
This is the shape your code needs to match, regardless of which lane you're on.

### 3. Set up your lane

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**AI/ML**
```bash
cd ai
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 4. Environment variables
Copy `.env.example` to `.env` in `frontend/` and `backend/` and fill in:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY` (Claude or OpenAI, per Tech Stack decision)

---

## Branching & PR Workflow

- `main` is protected — no direct pushes, always deployable.
- One branch per task: `<lane>/<task>`, e.g. `frontend/upload-page`, `backend/upload-endpoint`, `ai/transcribe-fn`.
- Open a PR into `main` when a task is done. A merged PR landing a real endpoint/function **is** the integration checkpoint (see PRD Section 7) — no separate meeting needed.
- **PRs need at least one review from another lane before merging** — nobody merges their own PR unreviewed.
- Any PR touching `contracts/` needs a review from whichever lane(s) depend on it, since a silent contract change breaks the "nobody blocks anybody" model.
- Mocks/stubs live inside the lane that owns them (`frontend/src/mocks/`, `backend/stubs/ai_stubs.py`) — never in another lane's folder.

```bash
git checkout -b <lane>/<task>
# ... do the work, commit ...
git push -u origin <lane>/<task>
# open a PR into main on GitHub
```

---

## Definition of Done

- [ ] Live deployed link (not localhost)
- [ ] User can sign up, upload a real recording, and get a summary
- [ ] Chatbot answers correctly from that meeting only
- [ ] README with architecture diagram and setup instructions
- [ ] 2-3 minute demo video showing the full flow
