import { useCallback, useEffect, useRef, useState } from 'react'
import type { MeetingListItem } from '../types/contracts'
import { fetchMeetings } from '../mocks/dashboardMock'
import { MeetingCard } from '../components/dashboard/MeetingCard'
import { UploadModal } from '../components/upload/UploadModal'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'

export function DashboardPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Your meetings</h1>
          <p className="mt-1 text-sm text-slate-500">Upload a recording to get a transcript, summary, and chatbot.</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>Upload recording</Button>
      </div>

      <div className="mt-6">
        {error && <ErrorState message={error} onRetry={load} />}

        {!error && meetings === null && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        )}

        {!error && meetings?.length === 0 && (
          <EmptyState
            title="No meetings yet"
            description="Upload your first recording — we'll transcribe it and generate a summary within a few minutes."
            action={<Button onClick={() => setShowUpload(true)}>Upload recording</Button>}
          />
        )}

        {!error && meetings && meetings.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            load()
          }}
        />
      )}
    </div>
  )
}
