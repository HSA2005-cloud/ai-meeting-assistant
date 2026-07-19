import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  Lightbulb,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import type { AnalyticsResponse } from '../types/contracts'
import { fetchAnalytics } from '../mocks/analyticsMock'
import { fetchMeetingDetail } from '../mocks/meetingDetailMock'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatRelativeTime } from '../lib/utils'

// Monochrome forest-green scale used across the charts, matching the app brand.
const GREEN_DARK = '#064E3B'
const GREEN_MID_DARK = '#3F7A5F'
const GREEN_MID = '#A3C2AD'
const GREEN_LIGHT = '#D9E5DD'

interface InsightCounts {
  key_points: number
  decisions: number
  action_items: number
}

function weekLabel(isoDate: string) {
  // isoDate is 'YYYY-MM-DD' — pin to local midnight so the label doesn't shift.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Small colored pill shown in place of the old KPI icons. */
function MetricBadge({ tone, children }: { tone: 'green' | 'amber' | 'neutral'; children: ReactNode }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    neutral: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

function TrendBadge({ delta }: { delta: number }) {
  const up = delta > 0
  const Arrow = up ? ArrowUpRight : ArrowDownRight
  return (
    <MetricBadge tone={up ? 'green' : 'neutral'}>
      <Arrow size={13} strokeWidth={2.2} />
      {Math.abs(delta)}% vs last week
    </MetricBadge>
  )
}

/** Shared chart frame maths so the line and bar charts align identically. */
const CHART = { W: 720, H: 240, pad: { l: 40, r: 18, t: 14, b: 30 } }

function chartScales(weekly: AnalyticsResponse['weekly']) {
  const { W, H, pad } = CHART
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const yMax = Math.max(2, ...weekly.map((b) => b.count))
  const x = (i: number) => pad.l + (weekly.length > 1 ? (i * innerW) / (weekly.length - 1) : innerW / 2)
  const y = (c: number) => pad.t + (1 - c / yMax) * innerH
  return { innerH, yMax, x, y }
}

function ChartGrid({ yMax, y }: { yMax: number; y: (c: number) => number }) {
  const { W, pad } = CHART
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax * i) / 4)
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(t)}
            y2={y(t)}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
    </>
  )
}

