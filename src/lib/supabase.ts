import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Failsafe storage adapter to prevent SecurityError/DOMException in Chrome macOS
const safeStorage = {
  getItem: (key: string) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key)
    } catch {}
  },
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
