import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Heart, Brain, Activity, CloudSun, CloudRain, CloudLightning, CloudMoon, CloudDrizzle, Target, Check } from 'lucide-react'

interface VibeState {
  innerWeather: string | null
  corePath: string | null
  primaryGoal: string | null
}

interface VibeOnboardingModalProps {
  open: boolean
  onComplete: (vibe: VibeState) => void
  onSkip: () => void
}

const INNER_WEATHER_OPTIONS = [
  { id: 'calm', label: 'Calm', emoji: '☀️', icon: CloudSun, color: '#fbbf24', description: 'Feeling centered and peaceful' },
  { id: 'anxious', label: 'Anxious', emoji: '🌧️', icon: CloudRain, color: '#60a5fa', description: 'Nervous energy or worry' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '⛈️', icon: CloudLightning, color: '#ef4444', description: 'Too much coming at you' },
  { id: 'seeking_clarity', label: 'Seeking Clarity', emoji: '🌙', icon: CloudMoon, color: '#a78bfa', description: 'Looking for direction' },
  { id: 'exhausted', label: 'Exhausted', emoji: '🌫️', icon: CloudDrizzle, color: '#94a3b8', description: 'Drained and depleted' },
]

const CORE_PATH_OPTIONS = [
  { id: 'emotional_wellness', label: 'Emotional Wellness', icon: Heart, color: '#ec4899', description: 'Emotional intelligence, stress release, clarity & confidence rebuilding' },
  { id: 'spiritual_alignment', label: 'Spiritual Alignment', icon: Brain, color: '#8b5cf6', description: 'Inner grounding, mindfulness, reflective awareness' },
  { id: 'mind_body_balance', label: 'Mind & Body Balance', icon: Activity, color: '#06b6d4', description: 'Aligning emotional health with physical wellbeing' },
]

const PRIMARY_GOAL_OPTIONS = [
  { id: 'reduce_stress', label: 'Reduce Stress', emoji: '🧘', description: 'Release tension and find calm' },
  { id: 'process_triggers', label: 'Process Triggers', emoji: '🪞', description: 'Understand and manage emotional reactions' },
  { id: 'sleep_deeply', label: 'Sleep Deeply', emoji: '🌙', description: 'Restore restful, regenerative sleep' },
  { id: 'rebuild_resilience', label: 'Rebuild Resilience', emoji: '🌱', description: 'Strengthen your inner foundation' },
]

const STEPS = [
  { id: 'inner_weather', title: 'How is your inner weather today?' },
  { id: 'core_path', title: 'Which core path calls to you?' },
  { id: 'primary_goal', title: 'What is your primary goal?' },
]

