'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  Coffee,
  Loader2,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { orderService } from '@/lib/services/orderService'

interface Notification {
  id: string
  pedido_id: string
  mensaje: string
  tipo: 'nuevo_pedido' | 'pedido_listo' | 'pedido_cancelado'
  leida: boolean
  created_at: string
  pedido?: any
}

export function NotificationBell({ bartenderId }: { bartenderId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    fetchNotifications()
    
    // Crear canal con un nombre único
    const channelName = `pedidos_changes_${bartenderId}`
    const channel = supabase.channel(channelName)
    
    // Configurar los eventos ANTES de suscribirse
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pedidos'
      }, (payload) => {
        const newOrder = payload.new
        if (!newOrder.bartender_id || newOrder.bartender_id === bartenderId) {
          handleNewOrder(newOrder)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos'
      }, (payload) => {
        const updatedOrder = payload.new
        if (updatedOrder.bartender_id === bartenderId) {
          handleOrderUpdate(updatedOrder)
        }
      })
      .subscribe((status) => {
        console.log(`🔔 Notificaciones: ${status}`)
      })

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [bartenderId])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_bartender')
        .select(`
          *,
          pedido:pedidos(*)
        `)
        .eq('bartender_id', bartenderId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.leida).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewOrder = async (order: any) => {
    // Verificar si la notificación ya existe
    const existing = notifications.find(n => n.pedido_id === order.id)
    if (existing) return

    const { data, error } = await supabase
      .from('notificaciones_bartender')
      .insert([{
        bartender_id: bartenderId,
        pedido_id: order.id,
        mensaje: `📦 Nuevo pedido de mesa ${order.mesa || 'N/A'}`,
        tipo: 'nuevo_pedido'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return
    }

    const notif = { ...data, pedido: order }
    setNotifications(prev => [notif, ...prev])
    setUnreadCount(prev => prev + 1)

    toast({
      title: '🔔 Nuevo Pedido',
      description: `Mesa ${order.mesa || 'N/A'} - ${order.items?.length || 0} items`,
      variant: 'default'
    })
  }

  const handleOrderUpdate = (order: any) => {
    // Actualizar notificación existente
    setNotifications(prev => 
      prev.map(n => 
        n.pedido_id === order.id 
          ? { ...n, pedido: order, mensaje: `📦 Pedido actualizado: ${order.estado}` }
          : n
      )
    )
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notificaciones_bartender')
        .update({ leida: true })
        .eq('id', notificationId)

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notificaciones_bartender')
        .update({ leida: true })
        .eq('bartender_id', bartenderId)
        .eq('leida', false)

      setNotifications(prev => 
        prev.map(n => ({ ...n, leida: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const acceptOrder = async (notification: Notification) => {
    try {
      await orderService.assignBartender(notification.pedido_id, bartenderId)
      
      toast({
        title: '✅ Pedido aceptado',
        description: `Preparando pedido de mesa ${notification.pedido.mesa || 'N/A'}`,
        variant: 'success'
      })

      await markAsRead(notification.id)
      setNotifications(prev => 
        prev.filter(n => n.id !== notification.id)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

    } catch (error) {
      console.error('Error accepting order:', error)
      toast({
        title: 'Error',
        description: 'No se pudo aceptar el pedido',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-[400px] overflow-y-auto" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-blue-600 h-auto p-1"
              onClick={markAllAsRead}
            >
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className="p-0 focus:bg-transparent">
              <div 
                className={`p-3 w-full ${!notif.leida ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notif.mensaje}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notif.created_at).toLocaleTimeString()}
                    </p>
                    {notif.pedido && (
                      <div className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Items:</span>{' '}
                        {notif.pedido.items?.map((item: any) => 
                          `${item.nombre} x${item.cantidad}`
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                  {notif.tipo === 'nuevo_pedido' && !notif.leida && (
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        acceptOrder(notif)
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aceptar
                    </Button>
                  )}
                  {notif.leida && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      Leída
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
