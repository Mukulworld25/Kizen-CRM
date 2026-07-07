import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPhone } from '@/lib/utils'

interface WhatsAppButtonProps {
  name: string
  mobile: string
  course?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function WhatsAppButton({ name, mobile, course, variant = 'outline', size = 'sm' }: WhatsAppButtonProps) {
  const message = encodeURIComponent(
    `Hi ${name}, this is from Kizen Education regarding your inquiry about ${course ?? 'our courses'}.`
  )
  const phone = formatPhone(mobile)
  const url = `https://wa.me/${phone}?text=${message}`

  return (
    <Button variant={variant} size={size} asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
    </Button>
  )
}
