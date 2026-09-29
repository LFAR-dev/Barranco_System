import { createClient } from '@/lib/supabase/client'
import { notificationService } from './notificationService'

export interface OrderItem {
  receta_id: string
  cantidad: number
  nombre: string
  precio: number
  tipo?: string
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
    if (error) throw new Error('No se pudieron cargar los pedidos')
    return data || []
  },

  async getOrderById(id: string): Promise<Order | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .eq('id', id)
      .maybeSingle()
    
    if (error) throw new Error('No se pudo cargar el pedido')
    return data
  },

  // ============================================================
  // CREAR PEDIDO - Notifica al bartender
  // ============================================================
  async createOrder(order: {
    mesero_id: string
    mesa?: string
    items: OrderItem[]
    total: number
    notas?: string
    tipo_origen?: 'mesero' | 'caja'
  }): Promise<Order> {
    const supabase = createClient()
    
    if (!order.mesero_id) throw new Error('Se requiere un usuario para crear el pedido')
    if (!order.items || order.items.length === 0) throw new Error('El pedido debe tener al menos un producto')
    if (order.total <= 0) throw new Error('El total del pedido debe ser mayor a 0')

    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        mesero_id: order.mesero_id,
        mesa: order.mesa || 'Caja',
        items: order.items,
        total: order.total,
        estado: 'pendiente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle()
    
    if (error) throw new Error('No se pudo crear el pedido')
    if (!data) throw new Error('No se pudo crear el pedido')

    // NOTIFICAR AL BARTENDER sobre el nuevo pedido
    try {
      await notificationService.notificarBartender({
        pedidoId: data.id,
        tipo: 'nuevo_pedido',
        mensaje: `📦 Nuevo pedido de ${order.mesa || 'Caja'} - ${order.items.length} items`
      })
    } catch (e) {
      console.error('No se pudo notificar al bartender:', e)
    }

    return data as Order
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()
    
    if (error) throw new Error('No se pudo actualizar el pedido')
    if (!data) throw new Error('No se pudo actualizar el pedido')
    
    return data as Order
  },

  // ============================================================
  // BARTENDER ACEPTA PEDIDO
  // ============================================================
  async assignBartender(orderId: string, bartenderId: string): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ 
        bartender_id: bartenderId, 
        estado: 'preparando',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo asignar el bartender')

    // Notificar al mesero que su pedido está en preparación
    if (data) {
      try {
        await notificationService.notificarMesero({
          meseroId: data.mesero_id,
          pedidoId: data.id,
          tipo: 'pedido_en_preparacion',
          mensaje: `👨‍🍳 Tu pedido de ${data.mesa || 'Caja'} está en preparación`
        })
      } catch (e) {
        console.error('No se pudo notificar al mesero:', e)
      }
    }

    return data as Order
  },

  // ============================================================
  // BARTENDER MARCA PEDIDO COMO LISTO
  // ============================================================
  async markReady(orderId: string): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'listo', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo marcar como listo')

    // Notificar al mesero Y a caja que el pedido está listo
    if (data) {
      try {
        await notificationService.notificarMesero({
          meseroId: data.mesero_id,
          pedidoId: data.id,
          tipo: 'pedido_listo',
          mensaje: `✅ ¡Pedido de ${data.mesa || 'Caja'} LISTO! Pasa a recogerlo`
        })

        await notificationService.notificarCaja({
          pedidoId: data.id,
          tipo: 'pedido_listo',
          mensaje: `✅ Pedido de ${data.mesa || 'Caja'} listo para cobrar`
        })
      } catch (e) {
        console.error('No se pudo notificar:', e)
      }
    }

    return data as Order
  },

  // ============================================================
  // ENTREGAR PEDIDO - Descuenta stock automáticamente
  // ============================================================
  async markServed(orderId: string): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'servido', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo marcar como servido')

    // Descontar stock automáticamente
    if (data) {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const usuarioId = userData?.user?.id || data.mesero_id

        const { data: descuentoData, error: descuentoError } = await supabase.rpc(
          'procesar_venta_con_descuento',
          {
            p_pedido_id: orderId,
            p_usuario_id: usuarioId
          }
        )

        if (descuentoError) {
          console.error('Error al descontar stock:', descuentoError)
        } else if (descuentoData) {
          // Si hay productos agotados o bajos, notificar
          const agotados = descuentoData.productos_agotados || []
          const bajos = descuentoData.productos_bajos || []

          for (const producto of agotados) {
            await notificationService.notificarStockBajo({ nombre: producto }, 0)
          }
          for (const producto of bajos) {
            await notificationService.notificarStockBajo({ nombre: producto }, 1)
          }
        }
      } catch (e) {
        console.error('Error al procesar descuento:', e)
      }
    }

    return data as Order
  },

  // ============================================================
  // CANCELAR PEDIDO - Restaura stock y notifica al admin
  // ============================================================
  async cancelOrder(
    orderId: string, 
    motivo: string, 
    canceladoPor: string
  ): Promise<Order> {
    const supabase = createClient()
    
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('El motivo de cancelación debe tener al menos 5 caracteres')
    }

    const pedidoActual = await this.getOrderById(orderId)
    if (!pedidoActual) throw new Error('El pedido no fue encontrado')
    if (pedidoActual.estado === 'cancelado') throw new Error('Este pedido ya fue cancelado')
    if (pedidoActual.estado === 'servido') throw new Error('Este pedido ya fue cobrado')

    // 1. Restaurar stock si el pedido estaba servido o en proceso
    if (pedidoActual.estado === 'listo') {
      try {
        await supabase.rpc('restaurar_stock_cancelacion', {
          p_pedido_id: orderId,
          p_usuario_id: canceladoPor
        })
      } catch (e) {
        console.error('Error al restaurar stock:', e)
      }
    }

    // 2. Actualizar estado
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo cancelar el pedido')

    // 3. Notificar al admin con el motivo
    try {
      await notificationService.notificarAdmin({
        pedidoId: orderId,
        usuarioId: canceladoPor,
        tipo: 'pedido_cancelado',
        mensaje: `Pedido cancelado: ${motivo}`,
        motivo: motivo
      })
    } catch (e) {
      console.error('No se pudo notificar al admin:', e)
    }

    return data as Order
  },

  canCancelOrder(order: Order): { can: boolean; reason?: string } {
    if (order.estado === 'cancelado') return { can: false, reason: 'Este pedido ya está cancelado' }
    if (order.estado === 'servido') return { can: false, reason: 'Este pedido ya fue cobrado' }
    return { can: true }
  },

  // ============================================================
  // RENDIMIENTO DE PRODUCTOS (para gráfica)
  // ============================================================
  async getRendimientoProducto(productoId: string): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('calcular_rendimiento_producto', {
      p_producto_id: productoId
    })
    if (error) {
      console.error('Error:', error)
      return null
    }
    return data
  }
}
