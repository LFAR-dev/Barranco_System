'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, Wine, RefreshCw, Filter, 
  LayoutGrid, List, TrendingDown, AlertTriangle
} from 'lucide-react'
import { RendimientoBotella } from './RendimientoBotella'
import { createClient } from '@/lib/supabase/client'

interface ProductoBotella {
  id: string
  nombre: string
  marca: string
  volumen_ml: number
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  unidad_medida: string
  categoria_nombre?: string
  imagen_url?: string
}

interface RendimientoBotellasGridProps {
  onSelectProduct?: (producto: ProductoBotella) => void
}

export function RendimientoBotellasGrid({ onSelectProduct }: RendimientoBotellasGridProps) {
  const [productos, setProductos] = useState<ProductoBotella[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ProductoBotella[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [vista, setVista] = useState<'grid' | 'list'>('grid')
  const [filtro, setFiltro] = useState<'todas' | 'disponibles' | 'bajas' | 'agotadas'>('todas')
  const supabase = createClient()

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    aplicarFiltros()
  }, [searchTerm, filtro, productos])

  const cargarProductos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id, nombre, marca, volumen_ml, stock_actual, stock_minimo,
          stock_maximo, unidad_medida, imagen_url,
          categorias (nombre)
        `)
        .eq('activo', true)
        .eq('es_bebida_principal', true)
        .order('nombre')

      if (error) throw error

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        categoria_nombre: item.categorias?.nombre || 'Sin categoría'
      }))

      setProductos(formattedData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let resultado = [...productos]

    // Filtro por búsqueda
    if (searchTerm) {
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    switch (filtro) {
      case 'disponibles':
        resultado = resultado.filter(p => p.stock_actual > p.stock_minimo)
        break
      case 'bajas':
        resultado = resultado.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > 0)
        break
      case 'agotadas':
        resultado = resultado.filter(p => p.stock_actual <= 0)
        break
    }

    setFilteredProductos(resultado)
  }

  // Estadísticas
  const stats = {
    total: productos.length,
    disponibles: productos.filter(p => p.stock_actual > p.stock_minimo).length,
    bajas: productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > 0).length,
    agotadas: productos.filter(p => p.stock_actual <= 0).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`cursor-pointer transition-all ${filtro === 'todas' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFiltro('todas')}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wine className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${filtro === 'disponibles' ? 'ring-2 ring-emerald-500' : ''}`}
              onClick={() => setFiltro('disponibles')}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Wine className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Disponibles</p>
              <p className="text-lg font-bold text-emerald-600">{stats.disponibles}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${filtro === 'bajas' ? 'ring-2 ring-amber-500' : ''}`}
              onClick={() => setFiltro('bajas')}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Stock Bajo</p>
              <p className="text-lg font-bold text-amber-600">{stats.bajas}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${filtro === 'agotadas' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setFiltro('agotadas')}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Agotadas</p>
              <p className="text-lg font-bold text-red-600">{stats.agotadas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y vista */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar botella por nombre o marca..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={vista === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVista('grid')}
            className={vista === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={vista === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVista('list')}
            className={vista === 'list' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={cargarProductos}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de botellas */}
      {filteredProductos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wine className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No se encontraron botellas</p>
            <p className="text-sm text-gray-400 mt-1">
              Intenta con otro término de búsqueda o cambia el filtro
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          vista === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {filteredProductos.map((producto) => (
            <div
              key={producto.id}
              onClick={() => onSelectProduct?.(producto)}
              className={onSelectProduct ? 'cursor-pointer' : ''}
            >
              <RendimientoBotella
                productoId={producto.id}
                nombreProducto={producto.nombre}
                marca={producto.marca}
                volumenMl={producto.volumen_ml}
                stockActual={producto.stock_actual}
                stockMaximo={producto.stock_maximo || 10}
                stockMinimo={producto.stock_minimo || 2}
                size={vista === 'list' ? 'sm' : 'md'}
              />
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      {filteredProductos.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          Mostrando {filteredProductos.length} de {productos.length} botellas
        </p>
      )}
    </div>
  )
}
