import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Info, Pencil, Trash2, RefreshCw, Check, X } from 'lucide-react'
import type { MeetingDetailResponse } from '../types/contracts'
import { fetchMeetingDetail, renameMeeting, deleteMeeting, retryMeeting } from '../mocks/meetingDetailMock'
import { SummaryPanel } from '../components/meeting/SummaryPanel'
import { TranscriptPanel } from '../components/meeting/TranscriptPanel'
import { ProcessingSteps } from '../components/meeting/ProcessingSteps'
import { ChatWidget } from '../components/chat/ChatWidget'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { formatRelativeTime } from '../lib/utils'

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(
    (location.state as { duplicate?: boolean } | null)?.duplicate === true,
  )
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
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

  async function saveTitle() {
    if (!id || !meeting) return
    const next = titleDraft.trim()
    if (!next || next === meeting.title) {
      setEditing(false)
      return
    }
    setSavingTitle(true)
    setActionError(null)
    try {
      await renameMeeting(id, next)
      setMeeting({ ...meeting, title: next })
      setEditing(false)
    } catch {
      setActionError('Could not rename this meeting. Please try again.')
    } finally {
      setSavingTitle(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteMeeting(id)
      navigate('/meetings')
    } catch {
      setActionError('Could not delete this meeting. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleRetry() {
    if (!id) return
    setRetrying(true)
    setActionError(null)
    try {
      await retryMeeting(id)
      load() // status flips to uploaded → polling + processing steps take over
    } catch {
      setActionError('Could not restart processing. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

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
  const isFailed = meeting.status === 'failed'

  return (
    <div>
      <Link to="/meetings" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to meetings
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xl font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={saveTitle}
              disabled={savingTitle}
              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              aria-label="Save title"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={savingTitle}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Cancel"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-slate-900">{meeting.title}</h1>
            <button
              onClick={() => {
                setTitleDraft(meeting.title)
                setEditing(true)
              }}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Rename meeting"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={meeting.status} />
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete meeting"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-400">{formatRelativeTime(meeting.created_at)}</p>

      {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

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
        <div className="mt-6 flex flex-wrap items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-orange-800">Token limit reached</h3>
            <p className="mt-0.5 text-sm text-orange-700">
              The summary could not be generated due to API rate limits. Your transcript is still available below, or
              try again now that limits may have reset.
            </p>
          </div>
          <Button variant="secondary" onClick={handleRetry} loading={retrying} icon={<RefreshCw size={16} />} className="px-4 py-2">
            Try again
          </Button>
        </div>
      )}

      {isFailed && (
        <div className="mt-6 flex flex-wrap items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-red-800">Processing failed</h3>
            <p className="mt-0.5 text-sm text-red-700">
              Something went wrong while processing this recording. You can try again.
            </p>
          </div>
          <Button variant="secondary" onClick={handleRetry} loading={retrying} icon={<RefreshCw size={16} />} className="px-4 py-2">
            Try again
          </Button>
        </div>
      )}

      {isProcessing ? (
        <ProcessingSteps stage={meeting.stage} preparing={meeting.status === 'uploaded'} />
      ) : isFailed ? null : (
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
              <SummaryPanel summary={meeting.summary} meetingId={meeting.id} title={meeting.title} />
            ) : (
              <TranscriptPanel transcript={meeting.transcript} />
            )}
          </div>

          <div className="lg:col-span-1">
            <ChatWidget meetingId={meeting.id} disabled={isProcessing} />
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={deleting ? undefined : () => setConfirmDelete(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Delete this meeting?</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              “{meeting.title}” and its transcript, summary, and chat history will be permanently removed. This can't be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-5 py-2.5">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting} className="px-5 py-2.5">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
