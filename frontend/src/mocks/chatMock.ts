import type { ChatAnswerResponse, ChatMessage } from '../types/contracts'
import { apiFetch } from '../lib/apiClient'

/**
 * POST /chat/:meeting_id -> {answer}
 * GET  /chat/:meeting_id/history -> [{role, content, created_at}]
 * Swapped to the real backend (Checkpoint 4, Section 7).
 */
export function sendChatMessage(meetingId: string, question: string): Promise<ChatAnswerResponse> {
  return apiFetch(`/chat/${meetingId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
}

export async function fetchChatHistory(meetingId: string): Promise<ChatMessage[]> {
  // Backend rows have no id column — synthesize stable client-side ids for React keys.
  const rows = await apiFetch(`/chat/${meetingId}/history`)
  return (rows as Omit<ChatMessage, 'id'>[]).map((row, i) => ({ ...row, id: `${meetingId}-${i}` }))
}
