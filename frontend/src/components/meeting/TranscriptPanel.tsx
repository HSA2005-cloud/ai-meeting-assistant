export function TranscriptPanel({ transcript }: { transcript: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Transcript</h3>
      <div className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
        {transcript}
      </div>
    </div>
  )
}
