import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured } from '@/lib/supabase'
import kizenLogo from '@/assets/kizen-logo.jpg'
import sagedoLogo from '@/assets/sagedo-logo.jpeg'
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react'

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

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B132B] p-4 overflow-hidden select-none">
      {/* Ambient background glow mesh */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <Card className="animate-card-in relative w-full max-w-md border border-white/10 bg-[#1C2D4E]/80 backdrop-blur-xl shadow-2xl shadow-black/50 text-white rounded-3xl overflow-hidden">
        {/* Top Gold Accent Border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        <CardHeader className="text-center pt-8 pb-4">
          {/* Kizen Education Logo */}
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 p-2 shadow-xl ring-1 ring-white/20 group transition-all duration-300 hover:scale-105 hover:ring-amber-400/50">
            <img
              src={kizenLogo}
              alt="Kizen Education"
              className="h-full w-full rounded-xl object-cover shadow-inner"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-transparent pointer-events-none" />
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            Kizen Education
          </CardTitle>
          <CardDescription className="text-slate-300 text-xs font-medium tracking-wide mt-1">
            ENTERPRISE CRM PORTAL — SIGN IN TO CONTINUE
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl bg-amber-500/15 p-3 text-xs text-amber-300 border border-amber-500/30 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@kizeneducation.com"
                  {...register('email')}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 font-medium pl-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-400 font-medium pl-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold tracking-wide rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* SAGEDO Partner Footer Logo */}
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <span>Powered by</span>
            <img
              src={sagedoLogo}
              alt="SAGE DO"
              className="h-5 object-contain rounded bg-white/10 p-0.5"
            />
            <span className="font-semibold text-slate-300">SAGEDO</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
