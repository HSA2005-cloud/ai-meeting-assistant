import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage } from '../../types/contracts'
import { fetchChatHistory, sendChatMessage } from '../../mocks/chatMock'
import { MessageBubble } from './MessageBubble'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

export function ChatWidget({ meetingId, disabled, onDataUpdated }: { meetingId: string; disabled?: boolean; onDataUpdated?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChatHistory(meetingId)
      .then(setMessages)
      .finally(() => setLoadingHistory(false))
  }, [meetingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || sending) return

    setInput('')
    setSending(true)
    try {
      const { answer, updated } = await sendChatMessage(meetingId, question)
      setMessages((prev) => [
        ...prev,
        { id: `local-user-${Date.now()}`, role: 'user', content: question, created_at: new Date().toISOString() },
        { id: `local-assistant-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString() },
      ])
      // If the backend modified the transcript/summary (e.g. name correction),
      // notify the parent page so it can re-fetch the updated data.
      if (updated && onDataUpdated) {
        onDataUpdated()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Ask about this meeting</h3>
        <p className="text-xs text-slate-400">Answers are grounded only in this meeting's transcript.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loadingHistory && (
          <div className="flex justify-center py-4">
            <Spinner className="h-5 w-5 text-slate-300" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Ask something like "what did we decide about the billing cutover?"
          </p>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-500">
              <Spinner className="h-3.5 w-3.5" /> Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || sending}
          placeholder={disabled ? 'Available once processing is complete' : 'Ask a question…'}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
        />
        <Button type="submit" disabled={disabled || !input.trim()} loading={sending}>
          Send
        </Button>
      </form>
    </div>
  )
}
