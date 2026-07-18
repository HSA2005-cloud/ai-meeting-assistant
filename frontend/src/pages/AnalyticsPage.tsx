import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  CalendarDays,
  FileAudio,
  ListChecks,
  Gavel,
  Lightbulb,
} from 'lucide-react'
import type { AnalyticsResponse, MeetingStatus } from '../types/contracts'
import { fetchAnalytics } from '../mocks/analyticsMock'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatRelativeTime } from '../lib/utils'

// Status → a reserved color + human label. Every place these are used also shows
// the label, so meaning is never carried by color alone.
const STATUS_META: Record<MeetingStatus, { label: string; dot: string; bar: string }> = {
  completed: { label: 'Ready', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  processing: { label: 'Processing', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  uploaded: { label: 'Uploaded', dot: 'bg-slate-400', bar: 'bg-slate-400' },
  failed: { label: 'Failed', dot: 'bg-red-500', bar: 'bg-red-500' },
  quota_exceeded: { label: 'Token limit', dot: 'bg-orange-500', bar: 'bg-orange-500' },
}
const STATUS_ORDER: MeetingStatus[] = ['completed', 'processing', 'uploaded', 'quota_exceeded', 'failed']

function weekLabel(isoDate: string) {
  // isoDate is 'YYYY-MM-DD' — pin to local midnight so the label doesn't shift.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setData(await fetchAnalytics())
    } catch {
      setError('Could not load your analytics. Check your connection and try again.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <ErrorState message={error} onRetry={load} />

  if (data === null) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const { totals, insights, weekly, recent } = data
  const maxBucket = Math.max(1, ...weekly.map((b) => b.count))

  const statusCounts = STATUS_ORDER.map((s) => ({
    status: s,
    count: data.status_breakdown.find((b) => b.status === s)?.count ?? 0,
  })).filter((s) => s.count > 0)

  const stats = [
    { label: 'Total meetings', value: totals.meetings, icon: FileAudio, tint: 'bg-indigo-50 text-indigo-600' },
    { label: 'Ready', value: totals.completed, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'In progress', value: totals.in_progress, icon: Clock, tint: 'bg-amber-50 text-amber-600' },
    { label: 'This week', value: totals.this_week, icon: CalendarDays, tint: 'bg-slate-100 text-slate-600' },
  ]

  const insightTiles = [
    { label: 'Action items', value: insights.action_items, icon: ListChecks, tint: 'bg-indigo-50 text-indigo-600' },
    { label: 'Decisions', value: insights.decisions, icon: Gavel, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Key points', value: insights.key_points, icon: Lightbulb, tint: 'bg-amber-50 text-amber-600' },
    {
      label: 'Meetings summarized',
      value: insights.meetings_summarized,
      icon: FileAudio,
      tint: 'bg-slate-100 text-slate-600',
    },
  ]

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Analytics</h1>
        <p className="mt-2 text-sm text-[#6B7280]">An overview of your meetings and processing activity.</p>
      </div>

      {totals.meetings === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<BarChart3 size={28} strokeWidth={1.8} />}
            title="No data yet"
            description="Once you upload or record a meeting, your stats and activity will show up here."
          />
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, tint }) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
                <p className="mt-0.5 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Insight tiles (from summaries) */}
          <h2 className="mt-10 text-sm font-semibold text-slate-900">Meeting intelligence</h2>
          <p className="mt-0.5 text-xs text-slate-400">Extracted across your summarized meetings</p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {insightTiles.map(({ label, value, icon: Icon, tint }) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
                <p className="mt-0.5 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Meetings over time — single-series bars */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">Meetings over time</h2>
              <p className="mt-0.5 text-xs text-slate-400">Last {weekly.length} weeks</p>
              <div className="mt-6 flex h-48 items-end gap-2 sm:gap-3">
                {weekly.map((b) => {
                  const label = weekLabel(b.week_start)
                  return (
                    <div key={b.week_start} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-medium tabular-nums text-slate-500">{b.count || ''}</span>
                      <div
                        className="w-full rounded-t bg-emerald-500 transition-colors group-hover:bg-emerald-600"
                        style={{ height: `${(b.count / maxBucket) * 100}%`, minHeight: b.count ? 4 : 2 }}
                        title={`Week of ${label}: ${b.count} meeting${b.count === 1 ? '' : 's'}`}
                      />
                      <span className="text-[11px] text-slate-400">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status breakdown — labeled bars */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900">By status</h2>
              <p className="mt-0.5 text-xs text-slate-400">{totals.meetings} total</p>
              <ul className="mt-5 space-y-4">
                {statusCounts.map(({ status, count }) => {
                  const meta = STATUS_META[status]
                  const pct = Math.round((count / totals.meetings) * 100)
                  return (
                    <li key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="tabular-nums text-slate-500">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Recent activity */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/meetings/${m.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/70"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{m.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(m.created_at)}</span>
                    <StatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
