import { createClient } from '@/lib/supabase/client'

export interface User {
  id: string
  email: string
  phone_number: string
  nombre: string
  apellido: string
  rol: 'admin' | 'bartender' | 'mesero' | 'caja' | 'auditor'
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

const ERROR_MESSAGES = {
  RATE_LIMIT: 'Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.',
  ALREADY_REGISTERED: 'Este correo ya está registrado en el sistema. Usa otro correo o edita el usuario existente.',
  INVALID_EMAIL: 'El correo electrónico no es válido. Verifica que esté bien escrito.',
  WEAK_PASSWORD: 'La contraseña es muy débil. Intenta con una más segura.',
  USER_NOT_FOUND: 'Usuario no encontrado en el sistema.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
  EMAIL_RATE_LIMIT: 'Se alcanzó el límite de correos enviados. Contacta al administrador o espera una hora.',
  NIP_EXPIRED: 'El NIP ha expirado. Solicita uno nuevo al administrador.',
  NIP_INVALID: 'El NIP es inválido. Verifica que sean 6 dígitos.',
  USER_INACTIVE: 'El usuario está desactivado. Contacta al administrador.',
  RLS_VIOLATION: 'No tienes permisos para acceder a esta información.',
  DUPLICATE_EMAIL: 'Ya existe un usuario con este correo electrónico.',
  INVALID_ROLE: 'El rol especificado no es válido.',
}

function getErrorMessage(error: any): string {
  const msg = error?.message?.toLowerCase() || ''
  const code = error?.code || ''
  
  if (code === '23505' || msg.includes('duplicate key')) return ERROR_MESSAGES.DUPLICATE_EMAIL
  if (code === '42501' || msg.includes('row-level security') || msg.includes('rls')) return ERROR_MESSAGES.RLS_VIOLATION
  if (msg.includes('rate limit') && msg.includes('email')) return ERROR_MESSAGES.EMAIL_RATE_LIMIT
  if (msg.includes('rate limit') || msg.includes('for security purposes')) return ERROR_MESSAGES.RATE_LIMIT
  if (msg.includes('already registered') || msg.includes('already exists')) return ERROR_MESSAGES.ALREADY_REGISTERED
  if (msg.includes('invalid email') || msg.includes('email address')) return ERROR_MESSAGES.INVALID_EMAIL
  if (msg.includes('password')) return ERROR_MESSAGES.WEAK_PASSWORD
  if (msg.includes('permission') || msg.includes('denied') || msg.includes('not authorized')) return ERROR_MESSAGES.PERMISSION_DENIED
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) return ERROR_MESSAGES.NETWORK_ERROR
  if (msg.includes('not found') || msg.includes('no rows')) return ERROR_MESSAGES.USER_NOT_FOUND
  
  return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR
}

