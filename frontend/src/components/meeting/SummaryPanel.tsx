import { useState } from 'react'
import { Copy, Check, FileDown, Printer } from 'lucide-react'
import type { StructuredSummary } from '../../types/contracts'
import { useActionItemsDone } from '../../lib/useActionItemsDone'
import { summaryToMarkdown, downloadMarkdown, printSummary } from '../../lib/summaryExport'

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ActionItems({
  items,
  done,
  onToggle,
}: {
  items: string[]
  done: Set<string>
  onToggle: (item: string) => void
}) {
  if (items.length === 0) return null
  const doneCount = items.filter((i) => done.has(i)).length
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Action items</h3>
        <span className="text-xs tabular-nums text-slate-400">
          {doneCount} of {items.length} done
        </span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {items.map((item, i) => {
          const checked = done.has(item)
          return (
            <li key={i}>
              <label className="-mx-2 flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                  {item}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function SummaryPanel({
  summary,
  meetingId,
  title,
}: {
  summary: StructuredSummary
  meetingId: string
  title: string
}) {
  const { done, toggle } = useActionItemsDone(meetingId)
  const [copied, setCopied] = useState(false)

  const hasContent = Boolean(
    summary.summary ||
      summary.key_points.length ||
      summary.action_items.length ||
      summary.decisions.length,
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryToMarkdown(title, summary, [...done]))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable (insecure context / permissions) */
    }
  }

  const toolButton =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50'

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {hasContent && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={handleCopy} className={toolButton}>
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => downloadMarkdown(title, summary, [...done])} className={toolButton}>
            <FileDown size={14} />
            Markdown
          </button>
          <button onClick={() => printSummary(title, summary, [...done])} className={toolButton}>
            <Printer size={14} />
            PDF
          </button>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{summary.summary}</p>
      </div>
      <Section title="Key points" items={summary.key_points} />
      <ActionItems items={summary.action_items} done={done} onToggle={toggle} />
      <Section title="Decisions" items={summary.decisions} />
    </div>
  )
}
