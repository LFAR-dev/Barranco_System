'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, Loader2, Receipt, Clock,
  Plus, AlertCircle, DollarSign, Users
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  cuentaService,
  CuentaConPedidos
} from '@/lib/services/cuentaService'
import { PedirCuentaModal } from '@/components/mesas/PedirCuentaModal'

export default function MisMesasPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [cuentas, setCuentas] = useState<CuentaConPedidos[]>([])
  const [loading, setLoading] = useState(true)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaConPedidos | null>(null)
  const [isPedirCuentaOpen, setIsPedirCuentaOpen] = useState(false)

  const userId = user?.id

  const cargar = useCallback(async () => {
    if (!userId) {
      setCuentas([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const basicas = await cuentaService.getCuentasDelMesero(userId)
      const conPedidos = await Promise.all(
        (basicas || []).map((c) => cuentaService.getCuentaConPedidos(c.id))
      )
      setCuentas(conPedidos.filter(Boolean) as CuentaConPedidos[])
    } catch (error) {
      console.error('Error al cargar cuentas:', error)
      setCuentas([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!authLoading) {
      cargar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId])

  const handleAgregarProductos = (cuenta: CuentaConPedidos) => {
    if (!cuenta.mesa_id) {
      toast({
        title: 'Error',
        description: 'Esta cuenta no tiene mesa asignada',
        variant: 'destructive'
      })
      return
    }
    router.push(`/mesero/orders/new?mesa=${cuenta.mesa_id}&cuenta=${cuenta.id}`)
  }

  const handlePedirCuenta = (cuenta: CuentaConPedidos) => {
    setCuentaSeleccionada(cuenta)
    setIsPedirCuentaOpen(true)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    )
  }

  if (!user) return null

  const totalGeneral = cuentas.reduce(
    (s, c) => s + (Number(c.total_actual) || 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Link href="/mesero">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Mis mesas
              </h1>
              <p className="text-sm text-gray-500">
                Cuentas abiertas en tus mesas
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={cargar}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {cuentas.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-orange-500 bg-orange-50">
            <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-orange-700">Total en tus mesas</p>
                  <p className="text-xl font-bold text-orange-900">
                    ${totalGeneral.toFixed(2)}
                  </p>
                </div>
              </div>
              <Badge className="bg-orange-600 text-white">
                {cuentas.length} mesa{cuentas.length === 1 ? '' : 's'}
              </Badge>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Cargando cuentas...</p>
            </CardContent>
          </Card>
        ) : cuentas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">
                No tienes mesas abiertas
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Abre una cuenta desde el mapa de mesas para empezar a atender
              </p>
              <Link href="/mesero/orders">
                <Button className="mt-4 bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ir al mapa de mesas
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cuentas.map((cuenta) => {
              const tiempoMin = Math.floor(
                (Date.now() - new Date(cuenta.abierta_en).getTime()) / 60000
              )
              const esSolicitada = cuenta.estado === 'cuenta_solicitada'
              return (
                <Card
                  key={cuenta.id}
                  className={`overflow-hidden ${
                    esSolicitada ? 'border-2 border-amber-400' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div
                      className={`p-3 flex items-center justify-between ${
                        esSolicitada
                          ? 'bg-amber-50'
                          : 'bg-gradient-to-r from-gray-50 to-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
                            esSolicitada ? 'bg-amber-500' : 'bg-orange-500'
                          }`}
                        >
                          {cuenta.mesa?.numero || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Mesa {cuenta.mesa?.numero}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            hace {tiempoMin} min
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-orange-600">
                          ${Number(cuenta.total_actual || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {esSolicitada && (
                      <div className="px-3 py-2 bg-amber-100 border-y border-amber-200 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                        <p className="text-xs font-medium text-amber-800">
                          Cuenta solicitada - caja notificada
                        </p>
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Users className="h-3 w-3" />
                        {cuenta.comensales || 1} comensal
                        {cuenta.comensales === 1 ? '' : 'es'}
                        <span className="mx-1">·</span>
                        <Receipt className="h-3 w-3" />
                        {cuenta.pedidos.length} pedido
                        {cuenta.pedidos.length === 1 ? '' : 's'}
                      </div>

                      {cuenta.pedidos.length > 0 && (
                        <div className="bg-gray-50 rounded-md p-2 max-h-32 overflow-y-auto space-y-0.5">
                          {cuenta.pedidos.slice(-3).map((p: any) => (
                            <div key={p.id} className="text-xs text-gray-600">
                              {Array.isArray(p.items) &&
                                p.items.map((it: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex justify-between"
                                  >
                                    <span className="truncate">
                                      {it.nombre} x{it.cantidad}
                                    </span>
                                    <span className="text-gray-500 shrink-0 ml-2">
                                      $
                                      {(
                                        (it.precio || 0) * (it.cantidad || 0)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ))}
                          {cuenta.pedidos.length > 3 && (
                            <p className="text-[10px] text-gray-400 pt-1">
                              +{cuenta.pedidos.length - 3} pedido
                              {cuenta.pedidos.length - 3 === 1 ? '' : 's'} mas
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        {!esSolicitada && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAgregarProductos(cuenta)}
                            className="flex-1 text-orange-700 border-orange-300 hover:bg-orange-50 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar productos
                          </Button>
                        )}
                        {esSolicitada ? (
                          <Button
                            size="sm"
                            onClick={() => handlePedirCuenta(cuenta)}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Registrar cobro
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handlePedirCuenta(cuenta)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Pedir cuenta
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {cuentaSeleccionada && (
        <PedirCuentaModal
          cuenta={cuentaSeleccionada}
          isOpen={isPedirCuentaOpen}
          onClose={() => {
            setIsPedirCuentaOpen(false)
            setCuentaSeleccionada(null)
          }}
          onSuccess={() => {
            cargar()
          }}
        />
      )}
    </div>
  )
}
