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
import { useJornadaWatcher } from '@/hooks/useJornadaWatcher'
import { JornadaCerradaOverlay } from '@/components/shared/JornadaCerradaOverlay'
import { ToggleDisponibilidad } from '@/components/shared/ToggleDisponibilidad'
import { BotonReceta } from '@/components/shared/BotonReceta'
import { HeaderRol } from '@/components/layout/HeaderRol'
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
  const { jornadaActiva, loading: jornadaLoading } = useJornadaWatcher({ enabled: !!user })
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMermaOpen, setIsMermaOpen] = useState(false)
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

  const actualizarEstado = async (pedidoId: string, nuevoEstado: "pendiente" | "preparando" | "listo" | "servido" | "cancelado") => {
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
      case 'pendiente': return <Clock className="h-3 w-3" />
      case 'preparando': return <Coffee className="h-3 w-3" />
      case 'listo': return <CheckCircle className="h-3 w-3" />
      default: return null
    }
  }

  if (loading && pedidos.length === 0) {
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
      <JornadaCerradaOverlay isOpen={!jornadaActiva && !jornadaLoading} />

      <HeaderRol
        rol="bartender"
        userName={`${user?.nombre || ''} ${user?.apellido || ''}`.trim()}
        userEmail={user?.email}
        onLogout={handleLogout}
      >
        {user?.id && <ToggleDisponibilidad rol="bartender" usuarioId={user.id} />}
        <NotificationBell bartenderId={user?.id || ''} />
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap"
          onClick={() => setIsMermaOpen(true)}
        >
          <TrendingUp className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Merma</span>
        </Button>
      </HeaderRol>

      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Bartender'}!
            </h1>
            <p className="text-sm text-gray-500">Gestiona los pedidos de la barra</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchPedidos}
            className="text-gray-600 shrink-0"
          >
            <Loader2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
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
                  <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Pendientes</p>
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
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Preparando</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.preparando}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Listos</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.listos}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full shrink-0">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>📋 Pedidos en la barra</span>
              <Badge variant="secondary" className="text-xs">
                {pedidos.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidos.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Coffee className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No hay pedidos en la barra</p>
                <p className="text-xs text-gray-400">Aparecerán cuando los meseros los envíen</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base sm:text-lg">
                            Mesa {pedido.mesa || 'N/A'}
                          </span>
                          <Badge className={`${getStatusColor(pedido.estado)} text-xs`}>
                            {getStatusIcon(pedido.estado)}
                            <span className="ml-1">{pedido.estado.toUpperCase()}</span>
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(pedido.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-1.5">
                          {pedido.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs sm:text-sm text-gray-600 gap-2 bg-gray-50 rounded px-2 py-1">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="truncate">{item.nombre}</span>
                                <BotonReceta 
                                  recetaId={item.receta_id} 
                                  recetaNombre={item.nombre}
                                  variant="icon"
                                  size="sm"
                                />
                              </div>
                              <span className="font-medium shrink-0">x{item.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-bold text-base sm:text-lg text-orange-600">
                          ${pedido.total?.toFixed(2) || '0.00'}
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {pedido.estado === 'pendiente' && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              onClick={() => actualizarEstado(pedido.id, 'preparando')}
                            >
                              <Coffee className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Preparar</span>
                            </Button>
                          )}
                          {pedido.estado === 'preparando' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => actualizarEstado(pedido.id, 'listo')}
                            >
                              <CheckCircle className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Listo</span>
                            </Button>
                          )}
                          {pedido.estado === 'listo' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-gray-600 text-xs"
                              onClick={() => actualizarEstado(pedido.id, 'servido')}
                            >
                              Servido
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => actualizarEstado(pedido.id, 'cancelado')}
                          >
                            <XCircle className="h-3 w-3" />
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
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Registrar Merma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="producto" className="text-sm">Producto</Label>
              <Input
                id="producto"
                placeholder="Nombre del producto"
                value={mermaData.producto}
                onChange={(e) => setMermaData({ ...mermaData, producto: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-sm">Cantidad perdida</Label>
              <Input
                id="cantidad"
                type="number"
                placeholder="Cantidad"
                value={mermaData.cantidad || ''}
                onChange={(e) => setMermaData({ ...mermaData, cantidad: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo" className="text-sm">Motivo</Label>
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
