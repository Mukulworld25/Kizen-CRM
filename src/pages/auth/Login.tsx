import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { isSupabaseConfigured } from '@/lib/supabase'
import kizenLotus from '@/assets/kizen-lotus.png'
import sagedoLogo from '@/assets/sagedo_logo_final_circle.png'
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  HelpCircle,
  GraduationCap,
} from 'lucide-react'

const schema = z.object({
  email: z.string().email('Please enter a valid institutional email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials. Please verify and retry.')
    }
  }

  return (
    <div className="relative h-screen w-screen bg-[#060913] text-white selection:bg-amber-500/20 selection:text-amber-200 overflow-hidden font-sans select-none">
      {/* Background Ambient Lighting (Linear / Raycast Aesthetic) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Golden Ambient Glow */}
        <div className="absolute -top-32 -left-20 w-[600px] h-[500px] bg-gradient-to-br from-amber-500/12 via-amber-500/3 to-transparent rounded-full blur-[140px]" />
        
        {/* Deep Twilight Blue Ambient Glow */}
        <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-[700px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]" />
        
        {/* Subtle Bottom Glow */}
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[400px] bg-amber-400/5 rounded-full blur-[150px]" />

        {/* Micro-dot Background Matrix */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Subtle Decorative Architectural Accent Lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '180px 180px' }} />
      </div>

      {/* Main Grid: Split Layout on Desktop, Centered on Mobile — Exactly 100vh Fits in 1 Screen */}
      <div className="relative z-10 h-full w-full max-w-7xl mx-auto grid lg:grid-cols-12 items-center p-4 sm:p-6 lg:p-8 xl:p-12 gap-6 lg:gap-12">
        
        {/* ================= LEFT COLUMN: KIZEN BRAND & INSTITUTIONAL SHOWCASE ================= */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between h-full py-4 pr-6">
          {/* Top Brand Header */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center h-13 w-13 rounded-2xl bg-gradient-to-br from-[#0F172E] to-[#080D1A] border border-amber-400/30 p-2 shadow-[0_0_25px_rgba(245,166,35,0.15)]">
              <img
                src={kizenLotus}
                alt="Kizen Education"
                className="h-full w-full object-contain filter drop-shadow-[0_0_8px_rgba(245,166,35,0.35)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">KIZEN EDUCATION</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 tracking-wider">
                  CRM Portal
                </span>
              </div>
              <p className="text-xs text-amber-400/80 font-medium tracking-wider uppercase mt-0.5">
                Leave No Child Behind
              </p>
            </div>
          </div>

          {/* Center Showcase Card */}
          <div className="my-auto max-w-lg space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold tracking-wide">
                <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                <span>Institutional Management System</span>
              </div>

              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Empowering Student Futures with{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Structured Excellence.
                </span>
              </h1>

              <p className="text-slate-300/85 text-sm leading-relaxed font-normal">
                A purpose-built operational platform for admissions counseling, academic batch scheduling, and transparent fee governance.
              </p>
            </div>

            {/* Glassmorphic Institutional Highlights Panel */}
            <div className="p-5 rounded-2xl bg-[#0B1020]/70 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.06]">
                <span className="font-semibold text-slate-200">Institutional Modules</span>
                <span className="text-[11px] text-amber-400 font-mono">Unified Operations</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
                  <p className="text-xs font-bold text-white">Admissions</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Counseling &amp; Leads</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
                  <p className="text-xs font-bold text-white">Academia</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Batches &amp; Faculty</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
                  <p className="text-xs font-bold text-white">Finance</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fee Ledgers &amp; Dues</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer: SAGE DO Technology Builder Credit */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 font-medium">Built by</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B1020] border border-white/[0.08] shadow-sm">
                <img
                  src={sagedoLogo}
                  alt="SAGE DO"
                  className="h-3.5 w-3.5 rounded-full object-cover"
                />
                <span className="text-xs font-bold tracking-wider text-amber-400">SAGE DO</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-300">System Online</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: AUTHENTICATION TERMINAL ================= */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col justify-center items-center h-full py-2">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex flex-col items-center text-center mb-4 space-y-1">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-[#0E1528] border border-amber-400/30 p-2 shadow-md">
              <img src={kizenLotus} alt="Kizen Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-white">Kizen Education</h1>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">
              Leave No Child Behind
            </p>
          </div>

          {/* Login Card: Perfectly Proportioned */}
          <div className="w-full max-w-[390px] sm:max-w-[410px] rounded-3xl bg-[#0B1020]/90 border border-white/[0.09] shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl p-6 sm:p-7 relative overflow-hidden">
            
            {/* Top Amber Highlight Lip */}
            <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

            <div className="space-y-1 mb-5 text-left">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Staff Authentication
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
                Sign In to CRM
              </h2>
              <p className="text-xs text-slate-400">
                Enter your institutional credentials to access your workspace.
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-4 rounded-xl bg-amber-500/10 p-2.5 text-xs text-amber-300 border border-amber-500/25 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Backend connection not configured.</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              {/* Email Field */}
              <div className="space-y-1 text-left">
                <Label htmlFor="email" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider pl-0.5">
                  Institutional Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@kizen.edu"
                    {...register('email')}
                    className="pl-10 h-10 bg-[#070B16] border-white/[0.08] hover:border-white/[0.15] text-white placeholder:text-slate-600 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all text-xs"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-400 font-medium pl-1 pt-0.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider pl-0.5">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-amber-400/90 hover:text-amber-300 font-medium hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    {...register('password')}
                    className="pl-10 pr-10 h-10 bg-[#070B16] border-white/[0.08] hover:border-white/[0.15] text-white placeholder:text-slate-600 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 rounded-xl transition-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-400 font-medium pl-1 pt-0.5">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-[#070B16] text-amber-500 focus:ring-amber-400/30 cursor-pointer accent-amber-500"
                />
                <label htmlFor="remember" className="text-xs text-slate-400 select-none cursor-pointer">
                  Remember this device
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold tracking-wider rounded-xl shadow-[0_2px_20px_rgba(245,166,35,0.3)] hover:shadow-[0_4px_30px_rgba(245,166,35,0.45)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border-t border-white/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-wider font-extrabold">Sign In to CRM</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Mobile Footer Credit (Visible on Small Screens) */}
          <div className="lg:hidden flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
            <span>Built by</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0B1020] border border-white/[0.08]">
              <img src={sagedoLogo} alt="SAGE DO" className="h-3 w-3 rounded-full object-cover" />
              <span className="text-[11px] font-bold text-amber-400">SAGE DO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-[#0D1322] border border-white/10 shadow-2xl text-left space-y-4">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset Staff Password</h3>
                <p className="text-[11px] text-slate-400">Kizen Institutional Security</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To protect student records and institutional fee data, passwords can only be reset by your Kizen CRM Administrator.
            </p>
            <div className="p-3 rounded-xl bg-[#070B16] border border-white/[0.06] text-xs text-slate-300 space-y-1 font-mono">
              <p><span className="text-amber-400">Contact:</span> Kizen Administrator</p>
              <p><span className="text-amber-400">Official Desk:</span> support@kizen.edu</p>
            </div>
            <Button
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Understood
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
