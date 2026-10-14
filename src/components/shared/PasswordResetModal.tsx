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

  const [successDetails, setSuccessDetails] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isSelf = targetUser?.id === currentUser?.id || (!targetUser && currentUser)
  const targetEmail = targetUser?.email ?? currentUser?.email ?? ''
  const targetName = targetUser?.name ?? currentUser?.name ?? 'User'

  const handleCopyCredentials = () => {
    if (!successDetails) return
    const text = `Kizen CRM Login Credentials\nURL: ${window.location.origin}/login\nEmail: ${successDetails.email}\nPassword: ${successDetails.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Credentials copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

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
        setNewPassword('')
        setConfirmPassword('')
        onOpenChange(false)
      } else {
        // Owner resetting another user's password directly via RPC
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_set_user_password', {
          target_user_id: targetUser?.id,
          new_password: newPassword,
        })

        if (rpcErr) {
          throw new Error(rpcErr.message || 'Failed to update user password')
        }

        toast.success(`Password for ${targetName} updated successfully!`)
        setSuccessDetails({ email: targetEmail, password: newPassword })
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setSuccessDetails(null)
        setNewPassword('')
        setConfirmPassword('')
      }
      onOpenChange(o)
    }}>
      <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl">
        {successDetails ? (
          <div className="space-y-4 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Password Updated!</h3>
              <p className="text-xs text-muted-foreground">
                The password for <strong className="text-slate-800">{targetName}</strong> has been updated in the database.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-slate-50 p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-semibold text-slate-800">{successDetails.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">New Password:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {successDetails.password}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-950" /> : <Key className="h-4 w-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Login Credentials'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const text = encodeURIComponent(`Kizen CRM Login Credentials\nURL: ${window.location.origin}/login\nEmail: ${successDetails.email}\nPassword: ${successDetails.password}`)
                  window.open(`https://wa.me/?text=${text}`, '_blank')
                }}
                className="w-full rounded-xl gap-2 text-xs"
              >
                Share via WhatsApp
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSuccessDetails(null)
                  onOpenChange(false)
                }}
                className="w-full text-xs text-muted-foreground"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                  : `Enter the new password to set directly for ${targetEmail}.`}
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
                  <span>The new password will be activated immediately and logged in Security Activity Logs.</span>
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? 'Updating...' : isSelf ? 'Update Password' : 'Confirm Password Update'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
