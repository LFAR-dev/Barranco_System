import { createClient } from '@/lib/supabase/client'

export interface OrderItem {
  receta_id: string
  cantidad: number
  nombre: string
  precio: number
}

export interface Order {
  id: string
  mesero_id: string
  bartender_id?: string
  mesa?: string
  items: OrderItem[]
  total: number
  estado: 'pendiente' | 'preparando' | 'listo' | 'servido' | 'cancelado'
  created_at: string
  updated_at: string
  venta_id?: string
}

export const orderService = {
  async getOrdersByEstado(estado?: string): Promise<Order[]> {
    const supabase = createClient()
    let query = supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .order('created_at', { ascending: false })
    if (estado) query = query.eq('estado', estado)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createOrder(order: any): Promise<Order> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        mesero_id: order.mesero_id,
        mesa: order.mesa,
        items: order.items,
        total: order.total,
        estado: 'pendiente'
      }])
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Order
  },

  async updateOrder(id: string, updates: any): Promise<Order> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    return data as Order
  },

  async assignBartender(orderId: string, bartenderId: string): Promise<Order> {
    return this.updateOrder(orderId, { bartender_id: bartenderId, estado: 'preparando' })
  },

  async markReady(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { estado: 'listo' })
  },

  async markServed(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { estado: 'servido' })
  },

  async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { estado: 'cancelado' })
  }
}