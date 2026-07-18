import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AudioLines,
  BarChart3,
  ChevronDown,
  CircleHelp,
  LayoutGrid,
  LogOut,
  Settings,
  UploadCloud,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn, initialsFromEmail } from '../../lib/utils'

interface NavItem {
  label: string
  icon: typeof LayoutGrid
  to?: string
}

const navItems: NavItem[] = [
  { label: 'Meetings', icon: LayoutGrid, to: '/' },
  { label: 'Upload Recording', icon: UploadCloud, to: '/?upload=1' },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden rounded-r-[28px] bg-[#052E2B] transition-transform duration-300 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary"
      >
        {/* Subtle wave/grid backdrop pattern */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 280 800"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="sidebar-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="280" height="800" fill="url(#sidebar-grid)" />
          <path
            d="M0 120 C 60 80, 100 160, 160 120 S 260 80, 280 120"
            stroke="white"
            strokeWidth="1.4"
            fill="none"
          />
          <path
            d="M0 620 C 60 580, 100 660, 160 620 S 260 580, 280 620"
            stroke="white"
            strokeWidth="1.4"
            fill="none"
          />
        </svg>

        <div className="relative flex items-center justify-between px-6 pt-7 pb-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-200">
              <AudioLines size={20} strokeWidth={1.8} />
            </span>
            <span className="text-[15px] font-semibold text-white">AI Meeting Assistant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="relative flex-1 space-y-1 px-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.label === 'Meetings' && (location.pathname === '/' || location.pathname.startsWith('/meetings/'))
            const Icon = item.icon

            if (!item.to) {
              return (
                <div
                  key={item.label}
                  role="button"
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/35"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={22} strokeWidth={1.8} />
                    {item.label}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Soon
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon size={22} strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div ref={profileRef} className="relative mt-auto space-y-1 px-4 pb-6">
          {profileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#0a3c37] shadow-lg animate-fade-in z-10">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} strokeWidth={1.8} />
                Log out
              </button>
            </div>
          )}

          <a
            href="mailto:support@aimeetingassistant.app"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white"
          >
            <CircleHelp size={22} strokeWidth={1.8} />
            Help
          </a>

          {user && (
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white/5"
              aria-expanded={profileOpen}
              aria-label="Account menu"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-semibold text-emerald-100">
                {initialsFromEmail(user.email)}
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-sm text-white/85">{user.email}</span>
              <ChevronDown size={16} strokeWidth={1.8} className="shrink-0 text-white/50" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
