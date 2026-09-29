'use client'

import { useState, useEffect } from 'react'
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
  Bell, AlertCircle, CheckCircle, Loader2, Package
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { orderService } from '@/lib/services/orderService'

interface Notification {
  id: string
  pedido_id: string
  tipo: string
  mensaje: string
  motivo?: string
  leida: boolean
  created_at: string
  pedido?: any
  usuario?: any
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
    
    // Suscripción a nuevas notificaciones
    const channel = supabase
      .channel('notificaciones_admin_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones_admin'
      }, (payload) => {
        const newNotif = payload.new
        toast({
          title: '🔔 Nueva Notificación',
          description: newNotif.mensaje || 'Tienes una nueva notificación',
          variant: 'default',
          duration: 6000
        })
        fetchNotifications()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_admin')
        .select('*, pedido:pedidos(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.leida).length)
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones_admin')
        .update({ leida: true })
        .eq('id', notificationId)

      if (error) throw error
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error al marcar como leída:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      await supabase
        .from('notificaciones_admin')
        .update({ leida: true })
        .eq('leida', false)

      setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'pedido_cancelado': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pedido_nuevo': return <Package className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle className="h-4 w-4 text-emerald-500" />
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
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
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 max-h-[500px] overflow-y-auto" align="end">
        <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-white z-10">
          <span className="flex items-center gap-2">
            Notificaciones
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-700">{unreadCount} nuevas</Badge>
            )}
          </span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-blue-600 h-auto p-1"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">No hay notificaciones</p>
            <p className="text-xs mt-1">Las notificaciones aparecerán aquí</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem 
              key={notif.id} 
              className={`p-3 cursor-pointer ${!notif.leida ? 'bg-blue-50' : ''}`}
              onClick={() => !notif.leida && markAsRead(notif.id)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">
                  {getIcon(notif.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {notif.mensaje}
                  </p>
                  {notif.motivo && (
                    <p className="text-xs text-red-600 mt-1">
                      Motivo: {notif.motivo}
                    </p>
                  )}
                  {notif.pedido && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mesa: {notif.pedido.mesa} • Total: ${notif.pedido.total?.toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
                {!notif.leida && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
