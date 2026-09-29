'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react'
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
import { jornadaService } from '@/lib/services/jornadaService'

interface AbrirJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AbrirJornadaModal({ isOpen, onClose, onSuccess }: AbrirJornadaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (isOpen && !nombre) {
      const hoy = new Date()
      const dia = hoy.toLocaleDateString('es-MX', { weekday: 'long' })
      const fecha = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
      const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1)
      setNombre(`${diaCapitalizado} ${fecha}`)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la jornada es obligatorio',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const result = await jornadaService.abrirJornada(nombre.trim(), notas.trim() || undefined)
      
      toast({
        title: '✅ Jornada abierta',
        description: `"${result.nombre}" está activa desde ahora`,
        variant: 'success'
      })

      setNombre('')
      setNotas('')
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Calendar className="h-5 w-5" />
            Abrir jornada del día
          </DialogTitle>
          <DialogDescription>
            Se cerrará cualquier jornada activa anterior. Todos los pedidos y ventas nuevas pertenecerán a esta jornada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="flex items-center gap-1.5">
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
            <Label htmlFor="notas" className="flex items-center gap-1.5">
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
              La jornada se abrirá con la hora actual y permanecerá activa hasta que la cierres.
            </p>
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
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abriendo...
                </>
              ) : (
                'Abrir jornada'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
