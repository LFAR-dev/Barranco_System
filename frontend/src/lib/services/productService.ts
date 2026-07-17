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
  async getAll(): Promise<Product[]> {
    const supabase = createClient()
    
    try {
      // Intentar con join (ahora debería funcionar con las nuevas políticas)
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
      })) || []
      
    } catch (error) {
      console.error('Error en consulta con join, usando fallback:', error)
      return this.getAllFallback()
    }
  },

  async getAllFallback(): Promise<Product[]> {
    const supabase = createClient()
    
    const { data: productos, error: productError } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    
    if (productError) throw productError
    if (!productos || productos.length === 0) return []
    
    const { data: categorias, error: catError } = await supabase
      .from('categorias')
      .select('id, nombre')
      .eq('activa', true)
    
    if (catError) throw catError
    
    const categoriaMap = new Map()
    categorias?.forEach(c => categoriaMap.set(c.id, c.nombre))
    
    return productos.map((producto: any) => ({
      ...producto,
      categoria_nombre: categoriaMap.get(producto.categoria_id) || 'Sin categoría'
    }))
  },

  async getById(id: string): Promise<Product | null> {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categorias (nombre)
        `)
        .eq('id', id)
        .maybeSingle()
      
      if (error) throw error
      if (!data) return null
      
      return {
        ...data,
        categoria_nombre: data.categorias?.nombre || 'Sin categoría'
      } as Product
      
    } catch (error) {
      console.error('Error en getById con join, usando fallback:', error)
      return this.getByIdFallback(id)
    }
  },

  async getByIdFallback(id: string): Promise<Product | null> {
    const supabase = createClient()
    
    const { data: producto, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (error) throw error
    if (!producto) return null
    
    const { data: categoria, error: catError } = await supabase
      .from('categorias')
      .select('nombre')
      .eq('id', producto.categoria_id)
      .maybeSingle()
    
    if (catError) throw catError
    
    return {
      ...producto,
      categoria_nombre: categoria?.nombre || 'Sin categoría'
    } as Product
  },

  async create(product: any): Promise<Product> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .insert([product])
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Product
  },

  async update(id: string, product: any): Promise<Product> {
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

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadImage(file: File, path: string): Promise<string> {
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