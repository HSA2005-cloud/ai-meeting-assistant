import type { ChatAnswerResponse, ChatMessage } from '../types/contracts'
import { appendChatMessage, getChatHistory, getMeeting } from './store'

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/**
 * Stands in for def answer_question(meeting_id, question) -> str, called
 * through POST /chat/:meeting_id -> {answer}.
 * Swap-in point: Checkpoint 4 (Section 7). The real version embeds the
 * question, does a similarity search in ChromaDB scoped to meeting_id, and
 * calls the LLM with retrieved chunks — this mock just pattern-matches
 * against the sample transcript so the chat UI has something grounded-
 * looking to render while AI's real function is built.
 */
export function sendChatMessage(meetingId: string, question: string): Promise<ChatAnswerResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const meeting = getMeeting(meetingId)
      if (!meeting) {
        reject(new Error('Meeting not found'))
        return
      }

      const userMessage: ChatMessage = {
        id: randomId(),
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      }
      appendChatMessage(meetingId, userMessage)

      const answer = craftAnswer(meeting.transcript, meeting.summary.summary, question)
      const assistantMessage: ChatMessage = {
        id: randomId(),
        role: 'assistant',
        content: answer,
        created_at: new Date().toISOString(),
      }
      appendChatMessage(meetingId, assistantMessage)

      resolve({ answer })
    }, 700)
  })
}

// Stands in for GET /chat/:meeting_id/history -> [{role, content, created_at}]
export function fetchChatHistory(meetingId: string): Promise<ChatMessage[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(getChatHistory(meetingId)), 250)
  })
}

function craftAnswer(transcript: string, summary: string, question: string): string {
  if (!transcript) {
    return "This meeting is still processing — I'll be able to answer questions once the transcript is ready."
  }

  const q = question.toLowerCase()
  const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean)

  const hit = lines.find((line) =>
    q.split(/\s+/).filter((w) => w.length > 3).some((word) => line.toLowerCase().includes(word)),
  )

  if (hit) {
    return `Based on the transcript: "${hit}"`
  }

  return `I couldn't find anything specific about that in this meeting's transcript. Here's the overall summary instead: ${summary}`
}
