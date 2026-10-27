'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Receipt, Clock, UserCircle, AlertCircle,
  Loader2, RefreshCw, ChevronRight, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { cuentaService, CuentaAbierta } from '@/lib/services/cuentaService'
import { useToast } from '@/hooks/use-toast'

interface PanelCuentasCajaProps {
  onCuentaClick: (cuenta: CuentaAbierta) => void
  jornadaId?: string | null
}

export function PanelCuentasCaja({
  onCuentaClick,
  jornadaId
}: PanelCuentasCajaProps) {
  const { toast } = useToast()
  const [cuentas, setCuentas] = useState<CuentaAbierta[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const cargarCuentas = useCallback(async () => {
    if (!jornadaId) {
      setCuentas([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await cuentaService.getTodasLasCuentasActivas(jornadaId)
      setCuentas(data)
    } catch (error) {
      console.error('Error al cargar cuentas:', error)
    } finally {
      setLoading(false)
    }
  }, [jornadaId])

  useEffect(() => {
    cargarCuentas()

    if (!jornadaId) return

    const channelName = `cuentas_caja_${jornadaId.slice(0, 8)}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuentas_abiertas' },
        () => {
          cargarCuentas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cargarCuentas, supabase, jornadaId])

  const cobrando = cuentas.filter((c) => c.estado === 'cobrando')
  const solicitadas = cuentas.filter((c) => c.estado === 'cuenta_solicitada')
  const abiertas = cuentas.filter((c) => c.estado === 'abierta')

  const tiempoAbierta = (fecha: string) => {
    const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
    if (minutos < 60) return `${minutos} min`
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}min`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
          <p className="text-xs text-gray-500 mt-2">Cargando cuentas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">
              Cuentas de Mesa
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cargarCuentas}
            className="h-7"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* CUENTAS COBRANDO (prioridad maxima: mesero ya cobro) */}
        {cobrando.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Cobradas por mesero ({cobrando.length})
              </p>
            </div>
            {cobrando.map((cuenta) => {
              const efectivo = Number(cuenta.efectivo_recibido || 0)
              const cambio = Number(cuenta.cambio_entregado || 0)
              return (
                <button
                  key={cuenta.id}
                  onClick={() => onCuentaClick(cuenta)}
                  className="w-full text-left bg-blue-50 border-2 border-blue-400 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {cuenta.mesa?.numero || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          Mesa {cuenta.mesa?.numero}
                        </p>
                        <p className="text-[10px] text-gray-600 flex items-center gap-1">
                          <UserCircle className="h-2.5 w-2.5" />
                          {cuenta.mesero?.nombre} {cuenta.mesero?.apellido}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="bg-white rounded p-2 mb-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600">Efectivo recibido:</span>
                      <span className="font-semibold text-gray-900">
                        ${efectivo.toFixed(2)}
                      </span>
                    </div>
                    {cambio > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-600">Cambio entregado:</span>
                        <span className="font-semibold text-blue-700">
                          ${cambio.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                    <span className="text-[10px] text-blue-700 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {tiempoAbierta(cuenta.abierta_en)}
                    </span>
                    <span className="font-bold text-blue-700 text-base">
                      ${cuenta.total_actual.toFixed(2)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* CUENTAS SOLICITADAS (mesero pidio cuenta, aun no cobro) */}
        {solicitadas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Solicitan cuenta ({solicitadas.length})
              </p>
            </div>
            {solicitadas.map((cuenta) => (
              <button
                key={cuenta.id}
                onClick={() => onCuentaClick(cuenta)}
                className="w-full text-left bg-amber-50 border-2 border-amber-300 rounded-lg p-3 hover:bg-amber-100 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                      {cuenta.mesa?.numero || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        Mesa {cuenta.mesa?.numero}
                      </p>
                      <p className="text-[10px] text-gray-600 flex items-center gap-1">
                        <UserCircle className="h-2.5 w-2.5" />
                        {cuenta.mesero?.nombre} {cuenta.mesero?.apellido}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200">
                  <span className="text-[10px] text-amber-700 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {tiempoAbierta(cuenta.abierta_en)}
                  </span>
                  <span className="font-bold text-amber-700 text-base">
                    ${cuenta.total_actual.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CUENTAS ABIERTAS (mesero atendiendo, aun sin pedir cuenta) */}
        {abiertas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cuentas activas ({abiertas.length})
            </p>
            {abiertas.map((cuenta) => (
              <button
                key={cuenta.id}
                onClick={() => onCuentaClick(cuenta)}
                className="w-full text-left bg-white border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {cuenta.mesa?.numero || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs">
                        Mesa {cuenta.mesa?.numero}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {cuenta.mesero?.nombre?.charAt(0)}.{' '}
                        {cuenta.mesero?.apellido} ·{' '}
                        {tiempoAbierta(cuenta.abierta_en)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-emerald-700 text-sm">
                      ${cuenta.total_actual.toFixed(2)}
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {cuentas.length === 0 && (
          <div className="text-center py-4">
            <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Sin cuentas activas</p>
            <p className="text-[10px] text-gray-400">
              Las mesas ocupadas apareceran aqui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
