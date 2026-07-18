import { useCallback, useEffect, useState } from 'react'

const keyFor = (meetingId: string) => `ai-meeting-assistant:action-items-done:${meetingId}`

/**
 * Tracks which action items are checked off, persisted in localStorage keyed by
 * meeting. Done-state is stored by item *text* (not index), so it survives
 * re-ordering; if a summary is regenerated and an item's wording changes, that
 * item simply starts unchecked again.
 *
 * Note: persistence is per-device (localStorage). A server-backed version would
 * be needed for cross-device sync.
 */
export function useActionItemsDone(meetingId: string) {
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(meetingId))
      setDone(raw ? new Set<string>(JSON.parse(raw)) : new Set())
    } catch {
      setDone(new Set())
    }
  }, [meetingId])

  const toggle = useCallback(
    (item: string) => {
      setDone((prev) => {
        const next = new Set(prev)
        if (next.has(item)) next.delete(item)
        else next.add(item)
        try {
          localStorage.setItem(keyFor(meetingId), JSON.stringify([...next]))
        } catch {
          /* ignore write failures (private mode, quota) */
        }
        return next
      })
    },
    [meetingId],
  )

  return { done, toggle }
}
