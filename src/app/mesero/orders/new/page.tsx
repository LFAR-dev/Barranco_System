'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Minus, Trash2, Coffee, Wine, Beer, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { recipeService, Recipe } from '@/lib/services/recipeService'
import { orderService, OrderItem } from '@/lib/services/orderService'

interface OrderItemWithStock extends OrderItem {
  tiene_stock?: boolean
  stock_disponible?: number
  tipo?: string
}

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  stock_actual: number
  es_bebida_principal: boolean
  es_insumo: boolean
  es_paquete: boolean
}

export default function NewOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  
  const mesaId = searchParams.get('mesa')
  const [mesaInfo, setMesaInfo] = useState<any>(null)
  const [recetas, setRecetas] = useState<Recipe[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [cart, setCart] = useState<OrderItemWithStock[]>([])
  const [loading, setLoading] = useState(false)
  const [tipoPedido, setTipoPedido] = useState<'preparadas' | 'botellas' | 'servicio'>('preparadas')

  useEffect(() => {
    if (mesaId) {
      fetchMesaInfo()
    }
    fetchRecetas()
    fetchProductos()
  }, [mesaId])

  const fetchMesaInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('id', mesaId)
        .single()

      if (error) throw error
      setMesaInfo(data)
    } catch (error) {
      console.error('Error fetching mesa:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la mesa',
        variant: 'destructive'
      })
    }
  }

  const fetchRecetas = async () => {
    try {
      const data = await recipeService.getAll()
      setRecetas(data || [])
    } catch (error) {
      console.error('Error fetching recetas:', error)
    }
  }

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error('Error fetching productos:', error)
    }
  }

  const addToCart = (item: any, tipo: 'receta' | 'producto') => {
    const cartItem: OrderItemWithStock = {
      receta_id: item.id,
      cantidad: 1,
      nombre: item.nombre,
      precio: item.precio_venta || 0,
      tipo: tipo,
      tiene_stock: true,
      stock_disponible: item.stock_actual || 0
    }

    const existing = cart.find(c => c.receta_id === item.id && c.tipo === tipo)
    if (existing) {
      if (existing.stock_disponible !== undefined && existing.cantidad >= existing.stock_disponible) {
        toast({
          title: '⚠️ Stock insuficiente',
          description: `Solo hay ${existing.stock_disponible} unidades disponibles`,
          variant: 'destructive'
        })
        return
      }
      setCart(cart.map(c =>
        c.receta_id === item.id && c.tipo === tipo
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ))
    } else {
      setCart([...cart, cartItem])
    }

    toast({
      title: '✅ Agregado',
      description: `${item.nombre} agregado al pedido`,
      variant: 'success'
    })
  }

  const removeFromCart = (receta_id: string, tipo: string) => {
    setCart(cart.filter(item => !(item.receta_id === receta_id && item.tipo === tipo)))
  }

  const updateQuantity = (receta_id: string, tipo: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(receta_id, tipo)
      return
    }

    const item = cart.find(c => c.receta_id === receta_id && c.tipo === tipo)
    if (item && item.stock_disponible !== undefined && cantidad > item.stock_disponible) {
      toast({
        title: '⚠️ Stock insuficiente',
        description: `Solo hay ${item.stock_disponible} unidades disponibles`,
        variant: 'destructive'
      })
      return
    }

    setCart(cart.map(item =>
      item.receta_id === receta_id && item.tipo === tipo
        ? { ...item, cantidad }
        : item
    ))
  }

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'No hay usuario autenticado',
        variant: 'destructive'
      })
      return
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un producto',
        variant: 'destructive'
      })
      return
    }

    if (!mesaId) {
      toast({
        title: 'Error',
        description: 'No se seleccionó una mesa',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const pedidoData = {
        mesa_id: mesaId,
        mesero_id: user.id,
        items: cart.map(item => ({
          receta_id: item.receta_id,
          cantidad: item.cantidad,
          nombre: item.nombre,
          precio: item.precio,
          tipo: item.tipo
        })),
        total,
        estado: 'activo'
      }

      const { data, error } = await supabase
        .from('pedidos_activos')
        .insert([pedidoData])
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('notificaciones_bartender')
        .insert([{
          bartender_id: null,
          pedido_id: data.id,
          mensaje: `📦 Nuevo pedido - Mesa ${mesaInfo?.numero || 'N/A'}`,
          tipo: 'nuevo_pedido'
        }])

      toast({
        title: '✅ Pedido enviado',
        description: `Pedido de mesa ${mesaInfo?.numero || 'N/A'} enviado al bartender`,
        variant: 'success'
      })

      router.push('/mesero/orders')
    } catch (error) {
      console.error('Error creating order:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el pedido',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mesaId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">No hay mesa seleccionada</h2>
          <p className="text-gray-500 mt-2">Por favor, selecciona una mesa primero</p>
          <Link href="/mesero/orders">
            <Button className="mt-4 bg-orange-600 hover:bg-orange-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a mesas
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/mesero/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mesa {mesaInfo?.numero || 'N/A'}
            </h1>
            <p className="text-sm text-gray-500">
              {mesaInfo?.ubicacion || 'Sin ubicación'} • Capacidad: {mesaInfo?.capacidad || 0} personas
            </p>
          </div>
          <Badge className="ml-auto bg-green-100 text-green-700">
            <Coffee className="h-3 w-3 mr-1" />
            Tomando pedido
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <Tabs defaultValue="preparadas" onValueChange={(v) => setTipoPedido(v as any)}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="preparadas">
                      <Coffee className="h-4 w-4 mr-2" />
                      Preparadas
                    </TabsTrigger>
                    <TabsTrigger value="botellas">
                      <Wine className="h-4 w-4 mr-2" />
                      Botellas
                    </TabsTrigger>
                    <TabsTrigger value="servicio">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Servicio
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preparadas" className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {recetas.map(recipe => (
                        <Button
                          key={recipe.id}
                          variant="outline"
                          className="justify-start h-auto py-2 px-3 text-left"
                          onClick={() => addToCart(recipe, 'receta')}
                        >
                          <div>
                            <p className="font-medium text-sm truncate">{recipe.nombre}</p>
                            <p className="text-xs text-gray-500">${recipe.precio_venta}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="botellas" className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {productos
                        .filter(p => p.es_bebida_principal && p.stock_actual > 0)
                        .map(producto => (
                          <Button
                            key={producto.id}
                            variant="outline"
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => addToCart({
                              id: producto.id,
                              nombre: producto.nombre,
                              precio_venta: producto.precio_venta,
                              stock_actual: producto.stock_actual
                            }, 'producto')}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{producto.nombre}</p>
                                <Badge className="text-xs bg-green-100 text-green-700">
                                  {producto.stock_actual} disp.
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500">${producto.precio_venta}</p>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="servicio" className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {productos
                        .filter(p => p.es_insumo && p.stock_actual > 0)
                        .map(producto => (
                          <Button
                            key={producto.id}
                            variant="outline"
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => addToCart({
                              id: producto.id,
                              nombre: producto.nombre,
                              precio_venta: producto.precio_venta || 0,
                              stock_actual: producto.stock_actual
                            }, 'producto')}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{producto.nombre}</p>
                                <Badge className="text-xs bg-green-100 text-green-700">
                                  {producto.stock_actual} disp.
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500">${producto.precio_venta || 0}</p>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardContent className="p-4">
                <h2 className="font-bold text-lg mb-4">🛒 Pedido</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {cart.map(item => (
                    <div key={`${item.receta_id}-${item.tipo}`} className="flex items-center justify-between border-b pb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.nombre}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">${item.precio}</p>
                          {item.tipo && (
                            <Badge className="text-xs bg-gray-100 text-gray-500">
                              {item.tipo === 'receta' ? '🍸' : '🍾'}
                            </Badge>
                          )}
                          {item.stock_disponible !== undefined && (
                            <Badge className="text-xs bg-green-100 text-green-700">
                              Stock: {item.stock_disponible}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.receta_id, item.tipo || 'receta', item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.cantidad}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.receta_id, item.tipo || 'receta', item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => removeFromCart(item.receta_id, item.tipo || 'receta')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No hay productos agregados
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-orange-600">${total.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white" 
                    onClick={handleSubmit} 
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Pedido'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
