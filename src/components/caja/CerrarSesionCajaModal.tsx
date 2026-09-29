'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, Loader2, DollarSign, CreditCard,
  TrendingUp, Calculator
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { sesionCajaService, SesionCaja, ResumenSesion } from '@/lib/services/sesionCajaService'

interface CerrarSesionCajaModalProps {
  isOpen: boolean
  onClose: () => void
  sesion: SesionCaja
  onSuccess?: () => void
}

export function CerrarSesionCajaModal({ isOpen, onClose, sesion, onSuccess }: CerrarSesionCajaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [resumen, setResumen] = useState<ResumenSesion | null>(null)
  const [saldoFinal, setSaldoFinal] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (isOpen && sesion) {
      cargarResumen()
    }
  }, [isOpen, sesion])

  const cargarResumen = async () => {
    setLoadingResumen(true)
    try {
      const data = await sesionCajaService.getResumenSesion(sesion.id)
      setResumen(data)
    } catch (error) {
      console.error('Error al cargar resumen:', error)
    } finally {
      setLoadingResumen(false)
    }
  }

  const handleCerrar = async () => {
    const saldo = parseFloat(saldoFinal || '0')
    if (saldo < 0) {
      toast({
        title: 'Error',
        description: 'El saldo final no puede ser negativo',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await sesionCajaService.cerrarSesion(sesion.id, saldo, notas.trim() || undefined)

      const diferencia = saldo - (sesion.saldo_inicial + (resumen?.total_efectivo || 0))

      toast({
        title: '✅ Sesión cerrada',
        description: `Diferencia: ${diferencia >= 0 ? '+' : ''}$${diferencia.toFixed(2)}`,
        variant: Math.abs(diferencia) < 1 ? 'success' : 'destructive',
        duration: 8000
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar la sesión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const diferenciaProyectada = resumen
    ? parseFloat(saldoFinal || '0') - (sesion.saldo_inicial + resumen.total_efectivo)
    : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Cerrar sesión de caja
          </DialogTitle>
          <DialogDescription>
            Verifica el resumen y registra el efectivo final en caja.
          </DialogDescription>
        </DialogHeader>

        {loadingResumen ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : resumen ? (
          <div className="space-y-4 mt-2">
            {/* Resumen de la sesión */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-gray-600" />
                <p className="text-sm font-semibold text-gray-900">Resumen del turno</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Saldo inicial:</span>
                  <span className="font-semibold">${sesion.saldo_inicial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventas:</span>
                  <span className="font-semibold">{resumen.total_ventas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total cobrado:</span>
                  <span className="font-semibold text-emerald-600">
                    ${resumen.total_cobrado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Propinas:</span>
                  <span className="font-semibold text-blue-600">
                    ${resumen.total_propinas.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Efectivo:
                  </span>
                  <span className="font-semibold">${resumen.total_efectivo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Tarjeta:
                  </span>
                  <span className="font-semibold">${resumen.total_tarjeta.toFixed(2)}</span>
                </div>
                {resumen.total_transferencia > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Transferencia:
                    </span>
                    <span className="font-semibold">${resumen.total_transferencia.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Saldo esperado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 mb-1">Efectivo que debería haber en caja:</p>
              <p className="text-2xl font-bold text-blue-800">
                ${(sesion.saldo_inicial + resumen.total_efectivo).toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                (Saldo inicial + efectivo cobrado)
              </p>
            </div>

            {/* Input saldo final */}
            <div className="space-y-2">
              <Label htmlFor="saldoFinal" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                Efectivo real en caja
              </Label>
              <Input
                id="saldoFinal"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={saldoFinal}
                onChange={(e) => setSaldoFinal(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            {/* Diferencia en vivo */}
            {diferenciaProyectada !== null && saldoFinal && (
              <div className={`rounded-lg p-3 ${
                Math.abs(diferenciaProyectada) < 1
                  ? 'bg-emerald-50 border border-emerald-200'
                  : diferenciaProyectada > 0
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Diferencia:</span>
                  <span className={`text-lg font-bold ${
                    Math.abs(diferenciaProyectada) < 1
                      ? 'text-emerald-700'
                      : diferenciaProyectada > 0
                      ? 'text-blue-700'
                      : 'text-red-700'
                  }`}>
                    {diferenciaProyectada >= 0 ? '+' : ''}${diferenciaProyectada.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.abs(diferenciaProyectada) < 1
                    ? '✅ Cuadra perfecto'
                    : diferenciaProyectada > 0
                    ? '💰 Sobra dinero en caja'
                    : '⚠️ Falta dinero en caja'}
                </p>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas de cierre (opcional)</Label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Faltó cambio por propina..."
                disabled={loading}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCerrar}
                disabled={loading || !saldoFinal}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  'Confirmar cierre'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-2" />
            <p className="text-gray-600">No se pudo cargar el resumen</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
