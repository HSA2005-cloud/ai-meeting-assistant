import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { MeetingStage } from '../../types/contracts'
import { Spinner } from '../ui/Spinner'
import { cn } from '../../lib/utils'

/**
 * The real backend pipeline, in order. Each `key` matches the `stage` value the
 * backend writes to the meeting row while status === 'processing':
 *   transcribing -> chunking -> summarizing -> delivering
 */
const STEPS = [
  { key: 'transcribing', label: 'Transcribing audio', hint: 'Turning speech into text' },
  { key: 'chunking', label: 'Chunking transcript', hint: 'Splitting into searchable passages' },
  { key: 'summarizing', label: 'Summarizing with AI', hint: 'Generating your summary with the model' },
  { key: 'delivering', label: 'Delivering final answer', hint: 'Packaging your summary' },
] as const satisfies readonly { key: MeetingStage; label: string; hint: string }[]

// Fallback dwell time per step (ms) used only when the backend isn't reporting
// a real stage. The last step has no timeout — it holds until status flips.
const STEP_DURATIONS = [6000, 4000, 8000]

export function ProcessingSteps({
  stage,
  preparing,
}: {
  stage?: MeetingStage | null
  preparing: boolean
}) {
  const stageIndex = stage ? STEPS.findIndex((s) => s.key === stage) : -1
  const backendDriven = stageIndex >= 0

  // Timed fallback used only when the backend hasn't reported a stage yet.
  const [timed, setTimed] = useState(0)
  useEffect(() => {
    if (backendDriven || preparing) return
    if (timed >= STEPS.length - 1) return
    const t = setTimeout(() => setTimed((i) => i + 1), STEP_DURATIONS[timed])
    return () => clearTimeout(t)
  }, [backendDriven, preparing, timed])

  const active = preparing ? 0 : backendDriven ? stageIndex : timed

  return (
    <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {preparing ? 'Getting ready to process…' : STEPS[active].label + '…'}
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">
          This usually takes a few minutes. This page updates automatically.
        </p>
      </div>

      <ol className="mx-auto mt-8 max-w-sm space-y-1">
        {STEPS.map((step, i) => {
          const done = !preparing && i < active
          const current = !preparing && i === active
          return (
            <li
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                current && 'bg-indigo-50',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-indigo-500 text-white',
                  current && 'bg-indigo-100 text-indigo-600',
                  !done && !current && 'bg-slate-100 text-slate-400',
                )}
              >
                {done ? (
                  <Check size={14} strokeWidth={3} />
                ) : current ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex flex-col text-left">
                <span
                  className={cn(
                    'text-sm font-medium',
                    done && 'text-slate-500',
                    current && 'text-indigo-700',
                    !done && !current && 'text-slate-400',
                  )}
                >
                  {step.label}
                </span>
                {current && <span className="text-xs text-indigo-500">{step.hint}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
