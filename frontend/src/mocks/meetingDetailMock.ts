import type { MeetingDetailResponse } from '../types/contracts'
import { getMeeting } from './store'

/**
 * Stands in for GET /meetings/:id -> {transcript, summary, action_items}.
 * Swap-in point: Checkpoint 3 (Section 7).
 */
export function fetchMeetingDetail(id: string): Promise<MeetingDetailResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const meeting = getMeeting(id)
      if (!meeting) {
        reject(new Error('Meeting not found'))
        return
      }
      const { chat: _chat, ...detail } = meeting
      resolve(detail)
    }, 350)
  })
}
