/**
 * Mirrors contracts/ (Section 8 of the PRD) exactly.
 * When Backend's real endpoints land, only src/mocks/* should need to change —
 * every component below is built against these shapes.
 */

export type MeetingStatus = 'uploaded' | 'processing' | 'completed' | 'failed'

// GET /meetings -> [{id, title, status, created_at}]
export interface MeetingListItem {
  id: string
  title: string
  status: MeetingStatus
  created_at: string
}

// POST /meetings/upload -> {meeting_id, status}
export interface UploadMeetingResponse {
  meeting_id: string
  status: MeetingStatus
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
  created_at: string
  transcript: string
  summary: StructuredSummary
  action_items: string[]
}

export type ChatRole = 'user' | 'assistant'

// GET /chat/:meeting_id/history -> [{role, content, created_at}]
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  created_at: string
}

// POST /chat/:meeting_id -> {answer}
export interface ChatAnswerResponse {
  answer: string
}
