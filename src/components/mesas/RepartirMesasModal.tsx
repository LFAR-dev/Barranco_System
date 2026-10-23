'use client'

import { useState, useEffect } from 'react'
import {
  Shuffle, Hand, Users, Loader2, CheckCircle,
  AlertCircle, ArrowRight, UserCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  asignacionMesasService,
  MeseroActivo,
} from '@/lib/services/asignacionMesasService'

type Modo = 'seleccion' | 'automatico' | 'manual'

interface RepartirMesasModalProps {
  isOpen: boolean
  onClose: () => void
  jornadaId: string
  onSuccess?: () => void
}

export function RepartirMesasModal({
  isOpen,
  onClose,
  jornadaId,
  onSuccess,
}: RepartirMesasModalProps) {
  const { toast } = useToast()
  const [modo, setModo] = useState<Modo>('seleccion')
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [resultado, setResultado] = useState<{
    asignadas: number
    meseros_count: number
  } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setModo('seleccion')
      setResultado(null)
      return
    }

    const cargar = async () => {
      setCargando(true)
      try {
        const data = await asignacionMesasService.getMeserosActivos(jornadaId)
        setMeseros(data)
      } catch (error) {
        console.error('Error al cargar meseros:', error)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [isOpen, jornadaId])

  const handleRepartirAuto = async () => {
    if (meseros.length === 0) {
      toast({
        title: 'Sin meseros activos',
        description: 'Activa al menos un mesero en el turno para repartir',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await asignacionMesasService.repartirMesas(
        jornadaId,
        meseros.map((m) => m.usuario_id)
      )

      setResultado(res)
      toast({
        title: 'Mesas repartidas',
        description: `${res.asignadas} mesas asignadas a ${res.meseros_count} mesero${res.meseros_count === 1 ? '' : 's'}`,
        variant: 'success',
        duration: 4000,
      })

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      toast({
        title: 'Error al repartir',
        description: error.message || 'No se pudieron asignar las mesas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirManual = () => {
    setModo('manual')
    // El modo manual lo maneja el panel de asignación en /admin/mesas
    // Aquí solo cerramos y notificamos al padre
    toast({
      title: 'Modo manual',
      description: 'Ajusta las asignaciones desde el panel de mesas',
      variant: 'default',
    })
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Repartir mesas
          </DialogTitle>
          <DialogDescription>
            Elige como asignar las mesas entre los meseros del turno actual.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Cargando meseros...</p>
          </div>
        ) : meseros.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <p className="text-sm font-medium text-gray-900">
              No hay meseros activos en el turno
            </p>
            <p className="text-xs text-gray-500">
              Activa al menos un mesero en el panel de turno antes de repartir.
            </p>
          </div>
        ) : (
          <>
            {/* Lista de meseros */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Meseros activos ({meseros.length})
              </p>
              {meseros.map((m) => (
                <div
                  key={m.usuario_id}
                  className="flex items-center gap-3 p-2.5 border rounded-lg bg-white"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: m.color_mapa || '#6b7280' }}
                  >
                    {m.nombre?.charAt(0)}
                    {m.apellido?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.nombre} {m.apellido}
                    </p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.color_mapa || '#6b7280' }}
                      />
                      Color asignado
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de modo */}
            {resultado ? (
              <div className="border-2 border-emerald-300 bg-emerald-50 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-900">
                  {resultado.asignadas} mesas repartidas
                </p>
                <p className="text-xs text-emerald-700">
                  entre {resultado.meseros_count} mesero
                  {resultado.meseros_count === 1 ? '' : 's'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleRepartirAuto}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-auto py-3 flex items-start gap-3 justify-start"
                >
                  <Shuffle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">Repartir automaticamente</p>
                    <p className="text-[11px] opacity-90 font-normal mt-0.5">
                      Agrupa por cercania geografica y asigna bloques
                      consecutivos. Rapido y equilibrado.
                    </p>
                  </div>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-1" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                  )}
                </Button>

                <Button
                  onClick={handleAbrirManual}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-auto py-3 flex items-start gap-3 justify-start hover:bg-amber-50 hover:border-amber-300"
                >
                  <Hand className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900">
                      Elegir manualmente
                    </p>
                    <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                      Asigna cada mesa a un mesero desde el panel de mesas.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                </Button>

                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-gray-500"
                >
                  Repartir despues
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
