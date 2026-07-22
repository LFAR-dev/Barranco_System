'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Coffee, List, LogOut, Menu, Bell, Search, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { orderService, Order } from '@/lib/services/orderService'
import { useToast } from '@/hooks/use-toast'

export default function MeseroDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
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

  if (loading) {
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">BARRANCO</span>
              <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Mesero</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {pendientes.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {pendientes.length}
                  </span>
                )}
              </Button>
              <Avatar className="cursor-pointer">
                <AvatarFallback className="bg-orange-600 text-white">
                  {user?.nombre?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Mesero'}!
            </h1>
            <p className="text-gray-500">Gestiona pedidos y toma órdenes</p>
          </div>
          <Link href="/mesero/orders/new">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coffee className="h-5 w-5 text-orange-500" />
                Mis Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{misPedidos.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendientes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Listos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{listos.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>📋 Últimos Pedidos</CardTitle>
              <CardDescription>Estado de tus órdenes recientes</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay pedidos aún</p>
                  <p className="text-sm text-gray-400">Crea tu primer pedido</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">Mesa {order.mesa || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.estado)}>
                          {order.estado.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-600">
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
    </div>
  )
}
