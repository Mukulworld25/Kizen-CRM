'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function DarkModeToggle() {
  // Read the actual HTML class on mount so we're never out of sync
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    // Initialise from the real DOM state (dark = no .light class)
    setIsDark(!document.documentElement.classList.contains('light'))
  }, [])

  useEffect(() => {
    if (isDark === null) return
    if (isDark) {
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
    }
  }, [isDark])

  // Don't render until we've read the DOM — avoids icon flash
  if (isDark === null) return <div className="w-8 h-8" />

  return (
    <button
      onClick={() => setIsDark((d) => !d)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      {/* Sun = currently dark, click to go light */}
      {isDark ? (
        <Sun className="w-4 h-4 transition-all duration-300" />
      ) : (
        /* Moon = currently light, click to go dark */
        <Moon className="w-4 h-4 transition-all duration-300" />
      )}
    </button>
  )
}
