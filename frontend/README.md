# Frontend — AI Meeting & Lecture Assistant

React + Tailwind (Vite + TypeScript). Implements the Frontend lane's MVP work
from the PRD (Section 6, Weeks 1-6): auth, upload, dashboard, meeting detail,
and the per-meeting chat widget — built against the exact contract shapes in
Section 8 so swapping in the real backend (Section 7) only touches `src/mocks/`.

## Getting started

```bash
npm install
npm run dev
```

Auth works out of the box in **demo mode**: without Supabase env vars, any
email/password creates a local session so the whole app is clickable. To wire
up real Supabase Auth, copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Structure

```
src/
  types/contracts.ts     # mirrors contracts/ (Section 8) exactly
  mocks/                 # stand-ins for each backend endpoint — swap points for Section 7
    store.ts               # in-memory + localStorage fake backend (simulates the job queue)
    uploadMock.ts           # POST /meetings/upload
    dashboardMock.ts        # GET  /meetings
    meetingDetailMock.ts    # GET  /meetings/:id
    chatMock.ts             # POST /chat/:meeting_id, GET /chat/:meeting_id/history
  context/AuthContext.tsx  # Supabase Auth, with local demo-mode fallback
  components/
    ui/            # Button, Input, StatusBadge, Skeleton, EmptyState, ErrorState, Spinner
    layout/        # Navbar, ProtectedRoute
    upload/        # UploadModal (drag-and-drop + progress bar)
    dashboard/     # MeetingCard
    meeting/       # SummaryPanel, TranscriptPanel
    chat/          # ChatWidget, MessageBubble
  pages/           # LoginPage, SignupPage, DashboardPage, MeetingDetailPage
```

## Swapping mocks for the real backend (Section 7)

Each file in `src/mocks/` exposes the same function signature a real API call
would use. When Backend's endpoint lands:

1. Replace the body of the corresponding `mocks/*.ts` function with a `fetch`
   call to the real endpoint.
2. No component changes are needed — every screen consumes the types in
   `src/types/contracts.ts`, not the mock internals.

## Status

Loading/processing states, empty states, and error states are implemented
per the NFRs (Section 10) — uploads never silently hang; the dashboard and
meeting detail page poll while a meeting is `uploaded`/`processing`.
