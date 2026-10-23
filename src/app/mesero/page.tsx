'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Coffee, Clock, CheckCircle, UserRound, Loader2, Utensils, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { orderService, Order } from '@/lib/services/orderService'
import { useToast } from '@/hooks/use-toast'
import { useJornadaWatcher } from '@/hooks/useJornadaWatcher'
import { useTurnoActivo } from '@/hooks/useTurnoActivo'
import { useGeolocation } from '@/hooks/useGeolocation'
import { JornadaCerradaOverlay } from '@/components/shared/JornadaCerradaOverlay'
import { AvisoNoActivo } from '@/components/shared/AvisoNoActivo'
import { ToggleDisponibilidad } from '@/components/shared/ToggleDisponibilidad'
import { SalirTurnoModal } from '@/components/shared/SalirTurnoModal'
import { GPSPermissionModal } from '@/components/mesero/GPSPermissionModal'
import { AppShell } from '@/components/layout/AppShell'
import { UserMenu } from '@/components/layout/UserMenu'
import { SidebarSection } from '@/components/layout/AppSidebar'
import { NotificationBellUniversal } from '@/components/shared/NotificationBellUniversal'


const SECTIONS: SidebarSection[] = [
  {
    title: 'Mi turno',
    items: [
      { label: 'Mis pedidos', href: '/mesero', icon: <Coffee className="h-4 w-4" /> },
      { label: 'Nuevo pedido', href: '/mesero/orders/new', icon: <Plus className="h-4 w-4" /> },
    ]
  }
]

