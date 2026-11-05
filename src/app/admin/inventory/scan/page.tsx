'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Package, AlertCircle, CheckCircle, TrendingUp,
  TrendingDown, Settings, Loader2, History, RefreshCw,
  UserCircle, Clock, Filter, Activity, ScanLine
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { QRScanner } from '@/components/admin/QRScanner'
import { productService, Product, MovimientoInventario } from '@/lib/services/productService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'
type RangoFecha = 'hoy' | '7d' | '30d' | 'todo'

interface MovimientoConProducto extends MovimientoInventario {
  productos?: { nombre: string } | null
}

export default function ScanQRPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [producto, setProducto] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>([])
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroRango, setFiltroRango] = useState<RangoFecha>('hoy')
  const [pulso, setPulso] = useState(false)

  const canalRef = useRef<any>(null)

  // Cargar historial al montar
  useEffect(() => {
    cargarMovimientos()
  }, [filtroTipo, filtroRango])

  // Realtime en movimientos_inventario
  useEffect(() => {
    const nombreCanal = `scan_mov_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const canal = supabase
      .channel(nombreCanal)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movimientos_inventario' },
        () => {
          cargarMovimientos(true)
          setPulso(true)
          setTimeout(() => setPulso(false), 1200)
        }
      )
      .subscribe()

    canalRef.current = canal

    return () => {
      if (canalRef.current) {
        supabase.removeChannel(canalRef.current)
      }
    }
  }, [filtroTipo, filtroRango])

  const cargarMovimientos = async (silencioso = false) => {
    if (!silencioso) setLoadingMovimientos(true)
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select(`
          *,
          usuarios (nombre, apellido),
          productos (nombre)
        `)
        .order('fecha', { ascending: false })
        .limit(200)

      if (error) throw error

      let lista = (data || []) as any[]

      // Filtro por tipo
      if (filtroTipo !== 'todos') {
        lista = lista.filter(m => m.tipo_movimiento === filtroTipo)
      }

      // Filtro por rango de fecha
      if (filtroRango !== 'todo') {
        const ahora = new Date()
        let limite: Date
        if (filtroRango === 'hoy') {
          limite = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
        } else if (filtroRango === '7d') {
          limite = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
        } else {
          limite = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
        lista = lista.filter(m => new Date(m.fecha) >= limite)
      }

      setMovimientos(lista.slice(0, 50))
    } catch (e) {
      console.error('Error al cargar movimientos:', e)
    } finally {
      if (!silencioso) setLoadingMovimientos(false)
    }
  }

  const handleScan = async (token: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await productService.getByQrToken(token)
      if (!data) {
        setError('Producto no encontrado. Verifica el codigo QR.')
        return
      }
      setProducto(data)
      toast({
        title: 'Producto encontrado',
        description: data.nombre,
        variant: 'success'
      })
    } catch (err: any) {
      setError(err.message || 'Error al buscar el producto')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!producto || !user) return

    const cant = parseFloat(cantidad)
    if (isNaN(cant) || cant <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa una cantidad valida mayor a 0',
        variant: 'destructive'
      })
      return
    }

    if (!motivo || motivo.trim() === '') {
      toast({
        title: 'Motivo requerido',
        description: 'Indica el motivo del movimiento',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await productService.registrarMovimiento({
        producto_id: producto.id,
        tipo_movimiento: tipoMovimiento,
        cantidad: cant,
        motivo,
        observaciones,
        usuario_id: user.id
      })

      toast({
        title: 'Movimiento registrado',
        description: `${tipoMovimiento.toUpperCase()} de ${cant} ${producto.unidad_medida || 'unidades'}`,
        variant: 'success'
      })

      const updated = await productService.getById(producto.id)
      setProducto(updated)
      setCantidad('')
      setMotivo('')
      setObservaciones('')
      cargarMovimientos(true)
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al registrar el movimiento',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calcularNuevoStock = () => {
    if (!producto) return 0
    const cant = parseFloat(cantidad) || 0
    if (tipoMovimiento === 'entrada') return producto.stock_actual + cant
    if (tipoMovimiento === 'salida') return Math.max(0, producto.stock_actual - cant)
    return cant
  }

  const getUnidadLabel = () => {
    return producto?.unidad_medida || 'unidades'
  }

  const nombreUsuario = (m: any): string => {
    if (m.usuarios?.nombre) {
      return `${m.usuarios.nombre} ${m.usuarios.apellido || ''}`.trim()
    }
    return 'Sin usuario'
  }

  const getIconoTipo = (tipo: string) => {
    if (tipo === 'entrada') return <TrendingUp className="h-3 w-3" />
    if (tipo === 'salida') return <TrendingDown className="h-3 w-3" />
    return <Settings className="h-3 w-3" />
  }

  const getColorTipo = (tipo: string): string => {
    if (tipo === 'entrada') return 'bg-emerald-100 text-emerald-700'
    if (tipo === 'salida') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  const porcentajeStock = () => {
    if (!producto) return 0
    const max = producto.stock_maximo || 10
    if (max === 0) return 0
    return Math.min((producto.stock_actual / max) * 100, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/inventory">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ScanLine className="h-6 w-6 text-emerald-600" />
                Escaner de Productos
              </h1>
              <p className="text-sm text-gray-500">
                Escanea el codigo QR para registrar entradas, salidas o ajustes
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            pulso ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <Activity className={`h-3.5 w-3.5 ${pulso ? 'animate-pulse' : ''}`} />
            <span>{pulso ? 'Actualizando...' : 'En vivo'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Escaner */}
          <div>
            <QRScanner onScan={handleScan} />

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info del producto escaneado + formulario */}
          <div>
            {loading && !producto ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 text-emerald-600 mx-auto animate-spin" />
                  <p className="text-sm text-gray-500 mt-3">Buscando producto...</p>
                </CardContent>
              </Card>
            ) : producto ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    {producto.nombre}
                  </CardTitle>
                  {producto.marca && (
                    <p className="text-sm text-gray-500">{producto.marca}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info del producto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Stock actual</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {producto.stock_actual} {getUnidadLabel()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Stock minimo</p>
                      <p className="text-xl font-bold text-gray-900">
                        {producto.stock_minimo} {getUnidadLabel()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Categoria</p>
                      <p className="font-medium text-sm">{producto.categoria_nombre}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Presentacion</p>
                      <p className="font-medium text-sm">{producto.presentacion}</p>
                    </div>
                  </div>

                  {/* Barra de stock */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Nivel de stock</span>
                      <span className="font-medium">{Math.round(porcentajeStock())}%</span>
                    </div>
                    <Progress value={porcentajeStock()} className="h-2" />
                  </div>

                  {/* Formulario */}
                  <div className="pt-3 border-t">
                    <Tabs value={tipoMovimiento} onValueChange={(v) => setTipoMovimiento(v as TipoMovimiento)}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="entrada" className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Entrada
                        </TabsTrigger>
                        <TabsTrigger value="salida" className="flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5" />
                          Salida
                        </TabsTrigger>
                        <TabsTrigger value="ajuste" className="flex items-center gap-1">
                          <Settings className="h-3.5 w-3.5" />
                          Ajuste
                        </TabsTrigger>
                      </TabsList>

                      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cantidad" className="text-xs">
                            {tipoMovimiento === 'ajuste' ? 'Conteo fisico' : 'Cantidad'}
                          </Label>
                          <Input
                            id="cantidad"
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={cantidad}
                            onChange={(e) => setCantidad(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="motivo" className="text-xs">Motivo</Label>
                          <Input
                            id="motivo"
                            placeholder="Ej: Compra, merma, conteo..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="observaciones" className="text-xs">
                            Observaciones (opcional)
                          </Label>
                          <Input
                            id="observaciones"
                            placeholder="Notas adicionales"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                          />
                        </div>

                        {cantidad && (
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                            <p className="text-xs text-emerald-600">Stock resultante:</p>
                            <p className="text-2xl font-bold text-emerald-700">
                              {calcularNuevoStock()} {getUnidadLabel()}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <UserCircle className="h-3.5 w-3.5" />
                          <span>
                            Se registrara a nombre de{' '}
                            <strong>{user?.nombre} {user?.apellido}</strong>
                          </span>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Registrar {tipoMovimiento}
                            </>
                          )}
                        </Button>
                      </form>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    Escanea un codigo QR para comenzar
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Tambien puedes ingresar el codigo manualmente
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Historial de movimientos */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-blue-600" />
                Historial de movimientos
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="entrada">Solo entradas</SelectItem>
                    <SelectItem value="salida">Solo salidas</SelectItem>
                    <SelectItem value="ajuste">Solo ajustes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroRango} onValueChange={(v) => setFiltroRango(v as RangoFecha)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoy">Hoy</SelectItem>
                    <SelectItem value="7d">Ultimos 7 dias</SelectItem>
                    <SelectItem value="30d">Ultimos 30 dias</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cargarMovimientos()}
                  disabled={loadingMovimientos}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingMovimientos ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMovimientos ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                <p className="text-sm text-gray-500 mt-3">Cargando movimientos...</p>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sin movimientos en este rango</p>
                <p className="text-sm text-gray-400 mt-1">
                  Registra el primero escaneando un producto
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 font-medium text-xs text-gray-600">Fecha</th>
                      <th className="text-left p-2 font-medium text-xs text-gray-600">Producto</th>
                      <th className="text-center p-2 font-medium text-xs text-gray-600">Tipo</th>
                      <th className="text-right p-2 font-medium text-xs text-gray-600">Cant.</th>
                      <th className="text-right p-2 font-medium text-xs text-gray-600 hidden sm:table-cell">Antes</th>
                      <th className="text-right p-2 font-medium text-xs text-gray-600 hidden sm:table-cell">Despues</th>
                      <th className="text-left p-2 font-medium text-xs text-gray-600 hidden md:table-cell">Usuario</th>
                      <th className="text-left p-2 font-medium text-xs text-gray-600 hidden lg:table-cell">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(m.fecha).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2 text-xs font-medium text-gray-900">
                          {m.productos?.nombre || '-'}
                        </td>
                        <td className="p-2 text-center">
                          <Badge className={`${getColorTipo(m.tipo_movimiento)} text-[10px]`}>
                            {getIconoTipo(m.tipo_movimiento)}
                            <span className="ml-1 uppercase">{m.tipo_movimiento}</span>
                          </Badge>
                        </td>
                        <td className={`p-2 text-right text-xs font-bold ${
                          m.cantidad_movimiento < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {m.cantidad_movimiento > 0 ? '+' : ''}{m.cantidad_movimiento}
                        </td>
                        <td className="p-2 text-right text-xs text-gray-600 hidden sm:table-cell">
                          {m.stock_anterior}
                        </td>
                        <td className="p-2 text-right text-xs font-medium text-gray-900 hidden sm:table-cell">
                          {m.stock_posterior}
                        </td>
                        <td className="p-2 text-xs text-gray-600 hidden md:table-cell">
                          {nombreUsuario(m)}
                        </td>
                        <td className="p-2 text-xs text-gray-500 hidden lg:table-cell">
                          {m.motivo || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
