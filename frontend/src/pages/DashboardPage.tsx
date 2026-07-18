import { useCallback, useEffect, useRef, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { MeetingListItem } from '../types/contracts'
import { fetchMeetings } from '../mocks/dashboardMock'
import { MeetingCard } from '../components/dashboard/MeetingCard'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'

export function DashboardPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const data = await fetchMeetings()
      setMeetings(data)
      setError(null)
    } catch {
      setError('Could not load your meetings. Check your connection and try again.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Poll while any meeting is still uploading/processing so status badges and
  // the eventual summary update live, mirroring the real background job queue.
  useEffect(() => {
    const hasActiveJob = meetings?.some((m) => m.status === 'uploaded' || m.status === 'processing')
    if (hasActiveJob) {
      pollRef.current = setInterval(load, 2000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [meetings, load])

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Meeting History</h1>
          <p className="mt-2 text-sm text-[#6B7280]">View transcripts, summaries and chat with your past meetings.</p>
        </div>
      </div>

      <div className="mt-10">
        {error && <ErrorState message={error} onRetry={load} />}

        {!error && meetings === null && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        )}

        {!error && meetings?.length === 0 && (
          <EmptyState
            icon={<FolderOpen size={28} strokeWidth={1.8} />}
            title="No meetings yet"
            description="Upload your first recording from the Home page and we'll automatically generate transcripts, summaries, action items and an AI chatbot within minutes."
            action={
              <Button onClick={() => navigate('/')}>
                Go to Home
              </Button>
            }
          />
        )}

        {!error && meetings && meetings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
