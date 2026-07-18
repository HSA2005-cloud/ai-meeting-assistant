// Runs on the AI Meeting Assistant web app. It's the bridge between the
// extension and the page: it receives the finished recording from the service
// worker and forwards it into the page via window.postMessage, where the app's
// own (already-logged-in) code uploads it.

// Let the web app know the extension is installed, so it can show "ready to
// record" instead of "install the extension". We both announce on load and
// answer the app's ping (in case the app mounted after this script ran).
function announcePresence() {
  window.postMessage({ source: 'meeting-recorder-ext', type: 'present' }, window.location.origin)
}
announcePresence()
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== window.location.origin) return
  if (e.data?.source === 'meeting-recorder-app' && e.data?.type === 'ping') announcePresence()
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'deliver-recording') {
    window.postMessage(
      {
        source: 'meeting-recorder-ext',
        type: 'recording',
        dataUrl: msg.dataUrl,
        mimeType: msg.mimeType,
        filename: msg.filename,
      },
      window.location.origin,
    )
    sendResponse({ ok: true })
  }
  return true
})
