import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, id, className, ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition-colors',
          'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
          error ? 'border-red-400' : 'border-slate-300',
          className,
        )}
        {...rest}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
