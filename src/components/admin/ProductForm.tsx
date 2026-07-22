'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { productService, Product } from '@/lib/services/productService'
import { categoryService, Category } from '@/lib/services/categoryService'

const productSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  marca: z.string().optional(),
  categoria_id: z.string().min(1, 'La categoría es requerida'),
  presentacion: z.string().min(1, 'La presentación es requerida'),
  volumen_ml: z.number().min(0, 'El volumen debe ser mayor o igual a 0'),
  costo_unitario: z.number().min(0, 'El costo debe ser mayor o igual a 0'),
  precio_venta: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stock_actual: z.number().min(0, 'El stock debe ser mayor o igual a 0'),
  stock_minimo: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  stock_maximo: z.number().min(0, 'El stock máximo debe ser mayor o igual a 0'),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(product?.imagen_url || '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!product

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: product?.nombre || '',
      marca: product?.marca || '',
      categoria_id: product?.categoria_id || '',
      presentacion: product?.presentacion || '',
      volumen_ml: product?.volumen_ml || 0,
      costo_unitario: product?.costo_unitario || 0,
      precio_venta: product?.precio_venta || 0,
      stock_actual: product?.stock_actual || 0,
      stock_minimo: product?.stock_minimo || 0,
      stock_maximo: product?.stock_maximo || 0,
    }
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll()
        setCategories(data)
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }
    fetchCategories()
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

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true)
    setUploading(true)
    try {
      let imagen_url = product?.imagen_url || null
      
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        imagen_url = await productService.uploadImage(imageFile, path)
      }

      const productData = { ...data, imagen_url }
      
      if (isEditing && product) {
        await productService.update(product.id, productData)
        alert('Producto actualizado correctamente')
      } else {
        await productService.create(productData as any)
        alert('Producto creado correctamente')
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar el producto')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Imagen */}
      <div className="space-y-2">
        <Label>Imagen del producto</Label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
            {imagePreview ? (
              <img src={imagePreview} alt="Producto" className="w-full h-full object-cover" />
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

      {/* Resto del formulario */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" {...register('marca')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria_id">Categoría *</Label>
        <Select 
          value={watch('categoria_id')} 
          onValueChange={(value) => setValue('categoria_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoria_id && <p className="text-xs text-red-500">{errors.categoria_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="presentacion">Presentación *</Label>
          <Input id="presentacion" placeholder="Ej: 750ml" {...register('presentacion')} />
          {errors.presentacion && <p className="text-xs text-red-500">{errors.presentacion.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volumen_ml">Volumen (ml)</Label>
          <Input id="volumen_ml" type="number" {...register('volumen_ml', { valueAsNumber: true })} />
          {errors.volumen_ml && <p className="text-xs text-red-500">{errors.volumen_ml.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costo_unitario">Costo Unitario</Label>
          <Input id="costo_unitario" type="number" step="0.01" {...register('costo_unitario', { valueAsNumber: true })} />
          {errors.costo_unitario && <p className="text-xs text-red-500">{errors.costo_unitario.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="precio_venta">Precio Venta</Label>
          <Input id="precio_venta" type="number" step="0.01" {...register('precio_venta', { valueAsNumber: true })} />
          {errors.precio_venta && <p className="text-xs text-red-500">{errors.precio_venta.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock_actual">Stock Actual</Label>
          <Input id="stock_actual" type="number" {...register('stock_actual', { valueAsNumber: true })} />
          {errors.stock_actual && <p className="text-xs text-red-500">{errors.stock_actual.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock_minimo">Stock Mínimo</Label>
          <Input id="stock_minimo" type="number" {...register('stock_minimo', { valueAsNumber: true })} />
          {errors.stock_minimo && <p className="text-xs text-red-500">{errors.stock_minimo.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock_maximo">Stock Máximo</Label>
          <Input id="stock_maximo" type="number" {...register('stock_maximo', { valueAsNumber: true })} />
          {errors.stock_maximo && <p className="text-xs text-red-500">{errors.stock_maximo.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading || uploading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
