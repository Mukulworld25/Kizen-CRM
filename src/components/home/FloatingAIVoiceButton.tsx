import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Sparkles, X } from 'lucide-react'
import { AIVoiceCompanion } from './AIVoiceCompanion'

export function FloatingAIVoiceButton() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative"
            >
              {/* Pulsing lavender aura rings */}
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.5, 0.15, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.span
                className="absolute -inset-4 rounded-full"
                style={{
                  border: '1.5px solid rgba(139, 92, 246, 0.15)',
                }}
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0.08, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
              />
              <motion.span
                className="absolute -inset-8 rounded-full"
                style={{
                  border: '1px solid rgba(167, 139, 250, 0.08)',
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.05, 0.2],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                }}
              />

              <motion.button
                onClick={toggleOpen}
                className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl cursor-pointer group"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)',
                  border: '2px solid rgba(167, 139, 250, 0.3)',
                  boxShadow: '0 4px 30px rgba(124, 58, 237, 0.4), 0 0 60px rgba(124, 58, 237, 0.15)',
                }}
                whileHover={{
                  scale: 1.12,
                  boxShadow: '0 6px 40px rgba(124, 58, 237, 0.55), 0 0 80px rgba(124, 58, 237, 0.2)',
                }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open AI Voice Assistant"
              >
                <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                <motion.span
                  className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </motion.span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Voice Companion Drawer/Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={toggleOpen}
            />

            {/* Drawer */}
            <motion.div
              initial={{ opacity: 0, x: -320, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -320, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-sm"
              style={{
                background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
                borderRight: '1px solid rgba(139, 92, 246, 0.15)',
                boxShadow: '4px 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(124, 58, 237, 0.08)',
              }}
            >
              {/* Close button */}
              <button
                onClick={toggleOpen}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10 cursor-pointer"
                aria-label="Close AI Voice Assistant"
              >
                <X className="w-5 h-5 text-violet-300" />
              </button>

              <AIVoiceCompanion onClose={toggleOpen} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}