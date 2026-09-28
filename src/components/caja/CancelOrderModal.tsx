'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, XCircle, Loader2 } from 'lucide-react'

const MOTIVOS_COMUNES = [
  'Cliente canceló el pedido',
  'Error al tomar el pedido',
  'Producto agotado',
  'Error en la preparación',
  'Pedido duplicado',
  'Cliente se retiró sin pagar',
  'Otro (especificar)',
]

interface CancelOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
  pedidoInfo?: {
    mesa?: string
    total?: number
  }
}

export function CancelOrderModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  pedidoInfo 
}: CancelOrderModalProps) {
  const [motivo, setMotivo] = useState('')
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    const motivoFinal = motivoSeleccionado === 'Otro (especificar)' 
      ? motivo 
      : motivoSeleccionado || motivo

    if (!motivoFinal || motivoFinal.trim().length < 5) {
      setError('Por favor indica el motivo de la cancelación (mínimo 5 caracteres)')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onConfirm(motivoFinal.trim())
      setMotivo('')
      setMotivoSeleccionado('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'No se pudo cancelar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setMotivo('')
    setMotivoSeleccionado('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            {pedidoInfo?.mesa && (
              <span className="block">
                Mesa: <strong>{pedidoInfo.mesa}</strong>
                {pedidoInfo.total !== undefined && (
                  <> • Total: <strong>${pedidoInfo.total.toFixed(2)}</strong></>
                )}
              </span>
            )}
            Esta acción notificará al administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Motivo de cancelación *</Label>
            <div className="grid grid-cols-1 gap-2">
              {MOTIVOS_COMUNES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMotivoSeleccionado(m)
                    if (m !== 'Otro (especificar)') {
                      setMotivo(m)
                    } else {
                      setMotivo('')
                    }
                  }}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                    motivoSeleccionado === m
                      ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {(motivoSeleccionado === 'Otro (especificar)' || !motivoSeleccionado) && (
            <div className="space-y-2">
              <Label htmlFor="motivo">
                {motivoSeleccionado === 'Otro (especificar)' 
                  ? 'Especifica el motivo *' 
                  : 'O escribe el motivo directamente *'}
              </Label>
              <Textarea
                id="motivo"
                placeholder="Ej: El cliente cambió de opinión y ya no quiere el pedido..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                maxLength={300}
                disabled={loading}
              />
              <p className="text-xs text-gray-400">
                {motivo.length}/300 caracteres
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Volver
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Pedido
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
