'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, CreditCard, Wallet, Loader2, CheckCircle,
  Receipt, X, AlertCircle, Calculator
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cuentaService, CuentaConPedidos } from '@/lib/services/cuentaService'
import { createClient } from '@/lib/supabase/client'

interface PedirCuentaModalProps {
  cuenta: CuentaConPedidos
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export function PedirCuentaModal({
  cuenta,
  isOpen,
  onClose,
  onSuccess
}: PedirCuentaModalProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')

  const total = Number(cuenta.total_actual) || 0
  const recibido = parseFloat(efectivoRecibido) || 0
  const cambio = metodoPago === 'efectivo' ? Math.max(0, recibido - total) : 0
  const faltante = metodoPago === 'efectivo' ? Math.max(0, total - recibido) : 0

  useEffect(() => {
    if (isOpen) {
      setMetodoPago('efectivo')
      setEfectivoRecibido('')
    }
  }, [isOpen, cuenta.id])

  const handleSolicitarCuenta = async () => {
    setLoading(true)
    try {
      await cuentaService.solicitarCuenta(cuenta.mesa_id)

      try {
        await supabase.from('notificaciones_caja').insert([
          {
            tipo: 'cuenta_solicitada',
            mensaje: `Mesa ${cuenta.mesa?.numero} - Total: $${total.toFixed(2)}`,
            motivo: `Mesero ${cuenta.mesero?.nombre} solicito cuenta para mesa ${cuenta.mesa?.numero}`,
            leida: false,
            jornada_id: cuenta.jornada_id
          }
        ])
      } catch (e) {
        console.warn('No se pudo notificar a caja (la cuenta si se solicito):', e)
      }

      toast({
        title: 'Cuenta enviada a caja',
        description: `Mesa ${cuenta.mesa?.numero} - Caja notificada con monto de $${total.toFixed(2)}`,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error al solicitar cuenta:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo solicitar la cuenta',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrarCobro = async () => {
    if (metodoPago === 'efectivo' && recibido < total) {
      toast({
        title: 'Efectivo insuficiente',
        description: `Faltan $${faltante.toFixed(2)} por cubrir`,
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const efectivoFinal = metodoPago === 'efectivo' ? recibido : total
      const cambioFinal = metodoPago === 'efectivo' ? cambio : 0

      await cuentaService.registrarCobroMesero(
        cuenta.id,
        efectivoFinal,
        cambioFinal
      )

      try {
        await supabase.from('notificaciones_caja').insert([
          {
            tipo: 'cobro_mesero',
            mensaje: `Mesa ${cuenta.mesa?.numero} - Total: $${total.toFixed(2)}, Efectivo: $${efectivoFinal.toFixed(2)}, Cambio: $${cambioFinal.toFixed(2)}`,
            motivo: `Mesero ${cuenta.mesero?.nombre} cobro al cliente. Confirmar en caja.`,
            leida: false,
            jornada_id: cuenta.jornada_id
          }
        ])
      } catch (e) {
        console.warn('No se pudo notificar a caja (cobro si registrado):', e)
      }

      toast({
        title: 'Cobro registrado',
        description: `Mesa ${cuenta.mesa?.numero} - Total: $${total.toFixed(2)}${
          cambioFinal > 0
            ? `, cambio entregado: $${cambioFinal.toFixed(2)}`
            : ''
        }. Caja debe confirmar.`,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error al registrar cobro:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el cobro',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const esSolicitada = cuenta.estado === 'cuenta_solicitada'
  const esCobrando = cuenta.estado === 'cobrando'

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !loading && onClose()}
    >
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-700" />
            <span className="text-emerald-800">
              {esSolicitada
                ? 'Registrar cobro'
                : esCobrando
                ? 'Cobro ya registrado'
                : 'Pedir cuenta'}{' '}
              - Mesa {cuenta.mesa?.numero}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {esSolicitada
              ? 'Registra el cobro al cliente y notifica a caja'
              : esCobrando
              ? 'El cobro ya fue registrado, espera confirmacion de caja'
              : 'Notifica a caja que el cliente va a pagar'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-900">
                Total de la cuenta:
              </span>
              <span className="text-2xl font-bold text-emerald-700">
                ${total.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              {cuenta.pedidos.length} pedido
              {cuenta.pedidos.length === 1 ? '' : 's'} ·{' '}
              {cuenta.items_totales} items
            </p>
          </div>

          {esCobrando && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">
                    Cobro registrado
                  </p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Ya registraste el cobro (efectivo:{' '}
                    ${Number(cuenta.efectivo_recibido || 0).toFixed(2)},
                    cambio:{' '}
                    ${Number(cuenta.cambio_entregado || 0).toFixed(2)}).
                    Caja debe confirmar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {esSolicitada && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Metodo de pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={metodoPago === 'efectivo' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('efectivo')}
                    disabled={loading}
                    className={`flex-col h-auto py-2 ${
                      metodoPago === 'efectivo'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }`}
                  >
                    <DollarSign className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">Efectivo</span>
                  </Button>
                  <Button
                    variant={metodoPago === 'tarjeta' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('tarjeta')}
                    disabled={loading}
                    className={`flex-col h-auto py-2 ${
                      metodoPago === 'tarjeta'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">Tarjeta</span>
                  </Button>
                  <Button
                    variant={metodoPago === 'transferencia' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('transferencia')}
                    disabled={loading}
                    className={`flex-col h-auto py-2 ${
                      metodoPago === 'transferencia'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }`}
                  >
                    <Wallet className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">Transf.</span>
                  </Button>
                </div>
              </div>

              {metodoPago === 'efectivo' && (
                <div className="space-y-2">
                  <Label htmlFor="efectivo" className="text-xs flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Efectivo recibido del cliente
                  </Label>
                  <Input
                    id="efectivo"
                    type="number"
                    placeholder="0.00"
                    value={efectivoRecibido}
                    onChange={(e) => setEfectivoRecibido(e.target.value)}
                    disabled={loading}
                    className="text-lg font-semibold"
                  />
                  {faltante > 0 && (
                    <div className="flex justify-between text-sm bg-red-50 p-2 rounded-lg">
                      <span className="font-medium text-red-800">Falta:</span>
                      <span className="font-bold text-red-700">
                        ${faltante.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {cambio > 0 && (
                    <div className="flex justify-between text-sm bg-blue-50 p-2 rounded-lg">
                      <span className="font-medium text-blue-800">Cambio:</span>
                      <span className="font-bold text-blue-700">
                        ${cambio.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {recibido === total && total > 0 && (
                    <div className="flex justify-between text-sm bg-emerald-50 p-2 rounded-lg">
                      <span className="font-medium text-emerald-800">
                        Sin cambio
                      </span>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                </div>
              )}

              {metodoPago !== 'efectivo' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    El cliente pagara con{' '}
                    {metodoPago === 'tarjeta' ? 'tarjeta' : 'transferencia'}.
                    Confirma en caja al recibir el pago.
                  </p>
                </div>
              )}
            </>
          )}

          {!esSolicitada && !esCobrando && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    Siguiente paso
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Al pedir cuenta, la caja recibe el monto exacto y espera el
                    pago. Cuando el cliente pague, vuelve aqui para registrar el
                    cobro.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            {esSolicitada && (
              <Button
                onClick={handleRegistrarCobro}
                disabled={
                  loading ||
                  total <= 0 ||
                  (metodoPago === 'efectivo' && recibido < total)
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registrar cobro ${total.toFixed(2)}
                  </>
                )}
              </Button>
            )}
            {!esSolicitada && !esCobrando && (
              <Button
                onClick={handleSolicitarCuenta}
                disabled={loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Pedir cuenta a caja
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
