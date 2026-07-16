import { Link } from 'react-router-dom'
import type { MeetingListItem } from '../../types/contracts'
import { formatRelativeTime } from '../../lib/utils'
import { StatusBadge } from '../ui/StatusBadge'

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-slate-900 group-hover:text-indigo-600">{meeting.title}</h3>
        <StatusBadge status={meeting.status} />
      </div>
      <p className="text-xs text-slate-400">{formatRelativeTime(meeting.created_at)}</p>
    </Link>
  )
}
