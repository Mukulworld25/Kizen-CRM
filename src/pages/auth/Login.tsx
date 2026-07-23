import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { isSupabaseConfigured } from '@/lib/supabase'
import kizenLogo from '@/assets/kizen-logo-transparent.png'
import sagedoLogo from '@/assets/sagedo-logo.jpeg'
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#060B18] p-4 overflow-hidden select-none">
      {/* Royal ambient lighting & glowing mesh background */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-amber-400/5 blur-[180px] pointer-events-none" />

      {/* Main Royal Card Container */}
      <div
        className="animate-card-in relative w-full max-w-md border-2 border-amber-400/40 shadow-[0_15px_60px_rgba(0,0,0,0.85)] rounded-3xl overflow-hidden backdrop-blur-2xl"
        style={{ backgroundColor: '#0D162D', color: '#FFFFFF' }}
      >
        {/* Top Gold Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 shadow-md" />

        <div className="p-8 text-center pb-4">
          {/* 100% Transparent Logo — Completely free-floating, NO box, NO border */}
          <div className="mx-auto mb-3 flex items-center justify-center pt-2">
            <img
              src={kizenLogo}
              alt="Kizen Education"
              className="h-16 w-auto max-w-[260px] object-contain filter drop-shadow-[0_0_18px_rgba(245,166,35,0.45)]"
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 bg-clip-text text-transparent drop-shadow-md">
              Kizen Education
            </h1>
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          </div>

          <p className="text-amber-400/90 text-[11px] font-extrabold tracking-[0.2em] uppercase mt-1">
            ENTERPRISE CRM PORTAL — SIGN IN
          </p>
        </div>

        <div className="px-8 pb-8 pt-2">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl bg-amber-500/20 p-3 text-xs text-amber-200 border border-amber-500/40 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-xs font-bold text-amber-300/90 uppercase tracking-widest pl-1">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@kizeneducation.com"
                  {...register('email')}
                  className="pl-10 h-11 bg-[#060B18] border-amber-500/30 text-white font-medium placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/30 rounded-xl transition-all shadow-inner"
                  style={{ backgroundColor: '#060B18', color: '#FFFFFF', borderColor: 'rgba(245,166,35,0.35)' }}
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 font-semibold pl-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="password" className="text-xs font-bold text-amber-300/90 uppercase tracking-widest pl-1">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400/70" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="pl-10 h-11 bg-[#060B18] border-amber-500/30 text-white font-medium placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/30 rounded-xl transition-all shadow-inner"
                  style={{ backgroundColor: '#060B18', color: '#FFFFFF', borderColor: 'rgba(245,166,35,0.35)' }}
                />
              </div>
              {errors.password && <p className="text-xs text-rose-400 font-semibold pl-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black tracking-wider rounded-xl shadow-[0_4px_25px_rgba(245,166,35,0.4)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-yellow-200/50"
              style={{ backgroundColor: '#F5A623', color: '#060B18' }}
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span className="text-sm font-black uppercase tracking-wider">Sign In to CRM</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* SAGEDO Partner Footer Logo */}
          <div className="mt-8 pt-4 border-t border-amber-500/20 flex items-center justify-center gap-2.5 text-xs text-slate-300 font-semibold">
            <span className="text-slate-400">Powered by</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#060B18] border border-amber-500/30 shadow-sm">
              <img
                src={sagedoLogo}
                alt="SAGE DO"
                className="h-4 object-contain rounded"
              />
              <span className="font-extrabold text-amber-400 tracking-wider text-[11px]">SAGEDO AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
