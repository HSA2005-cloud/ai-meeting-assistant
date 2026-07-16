import type { ChatMessage } from '../../types/contracts'
import { cn } from '../../lib/utils'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
