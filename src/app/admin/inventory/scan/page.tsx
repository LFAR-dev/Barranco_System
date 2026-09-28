'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QRScanner } from '@/components/admin/QRScanner'
import { productService, Product } from '@/lib/services/productService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function ScanQRPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [producto, setProducto] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const handleScan = async (token: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await productService.getByQrToken(token)
      if (!data) {
        setError('Producto no encontrado. Verifica el código QR.')
        return
      }
      setProducto(data)
      toast({
        title: '✅ Producto encontrado',
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
        description: 'Ingresa una cantidad válida mayor a 0',
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
        title: '✅ Movimiento registrado',
        description: `${tipoMovimiento.toUpperCase()} de ${cant} ${producto.unidad_medida || 'unidades'}`,
        variant: 'success'
      })

      // Recargar producto
      const updated = await productService.getById(producto.id)
      setProducto(updated)
      setCantidad('')
      setMotivo('')
      setObservaciones('')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Escanear Producto
            </h1>
            <p className="text-sm text-gray-500">
              Escanea el código QR para registrar movimientos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Escáner */}
          <div>
            <QRScanner onScan={handleScan} />

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Información del producto */}
          <div>
            {producto ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    {producto.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Stock Actual</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {producto.stock_actual} {getUnidadLabel()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Stock Mínimo</p>
                      <p className="text-xl font-bold text-gray-900">
                        {producto.stock_minimo} {getUnidadLabel()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">Categoría</p>
                      <p className="font-medium">{producto.categoria_nombre}</p>
                    </div>
                  </div>

                  <Tabs value={tipoMovimiento} onValueChange={(v) => setTipoMovimiento(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="entrada">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Entrada
                      </TabsTrigger>
                      <TabsTrigger value="salida">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        Salida
                      </TabsTrigger>
                      <TabsTrigger value="ajuste">
                        <Settings className="h-4 w-4 mr-1" />
                        Ajuste
                      </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="cantidad">
                          {tipoMovimiento === 'ajuste' ? 'Conteo Físico' : 'Cantidad'}
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

                      <div className="space-y-2">
                        <Label htmlFor="motivo">Motivo</Label>
                        <Input
                          id="motivo"
                          placeholder="Ej: Compra, merma, conteo..."
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
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

                      <Button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={loading}
                      >
                        {loading ? 'Procesando...' : `Registrar ${tipoMovimiento}`}
                      </Button>
                    </form>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    Escanea un código QR para comenzar
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    También puedes ingresar el código manualmente
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
