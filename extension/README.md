# Meeting Recorder — browser extension

A Chrome/Edge (Manifest V3) extension that records a **browser** meeting's audio
(everyone on the call) mixed with **your microphone**, then hands the recording to
your logged-in AI Meeting Assistant web app, which uploads it to the existing
`/meetings/upload` pipeline. The result is a normal meeting you can open anytime.

Works for **browser-based** meetings — Google Meet, Zoom "join from browser".
It does **not** capture Zoom/Teams **desktop apps** (there's no browser tab to
tap), and on macOS Chrome can't capture other apps' system audio at all.

## How it fits together

```
Meeting tab audio ─┐
                   ├─ offscreen.js mixes ─▶ MediaRecorder ─▶ audio blob
Your microphone  ──┘
        │ (data URL)
        ▼
background.js ─▶ content.js (on your web app) ─▶ window.postMessage
        ▼
ExtensionRecordingBridge.tsx ─▶ uploadMeeting() ─▶ /meetings/upload ─▶ summary
```

The web app does the upload with its **own** Supabase session, so the extension
never handles auth tokens.

## Files

| File | Role |
|------|------|
| `manifest.json` | Permissions + entry points |
| `popup.html` / `popup.js` | Start/Stop button + timer |
| `background.js` | Service worker: gets the tab stream id, drives the offscreen doc, delivers the result |
| `offscreen.html` / `offscreen.js` | Captures tab + mic, mixes, records |
| `content.js` | Runs on the web app; forwards the recording into the page |

## Load it (unpacked, for testing)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the extension so its icon is visible.

## Try it

1. Start the web app (`npm run dev` in `frontend/`) and **log in** — leave the tab open.
2. Open a meeting in a browser tab (e.g. Google Meet).
3. Click the extension icon on the meeting tab → **Start recording**. Allow the
   microphone prompt the first time.
4. Talk / let the meeting run, then **Stop & summarize**.
5. The extension switches you to the web app tab, which uploads the recording and
   opens its (processing → summary) page.

## Configuring for production

The dev origin `http://localhost:5173` is hardcoded in three places — update all
of them to your deployed web app origin:

- `manifest.json` → `host_permissions`
- `manifest.json` → `content_scripts[0].matches`
- `background.js` → `APP_ORIGIN`

## Known limitations (v0.1)

- Browser meetings only (see above).
- No speaker labels — tab + mic are mixed into one track.
- The finished audio is passed as a data URL, which is fine for typical meetings
  but can get large for very long ones; a future version could stream/chunk the
  hand-off instead.
- The web app tab must be open and logged in for the upload to succeed.
