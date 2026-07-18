// Owns the actual capture. Grabs the meeting tab's audio + the mic, mixes them
// into one stream with the Web Audio API, records it, and returns the result as
// a data URL for the service worker to forward to the web app.

let recorder = null
let chunks = []
let audioCtx = null
let activeTracks = []

async function startRecording(streamId) {
  chunks = []

  // 1. The meeting tab's audio (everyone else on the call).
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  })

  // 2. The user's microphone (their own voice).
  let micStream = null
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  } catch (e) {
    // No mic / denied — still record the tab so the call audio isn't lost.
    console.warn('Microphone unavailable, recording tab audio only:', e)
  }

  // 3. Mix both sources into a single track.
  audioCtx = new AudioContext()
  const dest = audioCtx.createMediaStreamDestination()

  const tabSrc = audioCtx.createMediaStreamSource(tabStream)
  tabSrc.connect(dest)
  // Capturing a tab normally mutes it for the user — route it back to the
  // speakers so they still hear the meeting while recording.
  tabSrc.connect(audioCtx.destination)

  if (micStream) {
    const micSrc = audioCtx.createMediaStreamSource(micStream)
    micSrc.connect(dest)
    // NB: mic is NOT connected to speakers, to avoid an echo/feedback loop.
  }

  activeTracks = [...tabStream.getTracks(), ...(micStream ? micStream.getTracks() : [])]

  // 4. Record the mixed stream, flushing a chunk every second so long meetings
  //    don't accumulate one huge in-memory buffer.
  const mimeType = 'audio/webm'
  recorder = new MediaRecorder(dest.stream, { mimeType })
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  recorder.onstop = handleStop
  recorder.start(1000)
}

async function handleStop() {
  const mimeType = 'audio/webm'
  const blob = new Blob(chunks, { type: mimeType })

  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  chrome.runtime.sendMessage({
    type: 'recording-complete',
    dataUrl,
    mimeType,
    filename: `Meeting recording ${stamp}.webm`,
  })

  cleanup()
}

function cleanup() {
  activeTracks.forEach((t) => t.stop())
  activeTracks = []
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
  recorder = null
  chunks = []
  // Close the offscreen document; it'll be recreated for the next recording.
  window.close()
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return
  if (msg.type === 'start-recording') {
    startRecording(msg.streamId).catch((e) => {
      chrome.runtime.sendMessage({ type: 'recording-error', error: String(e) })
      cleanup()
    })
  }
  if (msg.type === 'stop-recording') {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }
})
