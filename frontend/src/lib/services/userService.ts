import { safeSupabase, withRetry } from '@/lib/supabase/safeClient'
import { formatSupabaseError } from '@/lib/utils/errorHandler'

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
  // ============================================================
  // USUARIOS - CRUD CON MANEJO DE ERRORES
  // ============================================================

  async getAll(rol?: string): Promise<User[]> {
    const result = await safeSupabase.safeSelect<User>(
      'usuarios',
      (q) => {
        let query = q.select('*').order('nombre')
        if (rol) query = query.eq('rol', rol)
        return query
      }
    )
    
    if (!result.success) throw result.error
    return result.data || []
  },

  async getById(id: string): Promise<User | null> {
    const result = await safeSupabase.safeSelect<User>(
      'usuarios',
      (q) => q.select('*').eq('id', id)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await withRetry(() => 
      safeSupabase.client.auth.getUser()
    )
    if (!user) return null
    
    const result = await safeSupabase.safeSelect<User>(
      'usuarios',
      (q) => q.select('*').eq('id', user.id)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async getByEmail(email: string): Promise<User | null> {
    const result = await safeSupabase.safeSelect<User>(
      'usuarios',
      (q) => q.select('*').eq('email', email)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const result = await safeSupabase.safeUpdate<User>(
      'usuarios',
      {
        ...userData,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
    return result.data as User
  },

  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    const result = await safeSupabase.safeUpdate<User>(
      'usuarios',
      {
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
    return result.data as User
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    try {
      const { error } = await safeSupabase.client.auth.admin.updateUserById(
        id,
        { password: newPassword }
      )
      if (error) throw error
    } catch (error) {
      throw formatSupabaseError(error)
    }
  },

  async deleteUser(id: string): Promise<void> {
    // Eliminar dependencias
    await safeSupabase.safeDelete('bartenders', { usuario_id: id })
    await safeSupabase.safeDelete('meseros', { usuario_id: id })
    
    const result = await safeSupabase.safeDelete('usuarios', { id })
    if (!result.success) throw result.error
  },

  // ============================================================
  // AUTORIZACIÓN Y NIP - CON REINTENTOS
  // ============================================================

  async getNIP(usuarioId: string): Promise<{ codigo: string | null, expiracion: string | null }> {
    const result = await withRetry(() => 
      safeSupabase.safeSelect<{ codigo_acceso: string, codigo_expiracion: string }>(
        'usuarios',
        (q) => q.select('codigo_acceso, codigo_expiracion').eq('id', usuarioId)
      )
    )
    
    if (!result.success) throw result.error
    return {
      codigo: result.data?.[0]?.codigo_acceso || null,
      expiracion: result.data?.[0]?.codigo_expiracion || null
    }
  },

  async generarNIP(usuarioId: string, adminId: string): Promise<string> {
    // Verificar que el admin existe
    const adminCheck = await safeSupabase.safeSelect<User>(
      'usuarios',
      (q) => q.select('id, email').eq('id', adminId).eq('rol', 'admin')
    )
    
    if (!adminCheck.success || !adminCheck.data?.length) {
      throw new Error('Administrador no encontrado o no tiene permisos')
    }
    
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    const expiracion = new Date()
    expiracion.setHours(expiracion.getHours() + 24)
    
    const result = await safeSupabase.safeUpdate<User>(
      'usuarios',
      {
        codigo_acceso: codigo,
        codigo_expiracion: expiracion.toISOString(),
        autorizado_por: adminId,
        activo: true,
        updated_at: new Date().toISOString()
      },
      { id: usuarioId }
    )
    
    if (!result.success) throw result.error
    
    return codigo
  },

  // ============================================================
  // VERIFICAR NIP - CON REINTENTOS
  // ============================================================

  async verificarSoloCodigo(codigo: string): Promise<any> {
    const result = await withRetry(() =>
      safeSupabase.safeSelect<{
        id: string,
        email: string,
        nombre: string,
        apellido: string,
        rol: string,
        codigo_acceso: string,
        codigo_expiracion: string,
        activo: boolean
      }>(
        'usuarios',
        (q) => q.select('id, email, nombre, apellido, rol, codigo_acceso, codigo_expiracion, activo')
          .eq('codigo_acceso', codigo)
      )
    )
    
    if (!result.success) {
      return { valido: false, mensaje: 'Error al verificar el NIP. Intenta de nuevo.' }
    }
    
    const data = result.data?.[0]
    
    if (!data) {
      return { valido: false, mensaje: 'NIP inválido' }
    }
    
    const expiracion = new Date(data.codigo_expiracion)
    if (expiracion < new Date()) {
      return { valido: false, mensaje: 'El NIP ha expirado. Contacta al administrador para generar uno nuevo.' }
    }
    
    if (!data.activo) {
      return { valido: false, mensaje: 'Usuario desactivado. Contacta al administrador.' }
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
    const result = await safeSupabase.safeUpdate<User>(
      'usuarios',
      {
        activo: false,
        codigo_acceso: null,
        codigo_expiracion: null,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
  },

  async activarUsuario(id: string): Promise<void> {
    const result = await safeSupabase.safeUpdate<User>(
      'usuarios',
      {
        activo: true,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
  },

  // ============================================================
  // FUNCIONES DE TURNO
  // ============================================================

  async iniciarTurno(usuarioId: string): Promise<void> {
    const user = await this.getById(usuarioId)
    if (!user) throw new Error('Usuario no encontrado')
    
    if (user.rol === 'bartender') {
      const result = await safeSupabase.safeUpdate<Bartender>(
        'bartenders',
        { turno_activo: true },
        { usuario_id: usuarioId }
      )
      if (!result.success) throw result.error
    } else if (user.rol === 'mesero') {
      const result = await safeSupabase.safeUpdate<Mesero>(
        'meseros',
        { turno_activo: true },
        { usuario_id: usuarioId }
      )
      if (!result.success) throw result.error
    }
  },

  async terminarTurno(usuarioId: string): Promise<void> {
    const user = await this.getById(usuarioId)
    if (!user) throw new Error('Usuario no encontrado')
    
    if (user.rol === 'bartender') {
      const result = await safeSupabase.safeUpdate<Bartender>(
        'bartenders',
        {
          turno_activo: false,
          updated_at: new Date().toISOString()
        },
        { usuario_id: usuarioId }
      )
      if (!result.success) throw result.error
    } else if (user.rol === 'mesero') {
      const result = await safeSupabase.safeUpdate<Mesero>(
        'meseros',
        {
          turno_activo: false,
          updated_at: new Date().toISOString()
        },
        { usuario_id: usuarioId }
      )
      if (!result.success) throw result.error
    }
    
    await this.desactivarUsuario(usuarioId)
  },

  async getTurnoActivo(usuarioId: string): Promise<boolean> {
    const user = await this.getById(usuarioId)
    if (!user) return false
    
    if (user.rol === 'bartender') {
      const result = await safeSupabase.safeSelect<{ turno_activo: boolean }>(
        'bartenders',
        (q) => q.select('turno_activo').eq('usuario_id', usuarioId)
      )
      if (!result.success) return false
      return result.data?.[0]?.turno_activo || false
    } else if (user.rol === 'mesero') {
      const result = await safeSupabase.safeSelect<{ turno_activo: boolean }>(
        'meseros',
        (q) => q.select('turno_activo').eq('usuario_id', usuarioId)
      )
      if (!result.success) return false
      return result.data?.[0]?.turno_activo || false
    }
    
    return false
  },

  // ============================================================
  // BARTENDERS - CRUD CON ERROR HANDLING
  // ============================================================

  async getBartenders(): Promise<Bartender[]> {
    const result = await safeSupabase.safeSelect<Bartender>(
      'bartenders',
      (q) => q.select(`
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
      `).order('nombre_completo')
    )
    
    if (!result.success) throw result.error
    return result.data || []
  },

  async getBartenderById(id: string): Promise<Bartender | null> {
    const result = await safeSupabase.safeSelect<Bartender>(
      'bartenders',
      (q) => q.select(`
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
      `).eq('id', id)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async getBartenderByUsuarioId(usuarioId: string): Promise<Bartender | null> {
    const result = await safeSupabase.safeSelect<Bartender>(
      'bartenders',
      (q) => q.select(`
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
      `).eq('usuario_id', usuarioId)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async createBartender(data: {
    usuario_id: string
    codigo: string
    nombre_completo: string
    fecha_contratacion?: string
  }): Promise<Bartender> {
    const result = await safeSupabase.safeInsert<Bartender>(
      'bartenders',
      {
        usuario_id: data.usuario_id,
        codigo: data.codigo,
        nombre_completo: data.nombre_completo,
        fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
        activo: false,
        turno_activo: false,
        calificacion_eficiencia: 0,
        bebidas_preparadas: 0,
        ventas_totales: 0,
        mermas_reportadas: 0,
        productividad: 0
      }
    )
    
    if (!result.success) throw result.error
    return result.data as Bartender
  },

  async updateBartender(id: string, data: Partial<Bartender>): Promise<Bartender> {
    const result = await safeSupabase.safeUpdate<Bartender>(
      'bartenders',
      {
        ...data,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
    return result.data as Bartender
  },

  async deleteBartender(id: string): Promise<void> {
    const result = await safeSupabase.safeDelete('bartenders', { id })
    if (!result.success) throw result.error
  },

  async uploadBartenderFoto(file: File, bartenderId: string, usuarioId: string): Promise<string> {
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `bartenders/${bartenderId}/${fileName}`
    
    try {
      const { error: uploadError } = await safeSupabase.client.storage
        .from('barranco-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = await safeSupabase.client.storage
        .from('barranco-images')
        .getPublicUrl(path)
      
      const avatarUrl = urlData.publicUrl
      
      await safeSupabase.safeUpdate('bartenders', { foto_url: avatarUrl }, { id: bartenderId })
      await safeSupabase.safeUpdate('usuarios', { avatar_url: avatarUrl }, { id: usuarioId })
      
      return avatarUrl
    } catch (error) {
      throw formatSupabaseError(error)
    }
  },

  // ============================================================
  // MESEROS - CRUD CON ERROR HANDLING
  // ============================================================

  async getMeseros(): Promise<Mesero[]> {
    const result = await safeSupabase.safeSelect<Mesero>(
      'meseros',
      (q) => q.select(`
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
      `).order('nombre_completo')
    )
    
    if (!result.success) throw result.error
    return result.data || []
  },

  async getMeseroById(id: string): Promise<Mesero | null> {
    const result = await safeSupabase.safeSelect<Mesero>(
      'meseros',
      (q) => q.select(`
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
      `).eq('id', id)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async getMeseroByUsuarioId(usuarioId: string): Promise<Mesero | null> {
    const result = await safeSupabase.safeSelect<Mesero>(
      'meseros',
      (q) => q.select(`
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
      `).eq('usuario_id', usuarioId)
    )
    
    if (!result.success) throw result.error
    return result.data?.[0] || null
  },

  async createMesero(data: {
    usuario_id: string
    codigo: string
    nombre_completo: string
    fecha_contratacion?: string
  }): Promise<Mesero> {
    const result = await safeSupabase.safeInsert<Mesero>(
      'meseros',
      {
        usuario_id: data.usuario_id,
        codigo: data.codigo,
        nombre_completo: data.nombre_completo,
        fecha_contratacion: data.fecha_contratacion || new Date().toISOString().split('T')[0],
        activo: false,
        turno_activo: false,
        calificacion: 0,
        pedidos_atendidos: 0,
        ventas_totales: 0
      }
    )
    
    if (!result.success) throw result.error
    return result.data as Mesero
  },

  async updateMesero(id: string, data: Partial<Mesero>): Promise<Mesero> {
    const result = await safeSupabase.safeUpdate<Mesero>(
      'meseros',
      {
        ...data,
        updated_at: new Date().toISOString()
      },
      { id }
    )
    
    if (!result.success) throw result.error
    return result.data as Mesero
  },

  async deleteMesero(id: string): Promise<void> {
    const result = await safeSupabase.safeDelete('meseros', { id })
    if (!result.success) throw result.error
  },

  async uploadMeseroFoto(file: File, meseroId: string, usuarioId: string): Promise<string> {
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `meseros/${meseroId}/${fileName}`
    
    try {
      const { error: uploadError } = await safeSupabase.client.storage
        .from('barranco-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = await safeSupabase.client.storage
        .from('barranco-images')
        .getPublicUrl(path)
      
      const avatarUrl = urlData.publicUrl
      
      await safeSupabase.safeUpdate('meseros', { foto_url: avatarUrl }, { id: meseroId })
      await safeSupabase.safeUpdate('usuarios', { avatar_url: avatarUrl }, { id: usuarioId })
      
      return avatarUrl
    } catch (error) {
      throw formatSupabaseError(error)
    }
  },

  // ============================================================
  // CREAR USUARIO - CON ERROR HANDLING Y REINTENTOS
  // ============================================================

  async createFullUser(data: {
    email: string
    nombre: string
    apellido: string
    telefono?: string
    fecha_nacimiento?: string
    rol: 'admin' | 'bartender' | 'mesero'
    avatar_file?: File
  }): Promise<{ userId: string; email: string; rol: string; nip?: string }> {
    const pinSeisDigitos = Math.floor(100000 + Math.random() * 900000).toString()
    const password = data.rol === 'admin' ? 'Admin123!' : pinSeisDigitos
    
    // 1. Crear en Auth con reintentos
    let authResult
    try {
      authResult = await withRetry(() => 
        safeSupabase.safeSignUp(data.email, password, {
          nombre: data.nombre,
          apellido: data.apellido,
          rol: data.rol,
        })
      )
    } catch (error) {
      throw formatSupabaseError(error)
    }
    
    if (!authResult.success || !authResult.data?.user) {
      throw authResult.error || new Error('No se pudo crear el usuario')
    }
    
    const userId = authResult.data.user.id

    // 2. Crear en tabla usuarios
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let nipGenerado = null
    if (data.rol === 'bartender' || data.rol === 'mesero') {
      nipGenerado = Math.floor(100000 + Math.random() * 900000).toString()
      const expiracion = new Date()
      expiracion.setHours(expiracion.getHours() + 24)
      userInsert.codigo_acceso = nipGenerado
      userInsert.codigo_expiracion = expiracion.toISOString()
    }

    const userResult = await safeSupabase.safeInsert('usuarios', userInsert)
    if (!userResult.success) throw userResult.error

    const codigo = `USR-${Date.now().toString().slice(-6)}`
    const nombre_completo = `${data.nombre} ${data.apellido}`

    // 3. Crear perfil según rol
    if (data.rol === 'bartender') {
      await this.createBartender({
        usuario_id: userId,
        codigo: `BT-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0]
      })
    } else if (data.rol === 'mesero') {
      await this.createMesero({
        usuario_id: userId,
        codigo: `MS-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0]
      })
    }

    // 4. Subir avatar si se proporcionó
    if (data.avatar_file) {
      try {
        const extension = data.avatar_file.name.split('.').pop()
        const fileName = `${Date.now()}.${extension}`
        const folder = data.rol === 'admin' ? 'admins' : data.rol === 'bartender' ? 'bartenders' : 'meseros'
        const path = `${folder}/${userId}/${fileName}`
        
        const { error: uploadError } = await safeSupabase.client.storage
          .from('barranco-images')
          .upload(path, data.avatar_file, {
            cacheControl: '3600',
            upsert: true,
            contentType: data.avatar_file.type
          })
        
        if (!uploadError) {
          const { data: urlData } = await safeSupabase.client.storage
            .from('barranco-images')
            .getPublicUrl(path)
          const avatarUrl = urlData.publicUrl
          
          await safeSupabase.safeUpdate('usuarios', { avatar_url: avatarUrl }, { id: userId })
        }
      } catch (error) {
        console.error('Error uploading avatar:', error)
        // No lanzar error, el usuario ya fue creado
      }
    }

    // 5. Si es admin, activarlo inmediatamente
    if (data.rol === 'admin') {
      await safeSupabase.safeUpdate('usuarios', { activo: true }, { id: userId })
    }

    return { 
      userId, 
      email: data.email, 
      rol: data.rol,
      nip: nipGenerado || undefined
    }
  },

  async getCounters() {
    const bartendersResult = await safeSupabase.safeSelect(
      'bartenders',
      (q) => q.select('*', { count: 'exact', head: true }).eq('activo', true)
    )
    
    const meserosResult = await safeSupabase.safeSelect(
      'meseros',
      (q) => q.select('*', { count: 'exact', head: true }).eq('activo', true)
    )
    
    const adminsResult = await safeSupabase.safeSelect(
      'usuarios',
      (q) => q.select('*', { count: 'exact', head: true }).eq('rol', 'admin').eq('activo', true)
    )
    
    return {
      bartenders: (bartendersResult.data as any)?.length || 0,
      meseros: (meserosResult.data as any)?.length || 0,
      admins: (adminsResult.data as any)?.length || 0
    }
  },

  async uploadAdminFoto(file: File, usuarioId: string): Promise<string> {
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `admins/${usuarioId}/${fileName}`
    
    try {
      const { error: uploadError } = await safeSupabase.client.storage
        .from('barranco-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = await safeSupabase.client.storage
        .from('barranco-images')
        .getPublicUrl(path)
      
      const avatarUrl = urlData.publicUrl
      
      await safeSupabase.safeUpdate('usuarios', { avatar_url: avatarUrl }, { id: usuarioId })
      
      return avatarUrl
    } catch (error) {
      throw formatSupabaseError(error)
    }
  }
}
