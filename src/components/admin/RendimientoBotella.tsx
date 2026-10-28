'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Wine, Droplets, Martini, AlertTriangle,
  CheckCircle, Loader2, SlidersHorizontal, History
} from 'lucide-react'
import {
  bottleService,
  RendimientoBotella as RendimientoData,
  MovimientoBotella
} from '@/lib/services/bottleService'
import { BottleAdjustmentModal } from './BottleAdjustmentModal'

interface RendimientoBotellaProps {
  productoId: string
  nombreProducto?: string
  marca?: string
  volumenMl?: number
  stockActual?: number
  stockMaximo?: number
  stockMinimo?: number
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
  showAdjustButton?: boolean
}

export function RendimientoBotella({
  productoId,
  nombreProducto,
  marca,
  showDetails = true,
  size = 'md',
  showAdjustButton = false
}: RendimientoBotellaProps) {
  const [rendimiento, setRendimiento] = useState<RendimientoData | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoBotella[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [data, movs] = await Promise.all([
        bottleService.getBotella(productoId),
        bottleService.getMovimientos(productoId, 10)
      ])
      setRendimiento(data)
      setMovimientos(movs)
    } catch (error) {
      console.error('Error al cargar rendimiento:', error)
    } finally {
      setLoading(false)
    }
  }, [productoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const getEstado = () => {
    if (!rendimiento) {
      return {
        label: 'CARGANDO',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        fillColor: '#6b7280',
        icon: Loader2
      }
    }
    if (rendimiento.estado_alerta === 'agotado') {
      return {
        label: 'AGOTADO',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        fillColor: '#ef4444',
        icon: AlertTriangle
      }
    }
    if (rendimiento.estado_alerta === 'bajo') {
      return {
        label: 'STOCK BAJO',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        fillColor: '#f59e0b',
        icon: AlertTriangle
      }
    }
    return {
      label: 'DISPONIBLE',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      borderColor: 'border-emerald-300',
      fillColor: '#10b981',
      icon: CheckCircle
    }
  }

  const estado = getEstado()
  const Icon = estado.icon
  const porcentaje = rendimiento?.porcentaje_stock || 0
  const volumenRestante = rendimiento?.ml_en_stock_actual || 0
  const shots = rendimiento?.shots_disponibles || 0
  const bebidas = rendimiento?.bebidas_disponibles || 0
  const mlConsumidos = rendimiento?.ml_consumidos || 0
  const shotsConsumidos = rendimiento?.shots_consumidos || 0

  const tamanos = {
    sm: { contenedor: 'p-3', titulo: 'text-sm', porcentaje: 'text-2xl', stat: 'text-lg', statLabel: 'text-[10px]', icono: 'h-8 w-8', progress: 'h-2', botella: 'w-8 h-16' },
    md: { contenedor: 'p-4', titulo: 'text-base', porcentaje: 'text-3xl', stat: 'text-xl', statLabel: 'text-xs', icono: 'h-10 w-10', progress: 'h-3', botella: 'w-10 h-20' },
    lg: { contenedor: 'p-6', titulo: 'text-lg', porcentaje: 'text-4xl', stat: 'text-2xl', statLabel: 'text-sm', icono: 'h-12 w-12', progress: 'h-4', botella: 'w-12 h-24' }
  }
  const t = tamanos[size]

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border-2 ${estado.borderColor} ${t.contenedor}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!rendimiento) {
    return (
      <div className={`bg-white rounded-xl border-2 border-gray-300 ${t.contenedor}`}>
        <p className="text-sm text-gray-500 text-center py-8">
          No se pudo cargar el rendimiento
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 ${estado.borderColor} ${t.contenedor} transition-all hover:shadow-lg`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`relative flex-shrink-0 ${estado.bgColor} rounded-xl p-2`}>
              <Wine className={`${t.icono} ${estado.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-bold text-gray-900 ${t.titulo} truncate`}>
                {nombreProducto || rendimiento.nombre}
              </h3>
              {(marca || rendimiento.marca) && (
                <p className="text-gray-500 text-xs truncate">
                  {marca || rendimiento.marca}
                </p>
              )}
            </div>
          </div>
          <Badge className={`${estado.bgColor} ${estado.color} border ${estado.borderColor} font-semibold whitespace-nowrap`}>
            <Icon className="h-3 w-3 mr-1" />
            {estado.label}
          </Badge>
        </div>

        {/* Botella visual + porcentaje */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className={`${t.botella} relative rounded-lg border-2 border-gray-300 bg-gray-100 overflow-hidden`}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-2 bg-gray-300 rounded-t-sm" />
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                style={{
                  height: `${Math.min(porcentaje, 100)}%`,
                  backgroundColor: estado.fillColor,
                  opacity: 0.85
                }}
              >
                <div className="absolute top-0 left-1 w-1 h-full bg-white/30 rounded-full" />
              </div>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <span className="text-[8px] font-bold text-white drop-shadow-lg">
                  {rendimiento.volumen_ml}ml
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`font-black ${t.porcentaje} ${estado.color}`}>
                {porcentaje.toFixed(0)}%
              </span>
              <span className="text-gray-400 text-xs">del stock maximo</span>
            </div>
            <Progress value={Math.min(porcentaje, 100)} className={`${t.progress} mb-2`} />
            {showDetails && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Droplets className="h-3 w-3" />
                <span className="font-medium">{volumenRestante.toLocaleString()} ml</span>
                <span className="text-gray-400">en stock</span>
              </div>
            )}
          </div>
        </div>

        {showDetails && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
              <div className="text-center">
                <Wine className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className={`font-bold ${t.stat} text-gray-900`}>
                  {rendimiento.stock_actual}
                </p>
                <p className={`${t.statLabel} text-gray-500 uppercase`}>
                  {rendimiento.stock_actual === 1 ? 'Botella' : 'Botellas'}
                </p>
              </div>
              <div className="text-center border-x border-gray-200">
                <Martini className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                <p className={`font-bold ${t.stat} text-purple-600`}>{shots}</p>
                <p className={`${t.statLabel} text-gray-500 uppercase`}>Shots</p>
                <p className="text-[9px] text-gray-400 mt-0.5">disponibles</p>
              </div>
              <div className="text-center">
                <Droplets className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                <p className={`font-bold ${t.stat} text-emerald-600`}>{bebidas}</p>
                <p className={`${t.statLabel} text-gray-500 uppercase`}>Bebidas</p>
                <p className="text-[9px] text-gray-400 mt-0.5">disponibles</p>
              </div>
            </div>

            {/* Consumo historico */}
            {(mlConsumidos > 0 || shotsConsumidos > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-3.5 w-3.5 text-gray-500" />
                  <p className="text-xs font-semibold text-gray-700">Consumo historico</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">Total ml</p>
                    <p className="font-bold text-gray-900">
                      {mlConsumidos.toLocaleString()} ml
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">Shots consumidos</p>
                    <p className="font-bold text-gray-900">{shotsConsumidos}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Movimientos recientes */}
            {movimientos.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Ultimos movimientos
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {movimientos.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-700 truncate">
                          {m.motivo || 'Sin motivo'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(m.created_at).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span
                        className={`font-bold shrink-0 ml-2 ${
                          m.tipo_movimiento === 'salida'
                            ? 'text-red-600'
                            : m.tipo_movimiento === 'entrada'
                            ? 'text-emerald-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {m.tipo_movimiento === 'salida' ? '-' : '+'}
                        {Math.abs(m.cantidad_movimiento).toFixed(0)} ml
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Boton ajustar */}
        {showAdjustButton && (
          <Button
            onClick={() => setIsAdjustOpen(true)}
            variant="outline"
            size="sm"
            className="w-full mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
            Ajustar ml manualmente
          </Button>
        )}

        {/* Alerta bajo */}
        {rendimiento.estado_alerta === 'bajo' && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Stock bajo. Considera reabastecer.
              </p>
            </div>
          </div>
        )}

        {/* Alerta agotado */}
        {rendimiento.estado_alerta === 'agotado' && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-800 font-semibold">
                PRODUCTO AGOTADO
              </p>
            </div>
          </div>
        )}
      </div>

      <BottleAdjustmentModal
        botella={rendimiento}
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        onSuccess={cargar}
      />
    </>
  )
}
