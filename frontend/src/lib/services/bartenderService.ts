import { createClient } from '@/lib/supabase/client'

export interface Bartender {
  id: string
  usuario_id: string
  codigo: string
  nombre_completo: string
  fecha_contratacion: string
  activo: boolean
  productividad: number
  mermas_reportadas: number
  ventas_totales: number
  bebidas_preparadas: number
  calificacion_eficiencia: number
  foto_url?: string
  email?: string
  phone_number?: string
  avatar_url?: string
}

export const bartenderService = {
  async getAll() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`
        *,
        usuarios (
          id,
          email,
          phone_number,
          avatar_url
        )
      `)
      .order('nombre_completo')
    if (error) throw error
    return data.map((b: any) => ({
      ...b,
      email: b.usuarios?.email,
      phone_number: b.usuarios?.phone_number,
      avatar_url: b.usuarios?.avatar_url
    })) as Bartender[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`
        *,
        usuarios (
          email,
          phone_number,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return {
      ...data,
      email: data?.usuarios?.email,
      phone_number: data?.usuarios?.phone_number,
      avatar_url: data?.usuarios?.avatar_url
    } as Bartender
  },

  async getByUsuarioId(usuarioId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`
        *,
        usuarios (
          email,
          phone_number,
          avatar_url
        )
      `)
      .eq('usuario_id', usuarioId)
      .maybeSingle()
    if (error) throw error
    return {
      ...data,
      email: data?.usuarios?.email,
      phone_number: data?.usuarios?.phone_number,
      avatar_url: data?.usuarios?.avatar_url
    } as Bartender
  },

  async create(bartender: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .insert([bartender])
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Bartender
  },

  async update(id: string, bartender: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .update(bartender)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Bartender
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('bartenders')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadFoto(file: File, bartenderId: string) {
    const supabase = createClient()
    const path = `bartenders/${bartenderId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('barranco-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      })
    if (error) throw error
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(path)
    return urlData.publicUrl
  }
}
