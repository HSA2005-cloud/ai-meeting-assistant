import type { MeetingListItem } from '../types/contracts'
import { apiFetch } from '../lib/apiClient'

/**
 * GET /meetings -> [{id, title, status, created_at}]
 * Swapped to the real backend (Checkpoint 1, Section 7).
 */
export function fetchMeetings(): Promise<MeetingListItem[]> {
  return apiFetch('/meetings')
}
