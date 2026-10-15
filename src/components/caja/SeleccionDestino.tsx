'use client'

import { useEffect, useState } from 'react'
import { MapPin, ShoppingBag, Utensils, Users, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { turnoService } from '@/lib/services/turnoService'
import { jornadaService } from '@/lib/services/jornadaService'
import { createClient } from '@/lib/supabase/client'

export type TipoDestino = 'caja' | 'mesa'

interface Mesa {
  id: string
  numero: string | number
  ubicacion?: string
  capacidad?: number
}

interface MeseroActivo {
  usuario_id: string
  nombre: string
  apellido: string
  email: string
}

interface SeleccionDestinoProps {
  onChange: (data: {
    tipo: TipoDestino
    mesaId: string
    mesaNombre: string
    meseroId: string
    meseroNombre: string
  }) => void
}

export function SeleccionDestino({ onChange }: SeleccionDestinoProps) {
  const supabase = createClient()
  const [tipo, setTipo] = useState<TipoDestino>('caja')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [mesaId, setMesaId] = useState('')
  const [meseroId, setMeseroId] = useState('')
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [loadingMeseros, setLoadingMeseros] = useState(false)

  // Cargar mesas al montar
  useEffect(() => {
    cargarMesas()
  }, [])

  // Cargar meseros cuando se elige "mesa"
  useEffect(() => {
    if (tipo === 'mesa') {
      cargarMeserosActivos()
    }
  }, [tipo])

  // Notificar cambios al padre
  useEffect(() => {
    const mesaSeleccionada = mesas.find(m => m.id === mesaId)
    const meseroSeleccionado = meseros.find(m => m.usuario_id === meseroId)

    onChange({
      tipo,
      mesaId: tipo === 'mesa' ? mesaId : '',
      mesaNombre: tipo === 'mesa' ? (mesaSeleccionada ? `Mesa ${mesaSeleccionada.numero}` : '') : 'Caja',
      meseroId: tipo === 'mesa' ? meseroId : '',
      meseroNombre: tipo === 'mesa' && meseroSeleccionado
        ? `${meseroSeleccionado.nombre} ${meseroSeleccionado.apellido}`
        : ''
    })
  }, [tipo, mesaId, meseroId, mesas, meseros])

  const cargarMesas = async () => {
    setLoadingMesas(true)
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('activa', true)
        .order('numero')

      if (error) throw error
      setMesas(data || [])
    } catch (error) {
      console.error('Error al cargar mesas:', error)
    } finally {
      setLoadingMesas(false)
    }
  }

  const cargarMeserosActivos = async () => {
    setLoadingMeseros(true)
    try {
      const jornadaId = await jornadaService.getJornadaActualId()
      if (!jornadaId) {
        setMeseros([])
        return
      }

      const trabajadores = await turnoService.getTrabajadoresActivosTurno(jornadaId, 'mesero')
      setMeseros(trabajadores)
    } catch (error) {
      console.error('Error al cargar meseros:', error)
    } finally {
      setLoadingMeseros(false)
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        Destino del pedido
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Opción 1: Cliente recoge en caja */}
        <button
          type="button"
          onClick={() => setTipo('caja')}
          className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
            tipo === 'caja'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            tipo === 'caja' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
          }`}>
            {tipo === 'caja' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs font-medium text-gray-900">Recoge en caja</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              El cliente recoge su pedido aquí
            </p>
          </div>
        </button>

        {/* Opción 2: Llevar a mesa */}
        <button
          type="button"
          onClick={() => setTipo('mesa')}
          className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
            tipo === 'mesa'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            tipo === 'mesa' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
          }`}>
            {tipo === 'mesa' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs font-medium text-gray-900">Llevar a mesa</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Un mesero lleva el pedido
            </p>
          </div>
        </button>
      </div>

      {/* Selectores si "Llevar a mesa" */}
      {tipo === 'mesa' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-3">
          {/* Selector de mesa */}
          <div className="space-y-1.5">
            <Label htmlFor="mesa" className="text-xs font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Mesa
            </Label>
            {loadingMesas ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando mesas...
              </div>
            ) : (
              <select
                id="mesa"
                value={mesaId}
                onChange={(e) => setMesaId(e.target.value)}
                className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecciona una mesa...</option>
                {mesas.map(mesa => (
                  <option key={mesa.id} value={mesa.id}>
                    Mesa {mesa.numero} {mesa.ubicacion ? `- ${mesa.ubicacion}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selector de mesero */}
          <div className="space-y-1.5">
            <Label htmlFor="mesero" className="text-xs font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              Mesero
              <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0 ml-1">
                Solo activos en turno
              </Badge>
            </Label>
            {loadingMeseros ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando meseros...
              </div>
            ) : meseros.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                ⚠️ No hay meseros activos en este turno. Actívalos desde el panel admin.
              </div>
            ) : (
              <select
                id="mesero"
                value={meseroId}
                onChange={(e) => setMeseroId(e.target.value)}
                className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecciona un mesero...</option>
                {meseros.map(mesero => (
                  <option key={mesero.usuario_id} value={mesero.usuario_id}>
                    {mesero.nombre} {mesero.apellido}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Info */}
          {meseroId && mesaId && (
            <div className="text-[10px] text-emerald-700 bg-white rounded p-2 border border-emerald-200">
              ✅ El pedido se asignará a <strong>{meseros.find(m => m.usuario_id === meseroId)?.nombre}</strong> para la <strong>Mesa {mesas.find(m => m.id === mesaId)?.numero}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
