import type { UploadMeetingResponse } from '../types/contracts'
import { supabase } from '../lib/supabaseClient'

const BASE = import.meta.env.VITE_API_URL

/**
 * POST /meetings/upload -> {meeting_id, status}
 * Swapped to the real backend (Checkpoint 1, Section 7).
 *
 * Uses XMLHttpRequest instead of fetch so onProgress can report real upload
 * progress (0-100) for the UI's progress bar.
 */
export async function uploadMeeting(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadMeetingResponse> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
  const token = data.session?.access_token

  const form = new FormData()
  form.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/meetings/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadMeetingResponse)
      } else {
        reject(new Error(`${xhr.status}: ${xhr.responseText}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

export const ACCEPTED_MIME_TYPES = ['audio/', 'video/']

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_MIME_TYPES.some((prefix) => file.type.startsWith(prefix))
}
