'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LogOut, Bell, Coffee, Clock, CheckCircle, 
  Loader2, TrendingUp, DollarSign, Users, 
  XCircle, Plus, Minus, Trash2, Edit
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/bartender/NotificationBell'
import { orderService } from '@/lib/services/orderService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BartenderDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMermaOpen, setIsMermaOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<any>(null)
  const [mermaData, setMermaData] = useState({
    producto: '',
    cantidad: 0,
    motivo: ''
  })
  const [stats, setStats] = useState({
    pendientes: 0,
    preparando: 0,
    listos: 0,
    total: 0
  })

  useEffect(() => {
    if (user) {
      fetchPedidos()
      const subscription = supabase
        .channel('pedidos_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        }, () => {
          fetchPedidos()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchPedidos = async () => {
    setLoading(true)
    try {
      const data = await orderService.getOrdersByEstado()
      setPedidos(data || [])
      
      const pendientes = data.filter((o: any) => o.estado === 'pendiente').length
      const preparando = data.filter((o: any) => o.estado === 'preparando').length
      const listos = data.filter((o: any) => o.estado === 'listo').length
      
      setStats({
        pendientes,
        preparando,
        listos,
        total: data.length
      })
    } catch (error) {
      console.error('Error fetching pedidos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pedidos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
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

  const actualizarEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      await orderService.updateOrder(pedidoId, { estado: nuevoEstado })
      
      const pedido = pedidos.find(p => p.id === pedidoId)
      if (pedido) {
        await supabase
          .from('notificaciones_mesero')
          .insert([{
            mesero_id: pedido.mesero_id,
            pedido_id: pedidoId,
            tipo: 'pedido_actualizado',
            mensaje: `Pedido de mesa ${pedido.mesa} ahora está: ${nuevoEstado}`
          }])
      }

      toast({
        title: '✅ Estado actualizado',
        description: `Pedido ahora está: ${nuevoEstado}`,
        variant: 'success'
      })
      
      fetchPedidos()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      })
    }
  }

  const handleMerma = async () => {
    try {
      // Registrar merma
      const { error } = await supabase
        .from('mermas')
        .insert([{
          producto_id: mermaData.producto,
          bartender_id: user?.id,
          cantidad: mermaData.cantidad,
          motivo: mermaData.motivo,
          fecha: new Date().toISOString()
        }])

      if (error) throw error

      toast({
        title: '✅ Merma registrada',
        description: 'La merma ha sido registrada correctamente',
        variant: 'success'
      })

      setIsMermaOpen(false)
      setMermaData({ producto: '', cantidad: 0, motivo: '' })
    } catch (error) {
      console.error('Error registrando merma:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar la merma',
        variant: 'destructive'
      })
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

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Clock className="h-4 w-4" />
      case 'preparando': return <Coffee className="h-4 w-4" />
      case 'listo': return <CheckCircle className="h-4 w-4" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">BARRANCO</span>
              <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Bartender</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell bartenderId={user?.id || ''} />
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setIsMermaOpen(true)}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Merma
              </Button>
              <Avatar className="cursor-pointer">
                <AvatarFallback className="bg-green-600 text-white">
                  {user?.nombre?.charAt(0) || 'B'}
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
              ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Bartender'}!
            </h1>
            <p className="text-gray-500">Gestiona los pedidos de la barra</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPedidos}
            className="text-gray-600"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Coffee className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Preparando</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.preparando}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Listos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.listos}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📋 Pedidos en la barra</span>
              <Badge variant="secondary">
                {pedidos.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidos.length === 0 ? (
              <div className="text-center py-12">
                <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay pedidos en la barra</p>
                <p className="text-sm text-gray-400">Los pedidos aparecerán aquí cuando los meseros los envíen</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">
                            Mesa {pedido.mesa || 'N/A'}
                          </span>
                          <Badge className={getStatusColor(pedido.estado)}>
                            {getStatusIcon(pedido.estado)}
                            <span className="ml-1">{pedido.estado.toUpperCase()}</span>
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {new Date(pedido.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          {pedido.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm text-gray-600">
                              <span>{item.nombre}</span>
                              <span className="font-medium">x{item.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-lg text-orange-600">
                          ${pedido.total?.toFixed(2) || '0.00'}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {pedido.estado === 'pendiente' && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => actualizarEstado(pedido.id, 'preparando')}
                            >
                              <Coffee className="h-3 w-3 mr-1" />
                              Preparar
                            </Button>
                          )}
                          {pedido.estado === 'preparando' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => actualizarEstado(pedido.id, 'listo')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Marcar Listo
                            </Button>
                          )}
                          {pedido.estado === 'listo' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-gray-600"
                              onClick={() => actualizarEstado(pedido.id, 'servido')}
                            >
                              Servido
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => actualizarEstado(pedido.id, 'cancelado')}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isMermaOpen} onOpenChange={setIsMermaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Registrar Merma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="producto">Producto</Label>
              <Input
                id="producto"
                placeholder="Nombre del producto"
                value={mermaData.producto}
                onChange={(e) => setMermaData({ ...mermaData, producto: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad perdida</Label>
              <Input
                id="cantidad"
                type="number"
                placeholder="Cantidad"
                value={mermaData.cantidad || ''}
                onChange={(e) => setMermaData({ ...mermaData, cantidad: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Ej: Derrame, producto caducado, etc."
                value={mermaData.motivo}
                onChange={(e) => setMermaData({ ...mermaData, motivo: e.target.value })}
              />
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleMerma}>
              Registrar Merma
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
