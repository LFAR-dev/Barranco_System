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
  cuenta_abierta_id?: string | null
  ayudado_por_id?: string | null
}

export interface CrearPedidoResult {
  success: boolean
  pedido_id: string
  jornada_id: string
  bartender_asignado_id: string | null
  sin_bartender: boolean
}

/**
 * Busca el bartender que debe atender un pedido nuevo.
 * Prioridad:
 *   1. turno_activo = true AND disponible = true
 *   2. turno_activo = true
 *   3. activo = true (fallback)
 * Devuelve null si no hay ninguno.
 */
async function resolverBartenderAsignable(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Prioridad 1: en turno y disponible
    const { data: p1 } = await supabase
      .from('bartenders')
      .select('id')
      .eq('activo', true)
      .eq('turno_activo', true)
      .eq('disponible', true)
      .limit(1)
      .maybeSingle()
    if (p1?.id) return p1.id

    // Prioridad 2: en turno
    const { data: p2 } = await supabase
      .from('bartenders')
      .select('id')
      .eq('activo', true)
      .eq('turno_activo', true)
      .limit(1)
      .maybeSingle()
    if (p2?.id) return p2.id

    // Prioridad 3: activo (aunque no esté en turno)
    const { data: p3 } = await supabase
      .from('bartenders')
      .select('id')
      .eq('activo', true)
      .limit(1)
      .maybeSingle()
    return p3?.id || null
  } catch (e) {
    console.warn('[orderService] Error buscando bartender asignable:', e)
    return null
  }
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

  async createOrder(order: {
    mesero_id: string
    meseroAsignadoId?: string
    mesa?: string
    mesaId?: string
    items: OrderItem[]
    total: number
    notas?: string
    tipo_origen?: 'mesero' | 'caja'
    ayudadoPorId?: string
    cuentaAbiertaId?: string | null
    jornadaId?: string | null
  }): Promise<Order> {
    const supabase = createClient()

    if (!order.mesero_id) throw new Error('Se requiere un usuario para crear el pedido')
    if (!order.items || order.items.length === 0)
      throw new Error('El pedido debe tener al menos un producto')
    if (order.total <= 0) throw new Error('El total del pedido debe ser mayor a 0')

    const meseroFinalId = order.meseroAsignadoId || order.mesero_id

    // Resolver jornada si no vino explícita
    let jornadaId = order.jornadaId
    if (jornadaId === undefined) {
      const { data: jornada } = await supabase
        .from('jornadas')
        .select('id')
        .eq('estado', 'activa')
        .maybeSingle()
      jornadaId = jornada?.id || null
    }

    // FIX: resolver bartender ANTES del insert para guardarlo en la fila
    const bartenderAsignadoId = await resolverBartenderAsignable(supabase)

    const { data, error } = await supabase
      .from('pedidos')
      .insert([
        {
          mesero_id: meseroFinalId,
          bartender_id: bartenderAsignadoId, // FIX: antes faltaba
          mesa: order.mesa || 'Caja',
          items: order.items,
          total: order.total,
          estado: 'pendiente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          jornada_id: jornadaId || null,
          cuenta_abierta_id: order.cuentaAbiertaId || null,
          ayudado_por_id: order.ayudadoPorId || null
        }
      ])
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo crear el pedido: ' + error.message)
    if (!data) throw new Error('No se pudo crear el pedido')

    // ============================================================
    // NOTIFICAR AL BARTENDER (si se pudo asignar)
    // ============================================================
    if (bartenderAsignadoId) {
      try {
        await supabase.from('notificaciones_bartender').insert([
          {
            bartender_id: bartenderAsignadoId,
            pedido_id: data.id,
            tipo: 'nuevo_pedido',
            mensaje: order.mesa
              ? `Nuevo pedido para ${order.mesa} - ${order.items.length} items`
              : `Nuevo pedido - ${order.items.length} items`,
            leida: false,
            jornada_id: jornadaId
          }
        ])
      } catch (e) {
        console.warn('[createOrder] No se pudo notificar al bartender:', e)
      }
    } else {
      console.warn(
        '[createOrder] Sin bartender activo. Pedido creado sin bartender_id ni notificacion.'
      )
    }

    // ============================================================
    // NOTIFICAR AL MESERO ASIGNADO (si es diferente al que creó)
    // ============================================================
    if (order.meseroAsignadoId && order.meseroAsignadoId !== order.mesero_id) {
      try {
        await notificationService.notificarMesero({
          meseroId: order.meseroAsignadoId,
          pedidoId: data.id,
          tipo: 'pedido_asignado',
          mensaje: `Nuevo pedido asignado: Mesa ${order.mesa} - ${order.items.length} items`
        })
      } catch (e) {
        console.warn('No se pudo notificar al mesero:', e)
      }
    }

    // ============================================================
    // NOTIFICAR AYUDA AL MESERO TITULAR (si aplica)
    // ============================================================
    if (order.ayudadoPorId && order.ayudadoPorId !== meseroFinalId) {
      try {
        const { data: ayudante } = await supabase
          .from('usuarios')
          .select('nombre, apellido')
          .eq('id', order.ayudadoPorId)
          .maybeSingle()

        const nombreAyudante = ayudante
          ? `${ayudante.nombre || ''} ${ayudante.apellido || ''}`.trim()
          : 'Un companero'

        await supabase.from('notificaciones_mesero').insert([
          {
            mesero_id: meseroFinalId,
            pedido_id: data.id,
            tipo: 'ayuda_mesero',
            mensaje: `${nombreAyudante} te ayudo en Mesa ${order.mesa} con ${order.items.length} items`,
            jornada_id: jornadaId
          }
        ])
      } catch (e) {
        console.warn('No se pudo notificar ayuda al mesero:', e)
      }
    }

    // ============================================================
    // DESCONTAR INVENTARIO (best-effort)
    // ============================================================
    try {
      const { data: invResult, error: invError } = await supabase.rpc(
        'descontar_inventario_por_pedido',
        { p_pedido_id: data.id }
      )
      if (invError) {
        console.error('[createOrder] Error al descontar inventario:', invError)
      } else {
        console.log('[createOrder] Inventario descontado:', invResult)
      }
    } catch (e) {
      console.error('[createOrder] Excepcion al descontar inventario:', e)
    }

    return data as Order
  },

  async updateOrder(
    id: string,
    updates: Partial<Order>
  ): Promise<Order> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo actualizar el pedido')
    return data as Order
  },

  async markServed(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'servido', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error('No se pudo marcar como servido')
  },

  async assignBartender(
    pedidoId: string,
    bartenderId: string | null
  ): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('pedidos')
      .update({
        bartender_id: bartenderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
    if (error) throw new Error('No se pudo asignar el bartender')
  },

  canCancelOrder(pedido: Order): { can: boolean; reason?: string } {
    if (pedido.estado === 'servido') {
      return { can: false, reason: 'El pedido ya fue servido' }
    }
    if (pedido.estado === 'cancelado') {
      return { can: false, reason: 'El pedido ya esta cancelado' }
    }
    return { can: true }
  },

  async cancelOrder(id: string, motivo: string, usuarioId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('pedidos')
      .update({
        estado: 'cancelado',
        motivo_cancelacion: motivo,
        cancelado_por: usuarioId,
        cancelado_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    if (error) throw new Error('No se pudo cancelar el pedido')

    try {
      const { data: revResult, error: revError } = await supabase.rpc(
        'revertir_inventario_por_pedido',
        { p_pedido_id: id }
      )
      if (revError) {
        console.error('[cancelOrder] Error al revertir inventario:', revError)
      } else {
        console.log('[cancelOrder] Inventario revertido:', revResult)
      }
    } catch (e) {
      console.error('[cancelOrder] Excepcion al revertir inventario:', e)
    }
  },

  async getAyudasDeJornada(jornadaId: string): Promise<
    Array<{
      pedido_id: string
      mesa: string
      total: number
      items_count: number
      ayudante: { usuario_id: string; nombre: string; apellido: string }
      titular: { usuario_id: string; nombre: string; apellido: string }
      created_at: string
    }>
  > {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        mesa,
        total,
        items,
        created_at,
        ayudado_por_id,
        mesero_id,
        ayudante:usuarios!ayudado_por_id(id, nombre, apellido),
        titular:usuarios!mesero_id(id, nombre, apellido)
      `)
      .eq('jornada_id', jornadaId)
      .not('ayudado_por_id', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error al cargar ayudas:', error)
      return []
    }

    return (data || []).map((p: any) => ({
      pedido_id: p.id,
      mesa: p.mesa || 'N/A',
      total: Number(p.total) || 0,
      items_count: Array.isArray(p.items) ? p.items.length : 0,
      ayudante: {
        usuario_id: p.ayudado_por_id,
        nombre: p.ayudante?.nombre || '',
        apellido: p.ayudante?.apellido || ''
      },
      titular: {
        usuario_id: p.mesero_id,
        nombre: p.titular?.nombre || '',
        apellido: p.titular?.apellido || ''
      },
      created_at: p.created_at
    }))
  },

  async getRendimientoProducto(productoId: string): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pedidos')
      .select('items, total, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return null

    let totalVendido = 0
    let cantidadVendida = 0

    for (const pedido of data || []) {
      const items = Array.isArray(pedido.items) ? pedido.items : []
      for (const item of items) {
        if (item.receta_id === productoId) {
          cantidadVendida += Number(item.cantidad) || 0
          totalVendido += (Number(item.precio) || 0) * (Number(item.cantidad) || 0)
        }
      }
    }

    return { totalVendido, cantidadVendida }
  },

  async getNotificacionesAdmin(): Promise<any[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notificaciones_admin')
      .select('*')
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return []
    return data || []
  }
}