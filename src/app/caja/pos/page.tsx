'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, 
  CreditCard, DollarSign, ArrowLeft, CheckCircle,
  Loader2, XCircle, AlertCircle
} from 'lucide-react'
import { productService, Product } from '@/lib/services/productService'
import { orderService } from '@/lib/services/orderService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { BotonReceta } from '@/components/shared/BotonReceta'

interface CartItem extends Product {
  cantidad: number
}

export default function CajaPOSPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [productos, setProductos] = useState<Product[]>([])
  const [filteredProductos, setFilteredProductos] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [mesa, setMesa] = useState('')
  const [notas, setNotas] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/caja-login')
      return
    }
    if (!authLoading && user?.rol !== 'caja') {
      router.push('/')
      return
    }
    if (user) {
      fetchProductos()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (searchTerm) {
      setFilteredProductos(
        productos.filter(p =>
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredProductos(productos)
    }
  }, [searchTerm, productos])

  const fetchProductos = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await productService.getAll()
      setProductos(data.filter(p => p.activo && p.stock_actual > 0))
    } catch (error: any) {
      setError(error.message || 'No se pudieron cargar los productos')
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudieron cargar los productos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (producto: Product) => {
    if (producto.stock_actual <= 0) {
      toast({
        title: '⚠️ Sin stock',
        description: `${producto.nombre} no tiene existencias disponibles`,
        variant: 'destructive'
      })
      return
    }

    const existing = cart.find(item => item.id === producto.id)
    if (existing) {
      if (existing.cantidad >= producto.stock_actual) {
        toast({
          title: '⚠️ Stock insuficiente',
          description: `Solo hay ${producto.stock_actual} unidades de ${producto.nombre}`,
          variant: 'destructive'
        })
        return
      }
      setCart(cart.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...producto, cantidad: 1 }])
    }
  }

  const removeFromCart = (productoId: string) => {
    setCart(cart.filter(item => item.id !== productoId))
  }

  const updateQuantity = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(productoId)
      return
    }

    const producto = productos.find(p => p.id === productoId)
    if (producto && cantidad > producto.stock_actual) {
      toast({
        title: '⚠️ Stock insuficiente',
        description: `Solo hay ${producto.stock_actual} unidades disponibles`,
        variant: 'destructive'
      })
      return
    }

    setCart(cart.map(item =>
      item.id === productoId ? { ...item, cantidad } : item
    ))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      setCart([])
      setEfectivoRecibido('')
      toast({
        title: '🗑️ Carrito vaciado',
        description: 'Se eliminaron todos los productos',
        variant: 'default'
      })
    }
  }

  const total = cart.reduce((sum, item) => 
    sum + (item.precio_venta || 0) * item.cantidad, 0
  )

  const cambio = metodoPago === 'efectivo' 
    ? Math.max(0, parseFloat(efectivoRecibido || '0') - total)
    : 0

  const handleCrearPedido = async () => {
    if (!user) {
      setError('No hay usuario autenticado')
      return
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto al pedido')
      return
    }

    if (metodoPago === 'efectivo' && parseFloat(efectivoRecibido || '0') < total) {
      setError('El efectivo recibido es insuficiente')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const items = cart.map(item => ({
        receta_id: item.id,
        cantidad: item.cantidad,
        nombre: item.nombre,
        precio: item.precio_venta || 0,
        tipo: 'producto'
      }))

      const result = await orderService.createOrder({
        mesero_id: user.id,
        mesa: mesa || 'Caja',
        items,
        total,
        notas
      })

      if (!result) {
        throw new Error('No se pudo crear el pedido')
      }

      toast({
        title: '✅ Pedido creado',
        description: `Pedido #${result.id.slice(0, 6)} creado. Total: $${total.toFixed(2)}${cambio > 0 ? ` | Cambio: $${cambio.toFixed(2)}` : ''}`,
        variant: 'success',
        duration: 6000
      })

      setCart([])
      setEfectivoRecibido('')
      setMesa('')
      setNotas('')
      
      await fetchProductos()
      
      setTimeout(() => {
        router.push('/caja')
      }, 1500)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'No se pudo crear el pedido')
      toast({
        title: '❌ Error al crear pedido',
        description: err.message || 'No se pudo crear el pedido. Intenta de nuevo.',
        variant: 'destructive',
        duration: 6000
      })
    } finally {
      setProcessing(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/caja">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <span className="text-xl font-bold text-gray-900">Nuevo Pedido</span>
                <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Caja / POS</span>
              </div>
            </div>
            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vaciar carrito
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Productos Disponibles
                <Badge variant="secondary">{filteredProductos.length}</Badge>
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar productos por nombre o marca..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredProductos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm">Intenta con otra búsqueda</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProductos.map((producto) => (
                      <Card
                        key={producto.id}
                        className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-emerald-300 relative"
                      >
                        <CardContent className="p-3 text-center">
                          <div
                            className="cursor-pointer"
                            onClick={() => addToCart(producto)}
                          >
                            <p className="font-medium text-sm truncate" title={producto.nombre}>
                              {producto.nombre}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{producto.marca}</p>
                            <p className="text-lg font-bold text-emerald-600 mt-1">
                              ${producto.precio_venta?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <Badge 
                              className={`text-xs ${
                                producto.stock_actual <= producto.stock_minimo
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              Stock: {producto.stock_actual}
                            </Badge>
                            <BotonReceta 
                              recetaId={producto.id} 
                              recetaNombre={producto.nombre}
                              variant="icon"
                              size="sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Pedido
                </span>
                <Badge className={cart.length > 0 ? 'bg-emerald-100 text-emerald-700' : ''}>
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Carrito vacío</p>
                    <p className="text-gray-400 text-xs mt-1">Toca un producto para agregarlo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 border-b pb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.nombre}</p>
                          <p className="text-xs text-gray-500">
                            ${item.precio_venta?.toFixed(2)} × {item.cantidad} = <strong>${((item.precio_venta || 0) * item.cantidad).toFixed(2)}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t pt-4 space-y-3">
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="mesa" className="text-sm">Mesa (opcional)</Label>
                  <Input
                    id="mesa"
                    placeholder="Ej: Mesa 5, Barra, Para llevar..."
                    value={mesa}
                    onChange={(e) => setMesa(e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas" className="text-sm">Notas (opcional)</Label>
                  <Input
                    id="notas"
                    placeholder="Ej: Sin hielo, extra limón..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-emerald-600">${total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={metodoPago === 'efectivo' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('efectivo')}
                    disabled={processing}
                    className={`w-full ${metodoPago === 'efectivo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Efectivo
                  </Button>
                  <Button
                    variant={metodoPago === 'tarjeta' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('tarjeta')}
                    disabled={processing}
                    className={`w-full ${metodoPago === 'tarjeta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Tarjeta
                  </Button>
                </div>

                {metodoPago === 'efectivo' && (
                  <div className="space-y-2">
                    <Label htmlFor="efectivo" className="text-sm">Efectivo recibido</Label>
                    <Input
                      id="efectivo"
                      type="number"
                      placeholder="0.00"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      disabled={processing}
                    />
                    {parseFloat(efectivoRecibido || '0') >= total && total > 0 && (
                      <div className="flex justify-between text-sm bg-blue-50 p-2 rounded-lg">
                        <span className="font-medium">Cambio:</span>
                        <span className="font-bold text-blue-600">
                          ${cambio.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
                  onClick={handleCrearPedido}
                  disabled={processing || cart.length === 0}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creando pedido...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Crear Pedido ${total.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
