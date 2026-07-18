import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadMeeting } from '../mocks/uploadMock'

/**
 * Receives a finished recording from the Meeting Recorder browser extension and
 * uploads it through the app's own (already authenticated) upload flow, then
 * routes to the new meeting. The extension's content script forwards the audio
 * into the page via window.postMessage — see extension/content.js.
 *
 * Mounted once, inside the router + auth provider, so it can reuse the session
 * and navigate. Renders only a small status toast while a recording uploads.
 */
type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string }

export function ExtensionRecordingBridge() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'idle' })

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      // Only trust same-window, same-origin messages from our extension bridge.
      if (event.source !== window || event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.source !== 'meeting-recorder-ext' || data.type !== 'recording') return

      try {
        setState({ kind: 'uploading', progress: 0 })
        const blob = await (await fetch(data.dataUrl)).blob()
        const file = new File([blob], data.filename ?? 'Meeting recording.webm', {
          type: data.mimeType ?? 'audio/webm',
        })
        const result = await uploadMeeting(file, (p) => setState({ kind: 'uploading', progress: p }))
        setState({ kind: 'idle' })
        navigate(`/meetings/${result.meeting_id}`, {
          state: result.duplicate ? { duplicate: true } : undefined,
        })
      } catch {
        setState({ kind: 'error', message: 'Could not upload the recording. Please try again.' })
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate])

  if (state.kind === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {state.kind === 'uploading' ? (
        <>
          <p className="text-sm font-semibold text-slate-900">Uploading recording…</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{state.progress}%</p>
        </>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-red-600">{state.message}</p>
          <button
            onClick={() => setState({ kind: 'idle' })}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
