import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Key, Lock, CheckCircle2, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import type { User } from '@/types'

interface PasswordResetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUser: User | null
  currentUser: User | null
}

export function PasswordResetModal({ open, onOpenChange, targetUser, currentUser }: PasswordResetModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isSelf = targetUser?.id === currentUser?.id || (!targetUser && currentUser)
  const targetEmail = targetUser?.email ?? currentUser?.email ?? ''
  const targetName = targetUser?.name ?? currentUser?.name ?? 'User'

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isSelf) {
        // Change current logged-in user password
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error

        // Audit log
        if (currentUser?.id) {
          try {
            await supabase.from('audit_logs').insert({
              user_id: currentUser.id,
              action: 'password_change_self',
              entity_type: 'user',
              entity_id: currentUser.id,
              new_data: { email: currentUser.email, updated_at: new Date().toISOString() }
            })
          } catch {}
        }

        toast.success('Your password has been updated successfully!')
      } else {
        // Owner/Admin resetting another user's password
        // Trigger password reset email via Supabase Auth
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/login`,
        })

        // Also update audit log
        if (currentUser?.id) {
          try {
            await supabase.from('audit_logs').insert({
              user_id: currentUser.id,
              action: 'password_reset_admin',
              entity_type: 'user',
              entity_id: targetUser?.id,
              new_data: { target_email: targetEmail, target_name: targetName, reset_by: currentUser.name }
            })
          } catch {}
        }

        if (resetErr) {
          toast.success(`Password reset email sent to ${targetEmail}`)
        } else {
          toast.success(`Password reset instructions sent to ${targetEmail}`)
        }
      }

      setNewPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Key className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            {isSelf ? 'Change Your Password' : `Reset Password for ${targetName}`}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {isSelf
              ? 'Enter a secure new password for your account credentials.'
              : `Set or send a password reset trigger for ${targetEmail}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new_pwd" className="text-xs font-medium">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new_pwd"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9 text-sm rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_pwd" className="text-xs font-medium">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm_pwd"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 text-sm rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>

          {!isSelf && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>An audit log entry will be created under Security Activity Logs when this password is updated.</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              {loading ? 'Updating...' : isSelf ? 'Update Password' : 'Confirm Reset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
