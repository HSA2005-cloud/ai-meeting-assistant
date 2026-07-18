import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FolderOpen, UploadCloud } from 'lucide-react'
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
  const [searchParams, setSearchParams] = useSearchParams()

  // Lets the sidebar's "Upload Recording" nav item (a link to /?upload=1) open
  // this page's existing upload modal without lifting any state or routes.
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      setShowUpload(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Your Meetings</h1>
          <p className="mt-2 text-sm text-[#6B7280]">Upload a recording to get transcripts, summaries and AI chat.</p>
        </div>
        <Button onClick={() => setShowUpload(true)} icon={<UploadCloud size={18} strokeWidth={1.8} />}>
          Upload Recording
        </Button>
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
            description="Upload your first recording and we'll automatically generate transcripts, summaries, action items and an AI chatbot within minutes."
            action={
              <Button onClick={() => setShowUpload(true)} icon={<UploadCloud size={18} strokeWidth={1.8} />}>
                Upload Recording
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
