import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { MeetingDetailResponse } from '../types/contracts'
import { fetchMeetingDetail } from '../mocks/meetingDetailMock'
import { SummaryPanel } from '../components/meeting/SummaryPanel'
import { TranscriptPanel } from '../components/meeting/TranscriptPanel'
import { ChatWidget } from '../components/chat/ChatWidget'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Spinner } from '../components/ui/Spinner'
import { formatRelativeTime } from '../lib/utils'

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
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

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to meetings
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{meeting.title}</h1>
        <StatusBadge status={meeting.status} />
      </div>
      <p className="mt-1 text-sm text-slate-400">{formatRelativeTime(meeting.created_at)}</p>

      {isProcessing ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Spinner className="h-8 w-8 text-indigo-500" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {meeting.status === 'uploaded' ? 'Getting ready to process…' : 'Transcribing and summarizing…'}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            This usually takes a few minutes for a typical recording. This page updates automatically.
          </p>
        </div>
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
