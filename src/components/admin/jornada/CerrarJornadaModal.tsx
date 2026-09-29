'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'

interface CerrarJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  jornada: Jornada
  onSuccess?: () => void
}

export function CerrarJornadaModal({ isOpen, onClose, jornada, onSuccess }: CerrarJornadaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [notas, setNotas] = useState('')

  const handleCerrar = async () => {
    setLoading(true)
    try {
      const result = await jornadaService.cerrarJornada(jornada.id, notas.trim() || undefined)

      let mensaje = 'Jornada cerrada correctamente'
      if (result.pedidos_pendientes > 0) {
        mensaje += `. Quedaron ${result.pedidos_pendientes} pedidos pendientes.`
      }
      if (result.sesiones_cerradas > 0) {
        mensaje += ` Se cerraron ${result.sesiones_cerradas} sesiones de caja.`
      }

      toast({
        title: '✅ Jornada cerrada',
        description: mensaje,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar la jornada',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Cerrar jornada
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro que quieres cerrar <strong>{jornada.nombre}</strong>?
            Los usuarios de bartender, mesero y caja tendrán que cerrar sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              Se cerrarán automáticamente todas las sesiones de caja abiertas.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas de cierre (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Cierre normal, evento finalizado, incidencias..."
              disabled={loading}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

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
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
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
      </DialogContent>
    </Dialog>
  )
}
