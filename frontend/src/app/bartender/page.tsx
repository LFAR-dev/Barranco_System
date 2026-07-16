'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { recipeService } from '@/lib/services/recipeService'
import {
  Search, Bell, LogOut, TrendingUp, DollarSign, AlertTriangle,
  Coffee, Plus, Clock, Menu, Eye, Utensils
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { wasteService } from '@/lib/services/wasteService'

export default function BartenderDashboardPage() {
  const { user, logout } = useAuth()
  const supabase = createClient()
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [bartenderId, setBartenderId] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [shiftStats, setShiftStats] = useState({ ventas: 0, mermas: 0, bebidas: 0, eficiencia: 0 })
  const [showWasteDialog, setShowWasteDialog] = useState(false)
  const [wasteData, setWasteData] = useState({ producto_id: '', cantidad: 0, motivo: 'caida', descripcion: '', tipo: 'no_esperada' })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: bartenderData } = await supabase
        .from('bartenders')
        .select('id')
        .eq('usuario_id', user?.id)
        .maybeSingle()
      
      if (bartenderData) setBartenderId(bartenderData.id)

      const recipesData = await recipeService.getAll()
      setRecipes(recipesData || [])

      const { data: productsData } = await supabase
        .from('productos')
        .select('id, nombre, marca')
        .eq('activo', true)
        .order('nombre')
      setProducts(productsData || [])

      await loadStats()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!bartenderId) return
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: ventasData } = await supabase
        .from('ventas')
        .select('total')
        .eq('bartender_id', bartenderId)
        .gte('fecha_hora', `${today}T00:00:00`)

      const { data: mermasData } = await supabase
        .from('mermas')
        .select('valor_perdido')
        .eq('bartender_id', bartenderId)
        .gte('fecha', `${today}T00:00:00`)

      const ventas = ventasData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const mermas = mermasData?.reduce((sum, m) => sum + (m.valor_perdido || 0), 0) || 0
      const bebidas = ventasData?.length || 0
      const eficiencia = bebidas > 0 ? (ventas / bebidas) : 0

      setShiftStats({ ventas, mermas, bebidas, eficiencia })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handlePrepareDrink = async (recipe: any) => {
    if (!bartenderId) {
      alert('No tienes un perfil de bartender asignado')
      return
    }
    try {
      const { error } = await supabase
        .from('ventas')
        .insert([{
          receta_id: recipe.id,
          bartender_id: bartenderId,
          total: recipe.precio_venta,
          metodo_pago: 'efectivo',
          estado: 'completada'
        }])

      if (error) throw error
      await loadStats()
      alert(`✅ ${recipe.nombre} preparada correctamente`)
    } catch (error) {
      console.error('Error preparing drink:', error)
      alert('Error al preparar la bebida')
    }
  }

  const handleReportWaste = async () => {
    if (!bartenderId) return
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('sucursal_id')
        .eq('id', user?.id)
        .maybeSingle()

      await wasteService.create({
        producto_id: wasteData.producto_id,
        bartender_id: bartenderId,
        sucursal_id: userData?.sucursal_id || null,
        cantidad: wasteData.cantidad,
        motivo: wasteData.motivo,
        descripcion: wasteData.descripcion,
        tipo: wasteData.tipo
      })

      setShowWasteDialog(false)
      setWasteData({ producto_id: '', cantidad: 0, motivo: 'caida', descripcion: '', tipo: 'no_esperada' })
      await loadStats()
      alert('✅ Merma reportada correctamente')
    } catch (error) {
      console.error('Error reporting waste:', error)
      alert('Error al reportar la merma')
    }
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.nombre_corto?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center ml-2 lg:ml-0">
                <span className="text-xl font-bold text-gray-900">BARRANCO</span>
                <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Bartender</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar recetas..."
                  className="pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-green-500 w-48 lg:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Avatar className="cursor-pointer">
                <AvatarFallback className="bg-green-600 text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'B'}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">¡Hola, Bartender!</h1>
                <p className="text-gray-500">Prepara bebidas y gestiona tu turno</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={showWasteDialog} onOpenChange={setShowWasteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Reportar Merma
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reportar Merma</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Producto</Label>
                        <Select
                          value={wasteData.producto_id}
                          onValueChange={(value) => setWasteData({ ...wasteData, producto_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.nombre} {p.marca ? `- ${p.marca}` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={wasteData.cantidad}
                          onChange={(e) => setWasteData({ ...wasteData, cantidad: parseFloat(e.target.value) })}
                          placeholder="Ej: 30"
                        />
                      </div>
                      <div>
                        <Label>Motivo</Label>
                        <Select
                          value={wasteData.motivo}
                          onValueChange={(value) => setWasteData({ ...wasteData, motivo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="caida">💥 Caída</SelectItem>
                            <SelectItem value="rotura">🔨 Rotura de botella</SelectItem>
                            <SelectItem value="agrio">🧪 Producto agrio</SelectItem>
                            <SelectItem value="cortesia">🎁 Cortesía</SelectItem>
                            <SelectItem value="error_preparacion">❌ Error de preparación</SelectItem>
                            <SelectItem value="caducidad">📅 Caducidad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Descripción (opcional)</Label>
                        <Textarea
                          value={wasteData.descripcion}
                          onChange={(e) => setWasteData({ ...wasteData, descripcion: e.target.value })}
                          placeholder="Detalles adicionales..."
                        />
                      </div>
                      <Button onClick={handleReportWaste} className="w-full bg-yellow-600 hover:bg-yellow-700">
                        Reportar Merma
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {recipe.imagen_url ? (
                          <img src={recipe.imagen_url} alt={recipe.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Utensils className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{recipe.nombre}</h3>
                        <p className="text-sm text-gray-500">{recipe.nombre_corto || recipe.categoria}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">${recipe.precio_venta}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => setSelectedRecipe(recipe)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          {selectedRecipe && (
                            <>
                              <DialogHeader>
                                <DialogTitle>{selectedRecipe.nombre}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Categoría</p>
                                    <p>{selectedRecipe.categoria}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Precio</p>
                                    <p className="font-bold">${selectedRecipe.precio_venta}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Método de preparación</p>
                                  <p className="text-sm text-gray-700">{selectedRecipe.metodo_preparacion || 'No especificado'}</p>
                                </div>
                                {selectedRecipe.garnish && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Garnish</p>
                                    <p className="text-sm text-gray-700">{selectedRecipe.garnish}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Ingredientes</p>
                                  <ul className="list-disc list-inside text-sm text-gray-700">
                                    {selectedRecipe.ingredientes?.map((ing: any) => (
                                      <li key={ing.id}>{ing.producto_nombre}: {ing.cantidad} {ing.unidad}</li>
                                    ))}
                                  </ul>
                                </div>
                                <Button 
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    handlePrepareDrink(selectedRecipe)
                                    setSelectedRecipe(null)
                                  }}
                                >
                                  <Coffee className="h-4 w-4 mr-2" />
                                  Preparar Bebida
                                </Button>
                              </div>
                            </>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handlePrepareDrink(recipe)}
                      >
                        <Coffee className="h-4 w-4 mr-1" />
                        Preparar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">RESUMEN DEL TURNO</CardTitle>
                <CardDescription>Tu rendimiento hoy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Bebidas</span>
                  </div>
                  <span className="text-lg font-bold">{shiftStats.bebidas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Ventas</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">${shiftStats.ventas.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Merma</span>
                  </div>
                  <span className="text-lg font-bold text-red-500">${shiftStats.mermas.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Eficiencia</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{shiftStats.eficiencia.toFixed(2)}%</span>
                </div>
                <div>
                  <Progress value={Math.min(shiftStats.eficiencia, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
