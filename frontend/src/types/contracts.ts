/**
 * Mirrors contracts/ (Section 8 of the PRD) exactly.
 * When Backend's real endpoints land, only src/mocks/* should need to change —
 * every component below is built against these shapes.
 */

export type MeetingStatus = 'uploaded' | 'processing' | 'completed' | 'failed' | 'quota_exceeded'

// Fine-grained pipeline stage while status === 'processing'. Null/absent once
// the job leaves the pipeline (or if the backend isn't reporting stages yet).
export type MeetingStage = 'transcribing' | 'chunking' | 'summarizing' | 'delivering'

// GET /meetings -> [{id, title, status, created_at}]
export interface MeetingListItem {
  id: string
  title: string
  status: MeetingStatus
  created_at: string
}

// POST /meetings/upload -> {meeting_id, status, duplicate?}
export interface UploadMeetingResponse {
  meeting_id: string
  status: MeetingStatus
  // True when the uploaded file matched an existing meeting (same content) —
  // meeting_id points at that existing meeting rather than a new one.
  duplicate?: boolean
}

// def summarize(transcript_text: str) -> dict  # {summary, key_points, action_items, decisions}
export interface StructuredSummary {
  summary: string
  key_points: string[]
  action_items: string[]
  decisions: string[]
}

// GET /meetings/:id -> {transcript, summary, action_items}
export interface MeetingDetailResponse {
  id: string
  title: string
  status: MeetingStatus
  stage?: MeetingStage | null
  created_at: string
  transcript: string
  summary: StructuredSummary
  action_items: string[]
}

// GET /meetings/analytics -> aggregated dashboard metrics (counts cover all
// meetings regardless of status).
export interface AnalyticsResponse {
  totals: {
    meetings: number
    completed: number
    in_progress: number
    failed: number
    this_week: number
  }
  insights: {
    action_items: number
    decisions: number
    key_points: number
    meetings_summarized: number
  }
  status_breakdown: { status: MeetingStatus; count: number }[]
  weekly: { week_start: string; count: number }[]
  recent: MeetingListItem[]
}

export type ChatRole = 'user' | 'assistant'

// GET /chat/:meeting_id/history -> [{role, content, created_at}]
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  created_at: string
}

// POST /chat/:meeting_id -> {answer, updated?}
export interface ChatAnswerResponse {
  answer: string
  updated?: boolean
}