function generarCodigo6Digitos(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function calcularExpiracion(horas: number = 24): string {
  const expiracion = new Date()
  expiracion.setHours(expiracion.getHours() + horas)
  return expiracion.toISOString()
}

function generarCodigoUsuario(): string {
  return `USR-${Date.now().toString().slice(-6)}`
}

export const userService = {
  async getAll(rol?: string): Promise<User[]> {
    const supabase = createClient()
    let query = supabase.from('usuarios').select('*').order('nombre')
    if (rol) query = query.eq('rol', rol)
    const { data, error } = await query
    if (error) throw new Error(getErrorMessage(error))
    return data || []
  },

  async getById(id: string): Promise<User | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async getByEmail(email: string): Promise<User | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
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
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const supabase = createClient()
    const { email, id: _, ...safeData } = userData as any
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ...safeData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()
    
    if (error) throw new Error(getErrorMessage(error))
    if (!data) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND)
    return data as User
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(getErrorMessage(error))
  },

  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    return this.updateUser(id, { avatar_url: avatarUrl })
  },

  async deleteUser(id: string): Promise<void> {
    const supabase = createClient()
    await supabase.from('bartenders').delete().eq('usuario_id', id)
    await supabase.from('meseros').delete().eq('usuario_id', id)
    await supabase.from('notificaciones_mesero').delete().eq('mesero_id', id)
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (error) throw new Error(getErrorMessage(error))
  },

  // ============================================================
  // GENERAR NIP - ACTUALIZA TABLA USUARIOS Y AUTH.USERS
  // ============================================================
  async generarNIP(usuarioId: string, adminId: string): Promise<string> {
    const supabase = createClient()
    
    // 1. Verificar que el admin existe
    const { data: adminCheck, error: adminError } = await supabase
      .from('usuarios')
      .select('id, email, rol')
      .eq('id', adminId)
      .eq('rol', 'admin')
      .maybeSingle()
    
    if (adminError) {
      console.error('Error al verificar admin:', adminError)
      throw new Error('Error al verificar permisos de administrador')
    }
    
    if (!adminCheck) {
      throw new Error(ERROR_MESSAGES.PERMISSION_DENIED)
    }
    
    // 2. Verificar que el usuario existe
    const { data: usuarioCheck, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, email, rol')
      .eq('id', usuarioId)
      .maybeSingle()
    
    if (usuarioError || !usuarioCheck) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND)
    }
    
    // 3. Generar NIP y expiración
    const codigo = generarCodigo6Digitos()
    const expiracion = calcularExpiracion(24)
    
    // 4. Actualizar tabla usuarios
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        codigo_acceso: codigo,
        codigo_expiracion: expiracion,
        autorizado_por: adminId,
        activo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', usuarioId)
      .select()
      .maybeSingle()
    
    if (error) throw new Error(getErrorMessage(error))
    if (!data) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND)
    
    // 5. Actualizar contraseña en auth.users usando la función RPC
    try {
      const { error: rpcError } = await supabase.rpc('actualizar_password_auth', {
        p_user_id: usuarioId,
        p_new_password: codigo
      })
      
      if (rpcError) {
        console.error('⚠️ No se pudo actualizar la contraseña en auth.users:', rpcError)
        console.error('El NIP se guardó en la tabla usuarios pero no funcionará para login')
        console.error('Solución: Ejecuta la función actualizar_password_auth en Supabase')
      }
    } catch (rpcError) {
      console.error('⚠️ Error al llamar RPC:', rpcError)
    }
    
    return codigo
  },

  async regenerarPIN(usuarioId: string): Promise<string> {
    const supabase = createClient()
    const nuevoPin = generarCodigo6Digitos()
    
    const { error } = await supabase
      .from('usuarios')
      .update({ pin: nuevoPin, updated_at: new Date().toISOString() })
      .eq('id', usuarioId)
    
    if (error) throw new Error(getErrorMessage(error))
    return nuevoPin
  },

  async verificarSoloCodigo(codigo: string): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol, codigo_acceso, codigo_expiracion, activo')
      .eq('codigo_acceso', codigo)
      .maybeSingle()
    
    if (error || !data) {
      return { valido: false, mensaje: ERROR_MESSAGES.NIP_INVALID }
    }
    
    const expiracion = new Date(data.codigo_expiracion)
    if (expiracion < new Date()) {
      return { valido: false, mensaje: ERROR_MESSAGES.NIP_EXPIRED }
    }
    
    if (!data.activo) {
      return { valido: false, mensaje: ERROR_MESSAGES.USER_INACTIVE }
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
    if (error) throw new Error(getErrorMessage(error))
  },

  async activarUsuario(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(getErrorMessage(error))
  },

  async getBartenders(): Promise<Bartender[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`*, usuarios (id, nombre, apellido, email, phone_number, avatar_url, activo, codigo_acceso, codigo_expiracion)`)
      .order('nombre_completo')
    if (error) throw new Error(getErrorMessage(error))
    return data || []
  },

  async getBartenderById(id: string): Promise<Bartender | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select(`*, usuarios (id, nombre, apellido, email, phone_number, avatar_url, activo, codigo_acceso, codigo_expiracion)`)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async getBartenderByUsuarioId(usuarioId: string): Promise<Bartender | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async deleteBartender(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('bartenders').delete().eq('id', id)
    if (error) throw new Error(getErrorMessage(error))
  },

  async getMeseros(): Promise<Mesero[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select(`*, usuarios (id, nombre, apellido, email, phone_number, avatar_url, activo, codigo_acceso, codigo_expiracion)`)
      .order('nombre_completo')
    if (error) throw new Error(getErrorMessage(error))
    return data || []
  },

  async getMeseroById(id: string): Promise<Mesero | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select(`*, usuarios (id, nombre, apellido, email, phone_number, avatar_url, activo, codigo_acceso, codigo_expiracion)`)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async getMeseroByUsuarioId(usuarioId: string): Promise<Mesero | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
    if (error) throw new Error(getErrorMessage(error))
    return data || null
  },

  async deleteMesero(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('meseros').delete().eq('id', id)
    if (error) throw new Error(getErrorMessage(error))
  },

  async uploadBartenderFoto(file: File, bartenderId: string, usuarioId: string): Promise<string> {
    const supabase = createClient()
    const extension = file.name.split('.').pop()
    const fileName = `${Date.now()}.${extension}`
    const path = `bartenders/${bartenderId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('barranco-images')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    if (uploadError) throw new Error(getErrorMessage(uploadError))
    const { data: urlData } = supabase.storage.from('barranco-images').getPublicUrl(path)
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
    if (uploadError) throw new Error(getErrorMessage(uploadError))
    const { data: urlData } = supabase.storage.from('barranco-images').getPublicUrl(path)
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
    if (uploadError) throw new Error(getErrorMessage(uploadError))
    const { data: urlData } = supabase.storage.from('barranco-images').getPublicUrl(path)
    const avatarUrl = urlData.publicUrl
    await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('id', usuarioId)
    return avatarUrl
  },

  async createFullUser(data: {
    email: string
    nombre: string
    apellido: string
    telefono?: string
    rol: 'admin' | 'bartender' | 'mesero' | 'caja'
  }): Promise<{ userId: string; email: string; rol: string; nip?: string }> {
    const supabase = createClient()
    
    if (!data.email || !data.nombre || !data.apellido) {
      throw new Error('Email, nombre y apellido son obligatorios')
    }
    
    const rolesValidos = ['admin', 'bartender', 'mesero', 'caja']
    if (!rolesValidos.includes(data.rol)) {
      throw new Error(ERROR_MESSAGES.INVALID_ROLE)
    }

    const nipGenerado = generarCodigo6Digitos()
    const pinSeisDigitos = generarCodigo6Digitos()
    const password = data.rol === 'admin' ? 'Admin123!' : nipGenerado
    const expiracion = calcularExpiracion(24)

    // 1. Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: password,
      options: {
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          rol: data.rol,
        },
      }
    })

    if (authError) throw new Error(getErrorMessage(authError))
    if (!authData.user) throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR)

    const userId = authData.user.id

    // 2. Crear registro en tabla usuarios
    const userInsert: any = {
      id: userId,
      email: data.email,
      password_hash: 'auth_managed',
      nombre: data.nombre,
      apellido: data.apellido,
      pin: pinSeisDigitos,
      rol: data.rol,
      telefono: data.telefono || null,
      phone_number: data.telefono || null,
      activo: true,
      email_verificado: true,
      codigo_acceso: data.rol !== 'admin' ? nipGenerado : null,
      codigo_expiracion: data.rol !== 'admin' ? expiracion : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: userError } = await supabase.from('usuarios').insert([userInsert])
    if (userError) throw new Error(getErrorMessage(userError))

    // 3. Crear registro específico según el rol
    const codigo = generarCodigoUsuario()
    const nombre_completo = `${data.nombre} ${data.apellido}`

    if (data.rol === 'bartender') {
      await supabase.from('bartenders').insert({
        usuario_id: userId,
        codigo: `BT-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0],
        activo: true,
        turno_activo: false
      })
    } else if (data.rol === 'mesero') {
      await supabase.from('meseros').insert({
        usuario_id: userId,
        codigo: `MS-${codigo}`,
        nombre_completo: nombre_completo,
        fecha_contratacion: new Date().toISOString().split('T')[0],
        activo: true,
        turno_activo: false
      })
    }

    return { 
      userId, 
      email: data.email, 
      rol: data.rol,
      nip: data.rol !== 'admin' ? nipGenerado : undefined 
    }
  },

  async getCounters() {
    const supabase = createClient()
    const [bartendersRes, meserosRes, adminsRes, cajasRes] = await Promise.all([
      supabase.from('bartenders').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('meseros').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'admin').eq('activo', true),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'caja').eq('activo', true)
    ])
    
    return {
      bartenders: bartendersRes.count || 0,
      meseros: meserosRes.count || 0,
      admins: adminsRes.count || 0,
      cajas: cajasRes.count || 0
    }
  }
}
