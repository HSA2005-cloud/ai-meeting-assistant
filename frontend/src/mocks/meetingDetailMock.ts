import type { MeetingDetailResponse } from '../types/contracts'
import { apiFetch } from '../lib/apiClient'

/**
 * GET /meetings/:id -> {transcript, summary, action_items}
 * Swapped to the real backend (Checkpoint 3, Section 7).
 */
export function fetchMeetingDetail(id: string): Promise<MeetingDetailResponse> {
  return apiFetch(`/meetings/${id}`)
}
