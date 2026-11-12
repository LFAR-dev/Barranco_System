'use client'

import { useEffect, useState } from 'react'
import { Wallet, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSesionCaja } from '@/hooks/useSesionCaja'

interface AvisoSinCajaProps {
  /** Si es true, ocupa el ancho completo del contenedor. Default: true */
  fullWidth?: boolean
  /** Callback que se ejecuta cuando el cajero abre la sesion */
  onSesionAbierta?: () => void
}

export function AvisoSinCaja({ fullWidth = true, onSesionAbierta }: AvisoSinCajaProps) {
  const { sesion, loading, haySesion } = useSesionCaja()
  const [estuvoSinSesion, setEstuvoSinSesion] = useState(false)

  useEffect(() => {
    if (haySesion && estuvoSinSesion) {
      onSesionAbierta?.()
    }
    if (!haySesion && !loading) {
      setEstuvoSinSesion(true)
    }
  }, [haySesion, loading, estuvoSinSesion, onSesionAbierta])

  if (loading) return null
  if (haySesion) return null

  return (
    <Card
      className={`border-l-4 border-l-amber-500 bg-amber-50/40 shadow-sm ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-amber-100 shrink-0">
              <Wallet className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm sm:text-base font-semibold text-amber-900">
                  Caja pendiente de abrir
                </p>
                <Badge className="bg-amber-200 text-amber-900 text-[10px] uppercase tracking-wide">
                  <Clock className="h-3 w-3 mr-1" />
                  En espera
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                El cajero debe abrir la sesión de caja para que puedas registrar ventas.
                Esta pantalla se actualizará automáticamente cuando se abra.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-700 sm:shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Esperando cajero</span>
            <span className="sm:hidden">Esperando...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
