'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Package, Wine, LayoutGrid,
  FlaskConical, Boxes, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import InventoryList from '@/components/admin/InventoryList'
import { RendimientoBotellasGrid } from '@/components/admin/RendimientoBotellasGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

const CATEGORIAS_VENDIBLES = [
  'todos',
  'tequila',
  'whisky',
  'vodka',
  'ron',
  'mezcal',
  'ginebra',
  'licor',
  'champagne',
  'cerveza',
  'agua',
  'refresco',
  'shots',
  'insumo',
  'garnish'
]

export default function InventoryPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('todas')
  const [categoriaFiltro, setCategoriaFiltro] = useState('tequila')
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>(CATEGORIAS_VENDIBLES)

  useEffect(() => {
    cargarCategorias()
  }, [])

  const cargarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nombre')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      const nombres = (data || []).map((c: any) => c.nombre)
      // Mezclar con la lista fija para asegurar las comunes, y ordenar
      const combinadas = Array.from(new Set(['todos', ...CATEGORIAS_VENDIBLES.slice(1), ...nombres]))
      setCategoriasDisponibles(combinadas)
    } catch (error) {
      console.error('Error al cargar categorias:', error)
    }
  }

  const labelCategoria = (cat: string) => {
    if (cat === 'todos') return 'Todas las categorias'
    return cat.charAt(0).toUpperCase() + cat.slice(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Inventario
              </h1>
              <p className="text-sm text-gray-500">
                Control de productos, rendimiento de botellas y codigos QR
              </p>
            </div>
          </div>
        </div>

        {/* Selector de categoria (global para todos los tabs) */}
        <Card className="mb-4 border-l-4 border-l-amber-500">
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-600" />
              <Label className="text-sm font-medium">Filtrar por categoria:</Label>
            </div>
            <select
              className="flex-1 max-w-xs px-3 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
            >
              {categoriasDisponibles.map(cat => (
                <option key={cat} value={cat}>
                  {labelCategoria(cat)}
                </option>
              ))}
            </select>
            {categoriaFiltro === 'tequila' && (
              <Badge className="bg-amber-100 text-amber-700 self-start sm:self-center">
                Vista por defecto
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto p-1">
            <TabsTrigger value="todas" className="flex items-center gap-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Boxes className="h-4 w-4" />
              <span className="hidden sm:inline">Productos</span>
              <span className="sm:hidden">Prod.</span>
            </TabsTrigger>
            <TabsTrigger value="botellas" className="flex items-center gap-2 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Wine className="h-4 w-4" />
              <span className="hidden sm:inline">Rendimiento Botellas</span>
              <span className="sm:hidden">Botellas</span>
            </TabsTrigger>
            <TabsTrigger value="insumos" className="flex items-center gap-2 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Insumos</span>
              <span className="sm:hidden">Insumos</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Productos */}
          <TabsContent value="todas" className="space-y-4">
            <InventoryList categoriaFiltro={categoriaFiltro} />
          </TabsContent>

          {/* Tab: Rendimiento de botellas */}
          <TabsContent value="botellas" className="space-y-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Wine className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Rendimiento de Botellas</h3>
                    <p className="text-sm text-gray-500">
                      Visualiza cuantos shots y bebidas puedes preparar con cada botella
                    </p>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700">Analisis visual</Badge>
              </CardContent>
            </Card>
            <RendimientoBotellasGrid />
          </TabsContent>

          {/* Tab: Insumos */}
          <TabsContent value="insumos" className="space-y-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FlaskConical className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Insumos y Jarabes</h3>
                    <p className="text-sm text-gray-500">
                      Control de jarabes, mezcladores y complementos
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">Proximamente</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-12 text-center">
                <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Vista en desarrollo</p>
                <p className="text-sm text-gray-400 mt-1">
                  Pronto podras gestionar insumos y jarabes desde aqui
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
