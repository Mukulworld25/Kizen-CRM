import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Waves, Clock, Sparkles, Play, Heart, Brain, Activity } from 'lucide-react'
import { ABOUT_DATA } from '@/data/aboutData'
import { MOCK_GROUNDING_EXERCISES } from '@/data/mockData'

interface AIVoiceCompanionProps {
  onClose: () => void
}

export function AIVoiceCompanion({ onClose }: AIVoiceCompanionProps) {
  const [activeTab, setActiveTab] = useState<'assist' | 'grounding'>('assist')
  const [isListening, setIsListening] = useState(false)

  return (
    <div className="flex flex-col h-full p-6 pt-14">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: '2px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.3)',
          }}
        >
          <Mic className="w-7 h-7 text-white" />
        </motion.div>
        <h2 className="text-lg font-bold text-white">SK's AI Voice Companion</h2>
        <p className="text-xs text-violet-300/70 mt-1">Your personal grounding assistant</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl p-1 mb-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setActiveTab('assist')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'assist'
              ? 'text-white'
              : 'text-violet-400/60 hover:text-violet-300'
          }`}
          style={activeTab === 'assist' ? { background: 'rgba(139, 92, 246, 0.25)' } : {}}
        >
          <Mic className="w-3.5 h-3.5 mx-auto mb-1" />
          AI Assistance
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'grounding'
              ? 'text-white'
              : 'text-violet-400/60 hover:text-violet-300'
          }`}
          style={activeTab === 'grounding' ? { background: 'rgba(139, 92, 246, 0.25)' } : {}}
        >
          <Waves className="w-3.5 h-3.5 mx-auto mb-1" />
          5-min Grounding
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {activeTab === 'assist' ? (
          <>
            {/* AI Voice Chat Simulation */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124, 58, 237, 0.2)' }}>
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-violet-200 font-medium">
                    Hi, I'm SK's AI Voice Companion. I'm here to support you.
                  </p>
                  <p className="text-xs text-violet-400/70 mt-1">
                    You can speak to me about stress, anxiety, or anything on your mind. I'll guide you with somatic grounding techniques.
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Input Button */}
            <motion.button
              onClick={() => setIsListening(!isListening)}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-3 cursor-pointer"
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                  : 'rgba(139, 92, 246, 0.1)',
                border: `1px solid ${isListening ? 'rgba(167, 139, 250, 0.5)' : 'rgba(139, 92, 246, 0.15)'}`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-violet-400'}`} />
              </motion.div>
              <span className={`text-sm font-semibold ${isListening ? 'text-white' : 'text-violet-300'}`}>
                {isListening ? 'Listening... Tap to stop' : 'Tap to speak'}
              </span>
            </motion.button>

            {/* Quick Prompts */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-violet-400/60 uppercase tracking-wider">Try asking:</p>
              {[
                'I\'m feeling anxious right now',
                'Help me ground myself',
                'I can\'t sleep, what can I do?',
                'Guide me through a breathing exercise',
              ].map((prompt, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-xl text-xs text-violet-200/80 hover:text-violet-100 transition-colors cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* 5-Minute Grounding Sessions */}
            <p className="text-[11px] font-semibold text-violet-400/60 uppercase tracking-wider mb-2">
              Quick grounding exercises
            </p>
            {MOCK_GROUNDING_EXERCISES.map((exercise, i) => (
              <motion.button
                key={exercise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-full text-left p-4 rounded-xl transition-all cursor-pointer group"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                whileHover={{ scale: 1.02, background: 'rgba(139, 92, 246, 0.1)' }}
                onClick={() => {
                  // Placeholder: start guided session
                  setIsListening(true)
                  setTimeout(() => setIsListening(false), 3000)
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: exercise.pillar === 'emotional_wellness'
                        ? 'rgba(236, 72, 153, 0.15)'
                        : exercise.pillar === 'spiritual_alignment'
                          ? 'rgba(139, 92, 246, 0.15)'
                          : 'rgba(6, 182, 212, 0.15)',
                    }}
                  >
                    {exercise.pillar === 'emotional_wellness' ? (
                      <Heart className="w-4 h-4 text-pink-400" />
                    ) : exercise.pillar === 'spiritual_alignment' ? (
                      <Brain className="w-4 h-4 text-violet-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{exercise.title}</h3>
                      <Play className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <p className="text-xs text-violet-300/60 mt-0.5 line-clamp-1">{exercise.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3 h-3 text-violet-400/50" />
                      <span className="text-[10px] text-violet-400/50">{exercise.duration}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 text-center border-t border-white/5">
        <p className="text-[10px] text-violet-400/40">
          {ABOUT_DATA.tagline}
        </p>
      </div>
    </div>
  )
}