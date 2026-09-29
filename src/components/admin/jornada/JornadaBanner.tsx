'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { escucharEventosJornada } from '@/lib/events/jornadaEvents'

interface JornadaBannerProps {
  onJornadaChange?: (jornada: Jornada | null) => void
  showCerrar?: boolean
  onCerrarClick?: () => void
}

export function JornadaBanner({ onJornadaChange, showCerrar, onCerrarClick }: JornadaBannerProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [loading, setLoading] = useState(true)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('')

  useEffect(() => {
    cargarJornada()
    const interval = setInterval(cargarJornada, 60000)
    const cleanup = escucharEventosJornada(cargarJornada)
    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!jornada) return
    actualizarTiempo()
    const interval = setInterval(actualizarTiempo, 60000)
    return () => clearInterval(interval)
  }, [jornada])

  const cargarJornada = async () => {
    try {
      const data = await jornadaService.getJornadaActual()
      setJornada(data)
      if (onJornadaChange) onJornadaChange(data)
    } catch (error) {
      console.error('Error al cargar jornada:', error)
    } finally {
      setLoading(false)
    }
  }

  const actualizarTiempo = () => {
    if (!jornada) return
    const inicio = new Date(jornada.hora_inicio)
    const ahora = new Date()
    const diffMs = ahora.getTime() - inicio.getTime()
    const horas = Math.floor(diffMs / (1000 * 60 * 60))
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    setTiempoTranscurrido(`${horas}h ${minutos}min`)
  }

  if (loading) {
    return (
      <Card className="border-l-4 border-l-gray-300 bg-gray-50">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500">Verificando jornada...</span>
        </CardContent>
      </Card>
    )
  }

  if (!jornada) {
    return (
      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 text-sm sm:text-base">
                No hay jornada activa
              </p>
              <p className="text-xs text-amber-700">
                Los pedidos y cobros no funcionarán hasta que abras la jornada
              </p>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            <Clock className="h-3 w-3 mr-1" />
            Cerrada
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-emerald-500 bg-emerald-50">
      <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-emerald-900 truncate text-sm sm:text-base">
                {jornada.nombre}
              </p>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs shrink-0">
                Activa
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-emerald-700 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(jornada.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Abierta hace {tiempoTranscurrido}
              </span>
            </div>
          </div>
        </div>

        {showCerrar && (
          <button
            onClick={onCerrarClick}
            className="text-xs font-medium text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Cerrar jornada
          </button>
        )}
      </CardContent>
    </Card>
  )
}
