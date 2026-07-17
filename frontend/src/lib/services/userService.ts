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

export interface Mesero {
  id: string
  usuario_id: string
  codigo: string
  nombre_completo: string
  fecha_contratacion: string
  activo: boolean
  pedidos_atendidos: number
  ventas_totales: number
  calificacion: number
  foto_url?: string
  email?: string
  phone_number?: string
  avatar_url?: string
}

export const userService = {
  async getAll(rol?: string): Promise<User[]> {
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

  async getById(id: string): Promise<User | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as User | null
  },

  async autorizarUsuario(usuarioId: string, adminId: string): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('autorizar_usuario', {
      p_usuario_id: usuarioId,
      p_admin_id: adminId
    })
    if (error) throw error
    return data as string
  },

  async verificarCodigo(email: string, codigo: string): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('verificar_codigo_acceso', {
      p_email: email,
      p_codigo: codigo
    })
    if (error) throw error
    return data?.[0] || null
  },

  async desactivarUsuario(id: string): Promise<void> {
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

  async activarUsuario(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: true })
      .eq('id', id)
    if (error) throw error
  },

  async update(id: string, user: Partial<User>): Promise<User> {
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

  // ============================================================
  // BARTENDERS
  // ============================================================
  
  async getBartenders(): Promise<Bartender[]> {
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

  async getBartenderById(id: string): Promise<Bartender | null> {
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
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async createBartender(data: {
    usuario_id: string
    codigo: string
    nombre_completo: string
    fecha_contratacion?: string
  }): Promise<Bartender> {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from('bartenders')
      .insert([{
        usuario_id: data.usuario_id,
        codigo: data.codigo,
        nombre_completo: data.nombre_completo,
        fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
        activo: true,
        calificacion_eficiencia: 0,
        bebidas_preparadas: 0,
        ventas_totales: 0,
        mermas_reportadas: 0,
        productividad: 0
      }])
      .select()
      .maybeSingle()
    if (error) throw error
    return result
  },

  async updateBartender(id: string, data: Partial<Bartender>): Promise<Bartender> {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from('bartenders')
      .update(data)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return result
  },

  async deleteBartender(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('bartenders')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadBartenderFoto(file: File, bartenderId: string): Promise<string> {
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
  },

  // ============================================================
  // MESEROS
  // ============================================================

  async getMeseros(): Promise<Mesero[]> {
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
  },

  async getMeseroById(id: string): Promise<Mesero | null> {
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
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async createMesero(data: {
    usuario_id: string
    codigo: string
    nombre_completo: string
    fecha_contratacion?: string
  }): Promise<Mesero> {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from('meseros')
      .insert([{
        usuario_id: data.usuario_id,
        codigo: data.codigo,
        nombre_completo: data.nombre_completo,
        fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
        activo: true,
        calificacion: 0,
        pedidos_atendidos: 0,
        ventas_totales: 0
      }])
      .select()
      .maybeSingle()
    if (error) throw error
    return result
  },

  async updateMesero(id: string, data: Partial<Mesero>): Promise<Mesero> {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from('meseros')
      .update(data)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return result
  },

  async deleteMesero(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('meseros')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadMeseroFoto(file: File, meseroId: string): Promise<string> {
    const supabase = createClient()
    const path = `meseros/${meseroId}/${Date.now()}_${file.name}`
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
  },

  // ============================================================
  // CREAR USUARIO COMPLETO (AUTH + USUARIOS + PERFIL)
  // ============================================================

  async createFullUser(data: {
    email: string
    password: string
    nombre: string
    apellido: string
    rol: 'admin' | 'bartender' | 'mesero'
    pin: string
    telefono?: string
    fecha_contratacion?: string
  }): Promise<{ userId: string; email: string; rol: string }> {
    const supabase = createClient()
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          rol: data.rol,
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    const userId = authData.user.id

    const { error: userError } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        pin: data.pin,
        rol: data.rol,
        telefono: data.telefono || null,
        activo: true,
        email_verificado: true,
      })

    if (userError) throw userError

    const codigo = `USR-${Date.now().toString().slice(-6)}`
    const nombre_completo = `${data.nombre} ${data.apellido}`

    if (data.rol === 'bartender') {
      await supabase
        .from('bartenders')
        .insert({
          usuario_id: userId,
          codigo: `BT-${codigo}`,
          nombre_completo: nombre_completo,
          fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
          activo: true,
          calificacion_eficiencia: 0,
          bebidas_preparadas: 0,
          ventas_totales: 0,
          mermas_reportadas: 0,
          productividad: 0
        })

    } else if (data.rol === 'mesero') {
      await supabase
        .from('meseros')
        .insert({
          usuario_id: userId,
          codigo: `MS-${codigo}`,
          nombre_completo: nombre_completo,
          fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
          activo: true,
          calificacion: 0,
          pedidos_atendidos: 0,
          ventas_totales: 0,
        })
    }

    return { userId, email: data.email, rol: data.rol }
  },

  async getAllUsers() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
}
