'use client'

import { useState, useEffect } from 'react'
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
  DollarSign,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  nombre: string
  marca: string
  categoria: string
  presentacion: string
  volumen_ml: number
  costo_unitario: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  activo: boolean
  categoria_nombre?: string
}

export default function InventoryList() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('todos')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categorias (
            nombre
          )
        `)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      const formattedData = data?.map((item: any) => ({
        ...item,
        categoria_nombre: item.categorias?.nombre || 'Sin categoría'
      })) || []

      setProducts(formattedData)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockPercentage = (actual: number, maximo: number) => {
    if (maximo === 0) return 0
    return Math.min((actual / maximo) * 100, 100)
  }

  const getStockStatus = (actual: number, minimo: number, maximo: number) => {
    const percentage = getStockPercentage(actual, maximo)
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

  // Categorías únicas para el filtro
  const categories = ['todos', ...new Set(products.map(p => p.categoria_nombre).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
          <p className="text-gray-500 text-sm">Gestiona todos los productos del bar</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          className="px-4 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat ?? 'todos'} value={cat ?? 'todos'}>
              {(cat ?? 'todos') === 'todos' ? 'Todas las categorías' : String(cat).charAt(0).toUpperCase() + String(cat).slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const percentage = getStockPercentage(product.stock_actual, product.stock_maximo || 10)
          const status = getStockStatus(product.stock_actual, product.stock_minimo, product.stock_maximo || 10)
          const StatusIcon = status.icon

          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{product.nombre}</h3>
                    <p className="text-sm text-gray-500">{product.marca || 'Sin marca'}</p>
                  </div>
                  <Badge className={`${status.color} text-white ml-2 shrink-0`}>
                    {status.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                  <span>{product.presentacion}</span>
                  <span>•</span>
                  <span>{product.volumen_ml}ml</span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Stock actual</span>
                    <span className="font-medium">
                      {product.stock_actual} / {product.stock_maximo || 10} unidades
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className={`h-3 ${
                        status.label === 'CRÍTICO' ? 'bg-red-200' :
                        status.label === 'BAJO' ? 'bg-yellow-200' :
                        status.label === 'COMPLETO' ? 'bg-green-200' :
                        'bg-blue-200'
                      }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-4 w-4 ${status.textColor}`} />
                    <span className={`text-sm font-medium ${status.textColor}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
  )
}
