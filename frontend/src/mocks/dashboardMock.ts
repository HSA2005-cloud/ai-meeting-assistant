import type { MeetingListItem } from '../types/contracts'
import { listMeetings } from './store'

/**
 * Stands in for GET /meetings -> [{id, title, status, created_at}].
 * Swap-in point: Checkpoint 1 (Section 7).
 */
export function fetchMeetings(): Promise<MeetingListItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(listMeetings().map(({ id, title, status, created_at }) => ({ id, title, status, created_at })))
    }, 350)
  })
}