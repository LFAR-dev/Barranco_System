import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE AUDITORÍA / BITÁCORA
// ============================================================

export interface EventoAuditoria {
  id: string
  tipo_evento: string
  entidad_id: string | null
  entidad_tipo: string | null
  usuario_id: string | null
  usuario_rol: string | null
  motivo: string | null
  descripcion: string
  datos_anteriores: any
  datos_nuevos: any
  jornada_id: string | null
  created_at: string
  // Relaciones
  usuario?: { nombre: string; apellido: string } | null
  jornada?: { nombre: string } | null
}

export interface AuditoriaFiltros {
  tipoEvento?: string
  usuarioId?: string
  fechaDesde?: string
  fechaHasta?: string
  searchTerm?: string
}

export interface AuditoriaStats {
  total: number
  cancelaciones: number
  jornadas: number
  inventario: number
  otros: number
  porTipo: Record<string, number>
}

export const auditoriaService = {
  /**
   * Obtiene eventos de auditoría con filtros
   */
  async getEventos(filtros: AuditoriaFiltros = {}): Promise<EventoAuditoria[]> {
    const supabase = createClient()

    let query = supabase
      .from('auditoria')
      .select(`
        *,
        usuario:usuarios!usuario_id(nombre, apellido),
        jornada:jornadas!jornada_id(nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filtros.tipoEvento) {
      query = query.eq('tipo_evento', filtros.tipoEvento)
    }
    if (filtros.usuarioId) {
      query = query.eq('usuario_id', filtros.usuarioId)
    }
    if (filtros.fechaDesde) {
      query = query.gte('created_at', filtros.fechaDesde)
    }
    if (filtros.fechaHasta) {
      query = query.lte('created_at', filtros.fechaHasta)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener auditoría:', error)
      return []
    }

    let eventos = (data || []) as EventoAuditoria[]

    if (filtros.searchTerm) {
      const term = filtros.searchTerm.toLowerCase()
      eventos = eventos.filter(e =>
        e.descripcion.toLowerCase().includes(term) ||
        e.motivo?.toLowerCase().includes(term) ||
        e.usuario?.nombre.toLowerCase().includes(term) ||
        e.usuario?.apellido.toLowerCase().includes(term)
      )
    }

    return eventos
  },

  /**
   * Estadísticas de auditoría
   */
  async getStats(): Promise<AuditoriaStats> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('auditoria')
      .select('tipo_evento')

    if (error || !data) {
      return {
        total: 0,
        cancelaciones: 0,
        jornadas: 0,
        inventario: 0,
        otros: 0,
        porTipo: {}
      }
    }

    const porTipo: Record<string, number> = {}
    let cancelaciones = 0
    let jornadas = 0
    let inventario = 0

    data.forEach((row: any) => {
      const tipo = row.tipo_evento
      porTipo[tipo] = (porTipo[tipo] || 0) + 1

      if (tipo.startsWith('cancelacion_')) cancelaciones++
      else if (tipo.startsWith('apertura_') || tipo.startsWith('cierre_') || tipo.startsWith('activacion_')) jornadas++
      else if (tipo.startsWith('stock_') || tipo.startsWith('cambio_inventario')) inventario++
    })

    return {
      total: data.length,
      cancelaciones,
      jornadas,
      inventario,
      otros: data.length - cancelaciones - jornadas - inventario,
      porTipo
    }
  },

  /**
   * Obtiene un evento por ID
   */
  async getEventoById(id: string): Promise<EventoAuditoria | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('auditoria')
      .select(`
        *,
        usuario:usuarios!usuario_id(nombre, apellido),
        jornada:jornadas!jornada_id(nombre)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) return null
    return data as EventoAuditoria
  }
}

// ============================================================
// HELPERS PARA UI
// ============================================================

export const TIPOS_EVENTO = {
  cancelacion_pedido: { label: 'Cancelación de pedido', color: 'red' },
  cancelacion_venta: { label: 'Cancelación de venta', color: 'red' },
  apertura_turno: { label: 'Apertura de turno', color: 'green' },
  cierre_turno: { label: 'Cierre de turno', color: 'gray' },
  cierre_caja: { label: 'Cierre de caja', color: 'blue' },
  activacion_trabajadores: { label: 'Activación de trabajadores', color: 'purple' },
  cambio_inventario: { label: 'Cambio de inventario', color: 'blue' },
  stock_agotado: { label: 'Stock agotado', color: 'red' },
  stock_bajo: { label: 'Stock bajo', color: 'amber' },
} as const

export function getTipoLabel(tipo: string): string {
  return (TIPOS_EVENTO as any)[tipo]?.label || tipo
}

export function getTipoColor(tipo: string): 'red' | 'green' | 'gray' | 'blue' | 'purple' | 'amber' {
  return (TIPOS_EVENTO as any)[tipo]?.color || 'gray'
}
