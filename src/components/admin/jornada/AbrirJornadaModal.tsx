'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, Clock, FileText, Loader2, ChevronLeft, 
  ChevronRight, Users, CheckCircle 
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { jornadaService } from '@/lib/services/jornadaService'
import { emitirEventoJornada } from '@/lib/events/jornadaEvents'
import { turnoService } from '@/lib/services/turnoService'
import { SeleccionTrabajadores } from './SeleccionTrabajadores'

interface AbrirJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Paso = 'info' | 'trabajadores'

export function AbrirJornadaModal({ isOpen, onClose, onSuccess }: AbrirJornadaModalProps) {
  const { toast } = useToast()
  const [paso, setPaso] = useState<Paso>('info')
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [seleccion, setSeleccion] = useState<{
    cajeros: string[]
    bartenders: string[]
    meseros: string[]
  }>({ cajeros: [], bartenders: [], meseros: [] })

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setPaso('info')
      setLoading(false)
      setSeleccion({ cajeros: [], bartenders: [], meseros: [] })
      
      if (!nombre) {
        const hoy = new Date()
        const dia = hoy.toLocaleDateString('es-MX', { weekday: 'long' })
        const fecha = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
        const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1)
        setNombre(`${diaCapitalizado} ${fecha}`)
      }
    } else {
      // Limpiar al cerrar
      setNombre('')
      setNotas('')
      setPaso('info')
      setSeleccion({ cajeros: [], bartenders: [], meseros: [] })
    }
  }, [isOpen])

  const handlePaso1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la jornada es obligatorio',
        variant: 'destructive'
      })
      return
    }
    setPaso('trabajadores')
  }

  const handleAbrirConTrabajadores = async () => {
    const totalSeleccionados = 
      seleccion.cajeros.length + 
      seleccion.bartenders.length + 
      seleccion.meseros.length

    if (totalSeleccionados === 0) {
      const confirmar = window.confirm(
        'No has seleccionado ningún trabajador. ¿Abrir la jornada sin nadie activo?'
      )
      if (!confirmar) return
    }

    setLoading(true)
    try {
      // 1. Abrir la jornada
      const result = await jornadaService.abrirJornada(nombre.trim(), notas.trim() || undefined)

      // 2. Activar los trabajadores seleccionados
      if (totalSeleccionados > 0) {
        await turnoService.activarTurnoConTrabajadores(
          result.jornada_id,
          seleccion.cajeros,
          seleccion.bartenders,
          seleccion.meseros
        )
      }

      // 3. Notificar a todos los componentes
      emitirEventoJornada('JORNADA_ABIERTA')

      toast({
        title: '✅ Jornada abierta',
        description: totalSeleccionados > 0
          ? `"${result.nombre}" activa con ${totalSeleccionados} trabajador${totalSeleccionados === 1 ? '' : 'es'}`
          : `"${result.nombre}" está activa (sin trabajadores asignados)`,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error al abrir jornada:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo abrir la jornada',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVolver = () => {
    setPaso('info')
  }

  const totalSeleccionados = 
    seleccion.cajeros.length + 
    seleccion.bartenders.length + 
    seleccion.meseros.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="flex items-center gap-2 text-emerald-800 text-base sm:text-lg">
            <Calendar className="h-5 w-5 shrink-0" />
            Abrir jornada del día
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {paso === 'info' 
              ? 'Configura la jornada. En el siguiente paso seleccionarás quién trabaja.'
              : 'Selecciona a los trabajadores que van a estar activos durante este turno.'}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de paso */}
        <div className="px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${paso === 'info' ? 'text-emerald-700' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                paso === 'info' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {paso === 'trabajadores' ? '✓' : '1'}
              </div>
              <span className="text-xs sm:text-sm font-medium">Info de jornada</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-1" />
            <div className={`flex items-center gap-2 ${paso === 'trabajadores' ? 'text-emerald-700' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                paso === 'trabajadores' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="text-xs sm:text-sm font-medium">Trabajadores</span>
            </div>
          </div>
        </div>

        {/* PASO 1: INFO */}
        {paso === 'info' && (
          <form onSubmit={handlePaso1Submit} className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                Nombre de la jornada
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Viernes 12 diciembre"
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500">
                Aparecerá en reportes y estadísticas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                Notas (opcional)
              </Label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Evento especial, DJ invitado, día festivo..."
                disabled={loading}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                La jornada se abrirá con la hora actual. En el siguiente paso podrás seleccionar quién trabaja.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
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
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </form>
        )}

        {/* PASO 2: TRABAJADORES */}
        {paso === 'trabajadores' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-emerald-700" />
                <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                  Jornada: {nombre}
                </p>
              </div>
              <p className="text-xs text-emerald-700">
                Selecciona a quién estará activo durante este turno
              </p>
            </div>

            <SeleccionTrabajadores onSelectionChange={setSeleccion} />

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleVolver}
                disabled={loading}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
              <Button
                type="button"
                onClick={handleAbrirConTrabajadores}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Abriendo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Abrir jornada
                    {totalSeleccionados > 0 && (
                      <Badge className="ml-2 bg-white/20 text-white border-0 text-[10px]">
                        {totalSeleccionados}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
