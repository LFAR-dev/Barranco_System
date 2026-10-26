'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Users, Plus, Receipt, Clock, CheckCircle,
  UserCircle, AlertCircle, Loader2, HeartHandshake
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
import { Mesa } from '@/lib/services/mesaService'
import { cuentaService, CuentaAbierta } from '@/lib/services/cuentaService'

interface MesaAccionesPanelProps {
  mesa: Mesa | null
  isOpen: boolean
  onClose: () => void
  usuarioId: string
  onSuccess?: () => void
}

const ESTADOS_LABEL: Record<string, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
  ocupada: { label: 'Ocupada', color: 'bg-red-100 text-red-700' },
  cuenta_solicitada: {
    label: 'Cuenta solicitada',
    color: 'bg-amber-100 text-amber-700'
  },
  cobrando: { label: 'Cobrando', color: 'bg-blue-100 text-blue-700' },
  reservada: { label: 'Reservada', color: 'bg-purple-100 text-purple-700' },
  fuera_servicio: {
    label: 'Fuera de servicio',
    color: 'bg-gray-100 text-gray-700'
  }
}

export function MesaAccionesPanel({
  mesa,
  isOpen,
  onClose,
  usuarioId,
  onSuccess
}: MesaAccionesPanelProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cuenta, setCuenta] = useState<CuentaAbierta | null>(null)
  const [cargandoCuenta, setCargandoCuenta] = useState(false)
  const [comensales, setComensales] = useState(2)
  const [modoAbrirCuenta, setModoAbrirCuenta] = useState(false)
  const [modoAyuda, setModoAyuda] = useState(false)

  useEffect(() => {
    if (mesa && (mesa.estado === 'ocupada' || mesa.estado === 'cuenta_solicitada')) {
      cargarCuenta()
    } else {
      setCuenta(null)
    }
  }, [mesa?.id, mesa?.estado])

  useEffect(() => {
    setModoAyuda(false)
    setModoAbrirCuenta(false)
  }, [mesa?.id])

  const cargarCuenta = async () => {
    if (!mesa) return
    setCargandoCuenta(true)
    try {
      const data = await cuentaService.getCuentaActiva(mesa.id)
      setCuenta(data)
    } catch (error) {
      console.error('Error al cargar cuenta:', error)
    } finally {
      setCargandoCuenta(false)
    }
  }

  const handleAbrirCuenta = async () => {
    if (!mesa) return
    setLoading(true)
    try {
      await cuentaService.abrirCuenta(mesa.id, usuarioId, comensales)
      toast({
        title: 'Cuenta abierta',
        description: `Mesa ${mesa.numero} lista para tomar pedidos`,
        variant: 'success'
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo abrir la cuenta',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleIrATomarPedido = () => {
    if (!mesa) return
    router.push(`/mesero/orders/new?mesa=${mesa.id}`)
    onClose()
  }

  const handleIrAAyudar = () => {
    if (!mesa) return
    router.push(`/mesero/orders/new?mesa=${mesa.id}&ayudando=true`)
    onClose()
  }

  const handleSolicitarCuenta = async () => {
    if (!mesa) return
    setLoading(true)
    try {
      await cuentaService.solicitarCuenta(mesa.id)
      toast({
        title: 'Cuenta solicitada',
        description: `Caja ha sido notificada para cobrar la mesa ${mesa.numero}`,
        variant: 'success'
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo solicitar la cuenta',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLiberarMesa = async () => {
    if (!mesa) return
    if (!confirm(`Liberar la mesa ${mesa.numero}? La cuenta se cerrara.`)) return
    setLoading(true)
    try {
      if (cuenta) {
        await cuentaService.cerrarCuenta(cuenta.id)
      }
      toast({
        title: 'Mesa liberada',
        description: `Mesa ${mesa.numero} esta disponible`,
        variant: 'success'
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo liberar la mesa',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mesa) return null

  const estadoInfo = ESTADOS_LABEL[mesa.estado] || ESTADOS_LABEL.disponible
  const esMiMesa = mesa.mesero_id === usuarioId
  const estaDisponible = mesa.estado === 'disponible'
  const estaOcupada = mesa.estado === 'ocupada'
  const cuentaSolicitada = mesa.estado === 'cuenta_solicitada'

  const tiempoAbierta = mesa.abierta_en
    ? Math.floor((Date.now() - new Date(mesa.abierta_en).getTime()) / 60000)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
        max-w-md w-full
        sm:w-[95vw]
        max-h-[90vh] sm:max-h-[90vh]
        overflow-y-auto
        p-0
        fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2
        rounded-t-2xl sm:rounded-2xl
        sm:left-1/2 sm:-translate-x-1/2
      "
      >
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold">
                {mesa.numero}
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">
                  Mesa {mesa.numero}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {mesa.categoria}
                </p>
              </div>
            </div>
            <Badge className={estadoInfo.color}>{estadoInfo.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                <Users className="h-3 w-3" /> Capacidad
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {mesa.capacidad} personas
              </p>
            </div>
            {estaOcupada || cuentaSolicitada ? (
              <div className="bg-orange-50 rounded-lg p-2.5">
                <p className="text-[10px] sm:text-xs text-orange-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Tiempo abierta
                </p>
                <p className="text-sm font-semibold text-orange-900">
                  {tiempoAbierta} min
                </p>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-2.5">
                <p className="text-[10px] sm:text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Lista
                </p>
                <p className="text-sm font-semibold text-green-900">
                  Disponible
                </p>
              </div>
            )}
          </div>

          {mesa.mesero && (
            <div
              className={`rounded-lg p-2.5 border ${
                esMiMesa ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="text-[10px] sm:text-xs text-gray-600 flex items-center gap-1 mb-1">
                <UserCircle className="h-3 w-3" /> Mesero
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {mesa.mesero.nombre} {mesa.mesero.apellido}
                {esMiMesa && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700 text-[9px]">
                    Tu
                  </Badge>
                )}
              </p>
            </div>
          )}

          {cargandoCuenta && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}

          {cuenta && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] sm:text-xs text-amber-700 font-medium">
                  Cuenta abierta
                </p>
                <Badge className="bg-amber-100 text-amber-700 text-[9px]">
                  {cuenta.comensales} comensales
                </Badge>
              </div>
              <p className="text-lg font-bold text-amber-900">
                ${cuenta.total_actual.toFixed(2)}
              </p>
            </div>
          )}

          {modoAbrirCuenta && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <Label className="text-xs">Numero de comensales</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={comensales}
                onChange={(e) => setComensales(parseInt(e.target.value) || 1)}
                className="bg-white"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModoAbrirCuenta(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAbrirCuenta}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Abrir'}
                </Button>
              </div>
            </div>
          )}

          {modoAyuda && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <HeartHandshake className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-purple-900">
                    Ayudar a {mesa.mesero?.nombre} {mesa.mesero?.apellido}
                  </p>
                  <p className="text-[10px] text-purple-700 mt-1">
                    El pedido se agregara a la cuenta de la mesa. Tu apareceras
                    como quien ayudo, y {mesa.mesero?.nombre} recibira una
                    notificacion.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModoAyuda(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleIrAAyudar}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-3 border-t">
            {estaDisponible && !modoAbrirCuenta && (
              <>
                <Button
                  onClick={() => setModoAbrirCuenta(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir cuenta
                </Button>
                <Button
                  onClick={handleIrATomarPedido}
                  variant="outline"
                  className="w-full"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Ir directo a tomar pedido
                </Button>
              </>
            )}

            {estaOcupada && esMiMesa && (
              <>
                <Button
                  onClick={handleIrATomarPedido}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar pedido
                </Button>
                <Button
                  onClick={handleSolicitarCuenta}
                  disabled={loading}
                  variant="outline"
                  className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Solicitar cuenta
                </Button>
                <Button
                  onClick={handleLiberarMesa}
                  disabled={loading}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Liberar mesa
                </Button>
              </>
            )}

            {estaOcupada && !esMiMesa && !modoAyuda && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      Esta mesa esta siendo atendida por otro mesero.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setModoAyuda(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <HeartHandshake className="h-4 w-4 mr-2" />
                  Ayudar a companero
                </Button>
              </>
            )}

            {cuentaSolicitada && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800">
                    Caja fue notificada. Esperando cobro.
                  </p>
                </div>
              </div>
            )}

            {mesa.estado === 'fuera_servicio' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-700">
                    Mesa fuera de servicio. Contacta al administrador.
                  </p>
                </div>
              </div>
            )}

            <Button onClick={onClose} variant="ghost" className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
