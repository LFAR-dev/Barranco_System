'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, RefreshCw, Loader2, Shuffle,
  ChevronDown, ChevronUp, Circle, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  asignacionMesasService,
  MeseroActivo,
} from '@/lib/services/asignacionMesasService'

interface MesaSimple {
  id: string
  numero: string
  categoria: string
}

interface AsignacionMesasPanelProps {
  jornadaId: string
  onRefresh?: () => void
}

export function AsignacionMesasPanel({
  jornadaId,
  onRefresh,
}: AsignacionMesasPanelProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [expandido, setExpandido] = useState(false)
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [mesasPorMesero, setMesasPorMesero] = useState<
    Record<string, MesaSimple[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [reasignando, setReasignando] = useState(false)
  const [rebalanceando, setRebalanceando] = useState(false)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [meserosData, mesasData] = await Promise.all([
        asignacionMesasService.getMeserosActivos(jornadaId),
        asignacionMesasService.getMesasPorMesero(jornadaId),
      ])

      setMeseros(meserosData)

      const normalizado: Record<string, MesaSimple[]> = {}
      for (const [key, mesas] of Object.entries(mesasData)) {
        normalizado[key] = mesas.map((m) => ({
          id: m.id,
          numero: m.numero,
          categoria: m.categoria,
        }))
      }
      setMesasPorMesero(normalizado)
    } catch (error) {
      console.error('Error al cargar asignaciones:', error)
    } finally {
      setLoading(false)
    }
  }, [jornadaId])

  useEffect(() => {
    cargar()

    if (!jornadaId) return

    const channelName = `asignacion_${jornadaId.slice(0, 8)}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        () => {
          cargar()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cargar, supabase, jornadaId])

  const handleReasignar = async (
    mesaId: string,
    meseroId: string | null
  ) => {
    setReasignando(true)
    try {
      await asignacionMesasService.asignarMesaAMesero(
        mesaId,
        meseroId,
        jornadaId
      )
      toast({
        title: meseroId ? 'Mesa reasignada' : 'Mesa liberada',
        description: meseroId
          ? 'La mesa ahora pertenece al mesero seleccionado'
          : 'La mesa quedo sin asignar',
        variant: 'success',
        duration: 2500,
      })
      setMesaSeleccionada(null)
      await cargar()
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reasignar',
        variant: 'destructive',
      })
    } finally {
      setReasignando(false)
    }
  }

  const handleRebalancear = async () => {
    if (meseros.length === 0) {
      toast({
        title: 'Sin meseros',
        description: 'No hay meseros activos para re-balancear',
        variant: 'destructive',
      })
      return
    }

    if (
      !confirm(
        'Re-balancear todas las mesas entre los meseros activos? Se perderan las asignaciones manuales.'
      )
    ) {
      return
    }

    setRebalanceando(true)
    try {
      await asignacionMesasService.repartirMesas(
        jornadaId,
        meseros.map((m) => m.usuario_id)
      )
      toast({
        title: 'Re-balanceo completo',
        description: 'Las mesas se redistribuyeron entre los meseros activos',
        variant: 'success',
      })
      await cargar()
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo re-balancear',
        variant: 'destructive',
      })
    } finally {
      setRebalanceando(false)
    }
  }

  const totalMesas = Object.values(mesasPorMesero)
    .flat()
    .filter(
      (m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx
    ).length

  return (
    <div className="absolute top-24 left-4 z-20 w-72">
      <div className="bg-black/85 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-between px-3 py-2 border-b border-amber-500/20 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-white text-sm font-semibold">
              Asignacion de mesas
            </span>
            <Badge className="bg-amber-500 text-black text-[10px] px-1.5 py-0">
              {totalMesas}
            </Badge>
          </div>
          {expandido ? (
            <ChevronUp className="h-3.5 w-3.5 text-amber-300" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-amber-300" />
          )}
        </button>

        {expandido && (
          <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={cargar}
                className="flex-1 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 h-8 text-xs"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Recargar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRebalancear}
                disabled={rebalanceando || meseros.length === 0}
                className="flex-1 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 h-8 text-xs"
              >
                {rebalanceando ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Shuffle className="h-3 w-3 mr-1" />
                )}
                Re-balancear
              </Button>
            </div>

            {meseros.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-3">
                Sin meseros activos en el turno
              </p>
            ) : (
              <div className="space-y-2">
                {meseros.map((mesero) => {
                  const mesas = mesasPorMesero[mesero.usuario_id] || []
                  return (
                    <div
                      key={mesero.usuario_id}
                      className="bg-white/5 border border-white/10 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{
                            backgroundColor: mesero.color_mapa || '#6b7280',
                          }}
                        >
                          {mesero.nombre?.charAt(0)}
                          {mesero.apellido?.charAt(0)}
                        </div>
                        <p className="text-xs font-medium text-white truncate flex-1">
                          {mesero.nombre} {mesero.apellido}
                        </p>
                        <Badge
                          className="text-[9px] px-1.5 py-0 text-white"
                          style={{
                            backgroundColor: mesero.color_mapa || '#6b7280',
                          }}
                        >
                          {mesas.length}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {mesas.length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic">
                            Sin mesas asignadas
                          </p>
                        ) : (
                          mesas.map((mesa) => (
                            <button
                              key={mesa.id}
                              onClick={() =>
                                setMesaSeleccionada(
                                  mesaSeleccionada === mesa.id ? null : mesa.id
                                )
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                                mesaSeleccionada === mesa.id
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                              }`}
                            >
                              {mesa.numero}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}

                {mesaSeleccionada && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-amber-300 font-medium">
                        Mover mesa seleccionada a:
                      </p>
                      <button
                        onClick={() => setMesaSeleccionada(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {meseros.map((m) => (
                        <button
                          key={m.usuario_id}
                          onClick={() =>
                            handleReasignar(mesaSeleccionada, m.usuario_id)
                          }
                          disabled={reasignando}
                          className="px-2 py-1 rounded text-[10px] text-white font-medium hover:opacity-80 transition-opacity flex items-center gap-1"
                          style={{
                            backgroundColor: m.color_mapa || '#6b7280',
                          }}
                        >
                          <Circle className="h-2 w-2 fill-white" />
                          {m.nombre}
                        </button>
                      ))}
                      <button
                        onClick={() => handleReasignar(mesaSeleccionada, null)}
                        disabled={reasignando}
                        className="px-2 py-1 rounded text-[10px] bg-gray-700 text-gray-300 font-medium hover:bg-gray-600 transition-colors"
                      >
                        Liberar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
