import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPhone(mobile: string) {
  const digits = mobile.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.startsWith('91')) return digits
  return digits
}
