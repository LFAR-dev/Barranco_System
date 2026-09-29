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
  jornada_id?: string
}

export interface CrearPedidoResult {
  success: boolean
  pedido_id: string
  jornada_id: string
  bartender_asignado_id: string | null
  sin_bartender: boolean
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

  /**
   * 🆕 Obtiene pedidos filtrados por jornada
   */
  async getOrdersByJornada(jornadaId: string, estado?: string): Promise<Order[]> {
    const supabase = createClient()
    let query = supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .eq('jornada_id', jornadaId)
      .order('created_at', { ascending: false })
    
    if (estado) query = query.eq('estado', estado)
    
    const { data, error } = await query
    if (error) throw new Error('No se pudieron cargar los pedidos de la jornada')
    return data || []
  },

  /**
   * 🆕 Obtiene pedidos pendientes de la jornada activa
   * (incluye pedidos antiguos NO resueltos para que no se pierdan)
   */
  async getPedidosPendientesSinPerder(jornadaId: string): Promise<Order[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .in('estado', ['pendiente', 'preparando', 'listo'])
      .or(`jornada_id.eq.${jornadaId},jornada_id.is.null`)
      .order('created_at', { ascending: true })
    
    if (error) throw new Error('No se pudieron cargar los pedidos pendientes')
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
  // MÉTODO EXISTENTE: createOrder (sin jornada, legacy)
  // ============================================================
  
  /**
   * @deprecated Usar `createOrderConJornada` para nuevos pedidos.
   * Este método se mantiene por compatibilidad con pantallas antiguas.
   */
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

  // ============================================================
  // 🆕 MÉTODO NUEVO: createOrderConJornada
  // Crea pedido con jornada activa + bartender asignado (round-robin)
  // ============================================================
  
  /**
   * Crea un pedido asignándolo automáticamente a una jornada activa
   * y a un bartender disponible (round-robin).
   * 
   * Requiere que exista una jornada activa. Si no hay, lanza error.
   */
  async createOrderConJornada(order: {
    mesero_id: string
    mesa?: string
    items: OrderItem[]
    total: number
    notas?: string
  }): Promise<Order> {
    const supabase = createClient()
    
    if (!order.mesero_id) throw new Error('Se requiere un usuario para crear el pedido')
    if (!order.items || order.items.length === 0) throw new Error('El pedido debe tener al menos un producto')
    if (order.total <= 0) throw new Error('El total del pedido debe ser mayor a 0')

    // Llamar a la RPC que crea el pedido con jornada + bartender asignado
    const { data, error } = await supabase.rpc('crear_pedido_con_jornada', {
      p_mesero_id: order.mesero_id,
      p_mesa: order.mesa || 'Caja',
      p_items: order.items,
      p_total: order.total
    })

    if (error) {
      console.error('Error al crear pedido con jornada:', error)
      throw new Error(error.message || 'No se pudo crear el pedido')
    }

    const result = data as CrearPedidoResult

    // Notificar al bartender asignado (si lo hay)
    try {
      if (result.sin_bartender) {
        // No había bartenders disponibles → notificar al admin
        await notificationService.notificarAdmin({
          usuarioId: order.mesero_id,
          pedidoId: result.pedido_id,
          tipo: 'pedido_sin_bartender',
          mensaje: `⚠️ Pedido de ${order.mesa || 'Caja'} sin bartender disponible. Asignar manualmente.`
        })
      } else {
        await notificationService.notificarBartender({
          bartenderId: result.bartender_asignado_id || undefined,
          pedidoId: result.pedido_id,
          tipo: 'nuevo_pedido',
          mensaje: `📦 Nuevo pedido de ${order.mesa || 'Caja'} - ${order.items.length} items`
        })
      }
    } catch (e) {
      console.error('No se pudo notificar:', e)
    }

    // Cargar el pedido completo con sus relaciones
    const pedidoCompleto = await this.getOrderById(result.pedido_id)
    if (!pedidoCompleto) throw new Error('Pedido creado pero no se pudo recuperar')

    return pedidoCompleto
  },

  // ============================================================
  // 🆕 MÉTODO NUEVO: assignBartenderAutomatico
  // Reasigna un pedido al siguiente bartender disponible
  // ============================================================
  
  /**
   * Reasigna un pedido al siguiente bartender disponible (round-robin).
   * Útil para:
   * - Cuando el bartender actual se desconecta
   * - Cuando un pedido quedó sin asignar por falta de bartenders
   */
  async assignBartenderAutomatico(orderId: string): Promise<Order> {
    const supabase = createClient()

    // Llamar a la RPC para obtener el siguiente bartender
    const { data: bartenderId, error: rpcError } = await supabase.rpc('asignar_siguiente_bartender')

    if (rpcError) {
      console.error('Error al asignar bartender:', rpcError)
      throw new Error('No se pudo asignar bartender automáticamente')
    }

    if (!bartenderId) {
      throw new Error('No hay bartenders disponibles en este momento')
    }

    // Actualizar el pedido con el bartender asignado
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

    if (error) throw new Error('No se pudo asignar el bartender al pedido')

    // Notificar al mesero
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

  async markReady(orderId: string): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'listo', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo marcar como listo')

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

  async markServed(orderId: string): Promise<Order> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'servido', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo marcar como servido')

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

    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo cancelar el pedido')

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
  },

  // ============================================================
  // NOTIFICACIONES AL ADMIN
  // ============================================================
  
  async getNotificacionesAdmin(): Promise<any[]> {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('notificaciones_admin')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.warn('⚠️ Tabla notificaciones_admin no disponible:', error.message)
        return []
      }
      return data || []
    } catch (e) {
      console.warn('⚠️ Error al cargar notificaciones admin:', e)
      return []
    }
  },

  async marcarNotificacionAdminLeida(id: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('notificaciones_admin')
      .update({ leida: true })
      .eq('id', id)
  },

  async marcarTodasNotificacionesAdminLeidas(): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('notificaciones_admin')
      .update({ leida: true })
      .eq('leida', false)
  }
}
