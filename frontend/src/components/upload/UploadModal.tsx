import { useRef, useState, type DragEvent } from 'react'
import { isAcceptedFile, uploadMeeting } from '../../mocks/uploadMock'
import { formatBytes } from '../../lib/utils'
import { Button } from '../ui/Button'

export function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    try {
      await uploadMeeting(file, setProgress)
      onUploaded()
    } catch {
      setError('Upload failed. Please try again.')
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={uploading ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">Upload a recording</h2>
        <p className="mt-1 text-sm text-slate-500">Audio or video — we'll extract audio automatically and transcribe it.</p>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-400">
            <path d="M12 16V4m0 0L7 9m5-5l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="mt-2 text-sm text-slate-600">
            {file ? file.name : 'Drag & drop a file here, or click to browse'}
          </p>
          {file && <p className="mt-0.5 text-xs text-slate-400">{formatBytes(file.size)}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Uploading… {progress}%</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file} loading={uploading}>
            Upload
          </Button>
        </div>
      </div>
    </div>
  )
}
