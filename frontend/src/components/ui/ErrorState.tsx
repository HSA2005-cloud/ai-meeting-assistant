import { Button } from './Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-[20px] border border-red-200 bg-red-50 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-red-800">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
