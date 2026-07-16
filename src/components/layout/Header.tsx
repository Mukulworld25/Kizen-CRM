import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, Sun, Moon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications, useMarkNotificationRead } from '@/hooks/useStudents'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { roleLabels } from '@/lib/permissions'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Dark/Light mode
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('kizen-theme')
    if (stored) return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
    localStorage.setItem('kizen-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6 shadow-sm" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-border shadow-lg">
            <DropdownMenuLabel className="text-primary">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-sm">{n.title}</span>
                    {!n.is_read && <Badge variant="default" className="text-[10px]">New</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--muted)] transition-colors border border-transparent hover:border-border">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                  {profile?.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.name}</p>
                <Badge variant="secondary" className="text-[10px]">{profile ? roleLabels[profile.role] : ''}</Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border shadow-lg">
            <DropdownMenuLabel className="text-primary">{profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}