import React from 'react'

export interface FlagDotProps {
  color?: 'red' | 'yellow' | null
  reason?: string | null
}

export const FlagDot: React.FC<FlagDotProps> = ({ color, reason }) => {
  if (!color) return null

  const isRed = color === 'red'

  return (
    <span
      title={reason || (isRed ? 'High Priority / Critical Action Required' : 'Action Pending')}
      className={`inline-block h-2.5 w-2.5 rounded-full cursor-help shadow-sm transition-transform hover:scale-125 ${
        isRed ? 'bg-red-500 ring-2 ring-red-200 animate-pulse' : 'bg-amber-400 ring-2 ring-amber-200'
      }`}
    />
  )
}

export default FlagDot
