import { createClient } from '@/lib/supabase/client'

export interface Product {
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

export const productService = {
  async getAll() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (nombre)
      `)
      .eq('activo', true)
      .order('nombre')
    if (error) throw error
    return data?.map((item: any) => ({
      ...item,
      categoria_nombre: item.categorias?.nombre || 'Sin categoría'
    })) as Product[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (nombre)
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return {
      ...data,
      categoria_nombre: data?.categorias?.nombre || 'Sin categoría'
    } as Product
  },

  async create(product: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .insert([product])
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Product
  },

  async update(id: string, product: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .update(product)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Product
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadImage(file: File, path: string) {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from('barranco-images')
      .upload(`productos/${path}`, file, {
        cacheControl: '3600',
        upsert: true
      })
    if (error) throw error
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(`productos/${path}`)
    return urlData.publicUrl
  }
}
