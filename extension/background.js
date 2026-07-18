// Service worker: orchestrates recording. It can't touch getUserMedia/MediaRecorder
// itself (no DOM in a worker), so the actual capture happens in an offscreen
// document. This file just wires the popup <-> offscreen <-> web app together.

// The origin of your AI Meeting Assistant web app. Change this (and the matching
// entries in manifest.json: host_permissions + content_scripts.matches) when you
// deploy to a real domain.
const APP_ORIGIN = 'http://localhost:5173'

const OFFSCREEN_PATH = 'offscreen.html'

// --- offscreen document lifecycle -----------------------------------------

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })
  return contexts.length > 0
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'Record and mix meeting tab audio with the microphone.',
  })
}

// --- recording state (kept in storage so the popup can read it) -----------

async function setState(patch) {
  const cur = (await chrome.storage.session.get('rec')).rec ?? {}
  await chrome.storage.session.set({ rec: { ...cur, ...patch } })
}

// --- start / stop ----------------------------------------------------------

async function startRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) throw new Error('No active tab to record.')

  // A stream id the offscreen document can hand to getUserMedia to grab THIS
  // tab's audio. Must be obtained from a user gesture (the popup click).
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id })

  await ensureOffscreen()
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'start-recording', streamId })

  await setState({ recording: true, startedAt: Date.now(), tabTitle: tab.title })
}

async function stopRecording() {
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' })
  await setState({ recording: false })
}

// --- hand the finished recording to the logged-in web app ------------------

async function deliverToApp(payload) {
  let [tab] = await chrome.tabs.query({ url: APP_ORIGIN + '/*' })
  if (!tab) {
    tab = await chrome.tabs.create({ url: APP_ORIGIN, active: true })
  }
  // Bring the app tab forward so the user sees the upload/processing UI.
  await chrome.tabs.update(tab.id, { active: true })

  // The content script may not be ready the instant the tab loads — retry.
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'deliver-recording', ...payload })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  console.error('Could not deliver recording to the app tab.')
}

// --- message router --------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'start') {
    startRecording()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true // async response
  }
  if (msg.type === 'stop') {
    stopRecording()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
  if (msg.type === 'recording-complete') {
    // From the offscreen document once the audio blob is ready (as a data URL).
    deliverToApp({
      dataUrl: msg.dataUrl,
      mimeType: msg.mimeType,
      filename: msg.filename,
    })
    setState({ recording: false })
  }
  if (msg.type === 'recording-error') {
    setState({ recording: false, error: msg.error })
  }
})
