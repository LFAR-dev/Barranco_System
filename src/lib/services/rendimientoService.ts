import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE RENDIMIENTO
// Estadísticas por rol para una jornada
// ============================================================

export interface RendimientoMesero {
  usuario_id: string
  nombre: string
  pedidos_atendidos: number
  ventas_totales: number
  propinas: number
  ticket_promedio: number
  cancelaciones: number
}

export interface RendimientoBartender {
  bartender_id: string
  usuario_id: string
  nombre: string
  pedidos_preparados: number
  pedidos_pendientes: number
}

export interface RendimientoCaja {
  usuario_id: string
  nombre: string
  ventas_cobradas: number
  importe_cobrado: number
  propinas_recibidas: number
}

export const rendimientoService = {
  /**
   * Rendimiento de meseros en una jornada
   */
  async getRendimientoMeseros(jornadaId: string): Promise<RendimientoMesero[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('calcular_rendimiento_por_rol', {
      p_jornada_id: jornadaId,
      p_rol: 'mesero'
    })

    if (error) {
      console.error('Error al obtener rendimiento de meseros:', error)
      return []
    }
    return (data as RendimientoMesero[]) || []
  },

  /**
   * Rendimiento de bartenders en una jornada
   */
  async getRendimientoBartenders(jornadaId: string): Promise<RendimientoBartender[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('calcular_rendimiento_por_rol', {
      p_jornada_id: jornadaId,
      p_rol: 'bartender'
    })

    if (error) {
      console.error('Error al obtener rendimiento de bartenders:', error)
      return []
    }
    return (data as RendimientoBartender[]) || []
  },

  /**
   * Rendimiento de cajeros en una jornada
   */
  async getRendimientoCaja(jornadaId: string): Promise<RendimientoCaja[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('calcular_rendimiento_por_rol', {
      p_jornada_id: jornadaId,
      p_rol: 'caja'
    })

    if (error) {
      console.error('Error al obtener rendimiento de caja:', error)
      return []
    }
    return (data as RendimientoCaja[]) || []
  },

  /**
   * Rendimiento del usuario actual (para mostrarlo en su propio dashboard)
   */
  async getMiRendimiento(jornadaId: string, rol: string, usuarioId: string): Promise<any | null> {
    if (rol === 'mesero') {
      const lista = await this.getRendimientoMeseros(jornadaId)
      return lista.find(m => m.usuario_id === usuarioId) || null
    }
    if (rol === 'bartender') {
      const lista = await this.getRendimientoBartenders(jornadaId)
      return lista.find(b => b.usuario_id === usuarioId) || null
    }
    if (rol === 'caja') {
      const lista = await this.getRendimientoCaja(jornadaId)
      return lista.find(c => c.usuario_id === usuarioId) || null
    }
    return null
  }
}
