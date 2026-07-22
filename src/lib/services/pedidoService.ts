import { createClient } from '@/lib/supabase/client'

export interface Pedido {
  id: string
  mesero_id: string
  bartender_id?: string
  mesa: string
  items: any[]
  total: number
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado'
  created_at: string
  updated_at: string
  mesero_nombre?: string
  bartender_nombre?: string
}

export const pedidoService = {
  // Crear un nuevo pedido (mesero)
  async crearPedido(data: {
    mesero_id: string
    mesa: string
    items: any[]
    total: number
  }): Promise<Pedido> {
    const supabase = createClient()
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{
        mesero_id: data.mesero_id,
        mesa: data.mesa,
        items: data.items,
        total: data.total,
        estado: 'pendiente'
      }])
      .select()
      .maybeSingle()
    
    if (error) throw error
    return pedido
  },

  // Obtener pedidos pendientes (bartender)
  async getPedidosPendientes(): Promise<Pedido[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Obtener pedidos de un bartender
  async getPedidosByBartender(bartenderId: string): Promise<Pedido[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('bartender_id', bartenderId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Tomar un pedido (bartender)
  async tomarPedido(pedidoId: string, bartenderId: string): Promise<Pedido> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .update({
        bartender_id: bartenderId,
        estado: 'preparando',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .select()
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  // Marcar pedido como listo (bartender)
  async marcarListo(pedidoId: string): Promise<Pedido> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .update({
        estado: 'listo',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .select()
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  // Marcar pedido como entregado (mesero)
  async marcarEntregado(pedidoId: string): Promise<Pedido> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .update({
        estado: 'entregado',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .select()
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  // Obtener pedidos de un mesero
  async getPedidosByMesero(meseroId: string): Promise<Pedido[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .eq('mesero_id', meseroId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}
