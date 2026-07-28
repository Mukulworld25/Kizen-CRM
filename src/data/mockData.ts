import type { CorePillarId } from './aboutData'

export interface Testimonial {
  id: string
  name: string
  location: string
  quote: string
  pillar: CorePillarId
  rating: number
}

export interface SessionType {
  id: string
  title: string
  description: string
  duration: string
  price: string
  pillar: CorePillarId
  isFree?: boolean
}

export interface GroundingExercise {
  id: string
  title: string
  description: string
  duration: string
  audioUrl?: string
  pillar: CorePillarId
  steps: string[]
}

export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Ananya R.',
    location: 'Mumbai, India',
    quote: 'Pause With SK gave me the tools to finally step off the hamster wheel. After just three sessions, I felt a shift I hadn\'t achieved in years of therapy.',
    pillar: 'emotional_wellness',
    rating: 5,
  },
  {
    id: 't2',
    name: 'Rohan Mehta',
    location: 'Dubai, UAE',
    quote: 'The corporate world left me disconnected from myself. Sahil\'s somatic grounding work helped me rebuild a relationship with my own body and emotions.',
    pillar: 'mind_body_balance',
    rating: 5,
  },
  {
    id: 't3',
    name: 'Priya Kapoor',
    location: 'Delhi, India',
    quote: 'Spiritual alignment used to feel like a vague concept. Now it\'s my daily anchor. The guided practices are simple but profound.',
    pillar: 'spiritual_alignment',
    rating: 5,
  },
  {
    id: 't4',
    name: 'Arjun Singh',
    location: 'Bangalore, India',
    quote: 'I came in with crippling burnout and left with a toolkit for life. Emotional wellness is no longer a luxury — it\'s my daily practice.',
    pillar: 'emotional_wellness',
    rating: 5,
  },
  {
    id: 't5',
    name: 'Neha Sharma',
    location: 'Pune, India',
    quote: 'The mind-body sessions were transformative. I sleep better, think clearer, and finally feel at home in my own body.',
    pillar: 'mind_body_balance',
    rating: 5,
  },
]

export const MOCK_SESSION_TYPES: SessionType[] = [
  {
    id: 's1',
    title: 'The Pause Protocol',
    description: 'A foundational session introducing somatic grounding techniques. Perfect for first-timers.',
    duration: '45 min',
    price: '₹1,500',
    pillar: 'emotional_wellness',
  },
  {
    id: 's2',
    title: 'Stress Release Flow',
    description: 'Deep, guided nervous system regulation through breathwork and gentle movement.',
    duration: '60 min',
    price: '₹2,000',
    pillar: 'emotional_wellness',
  },
  {
    id: 's3',
    title: 'Inner Alignment Session',
    description: 'A spiritual deep-dive helping you reconnect with your core values and inner stillness.',
    duration: '60 min',
    price: '₹2,000',
    pillar: 'spiritual_alignment',
  },
  {
    id: 's4',
    title: 'Mindful Awareness Practice',
    description: 'Cultivate present-moment awareness through guided reflection and meditation.',
    duration: '45 min',
    price: '₹1,500',
    pillar: 'spiritual_alignment',
  },
  {
    id: 's5',
    title: 'Somatic Grounding Flow',
    description: 'Body-centered awareness practices to restore the mind-body equilibrium.',
    duration: '50 min',
    price: '₹1,800',
    pillar: 'mind_body_balance',
  },
  {
    id: 's6',
    title: 'Evening Wind-Down',
    description: 'A gentle, restorative practice to release the day and prepare for deep sleep.',
    duration: '30 min',
    price: 'Free',
    isFree: true,
    pillar: 'mind_body_balance',
  },
]

export const MOCK_GROUNDING_EXERCISES: GroundingExercise[] = [
  {
    id: 'g1',
    title: '5-4-3-2-1 Sensory Grounding',
    description: 'A rapid grounding technique using your five senses to anchor yourself in the present moment.',
    duration: '5 min',
    pillar: 'emotional_wellness',
    steps: [
      'Find a comfortable seated position and take three deep breaths.',
      'Notice 5 things you can SEE around you — name them silently.',
      'Notice 4 things you can TOUCH — feel the textures consciously.',
      'Notice 3 things you can HEAR — listen without judgment.',
      'Notice 2 things you can SMELL — breathe in deeply.',
      'Notice 1 thing you can TASTE — focus on the sensation.',
    ],
  },
  {
    id: 'g2',
    title: 'Heart-Breath Resonance',
    description: 'A soothing breathwork practice to regulate your heart rate and calm the nervous system.',
    duration: '10 min',
    pillar: 'spiritual_alignment',
    steps: [
      'Sit comfortably with your hands resting over your heart.',
      'Inhale slowly for 4 counts, feeling your chest expand.',
      'Hold gently for 4 counts.',
      'Exhale completely for 6 counts — longer than the inhale.',
      'Repeat for 10 rounds, eyes closed, palms on heart.',
    ],
  },
  {
    id: 'g3',
    title: 'Body Scan Release',
    description: 'A progressive relaxation practice that releases tension from head to toe.',
    duration: '15 min',
    pillar: 'mind_body_balance',
    steps: [
      'Lie down comfortably, arms at your sides, eyes closed.',
      'Bring awareness to your feet — notice any sensations without trying to change them.',
      'Slowly move your attention up through your legs, hips, and torso.',
      'Notice your hands, arms, shoulders — soften any tension.',
      'Scan your neck, jaw, and face — consciously relax each muscle group.',
      'Take three final breaths, feeling your entire body as a unified whole.',
    ],
  },
]