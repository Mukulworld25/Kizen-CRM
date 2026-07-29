import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export const isSupabaseConfigured = true
