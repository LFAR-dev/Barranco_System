import { createClient } from '@/lib/supabase/client'

export interface Category {
  id: string
  nombre: string
  descripcion: string
  icono: string
  orden: number
  activa: boolean
}

export const categoryService = {
  async getAll() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activa', true)
      .order('orden', { ascending: true })
    if (error) throw error
    return data as Category[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Category
  },

  async create(category: Omit<Category, 'id'>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categorias')
      .insert([category])
      .select()
      .single()
    if (error) throw error
    return data as Category
  },

  async update(id: string, category: Partial<Category>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categorias')
      .update(category)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Category
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('categorias')
      .update({ activa: false })
      .eq('id', id)
    if (error) throw error
  }
}
