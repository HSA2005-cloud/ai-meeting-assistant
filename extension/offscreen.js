// Owns the actual capture. Grabs the meeting tab's audio + the mic, mixes them
// into one stream with the Web Audio API, records it, and returns the result as
// a data URL for the service worker to forward to the web app.

let recorder = null
let chunks = []
let audioCtx = null
let activeTracks = []
let levelAnalyser = null
let peakLevel = 0
let levelTimer = null

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
  let micError = null
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
      video: false,
    })
    console.log('[Meeting Recorder] Microphone acquired:', micStream.getAudioTracks().map(t => t.label))
  } catch (e) {
    // No mic / denied — still record the tab so the call audio isn't lost, but
    // surface why so the user isn't left wondering where their voice went.
    if (e.name === 'NotAllowedError') {
      micError = 'permission-denied'
      console.warn('[Meeting Recorder] Microphone permission denied — recording tab audio only.', e)
    } else if (e.name === 'NotFoundError') {
      micError = 'no-device'
      console.warn('[Meeting Recorder] No microphone device found.', e)
    } else {
      micError = e.name || 'unknown'
      console.warn('[Meeting Recorder] Microphone unavailable, recording tab audio only:', e)
    }
  }
  // Tell the popup/background whether the mic made it into the mix, so a missing
  // voice track is visible rather than silently dropped.
  chrome.runtime.sendMessage({ type: 'mic-status', ok: !!micStream, error: micError }).catch(() => {})

  // 3. Mix both sources into a single track.
  audioCtx = new AudioContext()
  // Offscreen documents have no user gesture, so the AudioContext can start
  // "suspended" — in which case the mixing graph produces total silence and the
  // recording transcribes to nothing. Force it running.
  if (audioCtx.state === 'suspended') await audioCtx.resume()

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

  // Tap the mixed signal to measure whether any audio is actually flowing, so a
  // silent capture is caught here instead of surfacing as a "you you you"
  // transcript downstream.
  levelAnalyser = audioCtx.createAnalyser()
  levelAnalyser.fftSize = 2048
  const meterSrc = audioCtx.createMediaStreamSource(dest.stream)
  meterSrc.connect(levelAnalyser)
  peakLevel = 0
  const buf = new Uint8Array(levelAnalyser.fftSize)
  levelTimer = setInterval(() => {
    levelAnalyser.getByteTimeDomainData(buf)
    let peak = 0
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) // 128 == silence for time-domain data
      if (v > peak) peak = v
    }
    if (peak > peakLevel) peakLevel = peak
    // Broadcast the instantaneous level (0..1) so the popup can show a live
    // meter. No-op when the popup is closed (nothing is listening).
    chrome.runtime.sendMessage({ type: 'level', value: Math.min(1, peak / 64) }).catch(() => {})
  }, 200)

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
  // peakLevel is 0..127 (distance from the silence midpoint). A handful of
  // counts is just noise; treat anything below ~2 as "nothing was captured".
  const silent = peakLevel < 2
  console.log('[Meeting Recorder] capture peak level:', peakLevel, silent ? '(SILENT!)' : '')

  chrome.runtime.sendMessage({
    type: 'recording-complete',
    dataUrl,
    mimeType,
    filename: `Meeting recording ${stamp}.webm`,
    silent,
  })

  cleanup()
}

function cleanup() {
  if (levelTimer) {
    clearInterval(levelTimer)
    levelTimer = null
  }
  levelAnalyser = null
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
