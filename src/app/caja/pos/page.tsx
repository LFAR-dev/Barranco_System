'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, DollarSign, ArrowLeft, CheckCircle,
  Loader2, AlertCircle, Wine, Beer, GlassWater, Droplet, Martini, Gift
} from 'lucide-react'
import { productService, Product, RecetaPOS } from '@/lib/services/productService'
import { orderService } from '@/lib/services/orderService'
import { cuentaService } from '@/lib/services/cuentaService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useTurnoActivo } from '@/hooks/useTurnoActivo'
import { AvisoNoActivo } from '@/components/shared/AvisoNoActivo'
import { SeleccionDestino, TipoDestino } from '@/components/caja/SeleccionDestino'

// IDs fijos de los dos mixers de regalo
const MIXER_AGUA_ID = 'c215aaba-febc-483d-968b-39c4d93c3a6d'
const MIXER_REFRESCO_ID = '702a33df-688c-4b72-809c-33f9fe318f02'
const MIXERS_GRATIS_POR_BOTELLA = 4

// Nombres permitidos en el tab Servicios (solo bebidas vendibles)
const SERVICIOS_PERMITIDOS = [
  'Agua Mineral',
  'Agua Natural',
  'Refresco',
  'Sprite',
  'Ginger Ale',
  'Volt'
]

interface CartItem {
  id: string
  tipo: 'producto' | 'receta' | 'mixer_regalo'
  nombre: string
  marca?: string
  precio: number
  cantidad: number
  stock_disponible?: number
}

type TabCategoria = 'botellas' | 'cervezas' | 'cocteles' | 'servicios' | 'shots'

const TABS: Array<{ key: TabCategoria; label: string; icon: JSX.Element; categorias: string[] }> = [
  {
    key: 'botellas',
    label: 'Botellas',
    icon: <Wine className="h-4 w-4" />,
    categorias: ['tequila', 'ron', 'whisky', 'vodka', 'mezcal', 'ginebra', 'licor', 'champagne']
  },
  {
    key: 'cervezas',
    label: 'Cervezas',
    icon: <Beer className="h-4 w-4" />,
    categorias: ['cerveza']
  },
  {
    key: 'cocteles',
    label: 'Cocteles',
    icon: <Martini className="h-4 w-4" />,
    categorias: []
  },
  {
    key: 'servicios',
    label: 'Servicios',
    icon: <Droplet className="h-4 w-4" />,
    categorias: ['agua', 'refresco']
  },
  {
    key: 'shots',
    label: 'Shots',
    icon: <GlassWater className="h-4 w-4" />,
    categorias: ['shots']
  }
]

