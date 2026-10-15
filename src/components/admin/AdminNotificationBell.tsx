'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  Bell, AlertCircle, CheckCircle, Loader2, Package,
  TrendingDown, LogOut, DollarSign
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  pedido_id: string | null
  usuario_id: string | null
  tipo: string
  mensaje: string
  motivo?: string
  leida: boolean
  created_at: string
  pedido?: any
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  // Solo cargar en cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Cargar notificaciones iniciales
    fetchNotifications()

    // Suscripción a nuevas notificaciones
    const channelName = `notif_admin_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones_admin'
        },
        (payload) => {
          const newNotif = payload.new as any
          toast({
            title: '🔔 Nueva notificación',
            description: newNotif.mensaje || 'Tienes una nueva notificación',
            variant: 'default',
            duration: 6000
          })
          fetchNotifications()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (e) {
          console.warn('Error removing channel:', e)
        }
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_admin')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Si falla por permisos, mostrar lista vacía sin error ruidoso
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn('Permisos insuficientes para notificaciones_admin:', error.message)
          setNotifications([])
          setUnreadCount(0)
          return
        }
        throw error
      }

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
      case 'pedido_cancelado':
      case 'cierre_sesion_operativo':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pedido_nuevo':
      case 'pedido_sin_bartender':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'stock_bajo':
        return <TrendingDown className="h-4 w-4 text-amber-500" />
      case 'stock_agotado':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'venta_realizada':
        return <DollarSign className="h-4 w-4 text-emerald-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pedido_cancelado: 'Cancelación',
      cierre_sesion_operativo: 'Cierre de sesión',
      pedido_nuevo: 'Pedido nuevo',
      pedido_sin_bartender: 'Sin bartender',
      stock_bajo: 'Stock bajo',
      stock_agotado: 'Agotado',
      venta_realizada: 'Venta'
    }
    return labels[tipo] || 'Notificación'
  }

  if (!isMounted || loading) {
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
      <DropdownMenuContent 
        className="w-[calc(100vw-2rem)] max-w-sm sm:w-96 max-h-[500px] overflow-y-auto" 
        align="end"
      >
        <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-white z-10 border-b">
          <span className="flex items-center gap-2 text-sm">
            Notificaciones
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">{unreadCount} nuevas</Badge>
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
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-sm">No hay notificaciones</p>
            <p className="text-xs mt-1">Las notificaciones aparecerán aquí</p>
          </div>
        ) : (
          notifications.slice(0, 20).map((notif) => (
            <DropdownMenuItem 
              key={notif.id} 
              className={`p-3 cursor-pointer ${!notif.leida ? 'bg-blue-50' : ''}`}
              onClick={() => !notif.leida && markAsRead(notif.id)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5 shrink-0">
                  {getIcon(notif.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0">
                      {getTipoLabel(notif.tipo)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1 break-words">
                    {notif.mensaje}
                  </p>
                  {notif.motivo && (
                    <p className="text-xs text-red-600 mt-1 break-words">
                      Motivo: {notif.motivo}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {!notif.leida && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
