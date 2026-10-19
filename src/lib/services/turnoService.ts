import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE TURNOS
// Gestiona la activación de trabajadores por jornada
// ============================================================

export type RolTurno = 'caja' | 'bartender' | 'mesero'

export interface TrabajadorDisponible {
  usuario_id: string
  nombre: string
  apellido: string
  email: string
  rol: RolTurno
  avatar_url: string | null
  activo: boolean
  seleccionado: boolean
}

export interface TrabajadorTurno {
  usuario_id: string
  nombre: string
  apellido: string
  email: string
  rol: RolTurno
  avatar_url: string | null
  activo_en_turno: boolean
}

export const turnoService = {
  /**
   * Devuelve todos los trabajadores activos de un rol (sin filtrar por turno)
   */
  async getTrabajadoresDisponiblesPorRol(rol: RolTurno): Promise<TrabajadorDisponible[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, avatar_url')
      .eq('rol', rol)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error al obtener trabajadores:', error)
      return []
    }

    return (data || []).map((u: any) => ({
      usuario_id: u.id,
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      rol,
      avatar_url: u.avatar_url,
      activo: true,
      seleccionado: false
    }))
  },

  /**
   * Activa un turno con la selección de trabajadores
   */
  async activarTurnoConTrabajadores(
    jornadaId: string,
    cajeros: string[],
    bartenders: string[],
    meseros: string[]
  ): Promise<{ success: boolean; trabajadores_activados: number }> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('activar_turno_con_trabajadores', {
      p_jornada_id: jornadaId,
      p_cajeros: cajeros,
      p_bartenders: bartenders,
      p_meseros: meseros
    })

    if (error) {
      console.error('Error al activar turno:', error)
      throw new Error(error.message || 'No se pudo activar el turno')
    }

    const result = data as { success: boolean; trabajadores_activados: number }

    // Registrar auditoría
    try {
      await supabase.rpc('registrar_auditoria', {
        p_tipo_evento: 'activacion_trabajadores',
        p_entidad_id: jornadaId,
        p_entidad_tipo: 'jornada',
        p_motivo: null,
        p_descripcion: `Activación de ${result.trabajadores_activados} trabajadores: ${cajeros.length} cajeros, ${bartenders.length} bartenders, ${meseros.length} meseros`,
        p_datos_anteriores: null,
        p_datos_nuevos: {
          cajeros: cajeros.length,
          bartenders: bartenders.length,
          meseros: meseros.length,
          trabajadores_activados: result.trabajadores_activados
        },
        p_jornada_id: jornadaId
      })
    } catch (e) {
      console.error('[auditoría] No se pudo registrar activación:', e)
    }

    return result
  },

  /**
   * Devuelve los trabajadores activos de un turno (opcionalmente filtrado por rol)
   */
  async getTrabajadoresActivosTurno(
    jornadaId: string,
    rol?: RolTurno
  ): Promise<TrabajadorTurno[]> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_trabajadores_activos_turno', {
      p_jornada_id: jornadaId,
      p_rol: rol || null
    })

    if (error) {
      console.error('Error al obtener trabajadores activos:', error)
      return []
    }

    return (data || []) as TrabajadorTurno[]
  },

  /**
   * Verifica si un usuario está activo en el turno actual
   */
  async estaUsuarioActivoEnTurno(usuarioId: string): Promise<boolean> {
    const supabase = createClient()

    const { data: jornada } = await supabase
      .from('jornadas')
      .select('id')
      .eq('estado', 'activa')
      .maybeSingle()

    if (!jornada) return false

    const { data: registro } = await supabase
      .from('turno_trabajadores')
      .select('activo_en_turno')
      .eq('jornada_id', jornada.id)
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    return registro?.activo_en_turno === true
  },

  /**
   * Devuelve la selección actual de trabajadores de una jornada
   */
  async getSeleccionActual(jornadaId: string): Promise<string[]> {
    const supabase = createClient()

    const { data } = await supabase
      .from('turno_trabajadores')
      .select('usuario_id')
      .eq('jornada_id', jornadaId)
      .eq('activo_en_turno', true)

    return (data || []).map((r: any) => r.usuario_id)
  }
}
