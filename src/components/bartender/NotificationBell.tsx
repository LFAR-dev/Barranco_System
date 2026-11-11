'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, Loader2, Package, CheckCircle, XCircle, DollarSign, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useNotificacionesRealtime } from '@/hooks/useNotificacionesRealtime'

interface BartenderNotificationBellProps {
  usuarioId: string
  jornadaId?: string | null
}

export function NotificationBell({ usuarioId, jornadaId }: BartenderNotificationBellProps) {
  const router = useRouter()

  const {
    notificaciones,
    unreadCount,
    loading,
    marcarLeida,
    marcarTodasLeidas
  } = useNotificacionesRealtime({
    tabla: 'notificaciones_bartender',
    filtro: { campo: 'bartender_id', valor: usuarioId },
    sonido: true,
    limite: 50,
    jornadaId: jornadaId || null
  })

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'nuevo_pedido': return <Package className="h-4 w-4 text-blue-500" />
      case 'pedido_listo': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pedido_cancelado': return <XCircle className="h-4 w-4 text-red-500" />
      case 'pedido_cobrado':
      case 'venta_realizada': return <DollarSign className="h-4 w-4 text-emerald-500" />
      case 'stock_bajo': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      nuevo_pedido: 'Nuevo pedido',
      pedido_listo: 'Listo',
      pedido_cancelado: 'Cancelado',
      pedido_cobrado: 'Cobrado',
      venta_realizada: 'Venta',
      stock_bajo: 'Stock bajo'
    }
    return labels[tipo] || 'Notificacion'
  }

  const handleClick = async (notif: any) => {
    if (!notif.leida) await marcarLeida(notif.id)
    router.push('/bartender')
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
      <DropdownMenuContent className="w-80 max-h-[400px] overflow-y-auto" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
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
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
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
                      <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                        {getTipoLabel(notif.tipo)}
                      </Badge>
                      {!notif.leida && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </div>
                    <p className="text-xs text-gray-900 break-words font-medium">
                      {notif.mensaje}
                    </p>
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
