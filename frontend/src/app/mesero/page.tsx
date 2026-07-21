'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'
import { meseroService } from '@/lib/services/meseroService'
import { recipeService } from '@/lib/services/recipeService'
import { productService } from '@/lib/services/productService'
import {
  Search, Bell, LogOut, Plus, Minus, Trash2, Send, 
  Coffee, Wine, Beer, GlassWater, Utensils, 
  AlertCircle, CheckCircle, Clock, Menu,
  Table, User, DollarSign, ShoppingCart
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AvatarWithViewer } from '@/components/ui/AvatarWithViewer'

export default function MeseroDashboard() {
  const { user, logout } = useAuth()
  const { greeting, timeIcon } = useGreeting()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [mesas, setMesas] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [recetas, setRecetas] = useState<any[]>([])
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(null)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<any>(null)
  const [pedidoActivo, setPedidoActivo] = useState<any>(null)
  const [carrito, setCarrito] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showNuevoPedido, setShowNuevoPedido] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar datos del usuario
      const userData = await userService.getById(user?.id || '')
      setUserData(userData)

      const [mesasData, pedidosData, productosData, recetasData] = await Promise.all([
        meseroService.getMesas(),
        meseroService.getPedidosByMesero(user?.id || ''),
        productService.getAll(),
        recipeService.getAll()
      ])
      
      setMesas(mesasData || [])
      setPedidos(pedidosData || [])
      setProductos(productosData || [])
      setRecetas(recetasData || [])
      
      await loadNotifications()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async () => {
    try {
      const notifs = await meseroService.getNotificaciones(user?.id || '', true)
      setNotificaciones(notifs || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleSeleccionarMesa = async (mesa: any) => {
    setMesaSeleccionada(mesa)
    const pedido = await meseroService.getPedidoActivoByMesa(mesa.id)
    if (pedido) {
      setPedidoActivo(pedido)
      setCarrito(pedido.items || [])
    } else {
      setPedidoActivo(null)
      setCarrito([])
    }
    setShowNuevoPedido(true)
  }

  const agregarAlCarrito = (producto: any, tipo: string) => {
    const existing = carrito.find(item => item.producto_id === producto.id)
    if (existing) {
      setCarrito(carrito.map(item =>
        item.producto_id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio: producto.precio_venta || producto.precio || 0,
        tipo: tipo
      }])
    }
  }

  const eliminarDelCarrito = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index))
  }

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(index)
      return
    }
    setCarrito(carrito.map((item, i) =>
      i === index ? { ...item, cantidad } : item
    ))
  }

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

  const handleEnviarPedido = async () => {
    if (!mesaSeleccionada || carrito.length === 0) return
    
    try {
      if (pedidoActivo) {
        await meseroService.actualizarPedido(pedidoActivo.id, {
          items: carrito,
          total: totalCarrito
        })
        await meseroService.enviarPedido(pedidoActivo.id)
      } else {
        const nuevoPedido = await meseroService.crearPedido({
          mesa_id: mesaSeleccionada.id,
          mesero_id: user?.id || '',
          items: carrito,
          total: totalCarrito,
          estado: 'activo',
          ultima_actividad: new Date().toISOString()
        })
        await meseroService.enviarPedido(nuevoPedido.id)
      }
      
      setCarrito([])
      setPedidoActivo(null)
      setShowNuevoPedido(false)
      await loadData()
      
      await meseroService.crearNotificacion(
        user?.id || '',
        mesaSeleccionada.id,
        'pedido_listo',
        `✅ Pedido de mesa ${mesaSeleccionada.numero} enviado al bartender`
      )
      await loadNotifications()
      
      alert('✅ Pedido enviado al bartender')
    } catch (error) {
      console.error('Error enviando pedido:', error)
      alert('Error al enviar el pedido')
    }
  }

  const handleLlamarCliente = async (mesaId: string) => {
    await meseroService.crearNotificacion(
      user?.id || '',
      mesaId,
      'llamado_cliente',
      `🔔 El cliente de la mesa ${mesas.find(m => m.id === mesaId)?.numero} te está llamando`
    )
    await loadNotifications()
  }

  const totalPedidosActivos = pedidos.filter(p => p.estado === 'activo').length

  const getFirstName = () => {
    if (!userData) return 'Mesero'
    return userData.nombre || 'Mesero'
  }

  const getInitials = () => {
    if (!userData) return 'M'
    return `${userData.nombre?.charAt(0) || ''}${userData.apellido?.charAt(0) || ''}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

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
                {notificaciones.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <AvatarWithViewer
            src={null}
            fallback={getInitials()}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {timeIcon} {greeting}, {getFirstName()}
            </h1>
            <p className="text-gray-500">
              {totalPedidosActivos} mesas activas • {notificaciones.length} notificaciones
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {mesas.map((mesa) => {
            const pedido = pedidos.find(p => p.mesa_id === mesa.id && p.estado === 'activo')
            return (
              <Card 
                key={mesa.id} 
                className={`cursor-pointer hover:shadow-lg transition-all ${pedido ? 'border-orange-500 border-2' : ''}`}
                onClick={() => handleSeleccionarMesa(mesa)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">{mesa.numero}</div>
                  <div className="text-xs text-gray-500">{mesa.ubicacion}</div>
                  <div className="text-xs text-gray-400">Cap: {mesa.capacidad}</div>
                  {pedido ? (
                    <Badge className="mt-2 bg-orange-100 text-orange-700">
                      {pedido.items.length} items
                    </Badge>
                  ) : (
                    <Badge className="mt-2 bg-green-100 text-green-700">Disponible</Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Dialog open={showNuevoPedido} onOpenChange={setShowNuevoPedido}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Mesa {mesaSeleccionada?.numero} - {mesaSeleccionada?.ubicacion}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-4 text-blue-600"
                  onClick={() => handleLlamarCliente(mesaSeleccionada?.id)}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Llamar cliente
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4">
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="bebidas">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
                    <TabsTrigger value="botellas">Botellas</TabsTrigger>
                    <TabsTrigger value="combo">Promociones</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bebidas" className="space-y-2">
                    <Input
                      placeholder="Buscar bebidas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {recetas
                        .filter(r => r.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((receta) => (
                          <Card 
                            key={receta.id} 
                            className="cursor-pointer hover:bg-orange-50 transition-colors"
                            onClick={() => agregarAlCarrito(receta, 'drink')}
                          >
                            <CardContent className="p-2 flex items-center gap-2">
                              {receta.imagen_url && (
                                <img src={receta.imagen_url} alt={receta.nombre} className="w-10 h-10 rounded object-cover" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{receta.nombre}</p>
                                <p className="text-xs text-gray-500">${receta.precio_venta}</p>
                              </div>
                              <Plus className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="botellas">
                    <div className="grid grid-cols-2 gap-2">
                      {productos
                        .filter(p => p.es_bebida_principal === true)
                        .map((producto) => (
                          <Card 
                            key={producto.id} 
                            className="cursor-pointer hover:bg-orange-50 transition-colors"
                            onClick={() => agregarAlCarrito(producto, 'botella')}
                          >
                            <CardContent className="p-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{producto.nombre}</p>
                                <p className="text-xs text-gray-500">${producto.precio_venta}</p>
                              </div>
                              <Plus className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="combo">
                    <div className="grid grid-cols-2 gap-2">
                      {productos
                        .filter(p => p.categoria_nombre === 'pack' || p.categoria_nombre === 'shots')
                        .map((producto) => (
                          <Card 
                            key={producto.id} 
                            className="cursor-pointer hover:bg-orange-50 transition-colors"
                            onClick={() => agregarAlCarrito(producto, 'combo')}
                          >
                            <CardContent className="p-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{producto.nombre}</p>
                                <p className="text-xs text-gray-500">${producto.precio_venta}</p>
                              </div>
                              <Plus className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4">
                <h3 className="font-bold text-lg mb-3">Pedido</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {carrito.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay productos agregados</p>
                  ) : (
                    carrito.map((item, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.nombre}</p>
                          <p className="text-xs text-gray-500">${item.precio}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.cantidad}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => eliminarDelCarrito(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${totalCarrito.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
                    disabled={carrito.length === 0}
                    onClick={handleEnviarPedido}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
