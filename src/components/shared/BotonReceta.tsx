'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
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

  if (!recetaId) {
    return null
  }

  const sizeClasses = size === 'sm'
    ? 'h-6 w-6 text-xs'
    : 'h-8 w-8 text-sm'

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
