import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Kizen CRM — Admissions Operations',
  description: 'B2B admissions CRM for coaching institute staff. Manage leads, pipeline, and enrollment.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0F1A2E' },
    { media: '(prefers-color-scheme: light)', color: '#F5F7FB' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} bg-background`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}
