'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Utensils,
  ArrowLeft,
  RefreshCw,
  Coffee,
  GlassWater,
  Wine,
  Beer,
  ImageIcon,
  Eye
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { recipeService, Recipe } from '@/lib/services/recipeService'
import RecipeForm from '@/components/admin/RecipeForm'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const data = await recipeService.getAll()
      setRecipes(data)
    } catch (error) {
      alert('Error al cargar recetas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  const handleDelete = async () => {
    if (!recipeToDelete) return
    try {
      await recipeService.delete(recipeToDelete)
      alert('Receta eliminada correctamente')
      fetchRecipes()
    } catch (error) {
      alert('Error al eliminar la receta')
    } finally {
      setIsDeleteDialogOpen(false)
      setRecipeToDelete(null)
    }
  }

  const getCategoryIcon = (categoria: string) => {
    if (categoria?.includes('tequila')) return <GlassWater className="h-4 w-4" />
    if (categoria?.includes('vodka')) return <GlassWater className="h-4 w-4" />
    if (categoria?.includes('ron')) return <Wine className="h-4 w-4" />
    if (categoria?.includes('whiskey')) return <Beer className="h-4 w-4" />
    if (categoria?.includes('mezcal')) return <GlassWater className="h-4 w-4" />
    if (categoria?.includes('ginebra')) return <GlassWater className="h-4 w-4" />
    return <Coffee className="h-4 w-4" />
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.nombre_corto?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Recetas</h1>
              <p className="text-sm text-gray-500">Gestiona las recetas del bar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setSelectedRecipe(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Receta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedRecipe ? 'Editar Receta' : 'Nueva Receta'}</DialogTitle>
                </DialogHeader>
                <RecipeForm
                  recipe={selectedRecipe}
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    setSelectedRecipe(null)
                    fetchRecipes()
                  }}
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setSelectedRecipe(null)
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchRecipes}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar recetas..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {recipe.imagen_url ? (
                      <img src={recipe.imagen_url} alt={recipe.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getCategoryIcon(recipe.categoria)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{recipe.nombre}</h3>
                        <p className="text-sm text-gray-500">{recipe.nombre_corto || recipe.categoria}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {recipe.margen_ganancia?.toFixed(0) || 0}% margen
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Precio</p>
                        <p className="font-medium text-gray-900">${recipe.precio_venta}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Costo</p>
                        <p className="font-medium text-gray-900">${recipe.costo_total?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {recipe.garnish && (
                      <div className="mt-1 text-xs">
                        <span className="text-gray-500">Garnish: </span>
                        <span className="text-gray-700">{recipe.garnish}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-gray-400 truncate max-w-[100px]">
                        {recipe.metodo_preparacion || 'Método no especificado'}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-blue-50"
                          onClick={async () => {
                            const fullRecipe = await recipeService.getById(recipe.id)
                            setViewRecipe(fullRecipe)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedRecipe(recipe)
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
                            setRecipeToDelete(recipe.id)
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
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron recetas</p>
          </div>
        )}
      </div>

      {/* Dialog para ver receta */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewRecipe?.nombre}</DialogTitle>
          </DialogHeader>
          {viewRecipe && (
            <div className="space-y-4">
              {viewRecipe.imagen_url && (
                <img src={viewRecipe.imagen_url} alt={viewRecipe.nombre} className="w-full max-h-48 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Categoría</p>
                  <p>{viewRecipe.categoria}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Precio</p>
                  <p>${viewRecipe.precio_venta}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Costo</p>
                  <p>${viewRecipe.costo_total?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Margen</p>
                  <p>{viewRecipe.margen_ganancia?.toFixed(0) || 0}%</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Método de preparación</p>
                <p className="text-sm text-gray-700">{viewRecipe.metodo_preparacion || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Garnish</p>
                <p className="text-sm text-gray-700">{viewRecipe.garnish || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ingredientes</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {viewRecipe.ingredientes?.map((ing) => (
                    <li key={ing.id}>{ing.producto_nombre}: {ing.cantidad} {ing.unidad}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la receta.
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