export default function MeseroDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
const { jornadaActiva, jornadaId, loading: jornadaLoading } = useJornadaWatcher({ enabled: !!user })
const { activo: turnoActivo, loading: turnoLoading, recargar: recargarTurno } = useTurnoActivo()  
  // GPS
  const { 
    estado: gpsEstado, 
    solicitar: solicitarGPS, 
    detener: detenerGPS,
    precision: gpsPrecision
  } = useGeolocation({
    usuarioId: user?.id,
    autoStart: false
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [isSalirTurnoOpen, setIsSalirTurnoOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showGPSModal, setShowGPSModal] = useState(false)
  const [hasAskedGPS, setHasAskedGPS] = useState(false)

    useEffect(() => {
    if (user && jornadaId) {
      fetchOrders()
      const interval = setInterval(fetchOrders, 30000)
      return () => clearInterval(interval)
    }
  }, [user, jornadaId])

  // Verificar si ya pidió permiso GPS antes
  useEffect(() => {
    if (!user?.id) return
    const asked = localStorage.getItem(`gps_asked_${user.id}`)
    if (!asked) {
      setShowGPSModal(true)
    } else {
      setHasAskedGPS(true)
      // Si ya aceptó antes, auto-iniciar
      if (asked === 'accepted') {
        solicitarGPS()
      }
    }
  }, [user?.id])

   const fetchOrders = async () => {
    if (!jornadaId) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await orderService.getOrdersByJornada(jornadaId)
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
    detenerGPS()
    await logout()
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente',
      variant: 'default'
    })
    router.push('/')
  }

  const handleAcceptGPS = () => {
    setShowGPSModal(false)
    setHasAskedGPS(true)
    if (user?.id) {
      localStorage.setItem(`gps_asked_${user.id}`, 'accepted')
    }
    solicitarGPS()
  }

  const handleRejectGPS = () => {
    setShowGPSModal(false)
    setHasAskedGPS(true)
    if (user?.id) {
      localStorage.setItem(`gps_asked_${user.id}`, 'rejected')
    }
    toast({
      title: 'Ubicación no compartida',
      description: 'Puedes activarla después desde el botón de ubicación',
      variant: 'default'
    })
  }

  const handleToggleGPS = () => {
    if (gpsEstado === 'activo') {
      detenerGPS()
      toast({
        title: 'Ubicación desactivada',
        description: 'Ya no compartes tu ubicación',
        variant: 'default'
      })
    } else {
      solicitarGPS()
    }
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
  const pedidosActivos = misPedidos.filter(o => 
    o.estado === 'pendiente' || o.estado === 'preparando' || o.estado === 'listo'
  )
  const listosParaRecoger = misPedidos.filter(o => o.estado === 'listo')
  const pendientes = misPedidos.filter(o => o.estado === 'pendiente' || o.estado === 'preparando')

  // Configuración visual del botón GPS
  const getGPSButtonConfig = () => {
    switch (gpsEstado) {
      case 'activo':
        return {
          className: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
          icon: <MapPin className="h-4 w-4" />,
          title: `Ubicación compartida (precisión: ${gpsPrecision ? Math.round(gpsPrecision) + 'm' : 'alta'})`
        }
      case 'solicitando':
        return {
          className: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          title: 'Solicitando permiso de ubicación...'
        }
      case 'denegado':
        return {
          className: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200',
          icon: <MapPin className="h-4 w-4" />,
          title: 'Permiso de ubicación denegado - click para reintentar'
        }
      case 'error':
        return {
          className: 'text-red-600 bg-red-50 border-red-200',
          icon: <MapPin className="h-4 w-4" />,
          title: 'Error de ubicación - click para reintentar'
        }
      case 'no_soportado':
        return {
          className: 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed',
          icon: <MapPin className="h-4 w-4" />,
          title: 'Este dispositivo no soporta geolocalización'
        }
      default:
        return {
          className: 'text-gray-600 hover:bg-gray-100 border-gray-200',
          icon: <MapPin className="h-4 w-4" />,
          title: 'Activar ubicación GPS'
        }
    }
  }

  const gpsButton = getGPSButtonConfig()

  return (
    <div className="min-h-screen bg-gray-50">
      <JornadaCerradaOverlay isOpen={!jornadaActiva && !jornadaLoading} />

      {!turnoLoading && turnoActivo === false && (
        <AvisoNoActivo
          rolLabel="mesero"
          onRecargar={recargarTurno}
          onSalir={() => setIsSalirTurnoOpen(true)}
        />
      )}

      <AppShell
        rol="mesero"
        sections={SECTIONS}
        sidebarHeaderSlot={user?.id ? <ToggleDisponibilidad rol="mesero" usuarioId={user.id} /> : null}
        headerRight={
          <>
            {/* Botón GPS */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleGPS}
              disabled={gpsEstado === 'no_soportado' || gpsEstado === 'solicitando'}
              className={`relative ${gpsButton.className}`}
              title={gpsButton.title}
            >
              {gpsButton.icon}
              {gpsEstado === 'activo' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </Button>

            <NotificationBellUniversal rol="mesero" usuarioId={user?.id || ''} />
            {user?.id && (
              <div className="hidden lg:block">
                <ToggleDisponibilidad rol="mesero" usuarioId={user.id} />
              </div>
            )}
            <UserMenu
              rol="mesero"
              onLogout={handleLogout}
              onSalirTurno={() => setIsSalirTurnoOpen(true)}
            />
          </>
        }
      >
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                ¡Hola, {user?.nombre || user?.email?.split('@')[0] || 'Mesero'}!
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                Gestiona pedidos y toma órdenes
                {gpsEstado === 'activo' && (
                  <Badge className="bg-green-100 text-green-700 text-[10px]">
                    <MapPin className="h-2.5 w-2.5 mr-1" />
                    Ubicación activa
                  </Badge>
                )}
              </p>
            </div>
            {turnoActivo ? (
              <Link href="/mesero/orders/new">
                <Button className="bg-orange-600 hover:bg-orange-700 shrink-0">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo Pedido</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </Link>
            ) : (
              <Button disabled className="bg-gray-300 text-gray-500 shrink-0 cursor-not-allowed">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Pedido</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>

          {listosParaRecoger.length > 0 && (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3 sm:p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg shrink-0 animate-pulse">
                <Utensils className="h-5 w-5 text-green-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-green-900 text-sm sm:text-base">
                  ¡Tienes {listosParaRecoger.length} pedido{listosParaRecoger.length === 1 ? '' : 's'} listo{listosParaRecoger.length === 1 ? '' : 's'} para recoger!
                </p>
                <p className="text-xs text-green-700">
                  Pasa a la barra a recogerlos y entrégalos
                </p>
              </div>
              <Badge className="bg-green-600 text-white text-base sm:text-lg px-3 py-1 shrink-0">
                {listosParaRecoger.length}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  Mis Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold">{pedidosActivos.length}</p>
                <p className="text-xs text-gray-500 mt-1">activos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  En preparación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold">{pendientes.length}</p>
                <p className="text-xs text-gray-500 mt-1">pendientes</p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  Listos para recoger
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold">{listosParaRecoger.length}</p>
                <p className="text-xs text-gray-500 mt-1">en barra</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Mis Pedidos Activos</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Pedidos en curso asignados a ti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pedidosActivos.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Coffee className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No tienes pedidos activos</p>
                    <p className="text-xs text-gray-400">Los pedidos nuevos aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pedidosActivos.map((order) => {
                      const esListo = order.estado === 'listo'
                      return (
                        <div 
                          key={order.id} 
                          className={`rounded-lg p-3 border-2 transition-all ${
                            esListo 
                              ? 'border-green-400 bg-green-50 shadow-md' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base">
                                  {order.mesa || 'Sin mesa'}
                                </span>
                                <Badge className={`${getStatusColor(order.estado)} text-xs`}>
                                  {order.estado.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  #{order.id.slice(0, 6)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {order.items?.length || 0} items •{' '}
                                {new Date(order.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className="font-bold text-base sm:text-lg text-orange-600 shrink-0">
                              ${order.total?.toFixed(2) || '0.00'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {order.items?.map((item: any, idx: number) => (
                              <span 
                                key={idx} 
                                className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-md"
                              >
                                {item.nombre} ×{item.cantidad}
                              </span>
                            ))}
                          </div>

                          {esListo && (
                            <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2 text-xs text-green-800">
                              <Utensils className="h-3 w-3" />
                              <span className="font-medium">¡Ve a la barra a recogerlo!</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>

      {/* Modal de permiso GPS */}
      <GPSPermissionModal
        isOpen={showGPSModal}
        onAccept={handleAcceptGPS}
        onReject={handleRejectGPS}
      />

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