/** Line/area chart of meetings per week. */
function MeetingsOverTimeChart({ weekly }: { weekly: AnalyticsResponse['weekly'] }) {
  const { W, H, pad } = CHART
  const { innerH, yMax, x, y } = chartScales(weekly)

  const points = weekly.map((b, i) => ({ px: x(i), py: y(b.count), ...b }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].px},${pad.t + innerH} L${points[0].px},${pad.t + innerH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Meetings per week over the last weeks">
      <defs>
        <linearGradient id="mot-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN_DARK} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GREEN_DARK} stopOpacity="0" />
        </linearGradient>
      </defs>

      <ChartGrid yMax={yMax} y={y} />

      <path d={areaPath} fill="url(#mot-fill)" />
      <path d={linePath} fill="none" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p) => (
        <g key={p.week_start}>
          <circle cx={p.px} cy={p.py} r="4.5" fill={GREEN_DARK} stroke="#fff" strokeWidth="1.5">
            <title>{`Week of ${weekLabel(p.week_start)}: ${p.count} meeting${p.count === 1 ? '' : 's'}`}</title>
          </circle>
          <text x={p.px} y={H - 8} textAnchor="middle" fontSize="11" fill="#94A3B8">
            {weekLabel(p.week_start)}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Bar chart of the same weekly buckets. */
function PerformanceBarChart({ weekly }: { weekly: AnalyticsResponse['weekly'] }) {
  const { W, H, pad } = CHART
  const { innerH, yMax, x, y } = chartScales(weekly)
  const barW = 18

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Meetings processed per week">
      <ChartGrid yMax={yMax} y={y} />

      {weekly.map((b, i) => (
        <g key={b.week_start}>
          {b.count > 0 && (
            <rect
              x={x(i) - barW / 2}
              y={y(b.count)}
              width={barW}
              height={pad.t + innerH - y(b.count)}
              rx="4"
              fill={GREEN_DARK}
            >
              <title>{`Week of ${weekLabel(b.week_start)}: ${b.count} meeting${b.count === 1 ? '' : 's'}`}</title>
            </rect>
          )}
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94A3B8">
            {weekLabel(b.week_start)}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Donut of meetings grouped into ready / in progress / failed. */
function StatusDonut({ groups, total }: { groups: { label: string; color: string; count: number }[]; total: number }) {
  const R = 54
  const C = 2 * Math.PI * R
  const readyPct = total > 0 ? Math.round(((groups[0]?.count ?? 0) / total) * 100) : 0

  let cumulative = 0
  const segments = groups
    .filter((g) => g.count > 0)
    .map((g) => {
      const frac = g.count / total
      const seg = { ...g, dash: `${frac * C} ${C}`, offset: -cumulative * C }
      cumulative += frac
      return seg
    })

  return (
    <div className="mt-2 flex flex-1 flex-col items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-44 w-44" role="img" aria-label={`${readyPct}% of meetings are completed`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#F1F5F9" strokeWidth="13" />
        <g transform="rotate(-90 70 70)">
          {segments.map((s) => (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="13"
              strokeLinecap={segments.length > 1 ? 'butt' : 'round'}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0F172A">
          {readyPct}%
        </text>
        <text x="70" y="88" textAnchor="middle" fontSize="12" fill="#94A3B8">
          Completed
        </text>
      </svg>

      <ul className="mt-4 w-full space-y-2.5">
        {groups.map((g) => {
          const pct = total > 0 ? Math.round((g.count / total) * 100) : 0
          return (
            <li key={g.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                {g.label}
              </span>
              <span className="tabular-nums text-slate-500">
                {g.count} ({pct}%)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insightCounts, setInsightCounts] = useState<Record<string, InsightCounts>>({})

  const load = useCallback(async () => {
    try {
      setError(null)
      const analytics = await fetchAnalytics()
      setData(analytics)

      // Per-meeting chip counts (key points / decisions / action items) aren't in
      // the analytics payload — pull them from the detail endpoint for the few
      // completed meetings we show. Failures just mean no chips for that card.
      const targets = analytics.recent.filter((m) => m.status === 'completed').slice(0, 3)
      const results = await Promise.allSettled(targets.map((m) => fetchMeetingDetail(m.id)))
      const counts: Record<string, InsightCounts> = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          counts[targets[i].id] = {
            key_points: r.value.summary.key_points.length,
            decisions: r.value.summary.decisions.length,
            action_items: r.value.summary.action_items.length,
          }
        }
      })
      setInsightCounts(counts)
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
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const { totals, insights, weekly, recent } = data

  const countOf = (...statuses: string[]) =>
    data.status_breakdown.filter((b) => statuses.includes(b.status)).reduce((sum, b) => sum + b.count, 0)

  const processingCount = countOf('processing')
  const scheduledCount = countOf('uploaded')
  const inProgress = processingCount + scheduledCount
  const failedCount = countOf('failed', 'quota_exceeded')

  const statusGroups = [
    { label: 'Completed', color: GREEN_DARK, count: totals.completed },
    { label: 'Processing', color: GREEN_MID_DARK, count: processingCount },
    { label: 'Scheduled', color: GREEN_MID, count: scheduledCount },
    { label: 'Failed', color: GREEN_LIGHT, count: failedCount },
  ]

  // Week-over-week trend from the weekly buckets (last bucket = current week).
  const thisWeekCount = weekly[weekly.length - 1]?.count ?? 0
  const prevWeekCount = weekly[weekly.length - 2]?.count ?? 0
  const weekDelta =
    prevWeekCount === 0 ? (thisWeekCount > 0 ? 100 : 0) : Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100)

  const pctOfTotal = (n: number) => (totals.meetings > 0 ? Math.round((n / totals.meetings) * 100) : 0)

  const statCards = [
    {
      label: 'Total Meetings',
      value: totals.meetings,
      sub: (
        <MetricBadge tone={totals.this_week > 0 ? 'green' : 'neutral'}>
          +{totals.this_week} this week
        </MetricBadge>
      ),
    },
    {
      label: 'Ready Meetings',
      value: totals.completed,
      sub: <MetricBadge tone="green">{pctOfTotal(totals.completed)}%</MetricBadge>,
    },
    {
      label: 'In Progress',
      value: inProgress,
      sub: (
        <MetricBadge tone={processingCount > 0 ? 'amber' : 'neutral'}>
          {processingCount} active
        </MetricBadge>
      ),
    },
    {
      label: 'This Week',
      value: totals.this_week,
      sub: <TrendBadge delta={weekDelta} />,
    },
  ]

  const aiInsightRows = [
    {
      icon: CalendarDays,
      text: `You had ${totals.this_week} meeting${totals.this_week === 1 ? '' : 's'} this week.`,
    },
    {
      icon: Lightbulb,
      text: `${insights.key_points} key point${insights.key_points === 1 ? ' was' : 's were'} extracted.`,
    },
    {
      icon: Gavel,
      text: `${insights.decisions} decision${insights.decisions === 1 ? ' was' : 's were'} identified.`,
    },
    {
      icon: ListChecks,
      text: `${insights.action_items} action item${insights.action_items === 1 ? ' was' : 's were'} captured.`,
    },
    {
      icon: CheckCircle2,
      text: 'Keep up the great work!',
    },
  ]

  const chipDefs = [
    { key: 'key_points' as const, label: 'Key Points' },
    { key: 'decisions' as const, label: 'Decisions' },
    { key: 'action_items' as const, label: 'Action Items' },
  ]

  const card = 'rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'

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
          {/* KPI tiles + status donut, then the two charts. On xl the donut sits
              in the right column spanning both rows, matching the reference design. */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-10">
            {statCards.map(({ label, value, sub }) => (
              <div key={label} className={`${card} flex flex-col p-5 xl:col-span-2`}>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
                <div className="mt-auto pt-3">{sub}</div>
              </div>
            ))}

            <div className={`${card} flex flex-col p-6 sm:col-span-2 xl:col-span-2 xl:row-span-2`}>
              <h2 className="text-base font-bold text-slate-900">By Status</h2>
              <StatusDonut groups={statusGroups} total={totals.meetings} />
            </div>

            <div className={`${card} p-6 sm:col-span-2 xl:col-span-5`}>
              <h2 className="text-base font-bold text-slate-900">Meetings Over Time</h2>
              <p className="mt-0.5 text-xs text-slate-400">Last {weekly.length} weeks</p>
              <MeetingsOverTimeChart weekly={weekly} />
            </div>

            <div className={`${card} p-6 sm:col-span-2 xl:col-span-3`}>
              <h2 className="text-base font-bold text-slate-900">Performance</h2>
              <p className="mt-0.5 text-xs text-slate-400">Last {weekly.length} weeks</p>
              <PerformanceBarChart weekly={weekly} />
            </div>
          </div>

          {/* Recent meetings + AI insights */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className={`${card} p-6 lg:col-span-2`}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Recent Meetings</h2>
                <Link to="/meetings" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                  View All
                </Link>
              </div>

              <ul className="mt-4 space-y-3">
                {recent.slice(0, 3).map((m) => {
                  const counts = insightCounts[m.id]
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/meetings/${m.id}`}
                        className="block rounded-2xl border border-slate-100 p-4 transition-all hover:border-emerald-200 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                            <FileText size={20} strokeWidth={1.8} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                            <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={13} strokeWidth={1.8} />
                                {new Date(m.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} strokeWidth={1.8} />
                                {formatRelativeTime(m.created_at)}
                              </span>
                            </p>
                          </div>
                          <StatusBadge status={m.status} />
                        </div>

                        {counts && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {chipDefs.map(({ key, label }) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                              >
                                <span className="text-sm font-bold tabular-nums text-emerald-900">{counts[key]}</span>
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className={`${card} p-6`}>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sparkles size={18} strokeWidth={1.8} className="text-emerald-700" />
                AI Insights
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {aiInsightRows.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-900">
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="text-sm text-slate-600">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
