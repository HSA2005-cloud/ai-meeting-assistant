import type { StructuredSummary } from '../../types/contracts'

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

export function SummaryPanel({ summary }: { summary: StructuredSummary }) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{summary.summary}</p>
      </div>
      <Section title="Key points" items={summary.key_points} />
      <Section title="Action items" items={summary.action_items} />
      <Section title="Decisions" items={summary.decisions} />
    </div>
  )
}
