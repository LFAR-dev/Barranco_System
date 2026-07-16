'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Package,
  ArrowLeft,
  RefreshCw,
  Filter,
  ImageIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { productService, Product } from '@/lib/services/productService'
import { categoryService, Category } from '@/lib/services/categoryService'
import ProductForm from '@/components/admin/ProductForm'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('todos')
  const [categories, setCategories] = useState<string[]>(['todos'])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const data = await productService.getAll()
      setProducts(data)
      const uniqueCategories = ['todos', ...new Set(data.map(p => p.categoria_nombre).filter(Boolean))]
      setCategories(uniqueCategories as string[])
    } catch (error) {
      alert('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleDelete = async () => {
    if (!productToDelete) return
    try {
      await productService.delete(productToDelete)
      alert('Producto eliminado correctamente')
      fetchProducts()
    } catch (error) {
      alert('Error al eliminar el producto')
    } finally {
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const getStockPercentage = (actual: number, maximo: number) => {
    if (maximo === 0) return 0
    return Math.min((actual / maximo) * 100, 100)
  }

  const getStockStatus = (actual: number, minimo: number, maximo: number) => {
    const percentage = getStockPercentage(actual, maximo || 10)
    if (actual <= minimo) return { label: 'CRÍTICO', color: 'bg-red-500', textColor: 'text-red-600', icon: AlertCircle }
    if (percentage < 30) return { label: 'BAJO', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: TrendingDown }
    if (percentage > 85) return { label: 'COMPLETO', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircle }
    return { label: 'NORMAL', color: 'bg-blue-500', textColor: 'text-blue-600', icon: Package }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'todos' || product.categoria_nombre === filterCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
              <p className="text-sm text-gray-500">Gestiona todos los productos del bar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setSelectedProduct(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
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
            <Button variant="outline" onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'todos' ? 'Todas las categorías' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

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
                            <span>•</span>
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
                              status.label === 'CRÍTICO' ? 'bg-red-200' :
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
                            className="h-7 w-7 p-0 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedProduct(product)
                              setIsDialogOpen(true)
                            }}
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
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron productos</p>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el producto. Podrás reactivarlo más tarde si lo deseas.
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
    </div>
  )
}
