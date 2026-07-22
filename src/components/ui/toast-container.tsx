'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const handleToast = (event: CustomEvent<Toast>) => {
      const newToast = {
        ...event.detail,
        id: event.detail.id || String(Date.now()),
        duration: event.detail.duration || 4000,
      }
      setToasts((prev) => [...prev, newToast])
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, newToast.duration)
    }

    window.addEventListener('toast' as any, handleToast)
    return () => {
      window.removeEventListener('toast' as any, handleToast)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (!isClient) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-start gap-3 
            animate-in slide-in-from-right-5 fade-in duration-300
            ${toast.variant === 'destructive' 
              ? 'bg-red-50 border-red-200' 
              : toast.variant === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-200'
            }
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.variant === 'destructive' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {toast.variant === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {(!toast.variant || toast.variant === 'default') && (
              <AlertTriangle className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className={`
                text-sm font-semibold
                ${toast.variant === 'destructive' ? 'text-red-800' : ''}
                ${toast.variant === 'success' ? 'text-green-800' : ''}
                ${!toast.variant || toast.variant === 'default' ? 'text-gray-800' : ''}
              `}>
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p className={`
                text-sm mt-0.5
                ${toast.variant === 'destructive' ? 'text-red-600' : ''}
                ${toast.variant === 'success' ? 'text-green-600' : ''}
                ${!toast.variant || toast.variant === 'default' ? 'text-gray-600' : ''}
              `}>
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
