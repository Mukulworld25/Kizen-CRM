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
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  TrendingUp,
  Building2,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react'

const schema = z.object({
  email: z.string().email('Valid institutional email required'),
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
    setValue,
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
      toast.success('Welcome back to Kizen CRM!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials. Please verify and retry.')
    }
  }

  const fillQuickRole = (email: string) => {
    setValue('email', email, { shouldValidate: true })
    toast.success(`Selected ${email.split('@')[0]} role`)
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050914] text-white selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden font-sans">
      {/* Background Ambient Glow & Grid Matrix */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[170px]" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-[180px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-12">
        {/* ================= LEFT COLUMN: HERO & BRAND SHOWCASE (Desktop) ================= */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between p-10 lg:p-14 xl:p-16 border-r border-slate-800/80 bg-gradient-to-br from-[#070D1F] via-[#091228] to-[#040816]">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0D1836] to-[#060B1A] border border-amber-400/30 shadow-[0_0_30px_rgba(245,166,35,0.25)] p-1.5 transition-transform hover:scale-105 duration-300">
                <img src={kizenLotus} alt="Kizen Logo" className="h-full w-full object-contain rounded-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black tracking-tight text-white">KIZEN EDUCATION</span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 tracking-wider">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs text-amber-400/80 font-medium tracking-wide mt-0.5">
                  Leave No Child Behind · Sovereign Academic Operating System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-300">v2.4 Production Live</span>
            </div>
          </div>

          {/* Center Showcase & Value Pillars */}
          <div className="my-auto py-10 max-w-xl space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Academic CRM &amp; Institutional Intelligence</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Powering Student Futures with{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Intelligent Precision.
                </span>
              </h1>
              <p className="text-slate-300/90 text-sm sm:text-base leading-relaxed font-normal">
                Seamlessly unify candidate admissions counseling, automated fee structures, dynamic faculty scheduling, and comprehensive audit governance in one high-performance interface.
              </p>
            </div>

            {/* 3 Interactive Pillar Cards */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-md hover:border-amber-500/40 transition-all duration-300 group shadow-lg">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Admissions &amp; Lead Velocity
                    </h2>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      406 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Automated lead routing, temperature heatmaps, and counselor assignment with zero duplicate loss.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-md hover:border-amber-500/40 transition-all duration-300 group shadow-lg">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Automated Fee Reconciliation
                    </h2>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                      100% Synced
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Structured installment ledgers, instant receipt generation, and real-time scholarship tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-md hover:border-amber-500/40 transition-all duration-300 group shadow-lg">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Role-Level Security &amp; Isolation
                    </h2>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">
                      Row-Level Security
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Strict database isolation guaranteeing Counselor isolation, Faculty views, and Executive governance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Footer: SAGE DO Verification */}
          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={sagedoLogo}
                alt="SAGE DO"
                className="h-9 w-9 rounded-full object-cover border border-amber-400/40 shadow-[0_0_15px_rgba(245,166,35,0.2)]"
              />
              <div>
                <p className="text-xs font-bold text-white tracking-wide">
                  Engineered &amp; Powered by <span className="text-amber-400">SAGE DO AI</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Autonomous Enterprise Systems · Strategic AI Execution Partner
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>SOC2 / Database Encrypted</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: AUTHENTICATION TERMINAL ================= */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 relative">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile Header (Hidden on Large Screens) */}
            <div className="lg:hidden text-center space-y-3 pb-2">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0D1836] to-[#060B1A] border border-amber-400/30 shadow-[0_0_30px_rgba(245,166,35,0.25)] p-1.5">
                <img src={kizenLotus} alt="Kizen Logo" className="h-full w-full object-contain rounded-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">KIZEN EDUCATION</h1>
                <p className="text-xs text-amber-400/80 font-medium">Leave No Child Behind · Enterprise CRM</p>
              </div>
            </div>

            {/* Main Login Card */}
            <div className="relative p-7 sm:p-9 rounded-3xl bg-[#080E21]/90 border border-amber-500/25 shadow-[0_20px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden">
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600" />

              {/* Title Section */}
              <div className="space-y-1.5 mb-7 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-[10px] font-extrabold uppercase tracking-widest">
                  Secure Access Portal
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight pt-1">
                  Sign In to CRM
                </h2>
                <p className="text-xs text-slate-400">
                  Enter your verified staff email and password to access your institutional workspace.
                </p>
              </div>

              {!isSupabaseConfigured && (
                <div className="mb-5 rounded-xl bg-amber-500/15 p-3 text-xs text-amber-200 border border-amber-500/30 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Backend connection pending configuration in environment variables.</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-300 uppercase tracking-wider pl-0.5">
                    Institutional Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@kizen.edu"
                      {...register('email')}
                      className="pl-10 h-11 bg-[#050A17] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl transition-all shadow-inner text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-400 font-semibold pl-1 pt-0.5">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-300 uppercase tracking-wider pl-0.5">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-amber-400/90 hover:text-amber-300 font-semibold hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      {...register('password')}
                      className="pl-10 pr-10 h-11 bg-[#050A17] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl transition-all shadow-inner text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-400 font-semibold pl-1 pt-0.5">{errors.password.message}</p>
                  )}
                </div>

                {/* Session Option */}
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-[#050A17] text-amber-500 focus:ring-amber-400/30 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-400 select-none cursor-pointer">
                    Remember this device for 30 days
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black tracking-wider rounded-xl shadow-[0_4px_25px_rgba(245,166,35,0.35)] hover:shadow-[0_6px_35px_rgba(245,166,35,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-yellow-200/50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-black uppercase tracking-wider">Access CRM Workspace</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              {/* Quick Role Fillers for Instant Demo & Testing */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 text-left">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Quick Role Selector:
                  </span>
                  <span className="text-[10px] text-slate-500">Click to fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fillQuickRole('sagedo.test@kizen.edu')}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-white transition-all text-left"
                  >
                    <span className="font-semibold truncate">Owner</span>
                    <span className="text-[10px] text-amber-400 font-mono">SAGEDO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickRole('counselor1@kizen.edu')}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-white transition-all text-left"
                  >
                    <span className="font-semibold truncate">Counselor</span>
                    <span className="text-[10px] text-amber-400 font-mono">Staff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickRole('faculty.hod@kizen.edu')}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-white transition-all text-left"
                  >
                    <span className="font-semibold truncate">Faculty / HOD</span>
                    <span className="text-[10px] text-amber-400 font-mono">Teacher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickRole('reception@kizen.edu')}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 hover:bg-amber-400/5 text-slate-300 hover:text-white transition-all text-left"
                  >
                    <span className="font-semibold truncate">Reception</span>
                    <span className="text-[10px] text-amber-400 font-mono">FrontDesk</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card Footer: Official SAGE DO Partner Logo */}
            <div className="pt-2 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Engineered &amp; Powered by</span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/30 shadow-[0_0_20px_rgba(245,166,35,0.15)]">
                  <img
                    src={sagedoLogo}
                    alt="SAGE DO"
                    className="h-4 w-4 rounded-full object-cover shadow-sm"
                  />
                  <span className="text-xs font-black tracking-wider text-amber-400">SAGE DO AI</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 tracking-wider">
                India's Sovereign Revenue &amp; Autonomous AI Execution Partner
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0A122A] border border-amber-400/30 shadow-2xl text-left space-y-4">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Institutional Password</h3>
                <p className="text-xs text-slate-400">Enterprise Security Policy Notice</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To safeguard student records and financial ledgers, password resets are restricted to authorized CRM System Administrators.
            </p>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5 font-mono">
              <p><span className="text-amber-400">Contact:</span> Shivam Owner / Megha Executive</p>
              <p><span className="text-amber-400">Official Desk:</span> support@kizen.edu</p>
              <p><span className="text-amber-400">Support Partner:</span> SAGE DO Operations Team</p>
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
