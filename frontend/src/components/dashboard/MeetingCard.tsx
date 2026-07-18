import { Link } from 'react-router-dom'
import type { MeetingListItem } from '../../types/contracts'
import { formatRelativeTime } from '../../lib/utils'
import { StatusBadge } from '../ui/StatusBadge'

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="group flex animate-fade-in flex-col gap-3 rounded-[20px] border border-[#EAEAEA] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(16,24,40,0.04),0_16px_32px_-8px_rgba(16,24,40,0.1)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-[#111827] transition-colors group-hover:text-emerald-800">{meeting.title}</h3>
        <StatusBadge status={meeting.status} />
      </div>
      <p className="text-xs text-[#6B7280]">{formatRelativeTime(meeting.created_at)}</p>
    </Link>
  )
}
