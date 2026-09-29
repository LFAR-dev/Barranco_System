'use client'

import { useEffect, useState } from 'react'
import { Wallet, Clock, Plus, LogOut, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { sesionCajaService, SesionCaja } from '@/lib/services/sesionCajaService'
import { jornadaService } from '@/lib/services/jornadaService'
import { AbrirSesionCajaModal } from './AbrirSesionCajaModal'
import { CerrarSesionCajaModal } from './CerrarSesionCajaModal'

interface EstadoSesionCajaProps {
  onSesionChange?: (sesion: SesionCaja | null) => void
}

export function EstadoSesionCaja({ onSesionChange }: EstadoSesionCajaProps) {
  const [sesion, setSesion] = useState<SesionCaja | null>(null)
  const [loading, setLoading] = useState(true)
  const [abrirModal, setAbrirModal] = useState(false)
  const [cerrarModal, setCerrarModal] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('')

  useEffect(() => {
    cargarSesion()
    const interval = setInterval(cargarSesion, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!sesion) return
    actualizarTiempo()
    const interval = setInterval(actualizarTiempo, 60000)
    return () => clearInterval(interval)
  }, [sesion])

  const cargarSesion = async () => {
    try {
      const data = await sesionCajaService.getSesionAbierta()
      setSesion(data)
      onSesionChange?.(data)
    } catch (error) {
      console.error('Error al cargar sesión:', error)
    } finally {
      setLoading(false)
    }
  }

  const actualizarTiempo = () => {
    if (!sesion) return
    const inicio = new Date(sesion.abierta_en)
    const ahora = new Date()
    const diffMs = ahora.getTime() - inicio.getTime()
    const horas = Math.floor(diffMs / (1000 * 60 * 60))
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    setTiempoTranscurrido(`${horas}h ${minutos}min`)
  }

  if (loading) {
    return (
      <Card className="border-l-4 border-l-gray-300 bg-gray-50">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Verificando sesión de caja...</span>
        </CardContent>
      </Card>
    )
  }

  if (!sesion) {
    return (
      <>
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Sin sesión de caja activa</p>
                <p className="text-xs text-amber-700">
                  Abre una sesión para empezar a cobrar en tu turno
                </p>
              </div>
            </div>
            <Button
              onClick={() => setAbrirModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Abrir sesión
            </Button>
          </CardContent>
        </Card>

        <AbrirSesionCajaModal
          isOpen={abrirModal}
          onClose={() => setAbrirModal(false)}
          onSuccess={cargarSesion}
        />
      </>
    )
  }

  return (
    <>
      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-emerald-900">
                  Sesión activa
                </p>
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                  ${sesion.saldo_inicial.toFixed(2)} inicial
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-emerald-700 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Abierta hace {tiempoTranscurrido}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setCerrarModal(true)}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <CerrarSesionCajaModal
        isOpen={cerrarModal}
        onClose={() => setCerrarModal(false)}
        sesion={sesion}
        onSuccess={cargarSesion}
      />
    </>
  )
}
