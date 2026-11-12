'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Minus, Trash2, Coffee, Wine, Sparkles,
  Gift, Droplet, Beer, GlassWater, Martini, Search, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { recipeService, Recipe } from '@/lib/services/recipeService'
import { orderService, OrderItem } from '@/lib/services/orderService'
import { BotonReceta } from '@/components/shared/BotonReceta'
import { cuentaService } from '@/lib/services/cuentaService'
import { jornadaService } from '@/lib/services/jornadaService'
import { useSesionCaja } from '@/hooks/useSesionCaja'

const MIXER_AGUA_ID = 'c215aaba-febc-483d-968b-39c4d93c3a6d'
const MIXER_REFRESCO_ID = '702a33df-688c-4b72-809c-33f9fe318f02'
const MIXERS_GRATIS_POR_BOTELLA = 4

const SERVICIOS_PERMITIDOS = [
  'Agua Mineral',
  'Agua Natural',
  'Refresco',
  'Sprite',
  'Ginger Ale',
  'Volt'
]

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
  stock_minimo?: number
  es_bebida_principal: boolean
  es_insumo: boolean
  es_paquete: boolean
  categoria_nombre?: string
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

export default function NewOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ayudando = searchParams.get('ayudando') === 'true'
  const { toast } = useToast()
  const supabase = createClient()
  const { haySesion: hayCajaAbierta, loading: loadingCaja } = useSesionCaja()

  const mesaId = searchParams.get('mesa')
  const cuentaId = searchParams.get('cuenta')
  const [mesaInfo, setMesaInfo] = useState<any>(null)
  const [recetas, setRecetas] = useState<Recipe[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [cart, setCart] = useState<OrderItemWithStock[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [tabActiva, setTabActiva] = useState<TabCategoria>('botellas')
  const [searchTerm, setSearchTerm] = useState('')

  const [modalMixersOpen, setModalMixersOpen] = useState(false)
  const [botellaParaMixers, setBotellaParaMixers] = useState<Producto | null>(null)
  const [mixerAgua, setMixerAgua] = useState(0)
  const [mixerRefresco, setMixerRefresco] = useState(0)

  useEffect(() => {
    if (mesaId) {
      fetchMesaInfo()
    }
    fetchData()
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
        description: 'No se pudo cargar la informacion de la mesa',
        variant: 'destructive'
      })
    }
  }

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [recetasData, productosResp] = await Promise.all([
        recipeService.getAll(),
        supabase
          .from('productos')
          .select(`*, categorias (nombre)`)
          .eq('activo', true)
          .order('nombre')
      ])
      setRecetas(recetasData || [])
      const productosData = (productosResp.data || []).map((p: any) => ({
        ...p,
        categoria_nombre: p.categorias?.nombre || ''
      }))
      setProductos(productosData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const esBotella = (producto: Producto): boolean => {
    const cat = (producto.categoria_nombre || '').toLowerCase()
    return ['tequila', 'ron', 'whisky', 'vodka', 'mezcal', 'ginebra', 'licor', 'champagne'].includes(cat)
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
      p.nombre.toLowerCase().includes(term)
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

    const existing = cart.find((c) => c.receta_id === item.id && c.tipo === tipo)
    if (existing) {
      if (
        existing.stock_disponible !== undefined &&
        existing.cantidad >= existing.stock_disponible
      ) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${existing.stock_disponible} unidades disponibles`,
          variant: 'destructive'
        })
        return
      }
      setCart(
        cart.map((c) =>
          c.receta_id === item.id && c.tipo === tipo
            ? { ...c, cantidad: c.cantidad + 1 }
            : c
        )
      )
    } else {
      setCart([...cart, cartItem])
    }

    toast({
      title: 'Agregado',
      description: `${item.nombre} agregado al pedido`,
      variant: 'success',
      duration: 2000
    })
  }

  const addBotellaToCart = (producto: Producto) => {
    const cartItem: OrderItemWithStock = {
      receta_id: producto.id,
      cantidad: 1,
      nombre: producto.nombre,
      precio: producto.precio_venta || 0,
      tipo: 'producto',
      tiene_stock: true,
      stock_disponible: producto.stock_actual || 0
    }
    const existing = cart.find((c) => c.receta_id === producto.id && c.tipo === 'producto')
    if (existing) {
      if (existing.cantidad >= (existing.stock_disponible || 0)) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${existing.stock_disponible} unidades disponibles`,
          variant: 'destructive'
        })
        return
      }
      setCart(
        cart.map((c) =>
          c.receta_id === producto.id && c.tipo === 'producto'
            ? { ...c, cantidad: c.cantidad + 1 }
            : c
        )
      )
    } else {
      setCart([...cart, cartItem])
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
    const nuevos: OrderItemWithStock[] = []
    if (mixerAgua > 0) {
      nuevos.push({
        receta_id: MIXER_AGUA_ID,
        cantidad: mixerAgua,
        nombre: 'Agua Mineral (regalo)',
        precio: 0,
        tipo: 'mixer_regalo',
        tiene_stock: true
      })
    }
    if (mixerRefresco > 0) {
      nuevos.push({
        receta_id: MIXER_REFRESCO_ID,
        cantidad: mixerRefresco,
        nombre: 'Refresco Coca-Cola (regalo)',
        precio: 0,
        tipo: 'mixer_regalo',
        tiene_stock: true
      })
    }
    const cartActual = [...cart]
    for (const nuevo of nuevos) {
      const existente = cartActual.find(c => c.receta_id === nuevo.receta_id && c.tipo === 'mixer_regalo')
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

  const removeFromCart = (receta_id: string, tipo: string) => {
    setCart(
      cart.filter((item) => !(item.receta_id === receta_id && item.tipo === tipo))
    )
  }

  const updateQuantity = (receta_id: string, tipo: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(receta_id, tipo)
      return
    }
    if (tipo === 'mixer_regalo') {
      const item = cart.find((c) => c.receta_id === receta_id && c.tipo === 'mixer_regalo')
      if (item && cantidad > item.cantidad) {
        toast({
          title: 'Mixers de regalo limitados',
          description: 'Para agregar mas, usa el tab Servicios (se cobran a precio normal)',
          variant: 'destructive',
          duration: 3500
        })
        return
      }
      setCart(
        cart.map((item) =>
          item.receta_id === receta_id && item.tipo === 'mixer_regalo'
            ? { ...item, cantidad }
            : item
        )
      )
      return
    }

    const item = cart.find((c) => c.receta_id === receta_id && c.tipo === tipo)
    if (
      item &&
      item.stock_disponible !== undefined &&
      cantidad > item.stock_disponible
    ) {
      toast({
        title: 'Stock insuficiente',
        description: `Solo hay ${item.stock_disponible} unidades disponibles`,
        variant: 'destructive'
      })
      return
    }

    setCart(
      cart.map((item) =>
        item.receta_id === receta_id && item.tipo === tipo
          ? { ...item, cantidad }
          : item
      )
    )
  }

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const totalRegalos = cart.filter(i => i.tipo === 'mixer_regalo').reduce((sum, i) => sum + i.cantidad, 0)

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
        description: 'No se selecciono una mesa',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const jornadaId = await jornadaService.getJornadaActualId()

      if (!jornadaId) {
        throw new Error(
          'No hay jornada activa. El administrador debe abrir una jornada.'
        )
      }

      const cuentaActiva = cuentaId
        ? { id: cuentaId }
        : await cuentaService.getCuentaActiva(mesaId)

      const items: OrderItem[] = cart.map((item) => ({
        receta_id: item.receta_id,
        cantidad: item.cantidad,
        nombre: item.nombre,
        precio: item.precio,
        tipo: item.tipo
      }))

      const nuevoPedido = await orderService.createOrder({
        mesero_id: user.id,
        mesa: mesaInfo?.numero || 'N/A',
        mesaId: mesaId,
        items,
        total,
        cuentaAbiertaId: cuentaActiva?.id || null,
        jornadaId: jornadaId,
        ayudadoPorId: ayudando ? user.id : undefined
      })

      if (cuentaActiva?.id) {
        try {
          await cuentaService.vincularPedidoACuenta(
            nuevoPedido.id,
            cuentaActiva.id
          )
        } catch (e) {
          console.error('Error al vincular pedido a cuenta:', e)
        }
      }

      toast({
        title: ayudando ? 'Ayuda registrada' : 'Pedido enviado',
        description: ayudando
          ? `Pedido agregado en ayuda a la mesa ${mesaInfo?.numero || 'N/A'}`
          : `Pedido de mesa ${mesaInfo?.numero || 'N/A'} enviado al bartender`,
        variant: 'success'
      })

      router.push('/mesero/orders')
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el pedido',
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
          <h2 className="text-2xl font-bold text-gray-900">
            No hay mesa seleccionada
          </h2>
          <p className="text-gray-500 mt-2">
            Por favor, selecciona una mesa primero
          </p>
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
          <p className="text-gray-500">Cargando productos...</p>
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
              {mesaInfo?.ubicacion || 'Sin ubicacion'} - Capacidad:{' '}
              {mesaInfo?.capacidad || 0} personas
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
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar en la categoria activa..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-3">
                  {TABS.map(tab => {
                    const activa = tabActiva === tab.key
                    const count = conteoTab(tab.key)
                    return (
                      <button
                        key={tab.key}
                        onClick={() => { setTabActiva(tab.key); setSearchTerm('') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                          activa
                            ? 'bg-orange-600 text-white'
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

                {tabActiva === 'cocteles' ? (
                  recetasFiltradas.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Martini className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No hay cocteles disponibles</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[420px] sm:h-[520px]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {recetasFiltradas.map(recipe => (
                          <div key={recipe.id} className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              className="justify-start h-auto py-2 px-3 text-left flex-1 min-w-0"
                              onClick={() => addToCart(recipe, 'receta')}
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {recipe.nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ${recipe.precio_venta}
                                </p>
                              </div>
                            </Button>
                            <BotonReceta
                              recetaId={recipe.id}
                              recetaNombre={recipe.nombre}
                              variant="icon"
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No hay productos en esta categoria</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[420px] sm:h-[520px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {productosFiltrados.map(producto => {
                        const esBot = esBotella(producto)
                        return (
                          <div key={producto.id} className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              className={`justify-start h-auto py-2 px-3 text-left flex-1 min-w-0 ${esBot ? 'border-amber-200' : ''}`}
                              onClick={() => esBot ? addBotellaToCart(producto) : addToCart(
                                {
                                  id: producto.id,
                                  nombre: producto.nombre,
                                  precio_venta: producto.precio_venta || 0,
                                  stock_actual: producto.stock_actual
                                },
                                'producto'
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="font-medium text-sm truncate">
                                    {producto.nombre}
                                  </p>
                                  <Badge className="text-[9px] bg-green-100 text-green-700 flex-shrink-0">
                                    {producto.stock_actual} disp.
                                  </Badge>
                                  {esBot && (
                                    <Badge className="text-[9px] bg-amber-100 text-amber-700 flex-shrink-0">
                                      <Gift className="h-2.5 w-2.5 mr-0.5" />
                                      +4
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  ${producto.precio_venta || 0}
                                </p>
                              </div>
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">Pedido</h2>
                  {totalRegalos > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      <Gift className="h-3 w-3 mr-1" />
                      {totalRegalos} regalo(s)
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {cart.map((item) => {
                    const esRegalo = item.tipo === 'mixer_regalo'
                    return (
                      <div
                        key={`${item.receta_id}-${item.tipo}`}
                        className="flex items-center justify-between border-b pb-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="font-medium text-sm truncate">
                              {item.nombre}
                            </p>
                            {esRegalo && (
                              <Badge className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0">
                                Regalo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-500">${item.precio}</p>
                            {!esRegalo && item.tipo && (
                              <Badge className="text-xs bg-gray-100 text-gray-500">
                                {item.tipo === 'receta' ? 'Receta' : 'Botella'}
                              </Badge>
                            )}
                            {!esRegalo && item.stock_disponible !== undefined && (
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
                            onClick={() =>
                              updateQuantity(
                                item.receta_id,
                                item.tipo || 'receta',
                                item.cantidad - 1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {item.cantidad}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${esRegalo ? 'text-gray-300' : ''}`}
                            onClick={() =>
                              updateQuantity(
                                item.receta_id,
                                item.tipo || 'receta',
                                item.cantidad + 1
                              )
                            }
                            disabled={esRegalo}
                            title={esRegalo ? 'Mixers de regalo limitados: agregalos desde Servicios' : ''}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500"
                            onClick={() =>
                              removeFromCart(item.receta_id, item.tipo || 'receta')
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {cart.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No hay productos agregados
                    </p>
                  )}
                </div>
                {totalRegalos > 0 && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-3">
                    Tienes {totalRegalos} mixer(s) de regalo. Para agregar mas, usa el tab Servicios (se cobran).
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-orange-600">${total.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0 || !hayCajaAbierta}
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
