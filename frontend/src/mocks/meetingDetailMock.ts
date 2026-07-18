import type { MeetingDetailResponse, UploadMeetingResponse } from '../types/contracts'
import { apiFetch } from '../lib/apiClient'

/**
 * GET /meetings/:id -> {transcript, summary, action_items}
 * Swapped to the real backend (Checkpoint 3, Section 7).
 */
export function fetchMeetingDetail(id: string): Promise<MeetingDetailResponse> {
  return apiFetch(`/meetings/${id}`)
}

/** PATCH /meetings/:id -> {id, title} — rename a meeting. */
export function renameMeeting(id: string, title: string): Promise<{ id: string; title: string }> {
  return apiFetch(`/meetings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

/** DELETE /meetings/:id -> {ok} — delete a meeting and all its derived data. */
export function deleteMeeting(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/meetings/${id}`, { method: 'DELETE' })
}

/** POST /meetings/:id/retry -> {meeting_id, status} — reprocess a failed meeting. */
export function retryMeeting(id: string): Promise<UploadMeetingResponse> {
  return apiFetch(`/meetings/${id}/retry`, { method: 'POST' })
}
