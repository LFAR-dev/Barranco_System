'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recipeService, Recipe } from '@/lib/services/recipeService'
import { productService, Product } from '@/lib/services/productService'

const ingredientSchema = z.object({
  producto_id: z.string().min(1, 'Producto requerido'),
  cantidad: z.number().min(0.1, 'Cantidad debe ser mayor a 0'),
  unidad: z.string().min(1, 'Unidad requerida'),
})

const recipeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  nombre_corto: z.string().optional(),
  categoria: z.string().min(1, 'La categoría es requerida'),
  metodo_preparacion: z.string().optional(),
  garnish: z.string().optional(),
  precio_venta: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  ingredientes: z.array(ingredientSchema).min(1, 'Debe tener al menos un ingrediente'),
})

type RecipeFormData = z.infer<typeof recipeSchema>

interface RecipeFormProps {
  recipe?: Recipe | null
  onSuccess: () => void
  onCancel: () => void
}

export default function RecipeForm({ recipe, onSuccess, onCancel }: RecipeFormProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(recipe?.imagen_url || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!recipe

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      nombre: recipe?.nombre || '',
      nombre_corto: recipe?.nombre_corto || '',
      categoria: recipe?.categoria || '',
      metodo_preparacion: recipe?.metodo_preparacion || '',
      garnish: recipe?.garnish || '',
      precio_venta: recipe?.precio_venta || 0,
      ingredientes: recipe?.ingredientes?.map(ing => ({
        producto_id: ing.producto_id,
        cantidad: ing.cantidad,
        unidad: ing.unidad
      })) || [{ producto_id: '', cantidad: 0, unidad: 'ml' }],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredientes'
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAll()
        setProducts(data)
      } catch (error) {
        console.error('Error loading products:', error)
      }
    }
    fetchProducts()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: RecipeFormData) => {
    setLoading(true)
    setUploading(true)
    try {
      let imagen_url = recipe?.imagen_url || null
      
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        imagen_url = await recipeService.uploadImage(imageFile, path)
      }

      const recipeData = { ...data, imagen_url }
      
      if (isEditing && recipe) {
        await recipeService.update(recipe.id, recipeData)
        alert('Receta actualizada correctamente')
      } else {
        await recipeService.create(recipeData)
        alert('Receta creada correctamente')
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Error al guardar la receta')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Imagen */}
      <div className="space-y-2">
        <Label>Imagen de la receta</Label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
            {imagePreview ? (
              <img src={imagePreview} alt="Receta" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
            </Button>
            {imagePreview && (
              <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => {
                setImagePreview('')
                setImageFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre_corto">Nombre Corto</Label>
          <Input id="nombre_corto" {...register('nombre_corto')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría *</Label>
        <Select 
          value={watch('categoria')} 
          onValueChange={(value) => setValue('categoria', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="con_tequila">Con Tequila</SelectItem>
            <SelectItem value="con_vodka">Con Vodka</SelectItem>
            <SelectItem value="con_ron">Con Ron</SelectItem>
            <SelectItem value="con_mezcal">Con Mezcal</SelectItem>
            <SelectItem value="con_whiskey">Con Whiskey</SelectItem>
            <SelectItem value="con_ginebra">Con Ginebra</SelectItem>
            <SelectItem value="spritz">Spritz</SelectItem>
          </SelectContent>
        </Select>
        {errors.categoria && <p className="text-xs text-red-500">{errors.categoria.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodo_preparacion">Método de Preparación</Label>
        <Textarea id="metodo_preparacion" {...register('metodo_preparacion')} placeholder="Ej: Shaker, colado simple" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="garnish">Garnish</Label>
        <Input id="garnish" {...register('garnish')} placeholder="Ej: Naranja fresca, hierbabuena" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="precio_venta">Precio de Venta *</Label>
        <Input id="precio_venta" type="number" step="0.01" {...register('precio_venta', { valueAsNumber: true })} />
        {errors.precio_venta && <p className="text-xs text-red-500">{errors.precio_venta.message}</p>}
      </div>

      <div className="space-y-3">
        <Label>Ingredientes</Label>
        {fields.map((field, index) => {
          // Obtener el error del ingrediente de forma segura
          const ingredientError = errors.ingredientes?.[index]
          const productIdError = ingredientError?.producto_id
          
          return (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <Select 
                  value={watch(`ingredientes.${index}.producto_id`)} 
                  onValueChange={(value) => setValue(`ingredientes.${index}.producto_id`, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {productIdError && (
                  <p className="text-xs text-red-500">{productIdError.message}</p>
                )}
              </div>
              <div className="w-20">
                <Input 
                  type="number" 
                  placeholder="Cant." 
                  {...register(`ingredientes.${index}.cantidad`, { valueAsNumber: true })}
                />
                {ingredientError?.cantidad && (
                  <p className="text-xs text-red-500">{ingredientError.cantidad.message}</p>
                )}
              </div>
              <div className="w-20">
                <Input 
                  placeholder="Unidad" 
                  {...register(`ingredientes.${index}.unidad`)}
                />
                {ingredientError?.unidad && (
                  <p className="text-xs text-red-500">{ingredientError.unidad.message}</p>
                )}
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:text-red-700"
                onClick={() => remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
        {errors.ingredientes?.message && (
          <p className="text-xs text-red-500">{errors.ingredientes.message}</p>
        )}
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => append({ producto_id: '', cantidad: 0, unidad: 'ml' })}
        >
          + Agregar Ingrediente
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading || uploading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
