'use client'

import { useEffect, useState } from 'react'
import {
  Wine, Droplets, Clock, ChefHat, FileText,
  Loader2, AlertCircle, GlassWater
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { recipeService, Recipe } from '@/lib/services/recipeService'

interface RecetaModalProps {
  isOpen: boolean
  onClose: () => void
  recetaId: string | null
  recetaNombre?: string
}

export function RecetaModal({ isOpen, onClose, recetaId, recetaNombre }: RecetaModalProps) {
  const [receta, setReceta] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && recetaId) {
      cargarReceta(recetaId)
    } else {
      setReceta(null)
      setError(null)
    }
  }, [isOpen, recetaId])

  const cargarReceta = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await recipeService.getById(id)
      if (!data) {
        setError('Receta no encontrada')
        return
      }
      setReceta(data)
    } catch (err: any) {
      console.error('Error al cargar receta:', err)
      setError('No se pudo cargar la receta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <DialogTitle className="flex items-center gap-2 text-purple-800">
            <ChefHat className="h-5 w-5" />
            Receta: {recetaNombre || receta?.nombre || 'Cargando...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-3" />
            <p className="text-gray-500">Cargando receta...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              La receta puede no estar configurada. Contacta al administrador.
            </p>
          </div>
        ) : receta ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              {receta.imagen_url ? (
                <img
                  src={receta.imagen_url}
                  alt={receta.nombre}
                  className="w-full sm:w-32 h-32 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GlassWater className="h-12 w-12 text-purple-400" />
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {receta.nombre}
                </h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {receta.categoria && (
                    <Badge className="bg-purple-100 text-purple-700">
                      {receta.categoria}
                    </Badge>
                  )}
                  <Badge className="bg-emerald-100 text-emerald-700">
                    ${(receta.precio_venta || 0).toFixed(2)}
                  </Badge>
                </div>
                {receta.descripcion && (
                  <p className="text-sm text-gray-600 mt-2">
                    {receta.descripcion}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                Ingredientes ({receta.ingredientes?.length || 0})
              </h4>
              {!receta.ingredientes || receta.ingredientes.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    Esta receta no tiene ingredientes registrados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {receta.ingredientes.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <span className="text-sm text-gray-700 truncate">
                        {ing.producto_nombre}
                      </span>
                      <span className="text-sm font-semibold text-blue-600 ml-2 flex-shrink-0">
                        {ing.cantidad} {ing.unidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {receta.metodo_preparacion && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  Método de preparación
                </h4>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-900 whitespace-pre-wrap">
                    {receta.metodo_preparacion}
                  </p>
                </div>
              </div>
            )}

            {receta.garnish && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wine className="h-4 w-4 text-pink-500" />
                  Decoración
                </h4>
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <p className="text-sm text-pink-900">{receta.garnish}</p>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 flex items-start gap-1.5">
                <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Consulta esta receta para preparar el producto correctamente.
                  Si algo no coincide, avisa al administrador.
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
