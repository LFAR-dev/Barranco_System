'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Loader2, Package, CheckCircle, XCircle,
  DollarSign, AlertTriangle, TrendingDown, LogOut,
  ClipboardList, RefreshCw, History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useNotificacionesRealtime } from '@/hooks/useNotificacionesRealtime'

type Rol = 'admin' | 'bartender' | 'mesero' | 'caja'

interface NotificationBellUniversalProps {
  rol: Rol
  usuarioId: string
  jornadaId?: string | null
}

const rolConfig: Record<
  Rol,
  {
    tabla: any
    filtroCampo?: string
    color: { badge: string; dot: string }
    puedeVerHistorial: boolean
  }
> = {
  admin: {
    tabla: 'notificaciones_admin',
    color: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    puedeVerHistorial: true
  },
  bartender: {
    tabla: 'notificaciones_bartender',
    filtroCampo: 'bartender_id',
    color: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    puedeVerHistorial: false
  },
  mesero: {
    tabla: 'notificaciones_mesero',
    filtroCampo: 'mesero_id',
    color: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    puedeVerHistorial: false
  },
  caja: {
    tabla: 'notificaciones_caja',
    color: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    puedeVerHistorial: false
  }
}

export function NotificationBellUniversal({
  rol,
  usuarioId,
  jornadaId
}: NotificationBellUniversalProps) {
  const router = useRouter()
  const config = rolConfig[rol]
  const [tabActivo, setTabActivo] = useState<'actual' | 'historial'>('actual')

  const filtro = config.filtroCampo
    ? { campo: config.filtroCampo, valor: usuarioId }
    : undefined

  // Tab actual: filtra por jornada si esta disponible
  const {
    notificaciones: notificacionesActual,
    unreadCount,
    loading: loadingActual,
    marcarLeida: marcarLeidaActual,
    marcarTodasLeidas: marcarTodasActual
  } = useNotificacionesRealtime({
    tabla: config.tabla,
    filtro,
    sonido: true,
    limite: 50,
    jornadaId: jornadaId || null
  })

  // Tab historial: sin filtro de jornada
  const {
    notificaciones: notificacionesHistorial,
    loading: loadingHistorial,
    marcarLeida: marcarLeidaHistorial,
    marcarTodasLeidas: marcarTodasHistorial
  } = useNotificacionesRealtime({
    tabla: config.tabla,
    filtro,
    sonido: false,
    limite: 100,
    jornadaId: null
  })

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'nuevo_pedido':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'pedido_listo':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pedido_cancelado':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pedido_cobrado':
      case 'venta_realizada':
        return <DollarSign className="h-4 w-4 text-emerald-500" />
      case 'pedido_asignado':
      case 'pedido_actualizado':
        return <ClipboardList className="h-4 w-4 text-purple-500" />
      case 'pedido_en_preparacion':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'cierre_sesion_operativo':
        return <LogOut className="h-4 w-4 text-red-500" />
      case 'stock_bajo':
        return <TrendingDown className="h-4 w-4 text-amber-500" />
      case 'stock_agotado':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'pedido_sin_bartender':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      nuevo_pedido: 'Nuevo pedido',
      pedido_listo: 'Listo',
      pedido_cancelado: 'Cancelado',
      pedido_cobrado: 'Cobrado',
      pedido_asignado: 'Asignado',
      pedido_actualizado: 'Actualizado',
      pedido_en_preparacion: 'Preparando',
      cierre_sesion_operativo: 'Cierre sesion',
      stock_bajo: 'Stock bajo',
      stock_agotado: 'Agotado',
      pedido_sin_bartender: 'Sin bartender',
      venta_realizada: 'Venta',
      cobro_mesero: 'Cobro mesero'
    }
    return labels[tipo] || 'Notificacion'
  }

  const handleClickNotif = async (
    notif: any,
    marcarLeida: (id: string) => Promise<void>
  ) => {
    if (!notif.leida) {
      await marcarLeida(notif.id)
    }
    if (notif.pedido_id) {
      if (rol === 'admin') router.push('/admin/sales')
      else if (rol === 'caja') router.push('/caja')
      else router.push(`/${rol}`)
    }
  }

  const renderLista = (
    lista: any[],
    loading: boolean,
    marcarLeida: (id: string) => Promise<void>
  ) => {
    if (loading) {
      return (
        <div className="p-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
        </div>
      )
    }
    if (lista.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-sm">No hay notificaciones</p>
          <p className="text-xs mt-1">Las nuevas apareceran aqui</p>
        </div>
      )
    }
    return (
      <div className="divide-y divide-gray-100">
        {lista.slice(0, 30).map((notif) => (
          <button
            key={notif.id}
            onClick={() => handleClickNotif(notif, marcarLeida)}
            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
              !notif.leida ? 'bg-blue-50/50' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">{getIcon(notif.tipo)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Badge
                    className={`${config.color.badge} text-[10px] px-1.5 py-0`}
                  >
                    {getTipoLabel(notif.tipo)}
                  </Badge>
                  {!notif.leida && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${config.color.dot}`}
                    />
                  )}
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
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const verHistorial = config.puedeVerHistorial && !!jornadaId

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
        className="w-[calc(100vw-1rem)] max-w-sm sm:w-96 max-h-[500px] overflow-y-auto p-0"
        align="end"
      >
        <DropdownMenuLabel className="sticky top-0 bg-white z-10 border-b px-0 py-0">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold">Notificaciones</span>
              {unreadCount > 0 && (
                <Badge className={`${config.color.badge} text-xs px-1.5 py-0`}>
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 h-auto p-1"
                onClick={(e) => {
                  e.preventDefault()
                  marcarTodasActual()
                }}
              >
                Marcar todas
              </Button>
            )}
          </div>
          {verHistorial && (
            <Tabs
              value={tabActivo}
              onValueChange={(v) => setTabActivo(v as 'actual' | 'historial')}
            >
              <TabsList className="w-full rounded-none border-t bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="actual"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 text-xs py-2"
                >
                  Actual
                </TabsTrigger>
                <TabsTrigger
                  value="historial"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 text-xs py-2"
                >
                  <History className="h-3 w-3 mr-1" />
                  Historial
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DropdownMenuLabel>

        {!verHistorial || tabActivo === 'actual' ? (
          <>
            {renderLista(
              notificacionesActual,
              loadingActual,
              marcarLeidaActual
            )}
            {notificacionesActual.length === 0 &&
              notificacionesHistorial.length > 0 &&
              !loadingActual && (
                <div className="px-3 py-2 bg-gray-50 text-center border-t">
                  <p className="text-[10px] text-gray-500">
                    Ver historial de jornadas anteriores
                  </p>
                </div>
              )}
          </>
        ) : (
          <>
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <p className="text-[10px] text-gray-500">
                Historial de notificaciones
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-blue-600 h-auto p-1"
                onClick={(e) => {
                  e.preventDefault()
                  marcarTodasHistorial()
                }}
              >
                Marcar todas
              </Button>
            </div>
            {renderLista(
              notificacionesHistorial,
              loadingHistorial,
              marcarLeidaHistorial
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
