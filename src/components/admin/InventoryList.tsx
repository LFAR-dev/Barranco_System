'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search, Plus, Edit, Trash2, Eye, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, Package, ArrowLeft, RefreshCw,
  ImageIcon, QrCode, ScanLine, Activity
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { productService, Product } from '@/lib/services/productService'
import ProductForm from '@/components/admin/ProductForm'
import { ProductQRCode } from '@/components/admin/ProductQRCode'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface InventoryListProps {
  categoriaFiltro?: string
}

export default function InventoryList({ categoriaFiltro = 'tequila' }: InventoryListProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date())
  const [pulso, setPulso] = useState(false)
  const canalRef = useRef<any>(null)

  const fetchProducts = async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await productService.getAll()
      setProducts(data)
      setUltimaActualizacion(new Date())
    } catch (error) {
      if (!silencioso) {
        toast({
          title: 'Error',
          description: 'Error al cargar productos',
          variant: 'destructive'
        })
      }
    } finally {
      if (!silencioso) setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Realtime: escuchar cambios en productos y movimientos_inventario
  useEffect(() => {
    const nombreCanal = `admin_inventory_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const canal = supabase
      .channel(nombreCanal)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => {
          fetchProducts(true)
          setPulso(true)
          setTimeout(() => setPulso(false), 1200)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movimientos_inventario' },
        () => {
          fetchProducts(true)
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
  }, [])

  const handleDelete = async () => {
    if (!productToDelete) return
    try {
      await productService.delete(productToDelete)
      toast({
        title: 'Producto eliminado',
        description: 'El producto ha sido desactivado correctamente',
        variant: 'success'
      })
      fetchProducts()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el producto',
        variant: 'destructive'
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleViewQR = (product: Product) => {
    setQrProduct(product)
    setIsQRDialogOpen(true)
  }

  const getStockPercentage = (actual: number, maximo: number) => {
    if (maximo === 0) return 0
    return Math.min((actual / maximo) * 100, 100)
  }

  const getStockStatus = (actual: number, minimo: number, maximo: number) => {
    const percentage = getStockPercentage(actual, maximo || 10)
    if (actual <= minimo) return { label: 'CRITICO', color: 'bg-red-500', textColor: 'text-red-600', icon: AlertCircle }
    if (percentage < 30) return { label: 'BAJO', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: TrendingDown }
    if (percentage > 85) return { label: 'COMPLETO', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircle }
    return { label: 'NORMAL', color: 'bg-blue-500', textColor: 'text-blue-600', icon: Package }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoriaFiltro === 'todos' ||
      (product.categoria_nombre || '').toLowerCase() === categoriaFiltro.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const segundosDesdeActualizacion = Math.floor(
    (Date.now() - ultimaActualizacion.getTime()) / 1000
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="text-sm text-gray-500">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: estado realtime + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            pulso ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <Activity className={`h-3.5 w-3.5 ${pulso ? 'animate-pulse' : ''}`} />
            <span>{pulso ? 'Actualizando...' : 'En vivo'}</span>
          </div>
          <span className="text-xs text-gray-400">
            Ultima actualizacion: hace {segundosDesdeActualizacion}s
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {filteredProducts.length} productos
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/inventory/scan">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <ScanLine className="h-4 w-4 mr-1.5" />
              Escanear QR
            </Button>
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setSelectedProduct(null)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>
              <ProductForm
                product={selectedProduct}
                onSuccess={() => {
                  setIsDialogOpen(false)
                  setSelectedProduct(null)
                  fetchProducts()
                }}
                onCancel={() => {
                  setIsDialogOpen(false)
                  setSelectedProduct(null)
                }}
              />
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" onClick={() => fetchProducts()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar productos por nombre o marca..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const maxStock = product.stock_maximo || 10
          const percentage = getStockPercentage(product.stock_actual, maxStock)
          const status = getStockStatus(product.stock_actual, product.stock_minimo, maxStock)
          const StatusIcon = status.icon

          return (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden border-t-4 border-t-amber-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.imagen_url ? (
                      <img src={product.imagen_url} alt={product.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{product.nombre}</h3>
                        <p className="text-sm text-gray-500">{product.marca || 'Sin marca'}</p>
                      </div>
                      <Badge className={`${status.color} text-white ml-2 shrink-0 text-[10px]`}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{product.presentacion}</span>
                      {product.volumen_ml > 0 && (
                        <>
                          <span>·</span>
                          <span>{product.volumen_ml}ml</span>
                        </>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-medium text-gray-700">
                          {product.stock_actual} / {maxStock}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={percentage}
                          className={`h-2 ${
                            status.label === 'CRITICO' ? 'bg-red-200' :
                            status.label === 'BAJO' ? 'bg-yellow-200' :
                            status.label === 'COMPLETO' ? 'bg-green-200' :
                            'bg-blue-200'
                          }`}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-1">
                          <span className="text-[8px] font-bold text-white drop-shadow">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`h-3 w-3 ${status.textColor}`} />
                        <span className={`text-xs font-medium ${status.textColor}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-emerald-50"
                          onClick={() => handleViewQR(product)}
                          title="Ver codigo QR"
                        >
                          <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedProduct(product)
                            setIsDialogOpen(true)
                          }}
                          title="Editar producto"
                        >
                          <Edit className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-red-50"
                          onClick={() => {
                            setProductToDelete(product.id)
                            setIsDeleteDialogOpen(true)
                          }}
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            No hay productos en la categoria {categoriaFiltro === 'todos' ? 'seleccionada' : categoriaFiltro}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Prueba con otra categoria o cambia el filtro arriba
          </p>
        </div>
      )}

      {/* Modal de Eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion desactivara el producto. Podras reactivarlo mas tarde si lo deseas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de QR */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              Codigo QR del Producto
            </DialogTitle>
          </DialogHeader>
          {qrProduct && (
            <ProductQRCode
              producto={{
                id: qrProduct.id,
                nombre: qrProduct.nombre,
                qr_token: qrProduct.qr_token,
                categoria_nombre: qrProduct.categoria_nombre,
                unidad_medida: qrProduct.unidad_medida,
                marca: qrProduct.marca
              }}
              onClose={() => setIsQRDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
