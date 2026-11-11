'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, Loader2, Package, CheckCircle, XCircle,
  DollarSign, AlertTriangle, TrendingDown, LogOut, TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useNotificacionesRealtime } from '@/hooks/useNotificacionesRealtime'

interface AdminNotificationBellProps {
  jornadaId?: string | null
}

export function AdminNotificationBell({ jornadaId }: AdminNotificationBellProps) {
  const router = useRouter()

  const {
    notificaciones,
    unreadCount,
    loading,
    marcarLeida,
    marcarTodasLeidas
  } = useNotificacionesRealtime({
    tabla: 'notificaciones_admin',
    sonido: true,
    limite: 50,
    jornadaId: jornadaId || null
  })

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'pedido_cancelado':
      case 'cierre_sesion_operativo':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pedido_nuevo':
      case 'pedido_sin_bartender':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'stock_bajo':
        return <TrendingDown className="h-4 w-4 text-amber-500" />
      case 'stock_agotado':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'venta_realizada':
      case 'pedido_cobrado':
        return <DollarSign className="h-4 w-4 text-emerald-500" />
      case 'pedido_cancelado_por_caja':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pedido_cancelado: 'Cancelacion',
      cierre_sesion_operativo: 'Cierre sesion',
      pedido_nuevo: 'Pedido nuevo',
      pedido_sin_bartender: 'Sin bartender',
      stock_bajo: 'Stock bajo',
      stock_agotado: 'Agotado',
      venta_realizada: 'Venta',
      pedido_cobrado: 'Cobrado'
    }
    return labels[tipo] || 'Notificacion'
  }

  const handleClick = async (notif: any) => {
    if (!notif.leida) await marcarLeida(notif.id)
    if (notif.pedido_id) router.push('/admin/sales')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse font-bold">
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
              onClick={(e) => { e.preventDefault(); marcarTodasLeidas() }}
            >
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>

        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-sm">No hay notificaciones</p>
            <p className="text-xs mt-1">Solo de la jornada actual</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notificaciones.slice(0, 20).map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                  !notif.leida ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{getIcon(notif.tipo)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                        {getTipoLabel(notif.tipo)}
                      </Badge>
                      {!notif.leida && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-xs text-gray-900 break-words font-medium">
                      {notif.mensaje}
                    </p>
                    {notif.motivo && (
                      <p className="text-[10px] text-red-600 mt-1 break-words">
                        Motivo: {notif.motivo}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
