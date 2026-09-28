import { createClient } from '@/lib/supabase/client'

// ============================================================
// TIPOS DE AUDITORÍA
// ============================================================

export interface CancelacionAudit {
  id: string
  tipo: 'cancelacion'
  pedido_id: string
  usuario_id: string
  usuario_nombre: string
  usuario_rol: string
  usuario_avatar?: string
  mensaje: string
  motivo: string
  leida: boolean
  created_at: string
  pedido_info?: {
    mesa?: string
    total?: number
    items?: any[]
  }
}

export interface MermaAudit {
  id: string
  tipo: 'merma'
  producto_id: string
  producto_nombre: string
  producto_marca?: string
  bartender_id?: string
  bartender_nombre?: string
  bartender_avatar?: string
  cantidad: number
  unidad?: string
  motivo: string
  descripcion?: string
  tipo_merma?: string
  valor_perdido: number
  auditada: boolean
  fecha: string
  created_at: string
}

export interface AuditoriaFiltros {
  fecha_inicio?: string
  fecha_fin?: string
  usuario_id?: string
  tipo?: 'cancelacion' | 'merma' | 'todas'
  solo_no_leidas?: boolean
}

// ============================================================
// SERVICIO DE AUDITORÍA
// ============================================================

export const auditService = {
  // ============================================================
  // CANCELACIONES
  // ============================================================

  async getCancelaciones(filtros?: AuditoriaFiltros): Promise<CancelacionAudit[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('notificaciones_admin')
      .select(`
        id,
        pedido_id,
        usuario_id,
        tipo,
        mensaje,
        motivo,
        leida,
        created_at,
        usuario:usuarios!usuario_id(
          id,
          nombre,
          apellido,
          rol,
          avatar_url
        ),
        pedido:pedidos!pedido_id(
          id,
          mesa,
          total,
          items
        )
      `)
      .eq('tipo', 'pedido_cancelado')
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filtros?.fecha_inicio) {
      query = query.gte('created_at', filtros.fecha_inicio)
    }
    if (filtros?.fecha_fin) {
      query = query.lte('created_at', filtros.fecha_fin)
    }
    if (filtros?.usuario_id) {
      query = query.eq('usuario_id', filtros.usuario_id)
    }
    if (filtros?.solo_no_leidas) {
      query = query.eq('leida', false)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error al cargar cancelaciones:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      tipo: 'cancelacion' as const,
      pedido_id: item.pedido_id,
      usuario_id: item.usuario_id,
      usuario_nombre: item.usuario ? `${item.usuario.nombre} ${item.usuario.apellido}` : 'Usuario desconocido',
      usuario_rol: item.usuario?.rol || 'desconocido',
      usuario_avatar: item.usuario?.avatar_url,
      mensaje: item.mensaje,
      motivo: item.motivo || 'Sin motivo especificado',
      leida: item.leida,
      created_at: item.created_at,
      pedido_info: item.pedido ? {
        mesa: item.pedido.mesa,
        total: item.pedido.total,
        items: item.pedido.items
      } : undefined
    }))
  },

  // ============================================================
  // MERMAS
  // ============================================================

  async getMermas(filtros?: AuditoriaFiltros): Promise<MermaAudit[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('mermas')
      .select(`
        id,
        producto_id,
        bartender_id,
        cantidad,
        motivo,
        descripcion,
        tipo,
        valor_perdido,
        auditada,
        fecha,
        created_at,
        producto:productos!producto_id(
          id,
          nombre,
          marca,
          unidad_medida
        ),
        bartender:bartenders!bartender_id(
          id,
          nombre_completo,
          foto_url
        )
      `)
      .order('fecha', { ascending: false })

    // Aplicar filtros
    if (filtros?.fecha_inicio) {
      query = query.gte('fecha', filtros.fecha_inicio)
    }
    if (filtros?.fecha_fin) {
      query = query.lte('fecha', filtros.fecha_fin)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error al cargar mermas:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      tipo: 'merma' as const,
      producto_id: item.producto_id,
      producto_nombre: item.producto?.nombre || 'Producto desconocido',
      producto_marca: item.producto?.marca,
      bartender_id: item.bartender_id,
      bartender_nombre: item.bartender?.nombre_completo || 'Sin asignar',
      bartender_avatar: item.bartender?.foto_url,
      cantidad: item.cantidad,
      unidad: item.producto?.unidad_medida,
      motivo: item.motivo,
      descripcion: item.descripcion,
      tipo_merma: item.tipo,
      valor_perdido: item.valor_perdido || 0,
      auditada: item.auditada || false,
      fecha: item.fecha,
      created_at: item.created_at
    }))
  },

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  async getEstadisticas(filtros?: AuditoriaFiltros) {
    const [cancelaciones, mermas] = await Promise.all([
      this.getCancelaciones(filtros),
      this.getMermas(filtros)
    ])

    const totalMermas = mermas.reduce((sum, m) => sum + (m.valor_perdido || 0), 0)
    const cancelacionesNoLeidas = cancelaciones.filter(c => !c.leida).length
    const mermasNoAuditadas = mermas.filter(m => !m.auditada).length

    return {
      cancelaciones: {
        total: cancelaciones.length,
        noLeidas: cancelacionesNoLeidas,
        valorTotal: cancelaciones.reduce((sum, c) => sum + (c.pedido_info?.total || 0), 0)
      },
      mermas: {
        total: mermas.length,
        noAuditadas: mermasNoAuditadas,
        valorTotal: totalMermas
      }
    }
  },

  // ============================================================
  // MARCAR COMO LEÍDA / AUDITADA
  // ============================================================

  async marcarCancelacionLeida(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('notificaciones_admin')
      .update({ leida: true })
      .eq('id', id)
    if (error) throw new Error('No se pudo marcar como leída')
  },

  async marcarTodasCancelacionesLeidas(): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('notificaciones_admin')
      .update({ leida: true })
      .eq('leida', false)
    if (error) throw new Error('No se pudieron marcar como leídas')
  },

  async marcarMermaAuditada(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mermas')
      .update({ auditada: true })
      .eq('id', id)
    if (error) throw new Error('No se pudo marcar como auditada')
  },

  // ============================================================
  // OBTENER USUARIOS PARA FILTROS
  // ============================================================

  async getUsuariosParaFiltro(): Promise<any[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol, avatar_url')
      .in('rol', ['admin', 'bartender', 'mesero', 'caja'])
      .order('nombre')
    
    if (error) {
      console.error('Error al cargar usuarios:', error)
      return []
    }
    return data || []
  }
}
