import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AudioLines, UploadCloud, Mic, FileText, MessageSquare, Radio, CheckCircle2, ChevronDown } from 'lucide-react'
import { isAcceptedFile, uploadMeeting } from '../mocks/uploadMock'
import { formatBytes } from '../lib/utils'
import { useExtensionPresence } from '../lib/useExtensionPresence'
import { Button } from '../components/ui/Button'

export function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRecordSteps, setShowRecordSteps] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const extensionReady = useExtensionPresence()

  function handleFiles(files: FileList | null) {
    const next = files?.[0]
    if (!next) return
    if (!isAcceptedFile(next)) {
      setError('Please choose an audio or video file.')
      return
    }
    setError(null)
    setFile(next)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    if (!file) return
    setProgress(0)
    setError(null)
    try {
      const result = await uploadMeeting(file, setProgress)
      navigate(`/meetings/${result.meeting_id}`, {
        state: result.duplicate ? { duplicate: true } : undefined,
      })
    } catch {
      setError('Upload failed. Please try again.')
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="mt-4 text-center sm:mt-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 shadow-sm">
          <AudioLines size={32} strokeWidth={1.6} className="text-emerald-700" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
          AI Meeting Assistant
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-[#6B7280]">
          Upload a recording and get transcripts, summaries, action items, and an AI chatbot — all in minutes.
        </p>
      </div>

      {/* Upload area */}
      <div className="mt-10 w-full max-w-xl">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
              : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow-md'
          }`}
        >
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
            isDragging ? 'bg-emerald-100' : 'bg-slate-100'
          }`}>
            <UploadCloud size={28} strokeWidth={1.6} className={isDragging ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-700">
            {file ? file.name : 'Drag & drop your recording here'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {file ? formatBytes(file.size) : 'Supports audio and video files (MP3, WAV, MP4, MOV, etc.)'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-500">Uploading… {progress}%</p>
          </div>
        )}

        <div className="mt-5 flex justify-center gap-3">
          {file && !uploading && (
            <Button variant="secondary" onClick={() => { setFile(null); setError(null) }}>
              Clear
            </Button>
          )}
          <Button onClick={handleUpload} disabled={!file} loading={uploading} icon={<UploadCloud size={18} strokeWidth={1.8} />}>
            Upload Recording
          </Button>
        </div>
      </div>

      {/* Record a live meeting (browser extension) */}
      <div className="mt-6 w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <Radio size={22} strokeWidth={1.7} className="text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Record a live meeting</h3>
                {extensionReady ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={12} strokeWidth={2.5} /> Extension detected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Extension needed
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Capture a Google Meet or browser Zoom call — everyone's audio plus your mic — straight from your
                browser. When you stop, the summary lands here automatically.
              </p>

              {extensionReady ? (
                <p className="mt-3 text-sm text-slate-600">
                  You're all set. Open your meeting tab, click the{' '}
                  <span className="font-medium text-slate-900">Meeting Recorder</span> icon, and hit{' '}
                  <span className="font-medium text-slate-900">Start recording</span>.
                </p>
              ) : (
                <button
                  onClick={() => setShowRecordSteps((s) => !s)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  How to set it up
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${showRecordSteps ? 'rotate-180' : ''}`}
                  />
                </button>
              )}

              {!extensionReady && showRecordSteps && (
                <ol className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  <li>
                    1. In Chrome or Edge, open <span className="font-mono text-xs">chrome://extensions</span> and turn
                    on <span className="font-medium text-slate-900">Developer mode</span>.
                  </li>
                  <li>
                    2. Click <span className="font-medium text-slate-900">Load unpacked</span> and select the{' '}
                    <span className="font-mono text-xs">extension/</span> folder from this project.
                  </li>
                  <li>3. Pin the extension, then reload this page — you'll see “Extension detected” above.</li>
                  <li>4. Open your meeting tab, click the extension, and start recording.</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Mic, title: 'Transcribe', desc: 'Automatic speech-to-text with Whisper AI' },
          { icon: FileText, title: 'Summarize', desc: 'Key points, decisions, and action items' },
          { icon: MessageSquare, title: 'Chat', desc: 'Ask questions grounded in your transcript' },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-5 py-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Icon size={20} strokeWidth={1.6} className="text-emerald-700" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
