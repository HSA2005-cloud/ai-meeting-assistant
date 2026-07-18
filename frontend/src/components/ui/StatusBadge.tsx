import type { MeetingStatus } from '../../types/contracts'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

const config: Record<MeetingStatus, { label: string; classes: string; showSpinner?: boolean }> = {
  uploaded: { label: 'Uploaded', classes: 'bg-slate-100 text-slate-600' },
  processing: { label: 'Processing', classes: 'bg-amber-100 text-amber-700', showSpinner: true },
  completed: { label: 'Ready', classes: 'bg-emerald-50 text-emerald-800' },
  failed: { label: 'Failed', classes: 'bg-red-100 text-red-700' },
  quota_exceeded: { label: 'Token Limit Reached', classes: 'bg-orange-100 text-orange-700' },
}

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const { label, classes, showSpinner } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', classes)}>
      {showSpinner && <Spinner className="h-3 w-3" />}
      {label}
    </span>
  )
}
