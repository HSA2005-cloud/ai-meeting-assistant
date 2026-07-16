import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isDemoMode: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEMO_USER_KEY = 'ai-meeting-assistant:demo-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(sessionToUser(data.session))
        setLoading(false)
      })

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(sessionToUser(session))
      })

      return () => listener.subscription.unsubscribe()
    }

    // Demo mode: no Supabase project configured yet, so auth is a local stub
    // that lets the rest of the app be built/clicked through (Section 6, Week 1).
    try {
      const raw = localStorage.getItem(DEMO_USER_KEY)
      if (raw) setUser(JSON.parse(raw))
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemoMode: !isSupabaseConfigured,
      error,
      clearError: () => setError(null),
      async signIn(email, password) {
        setError(null)
        if (isSupabaseConfigured && supabase) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            setError(signInError.message)
            throw signInError
          }
          return
        }
        if (!email || !password) {
          const err = new Error('Enter an email and password.')
          setError(err.message)
          throw err
        }
        const demoUser: AuthUser = { id: `demo-${email}`, email }
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
        setUser(demoUser)
      },
      async signUp(email, password, name) {
        setError(null)
        if (isSupabaseConfigured && supabase) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          })
          if (signUpError) {
            setError(signUpError.message)
            throw signUpError
          }
          return
        }
        if (!email || !password) {
          const err = new Error('Enter an email and password.')
          setError(err.message)
          throw err
        }
        const demoUser: AuthUser = { id: `demo-${email}`, email, name }
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
        setUser(demoUser)
      },
      async signOut() {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut()
          return
        }
        localStorage.removeItem(DEMO_USER_KEY)
        setUser(null)
      },
    }),
    [user, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function sessionToUser(session: { user: { id: string; email?: string; user_metadata?: { name?: string } } } | null): AuthUser | null {
  if (!session) return null
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.user_metadata?.name,
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
