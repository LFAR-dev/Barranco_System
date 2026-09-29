'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'

interface JornadaCerradaOverlayProps {
  isOpen: boolean
}

export function JornadaCerradaOverlay({ isOpen }: JornadaCerradaOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Jornada cerrada
        </h2>

        <p className="text-gray-600 mb-6">
          El administrador ha cerrado la jornada actual.
          Tu sesión se cerrará automáticamente en unos segundos.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cerrando sesión...</span>
        </div>
      </div>
    </div>
  )
}
