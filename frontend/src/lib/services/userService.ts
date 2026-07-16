import { createClient } from '@/lib/supabase/client'

export interface User {
  id: string
  email: string
  phone_number: string
  nombre: string
  apellido: string
  rol: 'admin' | 'bartender' | 'mesero' | 'auditor'
  activo: boolean
  avatar_url?: string
  pin: string
  is_verified: boolean
  codigo_acceso?: string
  codigo_expiracion?: string
  autorizado_por?: string
  ultimo_acceso?: string
}

export const userService = {
  async getAll(rol?: string) {
    const supabase = createClient()
    let query = supabase
      .from('usuarios')
      .select('*')
      .order('nombre')
    
    if (rol) {
      query = query.eq('rol', rol)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data as User[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as User
  },

  async autorizarUsuario(usuarioId: string, adminId: string) {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('autorizar_usuario', {
      p_usuario_id: usuarioId,
      p_admin_id: adminId
    })
    if (error) throw error
    return data as string // El código generado
  },

  async verificarCodigo(email: string, codigo: string) {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('verificar_codigo_acceso', {
      p_email: email,
      p_codigo: codigo
    })
    if (error) throw error
    return data?.[0] || null
  },

  async desactivarUsuario(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({ 
        activo: false,
        codigo_acceso: null,
        codigo_expiracion: null
      })
      .eq('id', id)
    if (error) throw error
  },

  async update(id: string, user: Partial<User>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .update(user)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as User
  },

  async getBartenders() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`
        *,
        usuarios (
          id,
          nombre,
          apellido,
          email,
          phone_number,
          avatar_url,
          activo,
          codigo_acceso,
          codigo_expiracion,
          autorizado_por,
          ultimo_acceso
        )
      `)
      .order('nombre_completo')
    if (error) throw error
    return data
  },

  async getMeseros() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select(`
        *,
        usuarios (
          id,
          nombre,
          apellido,
          email,
          phone_number,
          avatar_url,
          activo,
          codigo_acceso,
          codigo_expiracion,
          autorizado_por,
          ultimo_acceso
        )
      `)
      .order('nombre_completo')
    if (error) throw error
    return data
  }
}
