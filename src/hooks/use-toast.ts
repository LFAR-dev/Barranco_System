'use client'

// ============================================================
// HOOK DE TOASTS con paleta formal Apple
// 4 variantes: success, error, warning, info
// Compatible con toasts existentes (default, destructive)
// ============================================================

export type ToastVariant = 'default' | 'destructive' | 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

function generarId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Mapea variantes historicas a las nuevas:
 *  - destructive -> error
 *  - default     -> info
 * Las nuevas (success, warning, info) se mantienen tal cual.
 */
function normalizarVariante(v?: ToastVariant): 'success' | 'error' | 'warning' | 'info' {
  if (v === 'destructive') return 'error'
  if (v === 'default' || !v) return 'info'
  return v
}

export function useToast() {
  const toast = ({
    title,
    description,
    variant = 'default',
    duration = 4000
  }: ToastProps) => {
    if (typeof window === 'undefined') return
    const id = generarId()
    const event = new CustomEvent('toast', {
      detail: {
        id,
        title,
        description,
        variant: normalizarVariante(variant),
        duration
      }
    })
    window.dispatchEvent(event)
  }

  return { toast }
}