export default function CajaPOSPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { activo: turnoActivo, loading: turnoLoading, recargar: recargarTurno } = useTurnoActivo()

  const [productos, setProductos] = useState<Product[]>([])
  const [recetas, setRecetas] = useState<RecetaPOS[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tabActiva, setTabActiva] = useState<TabCategoria>('botellas')
  const [cart, setCart] = useState<CartItem[]>([])
  const [notas, setNotas] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const [modalMixersOpen, setModalMixersOpen] = useState(false)
  const [botellaParaMixers, setBotellaParaMixers] = useState<Product | null>(null)
  const [mixerAgua, setMixerAgua] = useState(0)
  const [mixerRefresco, setMixerRefresco] = useState(0)

  const [destino, setDestino] = useState<{
    tipo: TipoDestino
    mesaId: string
    mesaNombre: string
    meseroId: string
    meseroNombre: string
    modoPago: 'agregar_cuenta' | 'pagar_ahora'
    cuentaExistenteId: string | null
    cuentaExistenteInfo: string | null
  }>({
    tipo: 'caja',
    mesaId: '',
    mesaNombre: '',
    meseroId: '',
    meseroNombre: '',
    modoPago: 'agregar_cuenta',
    cuentaExistenteId: null,
    cuentaExistenteInfo: null
  })

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
      fetchData()
    }
  }, [user, authLoading, router])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [productosData, recetasData] = await Promise.all([
        productService.getVendibles(),
        productService.getRecetasActivas()
      ])
      setProductos(productosData.filter(p => p.stock_actual > 0))
      setRecetas(recetasData)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los productos')
      toast({
        title: 'Error',
        description: err.message || 'No se pudieron cargar los productos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const productosDelTab = useMemo(() => {
    if (tabActiva === 'cocteles') return []
    const tab = TABS.find(t => t.key === tabActiva)
    if (!tab) return []
    return productos.filter(p => {
      const cat = (p.categoria_nombre || '').toLowerCase()
      const nombreOk = tabActiva !== 'servicios' || SERVICIOS_PERMITIDOS.includes(p.nombre)
      return tab.categorias.includes(cat) && nombreOk
    })
  }, [productos, tabActiva])

  const recetasDelTab = useMemo(() => {
    if (tabActiva !== 'cocteles') return []
    return recetas
  }, [recetas, tabActiva])

  const productosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return productosDelTab
    return productosDelTab.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      (p.marca || '').toLowerCase().includes(term)
    )
  }, [productosDelTab, searchTerm])

  const recetasFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return recetasDelTab
    return recetasDelTab.filter(r =>
      r.nombre.toLowerCase().includes(term)
    )
  }, [recetasDelTab, searchTerm])

  const conteoTab = (key: TabCategoria): number => {
    if (key === 'cocteles') return recetas.length
    const tab = TABS.find(t => t.key === key)
    if (!tab) return 0
    return productos.filter(p => {
      const cat = (p.categoria_nombre || '').toLowerCase()
      const nombreOk = key !== 'servicios' || SERVICIOS_PERMITIDOS.includes(p.nombre)
      return tab.categorias.includes(cat) && nombreOk
    }).length
  }

  const esBotellaElegible = (producto: Product): boolean => {
    const cat = (producto.categoria_nombre || '').toLowerCase()
    return ['tequila', 'ron', 'whisky', 'vodka', 'mezcal', 'ginebra', 'licor', 'champagne'].includes(cat)
  }

  const addBotellaAlCarrito = (producto: Product) => {
    const existing = cart.find(item => item.id === producto.id && item.tipo === 'producto')
    if (existing) {
      if (existing.cantidad >= producto.stock_actual) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${producto.stock_actual} unidades de ${producto.nombre}`,
          variant: 'destructive'
        })
        return
      }
      setCart(cart.map(item =>
        item.id === producto.id && item.tipo === 'producto'
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        id: producto.id,
        tipo: 'producto',
        nombre: producto.nombre,
        marca: producto.marca,
        precio: producto.precio_venta || 0,
        cantidad: 1,
        stock_disponible: producto.stock_actual
      }])
    }
    setBotellaParaMixers(producto)
    setMixerAgua(0)
    setMixerRefresco(0)
    setModalMixersOpen(true)
  }

  const confirmarMixers = () => {
    const totalMixers = mixerAgua + mixerRefresco
    if (totalMixers > MIXERS_GRATIS_POR_BOTELLA) {
      toast({
        title: 'Demasiados mixers',
        description: `Solo ${MIXERS_GRATIS_POR_BOTELLA} mixers de regalo por botella`,
        variant: 'destructive'
      })
      return
    }
    const nuevos: CartItem[] = []
    if (mixerAgua > 0) {
      nuevos.push({
        id: MIXER_AGUA_ID,
        tipo: 'mixer_regalo',
        nombre: 'Agua Mineral (regalo)',
        marca: 'Topo Chico',
        precio: 0,
        cantidad: mixerAgua
      })
    }
    if (mixerRefresco > 0) {
      nuevos.push({
        id: MIXER_REFRESCO_ID,
        tipo: 'mixer_regalo',
        nombre: 'Refresco Coca-Cola (regalo)',
        marca: 'Coca-Cola',
        precio: 0,
        cantidad: mixerRefresco
      })
    }
    const cartActual = [...cart]
    for (const nuevo of nuevos) {
      const existente = cartActual.find(c => c.id === nuevo.id && c.tipo === 'mixer_regalo')
      if (existente) {
        existente.cantidad += nuevo.cantidad
      } else {
        cartActual.push(nuevo)
      }
    }
    setCart(cartActual)
    setModalMixersOpen(false)
    setBotellaParaMixers(null)
    setMixerAgua(0)
    setMixerRefresco(0)
    toast({
      title: 'Botella agregada',
      description: totalMixers > 0
        ? `Con ${totalMixers} mixer(s) de regalo`
        : 'Sin mixers de regalo',
      variant: 'success',
      duration: 2500
    })
  }

  const omitirMixers = () => {
    setModalMixersOpen(false)
    setBotellaParaMixers(null)
    setMixerAgua(0)
    setMixerRefresco(0)
    toast({
      title: 'Botella agregada',
      description: 'Sin mixers de regalo',
      variant: 'default',
      duration: 2000
    })
  }

  const addProductoToCart = (producto: Product) => {
    if (producto.stock_actual <= 0) {
      toast({
        title: 'Sin stock',
        description: `${producto.nombre} no tiene existencias disponibles`,
        variant: 'destructive'
      })
      return
    }
    if (esBotellaElegible(producto)) {
      addBotellaAlCarrito(producto)
      return
    }
    const existing = cart.find(item => item.id === producto.id && item.tipo === 'producto')
    if (existing) {
      if (existing.cantidad >= producto.stock_actual) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${producto.stock_actual} unidades de ${producto.nombre}`,
          variant: 'destructive'
        })
        return
      }
      setCart(cart.map(item =>
        item.id === producto.id && item.tipo === 'producto'
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        id: producto.id,
        tipo: 'producto',
        nombre: producto.nombre,
        marca: producto.marca,
        precio: producto.precio_venta || 0,
        cantidad: 1,
        stock_disponible: producto.stock_actual
      }])
    }
  }

  const addRecetaToCart = (receta: RecetaPOS) => {
    const existing = cart.find(item => item.id === receta.id && item.tipo === 'receta')
    if (existing) {
      setCart(cart.map(item =>
        item.id === receta.id && item.tipo === 'receta'
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        id: receta.id,
        tipo: 'receta',
        nombre: receta.nombre,
        precio: receta.precio_venta || 0,
        cantidad: 1
      }])
    }
  }

  const removeFromCart = (id: string, tipo: 'producto' | 'receta' | 'mixer_regalo') => {
    setCart(cart.filter(item => !(item.id === id && item.tipo === tipo)))
  }

  const updateQuantity = (id: string, tipo: 'producto' | 'receta' | 'mixer_regalo', cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(id, tipo)
      return
    }
    if (tipo === 'mixer_regalo') {
      // Blindaje: los mixers de regalo solo se pueden reducir o eliminar.
      // Si el usuario intenta incrementar, no permitimos pasar del total actual (que ya fue validado en el modal).
      const item = cart.find(i => i.id === id && i.tipo === 'mixer_regalo')
      if (item && cantidad > item.cantidad) {
        toast({
          title: 'Mixers de regalo limitados',
          description: 'Para agregar mas, usa el tab Servicios (se cobran a precio normal)',
          variant: 'destructive',
          duration: 3500
        })
        return
      }
      setCart(cart.map(item =>
        item.id === id && item.tipo === 'mixer_regalo' ? { ...item, cantidad } : item
      ))
      return
    }
    if (tipo === 'producto') {
      const item = cart.find(i => i.id === id && i.tipo === 'producto')
      if (item && item.stock_disponible !== undefined && cantidad > item.stock_disponible) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${item.stock_disponible} unidades disponibles`,
          variant: 'destructive'
        })
        return
      }
    }
    setCart(cart.map(item =>
      item.id === id && item.tipo === tipo ? { ...item, cantidad } : item
    ))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('Estas seguro de que deseas vaciar el carrito?')) {
      setCart([])
      setEfectivoRecibido('')
      toast({ title: 'Carrito vaciado', variant: 'default' })
    }
  }

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const totalRegalos = cart
    .filter(i => i.tipo === 'mixer_regalo')
    .reduce((sum, i) => sum + i.cantidad, 0)

  const cambio = metodoPago === 'efectivo'
    ? Math.max(0, parseFloat(efectivoRecibido || '0') - total)
    : 0

  const validarDestino = (): string | null => {
    if (destino.tipo === 'mesa') {
      if (!destino.mesaId) return 'Selecciona una mesa'
      if (!destino.meseroId) return 'Selecciona un mesero activo'
    }
    return null
  }

  const handleCrearPedido = async () => {
    if (!turnoActivo) {
      setError('No estas activo en el turno actual. Contacta al administrador.')
      return
    }
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
    const errorDestino = validarDestino()
    if (errorDestino) {
      setError(errorDestino)
      return
    }

    setProcessing(true)
    setError('')

    try {
      const items = cart.map(item => ({
        receta_id: item.id,
        cantidad: item.cantidad,
        nombre: item.nombre,
        precio: item.precio,
        tipo: item.tipo
      }))

      let cuentaIdParaVincular: string | null = null

      // Fase D: si es mesa y modo "agregar_cuenta", resolver cuenta
      if (destino.tipo === 'mesa' && destino.modoPago === 'agregar_cuenta') {
        if (destino.cuentaExistenteId) {
          // Ya hay cuenta existente en esta mesa
          cuentaIdParaVincular = destino.cuentaExistenteId
        } else {
          // No hay cuenta: abrir una nueva
          if (!destino.meseroId) {
            throw new Error('Selecciona un mesero para abrir la cuenta')
          }
          try {
            const nuevaCuenta = await cuentaService.abrirCuenta(
              destino.mesaId,
              destino.meseroId,
              1
            )
            cuentaIdParaVincular = nuevaCuenta.id
          } catch (e: any) {
            // Si la cuenta ya existe (race condition), recargar y usar la existente
            if (e.message?.includes('Ya hay una cuenta abierta')) {
              const cuentaExistente = await cuentaService.getCuentaActiva(destino.mesaId)
              if (cuentaExistente?.id) {
                cuentaIdParaVincular = cuentaExistente.id
              } else {
                throw new Error('No se pudo abrir ni encontrar la cuenta de la mesa')
              }
            } else {
              throw e
            }
          }
        }
      }

      const result = await orderService.createOrder({
        mesero_id: user.id,
        meseroAsignadoId: destino.tipo === 'mesa' ? destino.meseroId : undefined,
        mesaId: destino.tipo === 'mesa' ? destino.mesaId : undefined,
        mesa: destino.tipo === 'mesa' ? destino.mesaNombre : 'Caja',
        items,
        total,
        notas,
        tipo_origen: 'caja',
        cuentaAbiertaId: cuentaIdParaVincular
      })

      if (!result) throw new Error('No se pudo crear el pedido')

      // Si se creo o uso cuenta, vincular el pedido
      if (cuentaIdParaVincular) {
        try {
          await cuentaService.vincularPedidoACuenta(result.id, cuentaIdParaVincular)
        } catch (e) {
          console.error('[handleCrearPedido] Error al vincular pedido a cuenta:', e)
        }
      }

      const mensajeDestino = destino.tipo === 'mesa'
        ? `Pedido enviado a ${destino.meseroNombre} para ${destino.mesaNombre}`
        : 'Pedido listo para recoger en caja'

      toast({
        title: 'Pedido creado',
        description: `${mensajeDestino}. Total: $${total.toFixed(2)}${cambio > 0 ? ` | Cambio: $${cambio.toFixed(2)}` : ''}`,
        variant: 'success',
        duration: 6000
      })

      setCart([])
      setEfectivoRecibido('')
      setNotas('')
      setDestino({
        tipo: 'caja',
        mesaId: '',
        mesaNombre: '',
        meseroId: '',
        meseroNombre: '',
        modoPago: 'agregar_cuenta',
        cuentaExistenteId: null,
        cuentaExistenteInfo: null
      })
      await fetchData()
      setTimeout(() => router.push('/caja'), 1500)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'No se pudo crear el pedido')
      toast({
        title: 'Error al crear pedido',
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
      {!turnoLoading && turnoActivo === false && (
        <AvisoNoActivo
          rolLabel="cajero"
          onRecargar={recargarTurno}
          onSalir={() => router.push('/caja')}
        />
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/caja">
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
              </Link>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  Nuevo Pedido
                </span>
                <span className="ml-1.5 text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                  POS
                </span>
              </div>
            </div>
            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Vaciar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 p-3 sm:p-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ShoppingCart className="h-5 w-5" />
                Productos
              </CardTitle>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en la categoria activa..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {TABS.map(tab => {
                  const activa = tabActiva === tab.key
                  const count = conteoTab(tab.key)
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { setTabActiva(tab.key); setSearchTerm('') }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                        activa
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 rounded-full ${activa ? 'bg-white/20' : 'bg-white'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent>
              {tabActiva === 'cocteles' ? (
                recetasFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Martini className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No hay cocteles disponibles</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] sm:h-[600px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {recetasFiltradas.map(receta => (
                        <Card
                          key={receta.id}
                          className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-emerald-300 cursor-pointer"
                          onClick={() => addRecetaToCart(receta)}
                        >
                          <CardContent className="p-2 sm:p-3 text-center">
                            <p className="font-medium text-xs sm:text-sm truncate" title={receta.nombre}>
                              {receta.nombre}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                              {receta.categoria?.replace('con_', '') || 'coctel'}
                            </p>
                            <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1">
                              ${receta.precio_venta?.toFixed(2) || '0.00'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )
              ) : productosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No hay productos en esta categoria</p>
                  <p className="text-sm">Prueba con otra categoria o busqueda</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] sm:h-[600px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {productosFiltrados.map(producto => (
                      <Card
                        key={producto.id}
                        className={`hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-emerald-300 cursor-pointer ${
                          esBotellaElegible(producto) ? 'border-amber-200' : ''
                        }`}
                        onClick={() => addProductoToCart(producto)}
                      >
                        <CardContent className="p-2 sm:p-3 text-center">
                          {esBotellaElegible(producto) && (
                            <Badge className="mb-1 text-[9px] bg-amber-100 text-amber-700 border-amber-300">
                              <Gift className="h-2.5 w-2.5 mr-0.5" />
                              +4 mixers
                            </Badge>
                          )}
                          <p className="font-medium text-xs sm:text-sm truncate" title={producto.nombre}>
                            {producto.nombre}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                            {producto.marca || '-'}
                          </p>
                          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1">
                            ${producto.precio_venta?.toFixed(2) || '0.00'}
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <Badge
                              className={`text-[10px] sm:text-xs ${
                                producto.stock_actual <= producto.stock_minimo
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              Stock: {producto.stock_actual}
                            </Badge>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Pedido
                </span>
                <div className="flex items-center gap-1">
                  {totalRegalos > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                      <Gift className="h-3 w-3 mr-0.5" />
                      {totalRegalos}
                    </Badge>
                  )}
                  <Badge className={cart.length > 0 ? 'bg-emerald-100 text-emerald-700' : ''}>
                    {cart.length}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-[200px]">
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">Carrito vacio</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => {
                      const esRegalo = item.tipo === 'mixer_regalo'
                      return (
                        <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-2 border-b pb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="font-medium text-xs truncate">{item.nombre}</p>
                              {esRegalo && (
                                <Badge className="bg-amber-100 text-amber-700 text-[9px] px-1 py-0">
                                  Regalo
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500">
                              ${item.precio.toFixed(2)} x {item.cantidad} = <strong>${(item.precio * item.cantidad).toFixed(2)}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => updateQuantity(item.id, item.tipo, item.cantidad - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-xs font-medium">{item.cantidad}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 w-6 p-0 ${esRegalo ? 'text-gray-300' : ''}`}
                              onClick={() => updateQuantity(item.id, item.tipo, item.cantidad + 1)}
                              disabled={esRegalo}
                              title={esRegalo ? 'Mixers de regalo limitados: agregalos desde Servicios' : ''}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => removeFromCart(item.id, item.tipo)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              {totalRegalos > 0 && (
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Tienes {totalRegalos} mixer(s) de regalo. Para agregar mas, usa el tab Servicios (se cobran).
                </div>
              )}

              <div className="border-t pt-3 space-y-3">
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <SeleccionDestino onChange={setDestino} />

                <div className="space-y-2">
                  <Label htmlFor="notas" className="text-xs">Notas (opcional)</Label>
                  <Input
                    id="notas"
                    placeholder="Ej: Sin hielo, extra limon..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    disabled={processing}
                    className="text-sm"
                  />
                </div>

                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-emerald-600">${total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={metodoPago === 'efectivo' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('efectivo')}
                    disabled={processing}
                    size="sm"
                    className={`w-full text-xs ${metodoPago === 'efectivo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <DollarSign className="h-3 w-3 sm:mr-1" />
                    Efectivo
                  </Button>
                  <Button
                    variant={metodoPago === 'tarjeta' ? 'default' : 'outline'}
                    onClick={() => setMetodoPago('tarjeta')}
                    disabled={processing}
                    size="sm"
                    className={`w-full text-xs ${metodoPago === 'tarjeta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <CreditCard className="h-3 w-3 sm:mr-1" />
                    Tarjeta
                  </Button>
                </div>

                {metodoPago === 'efectivo' && (
                  <div className="space-y-2">
                    <Label htmlFor="efectivo" className="text-xs">Efectivo recibido</Label>
                    <Input
                      id="efectivo"
                      type="number"
                      placeholder="0.00"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      disabled={processing}
                      className="text-sm"
                    />
                    {parseFloat(efectivoRecibido || '0') >= total && total > 0 && (
                      <div className="flex justify-between text-xs bg-blue-50 p-2 rounded-lg">
                        <span className="font-medium">Cambio:</span>
                        <span className="font-bold text-blue-600">${cambio.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 sm:h-12 text-sm sm:text-base"
                  onClick={handleCrearPedido}
                  disabled={processing || cart.length === 0 || !turnoActivo}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Crear ${total.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={modalMixersOpen} onOpenChange={(open) => {
        if (!open) omitirMixers()
      }}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="h-5 w-5 text-amber-600" />
              Mixers de regalo
            </DialogTitle>
            <DialogDescription className="text-sm">
              {botellaParaMixers?.nombre} incluye {MIXERS_GRATIS_POR_BOTELLA} mixers gratis.
              Elige cuantos quieres.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-xs text-amber-800">
                Llevas <strong>{mixerAgua + mixerRefresco} de {MIXERS_GRATIS_POR_BOTELLA}</strong> mixers gratis
                {mixerAgua + mixerRefresco === MIXERS_GRATIS_POR_BOTELLA && ' (completo)'}
              </p>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Droplet className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Agua Mineral</p>
                  <p className="text-[10px] text-gray-500">Topo Chico - Gratis</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setMixerAgua(Math.max(0, mixerAgua - 1))}
                  disabled={mixerAgua <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-bold">{mixerAgua}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (mixerAgua + mixerRefresco < MIXERS_GRATIS_POR_BOTELLA) {
                      setMixerAgua(mixerAgua + 1)
                    }
                  }}
                  disabled={mixerAgua + mixerRefresco >= MIXERS_GRATIS_POR_BOTELLA}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Droplet className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-sm">Refresco (Coca-Cola)</p>
                  <p className="text-[10px] text-gray-500">Gratis</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setMixerRefresco(Math.max(0, mixerRefresco - 1))}
                  disabled={mixerRefresco <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-bold">{mixerRefresco}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (mixerAgua + mixerRefresco < MIXERS_GRATIS_POR_BOTELLA) {
                      setMixerRefresco(mixerRefresco + 1)
                    }
                  }}
                  disabled={mixerAgua + mixerRefresco >= MIXERS_GRATIS_POR_BOTELLA}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 text-center pt-2">
              Si quieres mas de {MIXERS_GRATIS_POR_BOTELLA}, agregalos desde el tab Servicios
              y se cobraran a precio normal.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={omitirMixers}
              >
                Omitir
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={confirmarMixers}
              >
                <Gift className="h-4 w-4 mr-1" />
                Agregar {mixerAgua + mixerRefresco}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
