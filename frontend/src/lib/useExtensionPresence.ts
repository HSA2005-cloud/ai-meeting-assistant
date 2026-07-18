import { useEffect, useState } from 'react'

/**
 * True once the Meeting Recorder browser extension announces itself (see
 * extension/content.js). We ping on mount in case the extension's content
 * script loaded before this app did, and also listen for its unsolicited
 * "present" announcement.
 */
export function useExtensionPresence(): boolean {
  const [present, setPresent] = useState(false)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return
      if (event.data?.source === 'meeting-recorder-ext' && event.data?.type === 'present') {
        setPresent(true)
      }
    }
    window.addEventListener('message', onMessage)
    window.postMessage({ source: 'meeting-recorder-app', type: 'ping' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return present
}
