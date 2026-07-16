import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initialsFromEmail } from '../../lib/utils'
import { Button } from '../ui/Button'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M5 11v1a7 7 0 0014 0v-1M12 19v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span>Meeting Assistant</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                {initialsFromEmail(user.email)}
              </span>
              <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
            </div>
            <Button variant="ghost" onClick={handleSignOut}>
              Log out
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
