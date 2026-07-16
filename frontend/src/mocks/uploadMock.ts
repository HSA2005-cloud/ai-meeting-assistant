import type { UploadMeetingResponse } from '../types/contracts'
import { createMeeting } from './store'

/**
 * Stands in for POST /meetings/upload -> {meeting_id, status}.
 * Swap-in point: Checkpoint 1 (Section 7) — replace this call with a real
 * multipart upload to the backend once backend/upload-endpoint lands.
 *
 * onProgress reports fake upload progress (0-100) so the UI's progress bar
 * has something real to bind to before the real endpoint exists.
 */
export function uploadMeeting(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadMeetingResponse> {
  return new Promise((resolve) => {
    let percent = 0
    const tick = () => {
      percent = Math.min(100, percent + Math.random() * 22 + 8)
      onProgress?.(Math.round(percent))
      if (percent < 100) {
        setTimeout(tick, 180)
      } else {
        const title = file.name.replace(/\.[^/.]+$/, '')
        const meeting = createMeeting(title)
        resolve({ meeting_id: meeting.id, status: meeting.status })
      }
    }
    tick()
  })
}

export const ACCEPTED_MIME_TYPES = ['audio/', 'video/']

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_MIME_TYPES.some((prefix) => file.type.startsWith(prefix))
}
