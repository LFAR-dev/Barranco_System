import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE JORNADAS
// Maneja apertura, cierre y consulta de jornadas operativas
// ============================================================

export interface Jornada {
  id: string
  fecha: string
  nombre: string
  hora_inicio: string
  hora_cierre: string | null
  estado: 'activa' | 'cerrada'
  cerrada_por: string | null
  notas: string | null
  configuracion: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AbrirJornadaResult {
  success: boolean
  jornada_id: string
  fecha: string
  nombre: string
}

export interface CerrarJornadaResult {
  success: boolean
  jornada_id: string
  pedidos_pendientes: number
  sesiones_cerradas: number
}

export interface ConfiguracionDia {
  id: string
  dia_semana: number
  hora_apertura: string
  hora_cierre: string
  activo: boolean
  notas: string | null
}

export const jornadaService = {
  /**
   * Obtiene la jornada activa actual (o null si no hay)
   */
  async getJornadaActual(): Promise<Jornada | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('jornadas')
      .select('*')
      .eq('estado', 'activa')
      .maybeSingle()

    if (error) {
      console.error('Error al obtener jornada actual:', error)
      return null
    }
    return data
  },

  /**
   * Obtiene el ID de la jornada activa (más rápido que getJornadaActual)
   */
  async getJornadaActualId(): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('obtener_jornada_actual')

    if (error) {
      console.error('Error al obtener jornada actual:', error)
      return null
    }
    return data
  },

  /**
   * Abre una nueva jornada (solo admin). Cierra cualquier jornada activa previa.
   */
  async abrirJornada(nombre: string, notas?: string): Promise<AbrirJornadaResult> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('abrir_jornada', {
      p_nombre: nombre,
      p_notas: notas || null
    })

    if (error) {
      console.error('Error al abrir jornada:', error)
      throw new Error(error.message || 'No se pudo abrir la jornada')
    }

    return data as AbrirJornadaResult
  },

  /**
   * Cierra una jornada (solo admin). Cierra sesiones de caja abiertas.
   */
  async cerrarJornada(jornadaId: string, notas?: string): Promise<CerrarJornadaResult> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('cerrar_jornada', {
      p_jornada_id: jornadaId,
      p_notas: notas || null
    })

    if (error) {
      console.error('Error al cerrar jornada:', error)
      throw new Error(error.message || 'No se pudo cerrar la jornada')
    }

    return data as CerrarJornadaResult
  },

  /**
   * Lista las últimas N jornadas (histórico)
   */
  async getHistorial(limit = 30): Promise<Jornada[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('jornadas')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error al obtener historial de jornadas:', error)
      return []
    }
    return data || []
  },

  /**
   * Obtiene una jornada por ID
   */
  async getById(id: string): Promise<Jornada | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('jornadas')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error al obtener jornada:', error)
      return null
    }
    return data
  },

  /**
   * Obtiene la configuración de horarios programados (por día de semana)
   */
  async getConfiguracion(): Promise<ConfiguracionDia[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('configuracion_jornada')
      .select('*')
      .order('dia_semana')

    if (error) {
      console.error('Error al obtener configuración:', error)
      return []
    }
    return data || []
  },

  /**
   * Actualiza la configuración de un día específico (solo admin)
   */
  async actualizarConfiguracion(
    diaSemana: number,
    horaApertura: string,
    horaCierre: string,
    activo: boolean = true,
    notas?: string
  ): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('configuracion_jornada')
      .update({
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
        activo,
        notas: notas || null,
        updated_at: new Date().toISOString()
      })
      .eq('dia_semana', diaSemana)

    if (error) {
      console.error('Error al actualizar configuración:', error)
      throw new Error('No se pudo actualizar la configuración')
    }
  },

  /**
   * Verifica si la jornada cambió (útil para forzar logout)
   * Compara el jornada_id guardado localmente con el actual
   */
  async checkJornadaCambio(jornadaIdAnterior: string | null): Promise<boolean> {
    const jornadaActual = await this.getJornadaActualId()
    return jornadaIdAnterior !== jornadaActual
  }
}
