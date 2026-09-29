'use client'

import { useState } from 'react'
import { LogOut, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { jornadaService } from '@/lib/services/jornadaService'

type Rol = 'bartender' | 'mesero' | 'caja'

interface SalirTurnoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmarSalida: () => void
  rol: Rol
  usuarioNombre: string
  usuarioId: string
}

const MOTIVOS_PREDEFINIDOS: Record<Rol, Array<{ value: string; label: string }>> = {
  bartender: [
    { value: 'turno_terminado', label: 'Terminé mi turno' },
    { value: 'break_personal', label: 'Necesito salir un momento' },
    { value: 'emergencia', label: 'Emergencia personal' },
    { value: 'enfermedad', label: 'Me siento mal' },
    { value: 'otro', label: 'Otro (escribe el motivo)' },
  ],
  mesero: [
    { value: 'turno_terminado', label: 'Terminé mi turno' },
    { value: 'break_personal', label: 'Necesito salir un momento' },
    { value: 'emergencia', label: 'Emergencia personal' },
    { value: 'enfermedad', label: 'Me siento mal' },
    { value: 'otro', label: 'Otro (escribe el motivo)' },
  ],
  caja: [
    { value: 'turno_terminado', label: 'Terminé mi turno' },
    { value: 'break_personal', label: 'Necesito salir un momento' },
    { value: 'emergencia', label: 'Emergencia personal' },
    { value: 'enfermedad', label: 'Me siento mal' },
    { value: 'cierre_caja', label: 'Cierre de caja' },
    { value: 'otro', label: 'Otro (escribe el motivo)' },
  ],
}

const LABELS_ROL: Record<Rol, string> = {
  bartender: 'Bartender',
  mesero: 'Mesero',
  caja: 'Cajero',
}

export function SalirTurnoModal({
  isOpen,
  onClose,
  onConfirmarSalida,
  rol,
  usuarioNombre,
  usuarioId
}: SalirTurnoModalProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('')
  const [notasAdicionales, setNotasAdicionales] = useState('')

  const motivos = MOTIVOS_PREDEFINIDOS[rol]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!motivoSeleccionado) {
      toast({
        title: 'Motivo requerido',
        description: 'Selecciona por qué estás cerrando sesión',
        variant: 'destructive'
      })
      return
    }

    if (motivoSeleccionado === 'otro' && !notasAdicionales.trim()) {
      toast({
        title: 'Motivo requerido',
        description: 'Escribe el motivo de tu salida',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // 1. Construir el motivo completo
      const motivoLabel = motivos.find(m => m.value === motivoSeleccionado)?.label || motivoSeleccionado
      const motivoFinal = motivoSeleccionado === 'otro'
        ? notasAdicionales.trim()
        : notasAdicionales.trim()
          ? `${motivoLabel} - ${notasAdicionales.trim()}`
          : motivoLabel

      // 2. Obtener jornada actual
      const jornadaId = await jornadaService.getJornadaActualId()

      // 3. Enviar notificación al admin
      const { error } = await supabase
        .from('notificaciones_admin')
        .insert([{
          usuario_id: usuarioId,
          tipo: 'cierre_sesion_operativo',
          mensaje: `${usuarioNombre} (${LABELS_ROL[rol]}) cerró sesión`,
          motivo: motivoFinal,
          jornada_id: jornadaId,
          leida: false
        }])

      if (error) {
        console.error('Error al notificar al admin:', error)
        // No bloqueamos el logout por esto
      }

      toast({
        title: '✅ Sesión cerrada',
        description: 'Se notificó al administrador. ¡Hasta pronto!',
        variant: 'success',
        duration: 4000
      })

      setMotivoSeleccionado('')
      setNotasAdicionales('')
      onConfirmarSalida()
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error)
      // Aun así cerramos sesión
      onConfirmarSalida()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setMotivoSeleccionado('')
    setNotasAdicionales('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 text-base sm:text-lg">
            <LogOut className="h-5 w-5 shrink-0" />
            Salir del turno
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Cuéntanos por qué cierras sesión. Se notificará al administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Motivo de salida
            </Label>

            <div className="space-y-1.5">
              {motivos.map((motivo) => (
                <label
                  key={motivo.value}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                    motivoSeleccionado === motivo.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={motivo.value}
                    checked={motivoSeleccionado === motivo.value}
                    onChange={(e) => setMotivoSeleccionado(e.target.value)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    motivoSeleccionado === motivo.value
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300'
                  }`}>
                    {motivoSeleccionado === motivo.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{motivo.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas" className="text-sm">
              Notas adicionales {motivoSeleccionado === 'otro' ? '(obligatorio)' : '(opcional)'}
            </Label>
            <textarea
              id="notas"
              value={notasAdicionales}
              onChange={(e) => setNotasAdicionales(e.target.value)}
              placeholder={
                motivoSeleccionado === 'otro'
                  ? 'Escribe el motivo de tu salida...'
                  : '¿Algo más que deba saber el administrador?'
              }
              disabled={loading}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
              El administrador recibirá una notificación con tu motivo de salida.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !motivoSeleccionado}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Confirmar salida
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