export function VibeOnboardingModal({ open, onComplete, onSkip }: VibeOnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [vibe, setVibe] = useState<VibeState>({ innerWeather: null, corePath: null, primaryGoal: null })

  const totalSteps = STEPS.length
  const isLastStep = step === totalSteps - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(vibe)
    } else {
      setDirection(1)
      setStep((prev) => prev + 1)
    }
  }, [isLastStep, vibe, onComplete])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep((prev) => prev - 1)
    }
  }, [step])

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
  }

  const canProceed = () => {
    if (step === 0) return vibe.innerWeather !== null
    if (step === 1) return vibe.corePath !== null
    if (step === 2) return vibe.primaryGoal !== null
    return false
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 11, 24, 0.85)', backdropFilter: 'blur(16px)' }}
        >
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(124, 58, 237, 0.08)',
            }}
          >
            {/* Top accent bar */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)' }} />

            <div className="p-6 sm:p-8">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: i <= step
                            ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                            : 'rgba(255,255,255,0.06)',
                          border: i <= step
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.1)',
                          color: i <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {i < step ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className="w-8 h-[2px] rounded-full" style={{ background: i < step ? '#7c3aed' : 'rgba(255,255,255,0.06)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={onSkip}
                  className="text-xs text-violet-400/50 hover:text-violet-300 transition-colors cursor-pointer"
                >
                  Skip
                </button>
              </div>

              {/* Animated step content */}
              <div className="min-h-[320px] relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Step 0: Inner Weather */}
                    {step === 0 && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                          >
                            <CloudSun className="w-7 h-7 text-violet-400" />
                          </motion.div>
                          <h2 className="text-xl font-bold text-white">{STEPS[0].title}</h2>
                          <p className="text-sm text-violet-300/60 mt-1">Check in with yourself. No wrong answers.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {INNER_WEATHER_OPTIONS.map((option) => {
                            const isSelected = vibe.innerWeather === option.id
                            const Icon = option.icon
                            return (
                              <motion.button
                                key={option.id}
                                onClick={() => setVibe((prev) => ({ ...prev, innerWeather: option.id }))}
                                className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all cursor-pointer"
                                style={{
                                  background: isSelected
                                    ? `${option.color}18`
                                    : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isSelected ? `${option.color}40` : 'rgba(255,255,255,0.06)'}`,
                                }}
                                whileHover={{ scale: 1.02, background: isSelected ? `${option.color}18` : 'rgba(255,255,255,0.08)' }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: isSelected ? `${option.color}20` : 'rgba(255,255,255,0.05)' }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: option.color }} />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-semibold" style={{ color: isSelected ? option.color : '#e2e8f0' }}>
                                    {option.emoji} {option.label}
                                  </span>
                                  <p className="text-xs text-violet-300/50 mt-0.5">{option.description}</p>
                                </div>
                                {isSelected && <Check className="w-5 h-5" style={{ color: option.color }} />}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 1: Core Path */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                          >
                            <Sparkles className="w-7 h-7 text-violet-400" />
                          </motion.div>
                          <h2 className="text-xl font-bold text-white">{STEPS[1].title}</h2>
                          <p className="text-sm text-violet-300/60 mt-1">Choose the path that resonates most right now.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {CORE_PATH_OPTIONS.map((option) => {
                            const isSelected = vibe.corePath === option.id
                            const Icon = option.icon
                            return (
                              <motion.button
                                key={option.id}
                                onClick={() => setVibe((prev) => ({ ...prev, corePath: option.id }))}
                                className="flex items-center gap-3 p-4 rounded-xl text-left transition-all cursor-pointer"
                                style={{
                                  background: isSelected
                                    ? `${option.color}18`
                                    : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isSelected ? `${option.color}40` : 'rgba(255,255,255,0.06)'}`,
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: isSelected ? `${option.color}20` : 'rgba(255,255,255,0.05)' }}
                                >
                                  <Icon className="w-6 h-6" style={{ color: option.color }} />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-bold" style={{ color: isSelected ? option.color : '#e2e8f0' }}>
                                    {option.label}
                                  </span>
                                  <p className="text-xs text-violet-300/50 mt-0.5">{option.description}</p>
                                </div>
                                {isSelected && <Check className="w-5 h-5" style={{ color: option.color }} />}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Primary Goal */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                          >
                            <Target className="w-7 h-7 text-violet-400" />
                          </motion.div>
                          <h2 className="text-xl font-bold text-white">{STEPS[2].title}</h2>
                          <p className="text-sm text-violet-300/60 mt-1">What do you want to cultivate most right now?</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {PRIMARY_GOAL_OPTIONS.map((option) => {
                            const isSelected = vibe.primaryGoal === option.id
                            return (
                              <motion.button
                                key={option.id}
                                onClick={() => setVibe((prev) => ({ ...prev, primaryGoal: option.id }))}
                                className="flex flex-col items-center text-center p-5 rounded-xl transition-all cursor-pointer"
                                style={{
                                  background: isSelected
                                    ? 'rgba(139, 92, 246, 0.15)'
                                    : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isSelected ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                                }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="text-3xl mb-2">{option.emoji}</span>
                                <span className="text-sm font-semibold text-white">{option.label}</span>
                                <p className="text-xs text-violet-300/50 mt-1">{option.description}</p>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="mt-2 w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ background: '#7c3aed' }}
                                  >
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <motion.button
                  onClick={handleBack}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}
                  whileHover={step > 0 ? { scale: 1.03 } : {}}
                  whileTap={step > 0 ? { scale: 0.97 } : {}}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </motion.button>

                <motion.button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: canProceed()
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                      : 'rgba(255,255,255,0.06)',
                    color: canProceed() ? '#fff' : '#64748b',
                  }}
                  whileHover={canProceed() ? { scale: 1.03 } : {}}
                  whileTap={canProceed() ? { scale: 0.97 } : {}}
                >
                  {isLastStep ? 'Complete' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type { VibeState }