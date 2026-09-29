'use client'

import { useState, useEffect } from 'react'
import { Wallet, DollarSign, Loader2, MapPin } from 'lucide-react'
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
import { cajaFisicaService, CajaFisicaConSucursal } from '@/lib/services/cajaFisicaService'
import { sesionCajaService } from '@/lib/services/sesionCajaService'
import { jornadaService } from '@/lib/services/jornadaService'

interface AbrirSesionCajaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AbrirSesionCajaModal({ isOpen, onClose, onSuccess }: AbrirSesionCajaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [cajas, setCajas] = useState<CajaFisicaConSucursal[]>([])
  const [cajaSeleccionada, setCajaSeleccionada] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (isOpen) {
      cargarCajas()
    }
  }, [isOpen])

  const cargarCajas = async () => {
    try {
      const data = await cajaFisicaService.getAll(true)
      setCajas(data)
      if (data.length > 0 && !cajaSeleccionada) {
        setCajaSeleccionada(data[0].id)
      }
    } catch (error) {
      console.error('Error al cargar cajas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cajaSeleccionada) {
      toast({
        title: 'Error',
        description: 'Selecciona una caja física',
        variant: 'destructive'
      })
      return
    }

    const saldo = parseFloat(saldoInicial || '0')
    if (saldo < 0) {
      toast({
        title: 'Error',
        description: 'El saldo inicial no puede ser negativo',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const jornadaId = await jornadaService.getJornadaActualId()
      if (!jornadaId) {
        throw new Error('No hay jornada activa. Pide al admin que abra la jornada.')
      }

      await sesionCajaService.abrirSesion({
        caja_fisica_id: cajaSeleccionada,
        saldo_inicial: saldo,
        jornada_id: jornadaId,
        notas: notas.trim() || undefined
      })

      toast({
        title: '✅ Sesión abierta',
        description: `Sesión iniciada con saldo inicial de $${saldo.toFixed(2)}`,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error al abrir sesión:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo abrir la sesión',
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
            <Wallet className="h-5 w-5" />
            Abrir sesión de caja
          </DialogTitle>
          <DialogDescription>
            Selecciona la caja física y registra el saldo inicial con el que empiezas tu turno.
          </DialogDescription>
        </DialogHeader>

        {cajas.length === 0 ? (
          <div className="p-6 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No hay cajas físicas configuradas</p>
            <p className="text-sm text-gray-500 mt-2">
              Pide al administrador que cree al menos una caja física en /admin/cajas
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="caja" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                Caja física
              </Label>
              <select
                id="caja"
                value={cajaSeleccionada}
                onChange={(e) => setCajaSeleccionada(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona una caja...</option>
                {cajas.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.nombre} {caja.sucursal_nombre ? `(${caja.sucursal_nombre})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saldo" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                Saldo inicial (efectivo en caja)
              </Label>
              <Input
                id="saldo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500">
                ¿Cuánto efectivo hay en la caja al iniciar tu turno?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Caja entregada por María con $500..."
                disabled={loading}
                rows={2}
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
                  'Abrir sesión'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
