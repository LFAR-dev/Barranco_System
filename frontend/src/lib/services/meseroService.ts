import { createClient } from '@/lib/supabase/client'

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

export const meseroService = {
  async getAll() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
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
    return data.map((m: any) => ({
      ...m,
      email: m.usuarios?.email,
      phone_number: m.usuarios?.phone_number,
      avatar_url: m.usuarios?.avatar_url
    })) as Mesero[]
  },

  async getById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
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
    } as Mesero
  },

  async getByUsuarioId(usuarioId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
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
    } as Mesero
  },

  async create(mesero: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .insert([mesero])
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Mesero
  },

  async update(id: string, mesero: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .update(mesero)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Mesero
  },

  async delete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('meseros')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async uploadFoto(file: File, meseroId: string) {
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

  // Funciones para mesas y pedidos (del dashboard de mesero)
  async getMesas() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('activa', true)
      .order('numero')
    if (error) throw error
    return data
  },

  async getPedidoActivoByMesa(mesaId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos_activos')
      .select('*')
      .eq('mesa_id', mesaId)
      .eq('estado', 'activo')
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getPedidosByMesero(meseroId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos_activos')
      .select(`
        *,
        mesas!inner(numero, ubicacion)
      `)
      .eq('mesero_id', meseroId)
      .order('ultima_actividad', { ascending: false })
    if (error) throw error
    return data
  },

  async crearPedido(pedido: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos_activos')
      .insert([pedido])
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  },

  async actualizarPedido(id: string, updates: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos_activos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  },

  async enviarPedido(id: string) {
    const supabase = createClient()
    const pedido = await this.getPedidoById(id)
    if (!pedido) throw new Error('Pedido no encontrado')
    
    const { data, error } = await supabase
      .from('pedidos_activos')
      .update({ estado: 'enviado' })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    
    await supabase
      .from('pedidos')
      .insert([{
        mesero_id: pedido.mesero_id,
        mesa: (await this.getMesaById(pedido.mesa_id)).numero,
        items: pedido.items,
        total: pedido.total,
        estado: 'pendiente'
      }])
    
    return data
  },

  async getPedidoById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos_activos')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getMesaById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getNotificaciones(meseroId: string, soloNoLeidas = false) {
    const supabase = createClient()
    let query = supabase
      .from('notificaciones_mesero')
      .select('*')
      .eq('mesero_id', meseroId)
      .order('fecha', { ascending: false })
    if (soloNoLeidas) {
      query = query.eq('leida', false)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async crearNotificacion(meseroId: string, mesaId: string | null, tipo: string, mensaje: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('notificaciones_mesero')
      .insert([{
        mesero_id: meseroId,
        mesa_id: mesaId,
        tipo,
        mensaje
      }])
    if (error) throw error
  }
}
