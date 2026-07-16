import { createClient } from '@/lib/supabase/client'

export interface Recipe {
  id: string
  nombre: string
  nombre_corto: string
  categoria: string
  metodo_preparacion: string
  garnish: string
  costo_total: number
  precio_venta: number
  margen_ganancia: number
  activa: boolean
  imagen_url?: string
  ingredientes?: RecipeIngredient[]
}

export interface RecipeIngredient {
  id: string
  producto_id: string
  producto_nombre: string
  cantidad: number
  unidad: string
}

export const recipeService = {
  async getAll() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('activa', true)
      .order('nombre')
    if (error) throw error
    return data as Recipe[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recetas')
      .select(`
        *,
        detalles_receta (
          id,
          cantidad,
          unidad,
          productos (id, nombre)
        )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    const ingredientes = data?.detalles_receta?.map((d: any) => ({
      id: d.id,
      producto_id: d.productos.id,
      producto_nombre: d.productos.nombre,
      cantidad: d.cantidad,
      unidad: d.unidad
    })) || []
    return { ...data, ingredientes } as Recipe
  },

  async create(recipe: any) {
    const supabase = createClient()
    const { data: recipeData, error: recipeError } = await supabase
      .from('recetas')
      .insert([{
        nombre: recipe.nombre,
        nombre_corto: recipe.nombre_corto,
        categoria: recipe.categoria,
        metodo_preparacion: recipe.metodo_preparacion,
        garnish: recipe.garnish,
        precio_venta: recipe.precio_venta,
        imagen_url: recipe.imagen_url || null,
        activa: true
      }])
      .select()
      .maybeSingle()
    if (recipeError) throw recipeError

    if (recipe.ingredientes && recipe.ingredientes.length > 0) {
      const detalles = recipe.ingredientes.map((ing: any) => ({
        receta_id: recipeData.id,
        producto_id: ing.producto_id,
        cantidad: ing.cantidad,
        unidad: ing.unidad
      }))
      const { error: detError } = await supabase
        .from('detalles_receta')
        .insert(detalles)
      if (detError) throw detError
    }
    return recipeData as Recipe
  },

  async update(id: string, recipe: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recetas')
      .update({
        nombre: recipe.nombre,
        nombre_corto: recipe.nombre_corto,
        categoria: recipe.categoria,
        metodo_preparacion: recipe.metodo_preparacion,
        garnish: recipe.garnish,
        precio_venta: recipe.precio_venta,
        imagen_url: recipe.imagen_url || null
      })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error

    if (recipe.ingredientes) {
      await supabase.from('detalles_receta').delete().eq('receta_id', id)
      if (recipe.ingredientes.length > 0) {
        const detalles = recipe.ingredientes.map((ing: any) => ({
          receta_id: id,
          producto_id: ing.producto_id,
          cantidad: ing.cantidad,
          unidad: ing.unidad
        }))
        const { error: detError } = await supabase
          .from('detalles_receta')
          .insert(detalles)
        if (detError) throw detError
      }
    }
    return data as Recipe
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('recetas')
      .update({ activa: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadImage(file: File, path: string) {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from('barranco-images')
      .upload(`recetas/${path}`, file, {
        cacheControl: '3600',
        upsert: true
      })
    if (error) throw error
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(`recetas/${path}`)
    return urlData.publicUrl
  }
}
