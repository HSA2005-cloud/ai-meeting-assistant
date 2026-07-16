import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set (e.g. running the
// frontend lane standalone before Supabase project keys exist), AuthContext
// falls back to a local mock so the rest of the app stays clickable.
export const supabase = isSupabaseConfigured ? createClient(url as string, anonKey as string) : null
