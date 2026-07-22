'use client'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export function useToast() {
  const toast = ({ title, description, variant = 'default', duration = 4000 }: ToastProps) => {
    const id = String(Date.now())
    
    const event = new CustomEvent('toast', {
      detail: {
        id,
        title,
        description,
        variant,
        duration,
      },
    })
    
    window.dispatchEvent(event)
  }

  return { toast }
}
