import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AlertTriangle, Info } from 'lucide-react'
import type { MeetingDetailResponse } from '../types/contracts'
import { fetchMeetingDetail } from '../mocks/meetingDetailMock'
import { SummaryPanel } from '../components/meeting/SummaryPanel'
import { TranscriptPanel } from '../components/meeting/TranscriptPanel'
import { ProcessingSteps } from '../components/meeting/ProcessingSteps'
import { ChatWidget } from '../components/chat/ChatWidget'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { formatRelativeTime } from '../lib/utils'

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(
    (location.state as { duplicate?: boolean } | null)?.duplicate === true,
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(() => {
    if (!id) return
    fetchMeetingDetail(id)
      .then((data) => {
        setMeeting(data)
        setError(null)
      })
      .catch(() => setError('Could not load this meeting. It may have been removed.'))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (meeting && (meeting.status === 'uploaded' || meeting.status === 'processing')) {
      pollRef.current = setInterval(load, 2000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [meeting, load])

  if (error) return <ErrorState message={error} onRetry={load} />

  if (!meeting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const isProcessing = meeting.status === 'uploaded' || meeting.status === 'processing'
  const isQuotaExceeded = meeting.status === 'quota_exceeded'

  return (
    <div>
      <Link to="/meetings" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to meetings
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{meeting.title}</h1>
        <StatusBadge status={meeting.status} />
      </div>
      <p className="mt-1 text-sm text-slate-400">{formatRelativeTime(meeting.created_at)}</p>

      {showDuplicateNotice && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <Info size={20} className="mt-0.5 shrink-0 text-indigo-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-indigo-800">This recording already exists</h3>
            <p className="mt-0.5 text-sm text-indigo-700">
              You've uploaded this file before, so we skipped re-processing it. Here's the existing summary.
            </p>
          </div>
          <button
            onClick={() => setShowDuplicateNotice(false)}
            className="text-sm font-medium text-indigo-500 hover:text-indigo-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {isQuotaExceeded && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-orange-500" />
          <div>
            <h3 className="text-sm font-semibold text-orange-800">Token limit reached</h3>
            <p className="mt-0.5 text-sm text-orange-700">
              The summary could not be generated due to API rate limits. Your transcript is still available below.
            </p>
          </div>
        </div>
      )}

      {isProcessing ? (
        <ProcessingSteps stage={meeting.stage} preparing={meeting.status === 'uploaded'} />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              {(['summary', 'transcript'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-md py-1.5 capitalize transition-colors ${
                    tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'summary' ? (
              <SummaryPanel summary={meeting.summary} />
            ) : (
              <TranscriptPanel transcript={meeting.transcript} />
            )}
          </div>

          <div className="lg:col-span-1">
            <ChatWidget meetingId={meeting.id} disabled={isProcessing} />
          </div>
        </div>
      )}
    </div>
  )
}
