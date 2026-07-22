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
  codigo_acceso?: string
  codigo_expiracion?: string
  autorizado_por?: string
  ultimo_acceso?: string
  turno_activo?: boolean
}

export interface Bartender {
  id: string
  usuario_id: string
  codigo: string
  nombre_completo: string
  fecha_contratacion: string
  activo: boolean
  turno_activo: boolean
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
  turno_activo: boolean
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
    let query = supabase.from('usuarios').select('*').order('nombre')
    if (rol) query = query.eq('rol', rol)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<User | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as User
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.auth.admin.updateUserById(
      id,
      { password: newPassword }
    )
    if (error) throw error
  },

  async deleteUser(id: string): Promise<void> {
    const supabase = createClient()
    await supabase.from('bartenders').delete().eq('usuario_id', id)
    await supabase.from('meseros').delete().eq('usuario_id', id)
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (error) throw error
  },

  async generarNIP(usuarioId: string, adminId: string): Promise<string> {
    const supabase = createClient()
    const { data: adminCheck, error: adminError } = await supabase
      .from('usuarios')
      .select('id, email, rol')
      .eq('id', adminId)
      .maybeSingle()
    
    if (adminError || !adminCheck) {
      throw new Error('Administrador no encontrado o no tiene permisos')
    }
    
    if (adminCheck.rol !== 'admin') {
      throw new Error('No tienes permisos de administrador')
    }
    
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    const expiracion = new Date()
    expiracion.setHours(expiracion.getHours() + 24)
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        codigo_acceso: codigo,
        codigo_expiracion: expiracion.toISOString(),
        autorizado_por: adminId,
        activo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', usuarioId)
      .select()
      .maybeSingle()
    
    if (error) throw error
    return codigo
  },

  async verificarSoloCodigo(codigo: string): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol, codigo_acceso, codigo_expiracion, activo')
      .eq('codigo_acceso', codigo)
      .maybeSingle()
    
    if (error || !data) {
      return { valido: false, mensaje: 'NIP inválido' }
    }
    
    const expiracion = new Date(data.codigo_expiracion)
    if (expiracion < new Date()) {
      return { valido: false, mensaje: 'El NIP ha expirado' }
    }
    
    if (!data.activo) {
      return { valido: false, mensaje: 'Usuario desactivado' }
    }
    
    return {
      valido: true,
      usuario_id: data.id,
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol
    }
  },

  async desactivarUsuario(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({
        activo: false,
        codigo_acceso: null,
        codigo_expiracion: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    if (error) throw error
  },

  async activarUsuario(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({
        activo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    if (error) throw error
  },

  async getBartenders(): Promise<Bartender[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`
        *,
        usuarios (
          id, nombre, apellido, email, phone_number,
          avatar_url, activo, codigo_acceso, codigo_expiracion
        )
      `)
      .order('nombre_completo')
    if (error) throw error
    return data || []
  },

  async getBartenderByUsuarioId(usuarioId: string): Promise<Bartender | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async deleteBartender(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('bartenders').delete().eq('id', id)
    if (error) throw error
  },

  async getMeseros(): Promise<Mesero[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select(`
        *,
        usuarios (
          id, nombre, apellido, email, phone_number,
          avatar_url, activo, codigo_acceso, codigo_expiracion
        )
      `)
      .order('nombre_completo')
    if (error) throw error
    return data || []
  },

  async getMeseroByUsuarioId(usuarioId: string): Promise<Mesero | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async deleteMesero(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('meseros').delete().eq('id', id)
    if (error) throw error
  },

  async uploadBartenderFoto(file: File, bartenderId: string, usuarioId: string): Promise<string> {
    const supabase = createClient()
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `bartenders/${bartenderId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('barranco-images')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(path)
    
    const avatarUrl = urlData.publicUrl
    await supabase.from('bartenders').update({ foto_url: avatarUrl }).eq('id', bartenderId)
    await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('id', usuarioId)
    
    return avatarUrl
  },

  async uploadMeseroFoto(file: File, meseroId: string, usuarioId: string): Promise<string> {
    const supabase = createClient()
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `meseros/${meseroId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('barranco-images')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(path)
    
    const avatarUrl = urlData.publicUrl
    await supabase.from('meseros').update({ foto_url: avatarUrl }).eq('id', meseroId)
    await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('id', usuarioId)
    
    return avatarUrl
  },

  async uploadAdminFoto(file: File, usuarioId: string): Promise<string> {
    const supabase = createClient()
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `admins/${usuarioId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('barranco-images')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('barranco-images')
      .getPublicUrl(path)
    
    const avatarUrl = urlData.publicUrl
    await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('id', usuarioId)
    
    return avatarUrl
  },

  async createFullUser(data: {
    email: string
    nombre: string
    apellido: string
    telefono?: string
    rol: 'admin' | 'bartender' | 'mesero'
  }): Promise<{ userId: string; email: string; rol: string; nip?: string }> {
    const supabase = createClient()
    const pinSeisDigitos = Math.floor(100000 + Math.random() * 900000).toString()
    const password = data.rol === 'admin' ? 'Admin123!' : pinSeisDigitos
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: password,
      options: { data: { nombre: data.nombre, apellido: data.apellido, rol: data.rol } }
    })
    
    if (authError || !authData.user) {
      throw authError || new Error('No se pudo crear el usuario')
    }
    
    const userId = authData.user.id
    const userInsert: any = {
      id: userId,
      email: data.email,
      password_hash: 'auth_managed',
      nombre: data.nombre,
      apellido: data.apellido,
      pin: pinSeisDigitos,
      rol: data.rol,
      telefono: data.telefono || null,
      activo: data.rol === 'admin' ? true : false,
      email_verificado: true,
      created_at: new Date().toISOString()
    }

    let nipGenerado = null
    if (data.rol === 'bartender' || data.rol === 'mesero') {
      nipGenerado = Math.floor(100000 + Math.random() * 900000).toString()
      const expiracion = new Date()
      expiracion.setHours(expiracion.getHours() + 24)
      userInsert.codigo_acceso = nipGenerado
      userInsert.codigo_expiracion = expiracion.toISOString()
    }

    await supabase.from('usuarios').insert([userInsert])
    const codigo = `USR-${Date.now().toString().slice(-6)}`
    const nombre_completo = `${data.nombre} ${data.apellido}`

    if (data.rol === 'bartender') {
      await supabase.from('bartenders').insert({
        usuario_id: userId,
        codigo: `BT-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0],
        activo: false,
        turno_activo: false
      })
    } else if (data.rol === 'mesero') {
      await supabase.from('meseros').insert({
        usuario_id: userId,
        codigo: `MS-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0],
        activo: false,
        turno_activo: false
      })
    }

    if (data.rol === 'admin') {
      await supabase.from('usuarios').update({ activo: true }).eq('id', userId)
    }

    return { 
      userId, 
      email: data.email, 
      rol: data.rol,
      nip: nipGenerado || undefined 
    }
  },

  async getCounters() {
    const supabase = createClient()
    const { count: bartenders } = await supabase
      .from('bartenders')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    
    const { count: meseros } = await supabase
      .from('meseros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    
    const { count: admins } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'admin')
      .eq('activo', true)
    
    return {
      bartenders: bartenders || 0,
      meseros: meseros || 0,
      admins: admins || 0
    }
  }
}
