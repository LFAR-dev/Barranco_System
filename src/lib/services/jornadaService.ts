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
    /**
   * Obtiene las cuentas pendientes de cobro en una jornada.
   * Se usa para bloquear el cierre si hay cuentas abiertas.
   */
  async getCuentasPendientesCierre(jornadaId: string): Promise<Array<{
    id: string
    mesa: string
    total: number
    mesero: string
    estado: string
    abierta_en: string
  }>> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('cuentas_abiertas')
      .select(`
        id,
        total_actual,
        estado,
        abierta_en,
        mesa:mesas!mesa_id(numero),
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('jornada_id', jornadaId)
      .in('estado', ['abierta', 'cuenta_solicitada', 'cobrando'])
      .order('abierta_en', { ascending: true })

    if (error) {
      console.error('Error al obtener cuentas pendientes:', error)
      return []
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      mesa: c.mesa?.numero || 'N/A',
      total: Number(c.total_actual) || 0,
      mesero: c.mesero ? `${c.mesero.nombre} ${c.mesero.apellido}` : 'N/A',
      estado: c.estado,
      abierta_en: c.abierta_en
    }))
  },
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

    const result = data as AbrirJornadaResult

    // Registrar auditoría
    await registrarAuditoriaEvento({
      tipoEvento: 'apertura_turno',
      entidadId: result.jornada_id,
      entidadTipo: 'jornada',
      motivo: null,
      descripcion: `Apertura de turno: ${result.nombre}`,
      datosNuevos: {
        nombre: result.nombre,
        fecha: result.fecha,
        notas: notas || null
      },
      jornadaId: result.jornada_id
    })

    return result
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

    const result = data as CerrarJornadaResult

    // Registrar auditoría
    await registrarAuditoriaEvento({
      tipoEvento: 'cierre_turno',
      entidadId: jornadaId,
      entidadTipo: 'jornada',
      motivo: notas || null,
      descripcion: `Cierre de turno. Pedidos pendientes: ${result.pedidos_pendientes}. Sesiones cerradas: ${result.sesiones_cerradas}`,
      datosNuevos: {
        pedidos_pendientes: result.pedidos_pendientes,
        sesiones_cerradas: result.sesiones_cerradas,
        notas: notas || null
      },
      jornadaId: jornadaId
    })

    return result
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

// ============================================================
// EXTENSIÓN: Cierre definitivo de turno
// ============================================================

export interface CierreDefinitivoResult {
  success: boolean
  jornada_id: string
  pedidos_pendientes: number
  sesiones_cerradas: number
  trabajadores_notificados: number
}

/**
 * Cierra el turno de forma definitiva (bloquea operaciones).
 * Solo admin.
 */
export async function cerrarTurnoDefinitivo(
  jornadaId: string,
  notas?: string
): Promise<CierreDefinitivoResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('cerrar_jornada_definitivo', {
    p_jornada_id: jornadaId,
    p_notas: notas || null
  })

  if (error) {
    console.error('Error al cerrar turno:', error)
    throw new Error(error.message || 'No se pudo cerrar el turno')
  }

  const result = data as CierreDefinitivoResult

  // Registrar auditoría de cierre definitivo
  await registrarAuditoriaEvento({
    tipoEvento: 'cierre_definitivo_turno',
    entidadId: jornadaId,
    entidadTipo: 'jornada',
    motivo: notas || null,
    descripcion: `Cierre definitivo del turno. Trabajadores notificados: ${result.trabajadores_notificados}. Sesiones cerradas: ${result.sesiones_cerradas}. Pedidos pendientes: ${result.pedidos_pendientes}.`,
    datosNuevos: {
      pedidos_pendientes: result.pedidos_pendientes,
      sesiones_cerradas: result.sesiones_cerradas,
      trabajadores_notificados: result.trabajadores_notificados,
      notas: notas || null
    },
    jornadaId: jornadaId
  })

  return result
}

/**
 * Verifica si el turno está abierto
 */
export async function turnoEstaAbierto(): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('turno_esta_abierto')
  if (error) {
    console.error('Error al verificar turno:', error)
    return false
  }
  return data === true
}

// ============================================================
// AUDITORÍA INTERNA (helpers)
// ============================================================

/**
 * Registra un evento de auditoría desde el servicio de jornada.
 * No lanza error si falla — es best-effort.
 */
async function registrarAuditoriaEvento(data: {
  tipoEvento: string
  entidadId?: string | null
  entidadTipo?: string | null
  motivo?: string | null
  descripcion: string
  datosAnteriores?: any
  datosNuevos?: any
  jornadaId?: string | null
}): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('registrar_auditoria', {
      p_tipo_evento: data.tipoEvento,
      p_entidad_id: data.entidadId || null,
      p_entidad_tipo: data.entidadTipo || null,
      p_motivo: data.motivo || null,
      p_descripcion: data.descripcion,
      p_datos_anteriores: data.datosAnteriores || null,
      p_datos_nuevos: data.datosNuevos || null,
      p_jornada_id: data.jornadaId || null
    })
  } catch (e) {
    console.error('[auditoría] No se pudo registrar:', e)
  }
}

// Exportamos para uso interno (no como parte de la API pública)
export { registrarAuditoriaEvento }
