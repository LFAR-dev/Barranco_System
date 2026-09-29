'use client'

import { useState, useEffect } from 'react'
import { Loader2, Wallet, MapPin, Tag, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { cajaFisicaService, CajaFisica } from '@/lib/services/cajaFisicaService'

interface CajaFisicaFormProps {
  caja?: CajaFisica | null
  onSuccess: () => void
  onCancel: () => void
}

export function CajaFisicaForm({ caja, onSuccess, onCancel }: CajaFisicaFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sucursales, setSucursales] = useState<any[]>([])
  const [formData, setFormData] = useState({
    nombre: caja?.nombre || '',
    sucursal_id: caja?.sucursal_id || '',
    tipo: caja?.tipo || 'caja' as CajaFisica['tipo'],
    notas: caja?.notas || ''
  })

  useEffect(() => {
    cargarSucursales()
  }, [])

  const cargarSucursales = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('sucursales')
      .select('id, nombre, tipo')
      .eq('activa', true)
      .order('nombre')
    setSucursales(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      if (caja) {
        await cajaFisicaService.update(caja.id, {
          nombre: formData.nombre.trim(),
          sucursal_id: formData.sucursal_id || null,
          tipo: formData.tipo,
          notas: formData.notas.trim() || null
        })
        toast({
          title: '✅ Caja actualizada',
          description: 'Los cambios se guardaron correctamente',
          variant: 'success'
        })
      } else {
        await cajaFisicaService.create({
          nombre: formData.nombre.trim(),
          sucursal_id: formData.sucursal_id || null,
          tipo: formData.tipo,
          notas: formData.notas.trim() || undefined
        })
        toast({
          title: '✅ Caja creada',
          description: `"${formData.nombre}" está lista para usarse`,
          variant: 'success'
        })
      }
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la caja',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre" className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-gray-500" />
          Nombre de la caja
        </Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Ej: Caja Principal, Caja Terraza, Caja Evento..."
          disabled={loading}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sucursal" className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            Sucursal / Ubicación
          </Label>
          <select
            id="sucursal"
            value={formData.sucursal_id}
            onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
            disabled={loading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sin sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} {s.tipo === 'evento' ? '(evento)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo" className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-gray-500" />
            Tipo de caja
          </Label>
          <select
            id="tipo"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as CajaFisica['tipo'] })}
            disabled={loading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="caja">Caja normal</option>
            <option value="evento">Caja de evento</option>
            <option value="movil">Caja móvil</option>
            <option value="temporal">Caja temporal</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas" className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-gray-500" />
          Notas (opcional)
        </Label>
        <textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Información adicional sobre esta caja..."
          disabled={loading}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
              Guardando...
            </>
          ) : caja ? (
            'Guardar cambios'
          ) : (
            'Crear caja'
          )}
        </Button>
      </div>
    </form>
  )
}
