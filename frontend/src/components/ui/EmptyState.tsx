import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-lg animate-fade-in flex-col items-center justify-center rounded-[20px] border border-[#EAEAEA] bg-white px-8 py-16 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.06)]">
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[#111827]">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
