import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE NOTIFICACIONES
// ============================================================

export interface Notificacion {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  created_at: string
  pedido_id?: string
  [key: string]: any
}

export const notificationService = {
  // ============================================================
  // NOTIFICACIONES AL BARTENDER
  // ============================================================
  
  async notificarBartender(data: {
    bartenderId?: string
    pedidoId?: string
    tipo: string
    mensaje: string
  }): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notificaciones_bartender')
      .insert([{
        bartender_id: data.bartenderId || null,
        pedido_id: data.pedidoId || null,
        tipo: data.tipo,
        mensaje: data.mensaje,
        leida: false
      }])
    
    if (error) {
      console.error('Error al notificar bartender:', error)
    }
  },

  async getNotificacionesBartender(soloNoLeidas = false): Promise<Notificacion[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('notificaciones_bartender')
      .select(`
        *,
        pedido:pedidos(id, mesa, items, total, estado)
      `)
      .order('created_at', { ascending: false })
      .limit(30)
    
    if (soloNoLeidas) {
      query = query.eq('leida', false)
    }
    
    const { data, error } = await query
    if (error) return []
    return data || []
  },

  async marcarNotificacionBartenderLeida(id: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('notificaciones_bartender')
      .update({ leida: true })
      .eq('id', id)
  },

  // ============================================================
  // NOTIFICACIONES AL MESERO
  // ============================================================

  async notificarMesero(data: {
    meseroId: string
    pedidoId?: string
    tipo: string
    mensaje: string
    mesaId?: string
    motivo?: string
  }): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notificaciones_mesero')
      .insert([{
        mesero_id: data.meseroId,
        pedido_id: data.pedidoId || null,
        mesa_id: data.mesaId || null,
        tipo: data.tipo,
        mensaje: data.mensaje,
        motivo: data.motivo || null,
        leida: false
      }])
    
    if (error) {
      console.error('Error al notificar mesero:', error)
    }
  },

  async getNotificacionesMesero(meseroId: string, soloNoLeidas = false): Promise<Notificacion[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('notificaciones_mesero')
      .select(`
        *,
        pedido:pedidos(id, mesa, items, total, estado)
      `)
      .eq('mesero_id', meseroId)
      .order('fecha', { ascending: false })
      .limit(30)
    
    if (soloNoLeidas) {
      query = query.eq('leida', false)
    }
    
    const { data, error } = await query
    if (error) return []
    return data || []
  },

  async marcarNotificacionMeseroLeida(id: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('notificaciones_mesero')
      .update({ leida: true })
      .eq('id', id)
  },

  // ============================================================
  // NOTIFICACIONES AL CAJERO
  // ============================================================

  async notificarCaja(data: {
    cajaId?: string
    pedidoId?: string
    tipo: string
    mensaje: string
    motivo?: string
  }): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notificaciones_caja')
      .insert([{
        caja_id: data.cajaId || null,
        pedido_id: data.pedidoId || null,
        tipo: data.tipo,
        mensaje: data.mensaje,
        motivo: data.motivo || null,
        leida: false
      }])
    
    if (error) {
      console.error('Error al notificar caja:', error)
    }
  },

  async getNotificacionesCaja(soloNoLeidas = false): Promise<Notificacion[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('notificaciones_caja')
      .select(`
        *,
        pedido:pedidos(id, mesa, items, total, estado)
      `)
      .order('created_at', { ascending: false })
      .limit(30)
    
    if (soloNoLeidas) {
      query = query.eq('leida', false)
    }
    
    const { data, error } = await query
    if (error) return []
    return data || []
  },

  async marcarNotificacionCajaLeida(id: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('notificaciones_caja')
      .update({ leida: true })
      .eq('id', id)
  },

  // ============================================================
  // NOTIFICACIONES AL ADMIN
  // ============================================================

  async notificarAdmin(data: {
    pedidoId?: string
    usuarioId?: string
    tipo: string
    mensaje: string
    motivo?: string
  }): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notificaciones_admin')
      .insert([{
        pedido_id: data.pedidoId || null,
        usuario_id: data.usuarioId || null,
        tipo: data.tipo,
        mensaje: data.mensaje,
        motivo: data.motivo || null,
        leida: false
      }])
    
    if (error) {
      console.error('Error al notificar admin:', error)
    }
  },

  // ============================================================
  // STOCK BAJO / AGOTADO
  // ============================================================

  async notificarStockBajo(producto: any, stockActual: number): Promise<void> {
    const supabase = createClient()
    
    const esAgotado = stockActual <= 0
    const tipo = esAgotado ? 'stock_agotado' : 'stock_bajo'
    const mensaje = esAgotado 
      ? `🚨 PRODUCTO AGOTADO: ${producto.nombre}`
      : `⚠️ Stock bajo: ${producto.nombre} (${stockActual} restantes)`

    // Notificar al admin
    await this.notificarAdmin({
      tipo: tipo,
      mensaje: mensaje,
      motivo: `Stock actual: ${stockActual}`
    })

    // Obtener usuarios activos
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, rol')
      .in('rol', ['bartender', 'mesero', 'caja'])
      .eq('activo', true)

    if (!usuarios || usuarios.length === 0) return

    // Notificar a bartenders (sin asignar a uno específico)
    await supabase.from('notificaciones_bartender').insert([{
      bartender_id: null,
      tipo: tipo,
      mensaje: mensaje,
      leida: false
    }])

    // Notificar a meseros
    const meseros = usuarios.filter(u => u.rol === 'mesero')
    if (meseros.length > 0) {
      await supabase.from('notificaciones_mesero').insert(
        meseros.map(m => ({
          mesero_id: m.id,
          tipo: tipo,
          mensaje: mensaje,
          leida: false
        }))
      )
    }

    // Notificar a cajas
    const cajas = usuarios.filter(u => u.rol === 'caja')
    if (cajas.length > 0) {
      await supabase.from('notificaciones_caja').insert(
        cajas.map(c => ({
          caja_id: c.id,
          tipo: tipo,
          mensaje: mensaje,
          leida: false
        }))
      )
    }
  }
}
