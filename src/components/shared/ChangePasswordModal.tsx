import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Key, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setSuccess(false)
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('user_change_own_password', {
        new_password: newPassword.trim(),
      })

      if (error) throw error
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to update password')
      }

      setSuccess(true)
      toast.success('Your password has been changed successfully!')
    } catch (err) {
      console.error('Password change error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {success ? (
          <div className="space-y-4 py-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Password Changed Successfully!
              </DialogTitle>
              <p className="text-xs text-muted-foreground px-4">
                Your new password is now active immediately. This activity has been recorded in the security activity logs.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Use this new password next time you sign into Kizen CRM.</span>
            </div>
            <Button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">Change Your Password</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Update your personal login password securely.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="change_new_password" className="text-xs font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="change_new_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 text-sm rounded-xl font-mono"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="change_confirm_password" className="text-xs font-medium">Confirm New Password</Label>
                <Input
                  id="change_confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-sm rounded-xl font-mono"
                  required
                  minLength={6}
                />
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-[11px] text-muted-foreground border border-border flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Password updates take effect across all active sessions instantly and are logged to security audit trails.</span>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                >
                  <Key className="h-4 w-4" />
                  {loading ? 'Changing...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
