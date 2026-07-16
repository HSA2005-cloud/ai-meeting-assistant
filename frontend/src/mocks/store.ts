import type { ChatMessage, MeetingDetailResponse, MeetingStatus, StructuredSummary } from '../types/contracts'

/**
 * Stands in for the real backend (Supabase Postgres + the background job
 * queue described in Section 5/9 of the PRD) so every frontend screen can be
 * built and clicked through before a single real endpoint exists.
 *
 * Swap points (Section 7):
 *  - uploadMock.ts        -> POST /meetings/upload
 *  - dashboardMock.ts     -> GET  /meetings
 *  - meetingDetailMock.ts -> GET  /meetings/:id
 *  - chatMock.ts          -> POST /chat/:meeting_id, GET /chat/:meeting_id/history
 * Each one only touches this file — components never import it directly.
 */

interface StoredMeeting extends MeetingDetailResponse {
  chat: ChatMessage[]
}

const STORAGE_KEY = 'ai-meeting-assistant:mock-meetings'

const SAMPLE_TRANSCRIPT = `Alex: Alright, let's kick off the sync. First up — the migration to the new billing provider.
Priya: I finished the reconciliation script last night. We're matching 99.4% of transactions automatically now.
Alex: That's great. What about the remaining 0.6%?
Priya: Mostly refunds issued before the cutover date. I'll build a manual review queue for those by Friday.
Jordan: On the frontend side, the new invoice page is ready for QA. I'll open a PR today.
Alex: Perfect. Let's make Friday the target to have billing fully cut over.
Priya: Works for me. I'll also write a rollback plan in case something breaks in prod.
Jordan: One more thing — support has been getting questions about the pricing page copy. Can we get marketing to review it this week?
Alex: Good call, I'll ping them after this. Anything else before we wrap up?
Priya: Nope, that's everything from me.
Jordan: Same here. Thanks everyone.
Alex: Great, talk soon.`

const SAMPLE_SUMMARY: StructuredSummary = {
  summary:
    'The team reviewed progress on the billing provider migration. Reconciliation is nearly complete (99.4% automatic match rate), the new invoice page is ready for QA, and the team agreed to target full cutover by Friday, with a rollback plan and a marketing review of pricing copy as follow-ups.',
  key_points: [
    'Billing reconciliation script matches 99.4% of transactions automatically.',
    'Remaining unmatched transactions are mostly pre-cutover refunds.',
    'New invoice page is feature-complete and ready for QA.',
    'Support has flagged customer confusion about pricing page copy.',
  ],
  action_items: [
    'Priya: Build a manual review queue for unmatched refund transactions by Friday.',
    'Jordan: Open a PR for the new invoice page today.',
    'Priya: Write a rollback plan for the billing cutover.',
    'Alex: Ask marketing to review the pricing page copy this week.',
  ],
  decisions: [
    'Target Friday for full cutover to the new billing provider.',
    'Marketing will review pricing page copy before the cutover.',
  ],
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function load(): StoredMeeting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredMeeting[]) : []
  } catch {
    return []
  }
}

function save(meetings: StoredMeeting[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings))
}

export function listMeetings(): StoredMeeting[] {
  return load().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getMeeting(id: string): StoredMeeting | undefined {
  return load().find((m) => m.id === id)
}

export function createMeeting(title: string): StoredMeeting {
  const meetings = load()
  const meeting: StoredMeeting = {
    id: randomId(),
    title,
    status: 'uploaded',
    created_at: new Date().toISOString(),
    transcript: '',
    summary: { summary: '', key_points: [], action_items: [], decisions: [] },
    action_items: [],
    chat: [],
  }
  meetings.push(meeting)
  save(meetings)

  // Simulate the background job: FFmpeg extraction + transcribe() + summarize()
  // running asynchronously, mirroring Checkpoint 2/3 in Section 7.
  setTimeout(() => updateMeeting(meeting.id, { status: 'processing' }), 1200)
  setTimeout(() => {
    updateMeeting(meeting.id, {
      status: 'completed',
      transcript: SAMPLE_TRANSCRIPT,
      summary: SAMPLE_SUMMARY,
      action_items: SAMPLE_SUMMARY.action_items,
    })
  }, 5500)

  return meeting
}

export function updateMeeting(id: string, patch: Partial<StoredMeeting>): void {
  const meetings = load()
  const idx = meetings.findIndex((m) => m.id === id)
  if (idx === -1) return
  meetings[idx] = { ...meetings[idx], ...patch }
  save(meetings)
}

export function updateStatus(id: string, status: MeetingStatus): void {
  updateMeeting(id, { status })
}

export function appendChatMessage(meetingId: string, message: ChatMessage): void {
  const meetings = load()
  const idx = meetings.findIndex((m) => m.id === meetingId)
  if (idx === -1) return
  meetings[idx].chat = [...meetings[idx].chat, message]
  save(meetings)
}

export function getChatHistory(meetingId: string): ChatMessage[] {
  return getMeeting(meetingId)?.chat ?? []
}
