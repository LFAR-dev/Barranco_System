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
  RefreshCw,
  Filter,
  Wine,
  Beer,
  Coffee,
  GlassWater,
  Leaf,
  Apple,
  Utensils,
  Droplet
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'

// Mapeo de iconos por categoría
const categoryIcons: Record<string, any> = {
  'tequila': Wine,
  'whisky': Beer,
  'vodka': GlassWater,
  'ron': Wine,
  'mezcal': GlassWater,
  'ginebra': GlassWater,
  'licor': GlassWater,
  'champagne': GlassWater,
  'cerveza': Beer,
  'refresco': Droplet,
  'insumo': Package,
  'shots': GlassWater,
  'pack': Package,
  'material': Utensils,
}

// Colores por categoría
const categoryColors: Record<string, string> = {
  'tequila': 'from-amber-500 to-amber-700',
  'whisky': 'from-orange-600 to-orange-800',
  'vodka': 'from-blue-400 to-blue-600',
  'ron': 'from-yellow-500 to-yellow-700',
  'mezcal': 'from-emerald-500 to-emerald-700',
  'ginebra': 'from-purple-400 to-purple-600',
  'licor': 'from-red-400 to-red-600',
  'champagne': 'from-yellow-300 to-yellow-500',
  'cerveza': 'from-amber-400 to-amber-600',
  'refresco': 'from-cyan-400 to-cyan-600',
  'insumo': 'from-slate-400 to-slate-600',
  'garnish': 'from-green-400 to-green-600',
  'shots': 'from-pink-400 to-pink-600',
  'pack': 'from-indigo-400 to-indigo-600',
  'material': 'from-gray-400 to-gray-600',
}

interface Product {
  id: string
  nombre: string
  marca: string
  categoria_id: string
  presentacion: string
  volumen_ml: number
  costo_unitario: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  activo: boolean
  imagen_url?: string
  categoria_nombre?: string
}

export default function InventoryView() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('todos')
  const [categories, setCategories] = useState<string[]>(['todos'])

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
      const uniqueCategories = ['todos', ...new Set(formattedData.map((p: any) => p.categoria_nombre).filter(Boolean))]
      setCategories(uniqueCategories as string[])
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
    const percentage = getStockPercentage(actual, maximo || 10)
    if (actual <= minimo) return { label: 'CRÍTICO', color: 'bg-red-500', textColor: 'text-red-600', icon: AlertCircle, bg: 'bg-red-50' }
    if (percentage < 30) return { label: 'BAJO', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: TrendingDown, bg: 'bg-yellow-50' }
    if (percentage > 85) return { label: 'COMPLETO', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircle, bg: 'bg-green-50' }
    return { label: 'NORMAL', color: 'bg-blue-500', textColor: 'text-blue-600', icon: Package, bg: 'bg-blue-50' }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'todos' || product.categoria_nombre === filterCategory
    return matchesSearch && matchesCategory
  })

  // Agrupar por categoría
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const cat = product.categoria_nombre || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
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
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
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

      {/* Lista de productos agrupada por categoría */}
      {Object.entries(groupedProducts).map(([category, items]) => {
        const Icon = categoryIcons[category.toLowerCase()] || Package
        const color = categoryColors[category.toLowerCase()] || 'from-gray-500 to-gray-700'
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
              <span className="text-sm text-gray-400">({items.length} productos)</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((product) => {
                const maxStock = product.stock_maximo || 10
                const percentage = getStockPercentage(product.stock_actual, maxStock)
                const status = getStockStatus(product.stock_actual, product.stock_minimo, maxStock)
                const StatusIcon = status.icon
                const ProductIcon = categoryIcons[product.categoria_nombre?.toLowerCase() || ''] || Package

                return (
                  <Card key={product.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden border-t-4 border-t-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icono del producto */}
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shrink-0`}>
                          <ProductIcon className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{product.nombre}</h4>
                              <p className="text-xs text-gray-500">{product.marca || 'Sin marca'}</p>
                            </div>
                            <Badge className={`${status.color} text-white ml-1 shrink-0 text-[10px]`}>
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
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
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
          </div>
        )
      })}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}
    </div>
  )
}
