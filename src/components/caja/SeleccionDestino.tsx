'use client'

import { useEffect, useState } from 'react'
import {
  MapPin, ShoppingBag, Utensils, Users, Loader2,
  Receipt, Wallet, AlertCircle, CheckCircle, Plus
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { turnoService } from '@/lib/services/turnoService'
import { jornadaService } from '@/lib/services/jornadaService'
import { cuentaService } from '@/lib/services/cuentaService'
import { createClient } from '@/lib/supabase/client'

export type TipoDestino = 'caja' | 'mesa'
export type ModoPago = 'agregar_cuenta' | 'pagar_ahora'

interface Mesa {
  id: string
  numero: string | number
  ubicacion?: string
  capacidad?: number
  estado?: string
}

interface MeseroActivo {
  usuario_id: string
  nombre: string
  apellido: string
  email: string
}

interface CuentaExistente {
  id: string
  mesero_id: string
  total_actual: number
  mesero?: { nombre: string; apellido: string } | null
}

interface SeleccionDestinoProps {
  onChange: (data: {
    tipo: TipoDestino
    mesaId: string
    mesaNombre: string
    meseroId: string
    meseroNombre: string
    modoPago: ModoPago
    cuentaExistenteId: string | null
    cuentaExistenteInfo: string | null
  }) => void
}

export function SeleccionDestino({ onChange }: SeleccionDestinoProps) {
  const supabase = createClient()
  const [tipo, setTipo] = useState<TipoDestino>('caja')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [mesaId, setMesaId] = useState('')
  const [meseroId, setMeseroId] = useState('')
  const [modoPago, setModoPago] = useState<ModoPago>('agregar_cuenta')
  const [cuentaExistente, setCuentaExistente] = useState<CuentaExistente | null>(null)
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [loadingMeseros, setLoadingMeseros] = useState(false)
  const [loadingCuenta, setLoadingCuenta] = useState(false)

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

  // Consultar cuenta existente cuando se elige una mesa
  useEffect(() => {
    if (tipo === 'mesa' && mesaId) {
      consultarCuentaExistente(mesaId)
    } else {
      setCuentaExistente(null)
    }
  }, [tipo, mesaId])

  // Notificar cambios al padre
  useEffect(() => {
    const mesaSeleccionada = mesas.find(m => m.id === mesaId)
    const meseroSeleccionado = meseros.find(m => m.usuario_id === meseroId)

    // Si es "pagar ahora" o "caja", no va a cuenta
    const usarCuenta = tipo === 'mesa' && modoPago === 'agregar_cuenta'

    onChange({
      tipo,
      mesaId: tipo === 'mesa' ? mesaId : '',
      mesaNombre: tipo === 'mesa' ? (mesaSeleccionada ? `Mesa ${mesaSeleccionada.numero}` : '') : 'Caja',
      meseroId: tipo === 'mesa' ? meseroId : '',
      meseroNombre: tipo === 'mesa' && meseroSeleccionado
        ? `${meseroSeleccionado.nombre} ${meseroSeleccionado.apellido}`
        : '',
      modoPago,
      cuentaExistenteId: usarCuenta ? (cuentaExistente?.id || null) : null,
      cuentaExistenteInfo: usarCuenta && cuentaExistente
        ? `${cuentaExistente.mesero?.nombre || ''} ${cuentaExistente.mesero?.apellido || ''}`.trim() || 'Sin nombre'
        : null
    })
  }, [tipo, mesaId, meseroId, mesas, meseros, modoPago, cuentaExistente])

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

  const consultarCuentaExistente = async (idMesa: string) => {
    setLoadingCuenta(true)
    try {
      const cuenta = await cuentaService.getCuentaActiva(idMesa)
      if (cuenta) {
        setCuentaExistente({
          id: cuenta.id,
          mesero_id: cuenta.mesero_id,
          total_actual: cuenta.total_actual || 0,
          mesero: cuenta.mesero || null
        })
        // Si ya hay cuenta, forzar "agregar a cuenta existente"
        setModoPago('agregar_cuenta')
      } else {
        setCuentaExistente(null)
      }
    } catch (error) {
      console.error('Error al consultar cuenta:', error)
      setCuentaExistente(null)
    } finally {
      setLoadingCuenta(false)
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        Destino del pedido
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              El cliente recoge su pedido aqui
            </p>
          </div>
        </button>

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
                    {mesa.estado === 'ocupada' ? ' (ocupada)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Info de cuenta existente / mesa libre */}
          {mesaId && (
            <div>
              {loadingCuenta ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Consultando cuenta...
                </div>
              ) : cuentaExistente ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-700">
                      Mesa ocupada - Cuenta abierta
                    </p>
                  </div>
                  <p className="text-[10px] text-blue-600">
                    Abierta por {cuentaExistente.mesero?.nombre || ''} {cuentaExistente.mesero?.apellido || ''}
                    {' · '}
                    Total actual: ${(cuentaExistente.total_actual || 0).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Mesa libre</p>
                    <p className="text-[10px] text-amber-600">
                      Se abrira cuenta automatica al mesero seleccionado
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selector de mesero (solo si mesa libre o primera vez) */}
          {!cuentaExistente && mesaId && (
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
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>No hay meseros activos en este turno. Activalos desde el panel admin.</span>
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
          )}

          {/* Modo de pago: solo si hay mesa seleccionada */}
          {mesaId && !loadingCuenta && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Forma de cobro
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoPago('agregar_cuenta')}
                  className={`flex items-start gap-2 p-2 rounded-md border-2 transition-colors text-left ${
                    modoPago === 'agregar_cuenta'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    modoPago === 'agregar_cuenta' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {modoPago === 'agregar_cuenta' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {cuentaExistente ? <Receipt className="h-3 w-3 text-blue-600" /> : <Plus className="h-3 w-3 text-blue-600" />}
                      <p className="text-[11px] font-medium text-gray-900">
                        {cuentaExistente ? 'Agregar a cuenta existente' : 'Abrir cuenta nueva'}
                      </p>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">
                      {cuentaExistente ? 'Se cobra al cerrar la cuenta' : 'Se crea cuenta y se cobra al cerrar'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModoPago('pagar_ahora')}
                  className={`flex items-start gap-2 p-2 rounded-md border-2 transition-colors text-left ${
                    modoPago === 'pagar_ahora'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    modoPago === 'pagar_ahora' ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                  }`}>
                    {modoPago === 'pagar_ahora' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-amber-600" />
                      <p className="text-[11px] font-medium text-gray-900">Pagar ahora</p>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">
                      Se cobra al instante, no entra a cuenta
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Resumen final */}
          {meseroId && mesaId && !loadingCuenta && (
            <div className="text-[10px] text-emerald-700 bg-white rounded p-2 border border-emerald-200 flex items-start gap-1">
              <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                {modoPago === 'pagar_ahora' ? (
                  <>El pedido se cobrara al instante. Mesa <strong>{mesas.find(m => m.id === mesaId)?.numero}</strong></>
                ) : cuentaExistente ? (
                  <>El pedido se agregara a la cuenta existente de <strong>{cuentaExistente.mesero?.nombre} {cuentaExistente.mesero?.apellido}</strong></>
                ) : (
                  <>Se abrira cuenta a <strong>{meseros.find(m => m.usuario_id === meseroId)?.nombre}</strong> para <strong>Mesa {mesas.find(m => m.id === mesaId)?.numero}</strong></>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
