'use client'

import { useState, useEffect } from 'react'
import { Eye, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RecetaModal } from './RecetaModal'

interface BotonRecetaProps {
  recetaId: string | null | undefined
  recetaNombre?: string
  variant?: 'icon' | 'text' | 'icon-text'
  size?: 'sm' | 'md'
  className?: string
}

export function BotonReceta({
  recetaId,
  recetaNombre,
  variant = 'icon',
  size = 'sm',
  className = ''
}: BotonRecetaProps) {
  const [open, setOpen] = useState(false)
  const [existe, setExiste] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Verificar si la receta existe en BD (una sola vez)
  useEffect(() => {
    if (!recetaId) {
      setExiste(false)
      return
    }

    let cancelado = false

    const verificar = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('recetas')
          .select('id')
          .eq('id', recetaId)
          .maybeSingle()

        if (!cancelado) {
          setExiste(!!data && !error)
        }
      } catch {
        if (!cancelado) setExiste(false)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    verificar()

    return () => {
      cancelado = true
    }
  }, [recetaId, supabase])

  // Si no hay ID o la receta no existe, no mostrar boton
  if (!recetaId || existe === false) {
    return null
  }

  // Mientras verifica, mostrar spinner si es icon
  if (loading && variant === 'icon') {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center rounded-md bg-gray-50 text-gray-400 border border-gray-200 ${size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'} ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </button>
    )
  }

  if (loading) {
    return null
  }

  const sizeClasses = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'

  const paddingClasses = variant === 'icon'
    ? sizeClasses
    : 'px-2 py-1 text-xs h-auto'

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={`inline-flex items-center justify-center gap-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors ${paddingClasses} ${className}`}
        title="Ver receta"
      >
        <Eye className="h-3.5 w-3.5" />
        {variant !== 'icon' && <span>Ver receta</span>}
      </button>

      <RecetaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        recetaId={recetaId}
        recetaNombre={recetaNombre}
      />
    </>
  )
}
