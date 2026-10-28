'use client'

import { useState } from 'react'
import {
  Wine, Plus, Minus, SlidersHorizontal, Loader2, X, AlertTriangle
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { bottleService, RendimientoBotella, TipoMovimiento } from '@/lib/services/bottleService'

interface BottleAdjustmentModalProps {
  botella: RendimientoBotella | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MOTIVOS = [
  { valor: 'derrame', label: 'Derrame' },
  { valor: 'botella_rota', label: 'Botella rota' },
  { valor: 'invitacion', label: 'Invitacion / Cortesia' },
  { valor: 'ajuste_conteo', label: 'Ajuste por conteo fisico' },
  { valor: 'reposicion', label: 'Reposicion de stock' },
  { valor: 'otro', label: 'Otro' }
]

export function BottleAdjustmentModal({
  botella,
  isOpen,
  onClose,
  onSuccess
}: BottleAdjustmentModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<TipoMovimiento>('salida')
  const [cantidadMl, setCantidadMl] = useState('')
  const [motivo, setMotivo] = useState('derrame')
  const [descripcion, setDescripcion] = useState('')

  const reset = () => {
    setTipo('salida')
    setCantidadMl('')
    setMotivo('derrame')
    setDescripcion('')
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botella) return

    const cantidad = parseFloat(cantidadMl)
    if (!cantidad || cantidad <= 0) {
      toast({
        title: 'Cantidad invalida',
        description: 'Debe ser mayor a cero',
        variant: 'destructive'
      })
      return
    }

    if (!motivo) {
      toast({
        title: 'Motivo requerido',
        description: 'Selecciona un motivo del ajuste',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await bottleService.registrarMovimiento(
        botella.id,
        tipo,
        cantidad,
        motivo,
        descripcion.trim() || undefined
      )

      const accion =
        tipo === 'salida'
          ? 'descontados'
          : tipo === 'entrada'
          ? 'agregados'
          : 'ajustados'

      toast({
        title: 'Movimiento registrado',
        description: `${cantidad} ml ${accion} a ${botella.nombre}`,
        variant: 'success'
      })

      onSuccess?.()
      handleClose()
    } catch (error: any) {
      console.error('Error al registrar movimiento:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el movimiento',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!botella) return null

  const stockMl = botella.stock_actual * botella.volumen_ml
  const previewMl =
    tipo === 'salida'
      ? Math.max(0, stockMl - (parseFloat(cantidadMl) || 0))
      : tipo === 'entrada'
      ? stockMl + (parseFloat(cantidadMl) || 0)
      : parseFloat(cantidadMl) || 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-purple-600" />
            Ajustar botella
          </DialogTitle>
          <DialogDescription>
            Registra entrada, salida o ajuste manual de ml
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info actual */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="font-semibold text-purple-900 text-sm">
              {botella.nombre}
            </p>
            {botella.marca && (
              <p className="text-xs text-purple-700">{botella.marca}</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div>
                <p className="text-purple-700">Botellas</p>
                <p className="font-bold text-purple-900">
                  {botella.stock_actual}
                </p>
              </div>
              <div>
                <p className="text-purple-700">Stock actual</p>
                <p className="font-bold text-purple-900">
                  {stockMl.toLocaleString()} ml
                </p>
              </div>
              <div>
                <p className="text-purple-700">Consumidos</p>
                <p className="font-bold text-purple-900">
                  {botella.ml_consumidos.toLocaleString()} ml
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de movimiento */}
          <div className="space-y-2">
            <Label className="text-xs">Tipo de movimiento</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={tipo === 'entrada' ? 'default' : 'outline'}
                onClick={() => setTipo('entrada')}
                disabled={loading}
                className={`flex-col h-auto py-2 ${
                  tipo === 'entrada'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-emerald-700 border-emerald-300'
                }`}
              >
                <Plus className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Entrada</span>
              </Button>
              <Button
                type="button"
                variant={tipo === 'salida' ? 'default' : 'outline'}
                onClick={() => setTipo('salida')}
                disabled={loading}
                className={`flex-col h-auto py-2 ${
                  tipo === 'salida'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'text-red-700 border-red-300'
                }`}
              >
                <Minus className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Salida</span>
              </Button>
              <Button
                type="button"
                variant={tipo === 'ajuste' ? 'default' : 'outline'}
                onClick={() => setTipo('ajuste')}
                disabled={loading}
                className={`flex-col h-auto py-2 ${
                  tipo === 'ajuste'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-blue-700 border-blue-300'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Ajuste</span>
              </Button>
            </div>
            <p className="text-[10px] text-gray-500">
              {tipo === 'entrada' && 'Agrega ml al stock (reposicion)'}
              {tipo === 'salida' && 'Descuenta ml (derrame, merma)'}
              {tipo === 'ajuste' && 'Establece el stock exacto (conteo fisico)'}
            </p>
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="cantidad" className="text-xs">
              Cantidad en ml
            </Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              step="1"
              placeholder="Ej: 50"
              value={cantidadMl}
              onChange={(e) => setCantidadMl(e.target.value)}
              disabled={loading}
              className="text-lg font-semibold"
            />
            {previewMl > 0 && (
              <div className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                <span className="text-gray-600">Stock resultante:</span>
                <span className="font-bold">
                  {previewMl.toLocaleString()} ml
                </span>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-xs">
              Motivo
            </Label>
            <select
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MOTIVOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-xs">
              Descripcion (opcional)
            </Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles adicionales..."
              disabled={loading}
              rows={2}
            />
          </div>

          {tipo === 'salida' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-800">
                  Esta accion queda registrada en auditoria
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !cantidadMl}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar movimiento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
