'use client'

import { useState, useEffect } from 'react'
import {
  X, Save, Trash2, Users, MapPin, Circle,
  CheckCircle, AlertCircle, Clock, Lock
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { mesaService, Mesa, EstadoMesa, CategoriaMesa } from '@/lib/services/mesaService'

interface MesaDetalleModalProps {
  mesa: Mesa | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editable?: boolean
}

const CATEGORIAS: { value: CategoriaMesa; label: string }[] = [
  { value: 'especial', label: 'Especial' },
  { value: 'social', label: 'Social' },
  { value: 'privada', label: 'Privada' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'temporal', label: 'Temporal' }
]

const ESTADOS: { value: EstadoMesa; label: string; color: string }[] = [
  { value: 'disponible', label: 'Disponible', color: 'bg-green-100 text-green-700' },
  { value: 'ocupada', label: 'Ocupada', color: 'bg-red-100 text-red-700' },
  { value: 'cuenta_solicitada', label: 'Cuenta solicitada', color: 'bg-amber-100 text-amber-700' },
  { value: 'cobrando', label: 'Cobrando', color: 'bg-blue-100 text-blue-700' },
  { value: 'reservada', label: 'Reservada', color: 'bg-purple-100 text-purple-700' },
  { value: 'fuera_servicio', label: 'Fuera de servicio', color: 'bg-gray-100 text-gray-700' }
]

export function MesaDetalleModal({
  mesa,
  isOpen,
  onClose,
  onSuccess,
  editable = false
}: MesaDetalleModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    numero: '',
    categoria: 'social' as CategoriaMesa,
    capacidad: 4,
    ubicacion: '',
    estado: 'disponible' as EstadoMesa,
    mapa_x: 50,
    mapa_y: 50,
    mapa_ancho: 6,
    mapa_alto: 6,
    mapa_rotacion: 0
  })

  useEffect(() => {
    if (mesa) {
      setForm({
        numero: mesa.numero || '',
        categoria: mesa.categoria || 'social',
        capacidad: mesa.capacidad || 4,
        ubicacion: mesa.ubicacion || '',
        estado: mesa.estado || 'disponible',
        mapa_x: mesa.mapa_x || 50,
        mapa_y: mesa.mapa_y || 50,
        mapa_ancho: mesa.mapa_ancho || 6,
        mapa_alto: mesa.mapa_alto || 6,
        mapa_rotacion: mesa.mapa_rotacion || 0
      })
      setEditando(false)
    }
  }, [mesa])

  const handleGuardar = async () => {
    if (!mesa) return
    setLoading(true)
    try {
      await mesaService.actualizar(mesa.id, {
        numero: form.numero,
        categoria: form.categoria,
        capacidad: form.capacidad,
        ubicacion: form.ubicacion,
        estado: form.estado,
        mapa_x: form.mapa_x,
        mapa_y: form.mapa_y,
        mapa_ancho: form.mapa_ancho,
        mapa_alto: form.mapa_alto,
        mapa_rotacion: form.mapa_rotacion
      })
      toast({
        title: 'Mesa actualizada',
        description: `La mesa ${form.numero} fue actualizada correctamente`,
        variant: 'success'
      })
      setEditando(false)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async () => {
    if (!mesa) return
    if (!confirm(`¿Desactivar la mesa ${mesa.numero}? No se borrará del historial.`)) return
    setLoading(true)
    try {
      await mesaService.eliminar(mesa.id)
      toast({
        title: 'Mesa desactivada',
        description: 'La mesa ya no aparecerá en el mapa',
        variant: 'success'
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLiberar = async () => {
    if (!mesa) return
    setLoading(true)
    try {
      await mesaService.liberar(mesa.id)
      toast({
        title: 'Mesa liberada',
        description: 'La mesa está disponible nuevamente',
        variant: 'success'
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo liberar',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mesa) return null

  const estadoActual = ESTADOS.find(e => e.value === mesa.estado) || ESTADOS[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-gray-500" />
              <span>Mesa {mesa.numero}</span>
              <Badge className={estadoActual.color}>{estadoActual.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Vista read-only (no editando) */}
          {!editando ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Categoría
                  </p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{mesa.categoria}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Capacidad
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{mesa.capacidad} personas</p>
                </div>
                {mesa.mesero && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-orange-700">Mesero asignado</p>
                    <p className="text-sm font-semibold text-orange-900">
                      {mesa.mesero.nombre} {mesa.mesero.apellido}
                    </p>
                  </div>
                )}
                {mesa.abierta_en && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-blue-700 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Abierta desde
                    </p>
                    <p className="text-sm font-semibold text-blue-900">
                      {new Date(mesa.abierta_en).toLocaleString('es-MX')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                {editable && (
                  <Button
                    onClick={() => setEditando(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Editar características
                  </Button>
                )}
                {mesa.estado !== 'disponible' && (
                  <Button
                    variant="outline"
                    onClick={handleLiberar}
                    disabled={loading}
                    className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Liberar mesa
                  </Button>
                )}
                {editable && (
                  <Button
                    variant="outline"
                    onClick={handleEliminar}
                    disabled={loading}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Vista editable */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="numero" className="text-xs">Número</Label>
                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="capacidad" className="text-xs">Capacidad</Label>
                  <Input
                    id="capacidad"
                    type="number"
                    min="1"
                    value={form.capacidad}
                    onChange={(e) => setForm({ ...form, capacidad: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="categoria" className="text-xs">Categoría</Label>
                  <select
                    id="categoria"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaMesa })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="estado" className="text-xs">Estado</Label>
                  <select
                    id="estado"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoMesa })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {ESTADOS.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="ubicacion" className="text-xs">Ubicación</Label>
                <Input
                  id="ubicacion"
                  value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                  placeholder="Ej: Junto a la ventana"
                />
              </div>

              {/* Posición en el mapa */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Posición en el mapa</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">X (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.mapa_x}
                      onChange={(e) => setForm({ ...form, mapa_x: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Y (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.mapa_y}
                      onChange={(e) => setForm({ ...form, mapa_y: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Ancho (%)</Label>
                    <Input
                      type="number"
                      min="2"
                      max="20"
                      step="0.5"
                      value={form.mapa_ancho}
                      onChange={(e) => setForm({ ...form, mapa_ancho: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Alto (%)</Label>
                    <Input
                      type="number"
                      min="2"
                      max="20"
                      step="0.5"
                      value={form.mapa_alto}
                      onChange={(e) => setForm({ ...form, mapa_alto: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Rotación (grados)</Label>
                    <Input
                      type="number"
                      min="-180"
                      max="180"
                      step="5"
                      value={form.mapa_rotacion}
                      onChange={(e) => setForm({ ...form, mapa_rotacion: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditando(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardar}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
