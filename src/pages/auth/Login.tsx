import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast.error('Enter your email address')
      return
    }
    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      toast.success('Password reset link sent! Check your email.')
      setResetMode(false)
      setResetEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-2xl font-bold text-white shadow-lg shadow-primary/20">
            K
          </div>
          <CardTitle className="text-2xl font-bold">Kizen Education</CardTitle>
          <CardDescription>CRM Portal — Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl bg-accent/10 p-3 text-sm text-amber-800 border border-accent/20">
              Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@kizeneducation.com" {...register('email')} />
              {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-xs text-sky-600 hover:text-sky-800 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Powered by SAGEDO</p>
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      {resetMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-2xl font-bold text-white shadow-lg">
                <Mail className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
              <CardDescription>Enter your email to receive a password reset link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@kizeneducation.com"
                />
              </div>
              <Button className="w-full" onClick={handlePasswordReset} disabled={sendingReset}>
                {sendingReset ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
