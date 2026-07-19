const startBtn = document.getElementById('start')
const stopBtn = document.getElementById('stop')
const timerEl = document.getElementById('timer')
const statusEl = document.getElementById('status')
const meterWrap = document.getElementById('meterWrap')
const meterBar = document.getElementById('meterBar')
const meterHint = document.getElementById('meterHint')

let tick = null
let lastLevelAt = 0

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function showRecording(startedAt) {
  startBtn.style.display = 'none'
  stopBtn.style.display = 'block'
  meterWrap.style.display = 'block'
  statusEl.innerHTML = '<span class="dot"></span>Recording…'
  clearInterval(tick)
  const update = () => {
    timerEl.textContent = fmt(Date.now() - startedAt)
    // No level updates for ~1.5s while recording => nothing is being captured.
    if (lastLevelAt && Date.now() - lastLevelAt > 1500) setMeter(0, true)
  }
  update()
  tick = setInterval(update, 500)
}

function setMeter(value, silent) {
  meterBar.style.width = Math.round(value * 100) + '%'
  meterBar.style.background = silent ? '#dc2626' : '#10b981'
  meterHint.textContent = silent
    ? 'No audio detected — is the meeting playing in this tab?'
    : 'Audio detected ✓'
  meterHint.style.color = silent ? '#dc2626' : '#9ca3af'
}

function showIdle() {
  startBtn.style.display = 'block'
  stopBtn.style.display = 'none'
  meterWrap.style.display = 'none'
  clearInterval(tick)
  timerEl.textContent = '00:00'
}

// Live audio level from the offscreen recorder while a capture is running.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'level') {
    lastLevelAt = Date.now()
    setMeter(msg.value, msg.value < 0.03)
  }
  if (msg.type === 'mic-status' && !msg.ok) {
    // The offscreen recorder couldn't get the mic — surface it instead of
    // silently recording tab audio only.
    statusEl.textContent = '⚠️ Your mic isn’t being captured — recording tab audio only. Click Start again to grant mic access.'
  }
})

// True only if Chrome has already granted the extension microphone access.
async function micGranted() {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state === 'granted'
  } catch {
    return false // permissions API unavailable — treat as not granted
  }
}

// Reflect current state when the popup opens.
chrome.storage.session.get('rec').then(({ rec }) => {
  if (rec?.recording && rec.startedAt) showRecording(rec.startedAt)
  else showIdle()
  if (rec?.error) statusEl.textContent = 'Last error: ' + rec.error
})

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true
  statusEl.textContent = 'Starting…'

  // The offscreen recorder can't trigger Chrome's mic permission prompt, and
  // requesting it from this popup is unreliable — the prompt steals focus,
  // which closes the popup and cancels the request. So if the grant isn't
  // already in place, send the user to a dedicated tab that requests it (a tab
  // stays open while they answer). We hold off on recording until it's granted,
  // otherwise the first words would be captured tab-audio-only.
  if (!(await micGranted())) {
    startBtn.disabled = false
    statusEl.textContent = 'Grant microphone access in the tab that just opened, then click Start again.'
    chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission.html') })
    return
  }

  const res = await chrome.runtime.sendMessage({ type: 'start' })
  startBtn.disabled = false
  if (res?.ok) {
    showRecording(Date.now())
  } else {
    statusEl.textContent = res?.error || 'Could not start recording.'
  }
})

stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true
  statusEl.textContent = 'Finishing…'
  await chrome.runtime.sendMessage({ type: 'stop' })
  showIdle()
  statusEl.textContent = 'Sent to your app for summarizing.'
  stopBtn.disabled = false
})
