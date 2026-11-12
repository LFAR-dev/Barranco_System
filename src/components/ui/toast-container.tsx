'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react'

type Variante = 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  title?: string
  description?: string
  variant: Variante
  duration: number
}

// Paleta formal Apple
const paleta: Record<Variante, {
  bg: string
  border: string
  iconBg: string
  iconColor: string
  titleColor: string
  descColor: string
  Icon: any
}> = {
  success: {
    bg: 'bg-[#F0FDF4]',
    border: 'border-[#BBF7D0]',
    iconBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#047857]',
    titleColor: 'text-[#065F46]',
    descColor: 'text-[#047857]',
    Icon: CheckCircle2
  },
  error: {
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    iconBg: 'bg-[#FEE2E2]',
    iconColor: 'text-[#B91C1C]',
    titleColor: 'text-[#991B1B]',
    descColor: 'text-[#B91C1C]',
    Icon: XCircle
  },
  warning: {
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FDE68A]',
    iconBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#A16207]',
    titleColor: 'text-[#78350F]',
    descColor: 'text-[#A16207]',
    Icon: AlertTriangle
  },
  info: {
    bg: 'bg-white',
    border: 'border-[#E5E7EB]',
    iconBg: 'bg-[#F3F4F6]',
    iconColor: 'text-[#1F2937]',
    titleColor: 'text-[#111827]',
    descColor: 'text-[#4B5563]',
    Icon: Info
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    const handleToast = (event: CustomEvent<ToastData>) => {
      const nueva: ToastData = {
        id: event.detail.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: event.detail.title,
        description: event.detail.description,
        variant: (event.detail.variant as Variante) || 'info',
        duration: event.detail.duration || 4000
      }

      setToasts(prev => [...prev, nueva])

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== nueva.id))
      }, nueva.duration)
    }

    window.addEventListener('toast' as any, handleToast)
    return () => {
      window.removeEventListener('toast' as any, handleToast)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (!isClient) return null

  return (
    <div
      className="
        fixed bottom-4 right-4 left-4 sm:left-auto z-[9999]
        flex flex-col gap-2
        sm:max-w-sm sm:w-full
        pointer-events-none
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const p = paleta[toast.variant]
        const Icon = p.Icon
        return (
          <div
            key={toast.id}
            role="alert"
            className={`
              pointer-events-auto
              flex items-start gap-3
              p-3 sm:p-4
              rounded-lg
              border
              shadow-sm
              ${p.bg} ${p.border}
              animate-in slide-in-from-right-5 fade-in duration-300
            `}
          >
            <div className={`flex-shrink-0 p-1.5 rounded-full ${p.iconBg}`}>
              <Icon className={`h-4 w-4 ${p.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              {toast.title && (
                <p className={`text-sm font-semibold leading-tight ${p.titleColor}`}>
                  {toast.title}
                </p>
              )}
              {toast.description && (
                <p className={`text-xs sm:text-sm mt-1 leading-snug ${p.descColor}`}>
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={`
                flex-shrink-0 -mr-1 -mt-1 p-1 rounded
                ${p.descColor} opacity-60 hover:opacity-100
                transition-opacity
              `}
              aria-label="Cerrar notificacion"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
