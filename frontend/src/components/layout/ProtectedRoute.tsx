import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { Sidebar } from './Sidebar'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-700" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[280px]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <span className="text-sm font-semibold text-slate-900">AI Meeting Assistant</span>
        </div>

        <main className="mx-auto max-w-[1300px] px-6 py-10 sm:px-10 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  )
}
