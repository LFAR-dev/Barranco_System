'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Coffee, List, LogOut, Menu, Bell, Search, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { orderService, Order } from '@/lib/services/orderService'
import { useToast } from '@/hooks/use-toast'
import { useJornadaWatcher } from '@/hooks/useJornadaWatcher'
import { JornadaCerradaOverlay } from '@/components/shared/JornadaCerradaOverlay'
import { ToggleDisponibilidad } from '@/components/shared/ToggleDisponibilidad'
import { HeaderRol } from '@/components/layout/HeaderRol'
import { SalirTurnoModal } from '@/components/shared/SalirTurnoModal'

export default function MeseroDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { jornadaActiva, loading: jornadaLoading } = useJornadaWatcher({ enabled: !!user })
  const [orders, setOrders] = useState<Order[]>([])
  const [isSalirTurnoOpen, setIsSalirTurnoOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await orderService.getOrdersByEstado()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pedidos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
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

  const handleLogout = async () => {
    await logout()
    toast({
      title: '👋 Sesión cerrada',
      description: 'Has cerrado sesión correctamente',
      variant: 'default'
    })
    router.push('/')
  }

  const nombreCompleto = `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || 'Usuario'

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const misPedidos = orders.filter(o => o.mesero_id === user?.id)
  const pendientes = orders.filter(o => o.estado === 'pendiente')
  const listos = orders.filter(o => o.estado === 'listo')

  return (
    <div className="min-h-screen bg-gray-50">
      <JornadaCerradaOverlay isOpen={!jornadaActiva && !jornadaLoading} />

      <HeaderRol
        rol="mesero"
        onLogout={handleLogout}
        onSalirTurno={() => setIsSalirTurnoOpen(true)}
      >
        {user?.id && <ToggleDisponibilidad rol="mesero" usuarioId={user.id} />}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendientes.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {pendientes.length}
            </span>
          )}
        </Button>
      </HeaderRol>

      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Mesero'}!
            </h1>
            <p className="text-sm text-gray-500">Gestiona pedidos y toma órdenes</p>
          </div>
          <Link href="/mesero/orders/new">
            <Button className="bg-orange-600 hover:bg-orange-700 shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Pedido</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                Mis Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">{misPedidos.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">{pendientes.length}</p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                Listos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">{listos.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">📋 Últimos Pedidos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Estado de tus órdenes recientes</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Coffee className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No hay pedidos aún</p>
                  <p className="text-xs text-gray-400">Crea tu primer pedido</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">Mesa {order.mesa || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`${getStatusColor(order.estado)} text-xs`}>
                          {order.estado.toUpperCase()}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium text-gray-600">
                          ${order.total?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SalirTurnoModal
        isOpen={isSalirTurnoOpen}
        onClose={() => setIsSalirTurnoOpen(false)}
        onConfirmarSalida={handleLogout}
        rol="mesero"
        usuarioNombre={nombreCompleto}
        usuarioId={user?.id || ''}
      />
    </div>
  )
}
