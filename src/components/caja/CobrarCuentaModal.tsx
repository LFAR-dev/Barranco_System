'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, CreditCard, Wallet, Loader2, CheckCircle,
  Receipt, X, UserCircle, Clock, List
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cuentaService, CuentaAbierta, CuentaConPedidos } from '@/lib/services/cuentaService'

interface CobrarCuentaModalProps {
  cuenta: CuentaAbierta | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export function CobrarCuentaModal({
  cuenta,
  isOpen,
  onClose,
  onSuccess
}: CobrarCuentaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle] = useState<CuentaConPedidos | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')

  useEffect(() => {
    if (isOpen && cuenta) {
      cargarDetalle()
    }
  }, [isOpen, cuenta?.id])

  const cargarDetalle = async () => {
    if (!cuenta) return
    setCargando(true)
    try {
      const data = await cuentaService.getCuentaConPedidos(cuenta.id)
      setDetalle(data)
    } catch (error) {
      console.error('Error al cargar detalle:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleCobrar = async () => {
    if (!cuenta || !detalle) return

    const total = detalle.total_actual
    if (metodoPago === 'efectivo' && parseFloat(efectivoRecibido || '0') < total) {
      toast({
        title: 'Efectivo insuficiente',
        description: `Faltan $${(total - parseFloat(efectivoRecibido || '0')).toFixed(2)}`,
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await cuentaService.cerrarCuenta(cuenta.id)
      
      toast({
        title: 'Cuenta cobrada',
        description: `Mesa ${detalle.mesa?.numero} cobrada: $${total.toFixed(2)}`,
        variant: 'success'
      })

      setEfectivoRecibido('')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cobrar la cuenta',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!cuenta) return null

  const cambio = metodoPago === 'efectivo' 
    ? Math.max(0, parseFloat(efectivoRecibido || '0') - (detalle?.total_actual || 0))
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-700" />
              <span className="text-emerald-800">
                Cobrar Mesa {detalle?.mesa?.numero || cuenta.mesa?.numero}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {cargando ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : detalle ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Info de la cuenta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <UserCircle className="h-3 w-3" /> Mesero
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {detalle.mesero?.nombre} {detalle.mesero?.apellido}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Abierta
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {Math.floor((Date.now() - new Date(detalle.abierta_en).getTime()) / 60000)} min
                </p>
              </div>
            </div>

            {/* Lista de items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  Detalle de la cuenta
                </h4>
                <Badge className="bg-gray-100 text-gray-700 text-[10px]">
                  {detalle.pedidos.length} pedido{detalle.pedidos.length === 1 ? '' : 's'} · {detalle.items_totales} items
                </Badge>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-2 max-h-[250px] overflow-y-auto space-y-1">
                {detalle.pedidos.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">Sin items registrados</p>
                ) : (
                  detalle.pedidos.map((pedido) => (
                    <div key={pedido.id} className="bg-white rounded p-2 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400">
                          {new Date(pedido.created_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <Badge className="bg-gray-100 text-gray-600 text-[9px]">
                          {pedido.estado}
                        </Badge>
                      </div>
                      {Array.isArray(pedido.items) && pedido.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-700">
                            {item.nombre} <span className="text-gray-400">×{item.cantidad}</span>
                          </span>
                          <span className="font-medium text-gray-900">
                            ${((item.precio || 0) * (item.cantidad || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-900">Total a cobrar:</span>
                <span className="text-2xl font-bold text-emerald-700">
                  ${detalle.total_actual.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={metodoPago === 'efectivo' ? 'default' : 'outline'}
                  onClick={() => setMetodoPago('efectivo')}
                  disabled={loading}
                  className={`flex-col h-auto py-2 ${metodoPago === 'efectivo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <DollarSign className="h-4 w-4 mb-1" />
                  <span className="text-[10px]">Efectivo</span>
                </Button>
                <Button
                  variant={metodoPago === 'tarjeta' ? 'default' : 'outline'}
                  onClick={() => setMetodoPago('tarjeta')}
                  disabled={loading}
                  className={`flex-col h-auto py-2 ${metodoPago === 'tarjeta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-[10px]">Tarjeta</span>
                </Button>
                <Button
                  variant={metodoPago === 'transferencia' ? 'default' : 'outline'}
                  onClick={() => setMetodoPago('transferencia')}
                  disabled={loading}
                  className={`flex-col h-auto py-2 ${metodoPago === 'transferencia' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <Wallet className="h-4 w-4 mb-1" />
                  <span className="text-[10px]">Transf.</span>
                </Button>
              </div>
            </div>

            {/* Efectivo recibido */}
            {metodoPago === 'efectivo' && (
              <div className="space-y-2">
                <Label htmlFor="efectivo" className="text-xs">Efectivo recibido</Label>
                <Input
                  id="efectivo"
                  type="number"
                  placeholder="0.00"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  disabled={loading}
                />
                {cambio > 0 && (
                  <div className="flex justify-between text-sm bg-blue-50 p-2 rounded-lg">
                    <span className="font-medium text-blue-800">Cambio:</span>
                    <span className="font-bold text-blue-700">${cambio.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleCobrar}
                disabled={loading || detalle.total_actual <= 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cobrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Cobrar ${detalle.total_actual.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No se pudo cargar la cuenta</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
