const startBtn = document.getElementById('start')
const stopBtn = document.getElementById('stop')
const timerEl = document.getElementById('timer')
const statusEl = document.getElementById('status')

let tick = null

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function showRecording(startedAt) {
  startBtn.style.display = 'none'
  stopBtn.style.display = 'block'
  statusEl.innerHTML = '<span class="dot"></span>Recording…'
  clearInterval(tick)
  const update = () => (timerEl.textContent = fmt(Date.now() - startedAt))
  update()
  tick = setInterval(update, 500)
}

function showIdle() {
  startBtn.style.display = 'block'
  stopBtn.style.display = 'none'
  clearInterval(tick)
  timerEl.textContent = '00:00'
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
