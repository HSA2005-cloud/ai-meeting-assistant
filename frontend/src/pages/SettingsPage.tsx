import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, ShieldCheck, Radio, LogOut, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useExtensionPresence } from '../lib/useExtensionPresence'
import { initialsFromEmail } from '../lib/utils'
import { Button } from '../components/ui/Button'

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { user, isDemoMode, signOut } = useAuth()
  const navigate = useNavigate()
  const extensionReady = useExtensionPresence()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwState, setPwState] = useState<{ kind: 'idle' | 'saving' | 'done'; error?: string }>({ kind: 'idle' })

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setPwState({ kind: 'idle', error: 'Password must be at least 6 characters.' })
      return
    }
    if (password !== confirm) {
      setPwState({ kind: 'idle', error: 'Passwords do not match.' })
      return
    }
    if (!supabase) return
    setPwState({ kind: 'saving' })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPwState({ kind: 'idle', error: error.message })
    } else {
      setPwState({ kind: 'done' })
      setPassword('')
      setConfirm('')
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Settings</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Manage your account, security, and recording setup.</p>
      </div>

      <div className="mt-8 space-y-6">
        {/* Account */}
        <Section icon={User} title="Account" description="Your profile details.">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-emerald-100">
              {user ? initialsFromEmail(user.email) : '—'}
            </span>
            <div className="min-w-0">
              {user?.name && <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>}
              <p className="truncate text-sm text-slate-500">{user?.email}</p>
            </div>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              {isDemoMode ? 'Demo account' : 'Signed in'}
            </span>
          </div>
        </Section>

        {/* Security */}
        <Section icon={ShieldCheck} title="Security" description="Update your password.">
          {isDemoMode ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Password management isn't available in demo mode. Connect Supabase to enable it.
            </p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
              {pwState.error && <p className="text-sm text-red-600">{pwState.error}</p>}
              {pwState.kind === 'done' && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 size={15} /> Password updated.
                </p>
              )}
              <Button
                type="submit"
                loading={pwState.kind === 'saving'}
                disabled={!password || !confirm}
                className="px-5 py-2.5"
              >
                Update password
              </Button>
            </form>
          )}
        </Section>

        {/* Recording */}
        <Section icon={Radio} title="Recording" description="Record live browser meetings with the extension.">
          <div className="flex flex-wrap items-center gap-3">
            {extensionReady ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={15} strokeWidth={2.2} /> Extension installed
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500">
                Extension not detected
              </span>
            )}
            <Link to="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              {extensionReady ? 'Go record a meeting →' : 'Set up recording →'}
            </Link>
          </div>
        </Section>

        {/* Sign out */}
        <Section icon={LogOut} title="Session">
          <Button variant="danger" onClick={handleSignOut} className="px-5 py-2.5" icon={<LogOut size={16} />}>
            Log out
          </Button>
        </Section>
      </div>
    </div>
  )
}
