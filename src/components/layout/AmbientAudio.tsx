import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Headphones } from 'lucide-react'

const AMBIENT_SOURCE = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'

interface VisualizerBar {
  id: number
  height: number
}

export function AmbientAudio() {
  const [isMuted, setIsMuted] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [bars, setBars] = useState<VisualizerBar[]>([])

  useEffect(() => {
    // Show widget after a short delay
    const t = setTimeout(() => setShowWidget(true), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const audio = new Audio(AMBIENT_SOURCE)
    audio.loop = true
    audio.volume = 0.3
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const handleCanPlay = () => setIsLoaded(true)
    audio.addEventListener('canplaythrough', handleCanPlay)

    // Generate random visualizer bars
    const generatedBars: VisualizerBar[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      height: Math.random() * 30 + 8,
    }))
    setBars(generatedBars)

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!audioRef.current || !isLoaded) return
    if (isMuted) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
    setIsMuted((prev) => !prev)
  }, [isMuted, isLoaded])

  return (
    <AnimatePresence>
      {showWidget && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
        >
          {/* Soundwave Visualizer - shown when unmuted */}
          <AnimatePresence>
            {!isMuted && (
              <motion.div
                initial={{ opacity: 0, width: 0, scaleX: 0 }}
                animate={{ opacity: 1, width: 'auto', scaleX: 1 }}
                exit={{ opacity: 0, width: 0, scaleX: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="flex items-end gap-[2px] h-10 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {bars.map((bar, i) => (
                  <motion.div
                    key={bar.id}
                    className="w-[3px] rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, #a78bfa, #7c3aed)',
                    }}
                    animate={{
                      height: [
                        bar.height,
                        bar.height * (0.3 + Math.random() * 0.7),
                        bar.height,
                      ],
                    }}
                    transition={{
                      duration: 0.6 + Math.random() * 0.4,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Toggle Button */}
          <motion.button
            onClick={toggleMute}
            className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.35)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
          >
            {/* Pulsing aura ring */}
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid rgba(167, 139, 250, 0.3)',
              }}
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.4, 0.1, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </motion.button>

          {/* Label */}
          <AnimatePresence>
            {!isMuted && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Headphones className="w-3 h-3 text-violet-400" />
                <span className="text-violet-200">Binaural Waves</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}