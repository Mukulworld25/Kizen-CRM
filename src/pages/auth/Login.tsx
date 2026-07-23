import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
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
      {/* Ambient background lighting */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      {/* Main Container - Explicit background & text colors to guarantee 100% text contrast */}
      <div
        className="animate-card-in relative w-full max-w-md border border-amber-500/30 shadow-2xl shadow-black/80 rounded-3xl overflow-hidden"
        style={{ backgroundColor: '#1C2D4E', color: '#FFFFFF' }}
      >
        {/* Top Gold Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        <div className="p-8 text-center pb-4">
          {/* Full Un-cropped Kizen Education Logo */}
          <div className="mx-auto mb-4 flex h-16 w-full max-w-[220px] items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-2 ring-amber-400/40">
            <img
              src={kizenLogo}
              alt="Kizen Education"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
            Kizen Education
          </h1>
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mt-1">
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
              <Label htmlFor="email" className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@kizeneducation.com"
                  {...register('email')}
                  className="pl-10 h-11 bg-[#0F172A] border-slate-600 text-white font-medium placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/30 rounded-xl transition-all"
                  style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 font-semibold pl-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="password" className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="pl-10 h-11 bg-[#0F172A] border-slate-600 text-white font-medium placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/30 rounded-xl transition-all"
                  style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}
                />
              </div>
              {errors.password && <p className="text-xs text-rose-400 font-semibold pl-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black tracking-wide rounded-xl shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: '#F5A623', color: '#090D16' }}
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span className="text-sm font-extrabold">Sign In to CRM</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* SAGEDO Partner Footer Logo */}
          <div className="mt-8 pt-4 border-t border-slate-700/60 flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold">
            <span>Powered by</span>
            <img
              src={sagedoLogo}
              alt="SAGE DO"
              className="h-5 object-contain rounded bg-white p-0.5"
            />
            <span className="font-extrabold text-amber-400 tracking-wide">SAGEDO</span>
          </div>
        </div>
      </div>
    </div>
  )
}
