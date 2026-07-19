// A stable place to grant the extension microphone permission. Requesting it
// from the popup is unreliable — Chrome's permission prompt takes focus, which
// closes the popup and cancels the request. A normal tab stays open while the
// user answers, so the grant actually sticks. Once granted, it persists for the
// extension origin, so the offscreen recorder's getUserMedia will succeed too.

const stateEl = document.getElementById('state')
const retryBtn = document.getElementById('retry')

function show(cls, text) {
  stateEl.className = cls
  stateEl.textContent = text
}

async function request() {
  retryBtn.style.display = 'none'
  show('pending', 'Requesting microphone access…')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    // We only needed the grant — release the device immediately.
    stream.getTracks().forEach((t) => t.stop())
    show('ok', '✅ Microphone allowed. You can close this tab and start recording.')
    // Close the tab shortly after so the user is dropped back to their meeting.
    setTimeout(() => window.close(), 1500)
  } catch (e) {
    if (e && e.name === 'NotAllowedError') {
      show('err', '❌ Microphone blocked. Click the 🔒 / camera icon in the address bar, set Microphone to “Allow”, then Try again.')
    } else if (e && e.name === 'NotFoundError') {
      show('err', '❌ No microphone device was found. Connect a mic and Try again.')
    } else {
      show('err', '❌ Could not access the microphone: ' + (e && e.message ? e.message : String(e)))
    }
    retryBtn.style.display = 'inline-block'
  }
}

retryBtn.addEventListener('click', request)
request()
