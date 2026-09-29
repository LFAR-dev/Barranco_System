'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LogOut, Bell, DollarSign, ShoppingCart, 
  Clock, CheckCircle, Plus, 
  Wallet, CreditCard, Loader2, XCircle,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { orderService, Order } from '@/lib/services/orderService'
import { CancelOrderModal } from '@/components/caja/CancelOrderModal'
import { useJornadaWatcher } from '@/hooks/useJornadaWatcher'
import { JornadaCerradaOverlay } from '@/components/shared/JornadaCerradaOverlay'
import { EstadoSesionCaja } from '@/components/caja/EstadoSesionCaja'
import { HeaderRol } from '@/components/layout/HeaderRol'
import { SalirTurnoModal } from '@/components/shared/SalirTurnoModal'

export default function CajaDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { jornadaActiva, loading: jornadaLoading } = useJornadaWatcher({ enabled: !!user })
  const [pedidos, setPedidos] = useState<Order[]>([])
  const [isSalirTurnoOpen, setIsSalirTurnoOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pedidoToCancel, setPedidoToCancel] = useState<Order | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [sesionActiva, setSesionActiva] = useState<any>(null)
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    cobrados: 0,
    totalIngresos: 0
  })

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/caja-login')
        return
      }
      if (user.rol !== 'caja') {
        router.push('/')
        return
      }
      fetchPedidos()
    }
  }, [user, authLoading, router])

  const fetchPedidos = async () => {
    setLoading(true)
    try {
      const data = await orderService.getOrdersByEstado()
      setPedidos(data || [])
      
      const pendientes = data.filter((o: any) => 
        o.estado === 'pendiente' || o.estado === 'listo' || o.estado === 'preparando'
      ).length
      const cobrados = data.filter((o: any) => o.estado === 'servido').length
      const totalIngresos = data.filter((o: any) => o.estado === 'servido')
        .reduce((sum, o) => sum + (o.total || 0), 0)

      setStats({
        total: data.length,
        pendientes,
        cobrados,
        totalIngresos
      })
    } catch (error: any) {
      console.error('Error fetching pedidos:', error)
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudieron cargar los pedidos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: '👋 Sesión cerrada',
        description: 'Cerraste sesión correctamente',
        variant: 'default'
      })
      router.push('/')
    } catch (error) {
      router.push('/')
    }
  }

  const handleCobrarPedido = async (pedidoId: string, mesa?: string) => {
    try {
      await orderService.markServed(pedidoId)
      toast({
        title: '✅ Pedido cobrado',
        description: `El pedido de ${mesa || 'Caja'} se marcó como cobrado`,
        variant: 'success'
      })
      fetchPedidos()
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo cobrar el pedido',
        variant: 'destructive'
      })
    }
  }

  const handleOpenCancelModal = (pedido: Order) => {
    const canCancel = orderService.canCancelOrder(pedido)
    if (!canCancel.can) {
      toast({
        title: '⚠️ No se puede cancelar',
        description: canCancel.reason,
        variant: 'destructive'
      })
      return
    }
    setPedidoToCancel(pedido)
    setIsCancelModalOpen(true)
  }

  const handleConfirmCancel = async (motivo: string) => {
    if (!pedidoToCancel || !user) return

    try {
      await orderService.cancelOrder(pedidoToCancel.id, motivo, user.id)
      
      toast({
        title: '✅ Pedido cancelado',
        description: `Se canceló el pedido y se notificó al administrador`,
        variant: 'success',
        duration: 6000
      })
      
      fetchPedidos()
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo cancelar el pedido')
    }
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-700'
      case 'preparando': return 'bg-blue-100 text-blue-700'
      case 'listo': return 'bg-green-100 text-green-700'
      case 'servido': return 'bg-gray-100 text-gray-700'
      case 'cancelado': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const nombreCompleto = `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || 'Usuario'

  if (authLoading || (loading && pedidos.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const pedidosActivos = pedidos.filter(o => 
    o.estado === 'pendiente' || o.estado === 'preparando' || o.estado === 'listo'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <JornadaCerradaOverlay isOpen={!jornadaActiva && !jornadaLoading} />

      <HeaderRol
        rol="caja"
        onLogout={handleLogout}
        onSalirTurno={() => setIsSalirTurnoOpen(true)}
      >
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {stats.pendientes > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {stats.pendientes}
            </span>
          )}
        </Button>
      </HeaderRol>

      <div className="px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <EstadoSesionCaja onSesionChange={setSesionActiva} />
      </div>

      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Cajero'}!
            </h1>
            <p className="text-sm text-gray-500">Gestiona cobros y pedidos desde caja</p>
          </div>
          <Link href="/caja/pos">
            <Button className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Pedido</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Activos</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-full shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Cobrados</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.cobrados}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full shrink-0">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Ingresos</p>
                  <p className="text-base sm:text-2xl font-bold text-emerald-600 truncate">
                    ${stats.totalIngresos.toFixed(0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-full shrink-0">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span>📋 Pedidos Activos</span>
                  <Badge variant="secondary" className="text-xs">
                    {pedidosActivos.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pedidosActivos.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-base sm:text-lg">No hay pedidos activos</p>
                    <p className="text-sm mt-1">Todos los pedidos han sido cobrados</p>
                    <Link href="/caja/pos">
                      <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear nuevo pedido
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pedidosActivos.map((pedido) => (
                      <div 
                        key={pedido.id} 
                        className="border-2 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base sm:text-lg">
                                {pedido.mesa || 'Caja'}
                              </span>
                              <Badge className={`${getStatusColor(pedido.estado)} text-xs`}>
                                {pedido.estado.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                #{pedido.id.slice(0, 6)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                              {pedido.items?.length || 0} {pedido.items?.length === 1 ? 'producto' : 'productos'} • 
                              {' '}{new Date(pedido.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className="font-bold text-base sm:text-xl text-emerald-600 shrink-0">
                            ${pedido.total?.toFixed(2) || '0.00'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {pedido.items?.map((item: any, idx: number) => (
                            <span 
                              key={idx} 
                              className="text-xs bg-gray-100 px-2 py-1 rounded-md"
                            >
                              {item.nombre} ×{item.cantidad}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t">
                          {pedido.estado === 'listo' && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-w-[120px]"
                              onClick={() => handleCobrarPedido(pedido.id, pedido.mesa)}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Cobrar
                            </Button>
                          )}
                          {pedido.estado !== 'listo' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-gray-500 border-gray-200 flex-1 min-w-[120px]"
                              disabled
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              En preparación
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 flex-1 min-w-[100px]"
                            onClick={() => handleOpenCancelModal(pedido)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">💰 Resumen de Caja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs sm:text-sm text-gray-500">Total Ventas</span>
                    <span className="font-bold text-sm">${stats.totalIngresos.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs sm:text-sm text-gray-500">Pedidos Cobrados</span>
                    <span className="font-bold text-sm">{stats.cobrados}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs sm:text-sm text-gray-500">Pedidos Activos</span>
                    <span className="font-bold text-sm text-yellow-600">{stats.pendientes}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t-2">
                    <span className="font-semibold text-sm">Total en Caja</span>
                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                      ${stats.totalIngresos.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-gray-600 space-y-2">
                <p>• Los pedidos <strong>listos</strong> se pueden cobrar</p>
                <p>• Al cancelar, se notifica al administrador</p>
                <p>• El motivo de cancelación es obligatorio</p>
                <p>• Los pedidos cobrados no se pueden cancelar</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false)
          setPedidoToCancel(null)
        }}
        onConfirm={handleConfirmCancel}
        pedidoInfo={pedidoToCancel ? {
          mesa: pedidoToCancel.mesa,
          total: pedidoToCancel.total
        } : undefined}
      />

      <SalirTurnoModal
        isOpen={isSalirTurnoOpen}
        onClose={() => setIsSalirTurnoOpen(false)}
        onConfirmarSalida={handleLogout}
        rol="caja"
        usuarioNombre={nombreCompleto}
        usuarioId={user?.id || ''}
      />
    </div>
  )
}
