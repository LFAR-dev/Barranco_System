'use client'

import { useEffect, useState } from 'react'
import {
  X, DollarSign, CreditCard, Wallet, Calendar, Clock,
  User, ChefHat, Receipt, TrendingUp, TrendingDown,
  Building2, Loader2, AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ventaService, Venta, VentaDetalle } from '@/lib/services/ventaService'

interface DetalleVentaModalProps {
  venta: Venta | null
  isOpen: boolean
  onClose: () => void
}

export function DetalleVentaModal({ venta, isOpen, onClose }: DetalleVentaModalProps) {
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && venta) {
      cargarDetalle(venta.id)
    } else {
      setDetalle(null)
    }
  }, [isOpen, venta])

  const cargarDetalle = async (id: string) => {
    setLoading(true)
    try {
      const data = await ventaService.getVentaById(id)
      setDetalle(data)
    } catch (error) {
      console.error('Error al cargar detalle:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'efectivo': return <DollarSign className="h-4 w-4" />
      case 'tarjeta': return <CreditCard className="h-4 w-4" />
      default: return <Wallet className="h-4 w-4" />
    }
  }

  if (!venta) return null

  const v = detalle || venta

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-blue-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Detalle de venta
              <span className="font-mono text-sm text-gray-500">
                #{v.id.slice(0, 8)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Monto principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-700 mb-1">TOTAL</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ${(v.total || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 mb-1">PROPINA</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${(v.propina || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">MÉTODO</p>
                <div className="flex items-center gap-2 text-gray-900">
                  {getMetodoPagoIcon(v.metodo_pago || '')}
                  <span className="font-bold capitalize">{v.metodo_pago || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-2">
              <Badge className={
                v.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                v.estado === 'servido' || v.estado === 'completada' ? 'bg-emerald-100 text-emerald-700' :
                'bg-yellow-100 text-yellow-700'
              }>
                {v.estado || 'N/A'}
              </Badge>
              {v.descuento > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Descuento: ${v.descuento.toFixed(2)}
                </Badge>
              )}
            </div>

            {/* Trazabilidad */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                Trazabilidad del servicio
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mesero */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-orange-100 rounded-md">
                      <User className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <p className="text-xs text-gray-500">Mesero</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {v.mesero
                      ? `${v.mesero.nombre} ${v.mesero.apellido}`
                      : <span className="text-gray-400 italic">Venta directa en caja</span>}
                  </p>
                </div>

                {/* Bartender */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-100 rounded-md">
                      <ChefHat className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500">Bartender</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {v.bartender
                      ? v.bartender.nombre_completo
                      : <span className="text-gray-400 italic">Sin asignar</span>}
                  </p>
                </div>

                {/* Cajero */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-emerald-100 rounded-md">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-500">Cajero que cobró</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {v.cajero
                      ? `${v.cajero.nombre} ${v.cajero.apellido}`
                      : <span className="text-gray-400 italic">Sin registrar</span>}
                  </p>
                </div>

                {/* Caja física */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500">Caja / Sucursal</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {v.caja_fisica?.nombre || v.sucursal?.nombre || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fecha y hora */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                Fecha y jornada
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Fecha y hora</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {new Date(v.created_at).toLocaleString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Jornada</p>
                  </div>
                  <p className="font-medium text-sm text-gray-900">
                    {v.jornada?.nombre || <span className="text-gray-400 italic">Sin jornada asignada</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Pago */}
            {v.metodo_pago === 'efectivo' && (v.monto_recibido || v.monto_cambio) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  Detalle del pago
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Recibido</p>
                    <p className="font-bold text-gray-900">
                      ${(v.monto_recibido || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Cambio</p>
                    <p className="font-bold text-gray-900">
                      ${(v.monto_cambio || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Producto (si es venta individual) */}
            {v.receta && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-gray-600" />
                  Producto
                </h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-sm text-gray-900">{v.receta.nombre}</p>
                </div>
              </div>
            )}

            {/* Aviso si está cancelada */}
            {v.estado === 'cancelada' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Esta venta fue cancelada
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Consulta el módulo de Auditoría para ver el motivo y quién la canceló.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Total final */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total de la venta</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ${(v.total || 0).toFixed(2)}
                </span>
              </div>
              {v.propina > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">+ Propina</span>
                  <span className="text-sm font-medium text-blue-600">
                    ${(v.propina || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
