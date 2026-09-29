'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Package, ScanLine, Wine, LayoutGrid, 
  FlaskConical, Boxes, ChefHat
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InventoryList from '@/components/admin/InventoryList'
import { RendimientoBotellasGrid } from '@/components/admin/RendimientoBotellasGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('todas')

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
                Control de productos, rendimiento de botellas y códigos QR
              </p>
            </div>
          </div>
          <Link href="/admin/inventory/scan">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <ScanLine className="h-4 w-4 mr-2" />
              Escanear QR
            </Button>
          </Link>
        </div>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto p-1">
            <TabsTrigger value="todas" className="flex items-center gap-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Boxes className="h-4 w-4" />
              <span className="hidden sm:inline">Todos los Productos</span>
              <span className="sm:hidden">Todos</span>
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

          {/* Tab: Todos los productos */}
          <TabsContent value="todas" className="space-y-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Boxes className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Vista completa del inventario</h3>
                    <p className="text-sm text-gray-500">
                      Todos los productos con edición, QR y gestión
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-700">Vista General</Badge>
              </CardContent>
            </Card>
            <InventoryList />
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
                      Visualiza cuántos shots y bebidas puedes preparar con cada botella
                    </p>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700">Análisis visual</Badge>
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
                <Badge className="bg-emerald-100 text-emerald-700">Próximamente</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-12 text-center">
                <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Vista en desarrollo</p>
                <p className="text-sm text-gray-400 mt-1">
                  Pronto podrás gestionar insumos y jarabes desde aquí
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
