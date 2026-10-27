import { createClient } from '@/lib/supabase/client'
import { asignacionMesasService } from './asignacionMesasService'

// ============================================================
// SERVICIO DE TURNOS
// Gestiona la activacion de trabajadores por jornada
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
  tiene_acceso: boolean
  nip_generado: boolean
}

export const turnoService = {
  /**
   * Devuelve todos los trabajadores activos de un rol (sin filtrar por turno)
   */
  async getTrabajadoresDisponiblesPorRol(
    rol: RolTurno
  ): Promise<TrabajadorDisponible[]> {
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
   * Activa un turno con la seleccion de trabajadores (RPC atomica)
   */
  async activarTurnoConTrabajadores(
    jornadaId: string,
    cajeros: string[],
    bartenders: string[],
    meseros: string[]
  ): Promise<{ success: boolean; trabajadores_activados: number }> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc(
      'activar_turno_con_trabajadores',
      {
        p_jornada_id: jornadaId,
        p_cajeros: cajeros,
        p_bartenders: bartenders,
        p_meseros: meseros
      }
    )

    if (error) {
      console.error('Error al activar turno:', error)
      throw new Error(error.message || 'No se pudo activar el turno')
    }

    const result = data as {
      success: boolean
      trabajadores_activados: number
    }

    try {
      await supabase.rpc('registrar_auditoria', {
        p_tipo_evento: 'activacion_trabajadores',
        p_entidad_id: jornadaId,
        p_entidad_tipo: 'jornada',
        p_motivo: null,
        p_descripcion: `Activacion de ${result.trabajadores_activados} trabajadores: ${cajeros.length} cajeros, ${bartenders.length} bartenders, ${meseros.length} meseros`,
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
      console.error('[auditoria] No se pudo registrar activacion:', e)
    }

    return result
  },

  /**
   * Devuelve los trabajadores activos de un turno.
   * CRITICO: Filtra estrictamente por jornadaId y activo_en_turno = true.
   */
  async getTrabajadoresActivosTurno(
    jornadaId: string,
    rol?: RolTurno
  ): Promise<TrabajadorTurno[]> {
    const supabase = createClient()

    let query = supabase
      .from('turno_trabajadores')
      .select(`
        usuario_id,
        rol,
        activo_en_turno,
        usuario:usuarios!usuario_id(id, nombre, apellido, email, avatar_url)
      `)
      .eq('jornada_id', jornadaId)
      .eq('activo_en_turno', true)

    if (rol) {
      query = query.eq('rol', rol)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener trabajadores activos:', error)
      return []
    }

    // Obtener NIPs generados para esta jornada
    const { data: accesos } = await supabase
      .from('usuarios')
      .select('id, codigo_acceso, codigo_expiracion')
      .in('id', (data || []).map((t: any) => t.usuario_id))

    const accesosMap = new Map((accesos || []).map((a: any) => [a.id, a]))

    return (data || []).map((t: any) => {
      const acceso = accesosMap.get(t.usuario_id)
      const ahora = new Date()
      const expira = acceso?.codigo_expiracion ? new Date(acceso.codigo_expiracion) : null
      const vigente = expira ? expira > ahora : false

      return {
        usuario_id: t.usuario_id,
        nombre: t.usuario?.nombre || '',
        apellido: t.usuario?.apellido || '',
        email: t.usuario?.email || '',
        rol: t.rol,
        avatar_url: t.usuario?.avatar_url || null,
        activo_en_turno: t.activo_en_turno,
        tiene_acceso: !!acceso?.codigo_acceso && vigente,
        nip_generado: !!acceso?.codigo_acceso
      }
    })
  },

  /**
   * Verifica si un usuario esta activo en el turno actual
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
   * Devuelve la seleccion actual de trabajadores de una jornada
   */
  async getSeleccionActual(jornadaId: string): Promise<string[]> {
    const supabase = createClient()

    const { data } = await supabase
      .from('turno_trabajadores')
      .select('usuario_id')
      .eq('jornada_id', jornadaId)
      .eq('activo_en_turno', true)

    return (data || []).map((r: any) => r.usuario_id)
  },

  /**
   * Agrega un trabajador a la jornada activa sin cerrarla.
   * CRITICO: Verifica que la operacion se guarde realmente antes de retornar exito.
   */
  async agregarTrabajador(
    jornadaId: string,
    usuarioId: string,
    rol: RolTurno,
    rebalancear: boolean = true
  ): Promise<void> {
    const supabase = createClient()

    // 1. Verificar si ya existe
    const { data: existente, error: checkError } = await supabase
      .from('turno_trabajadores')
      .select('id, activo_en_turno')
      .eq('jornada_id', jornadaId)
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (checkError) {
      throw new Error('Error al verificar trabajador: ' + checkError.message)
    }

    let operacionError = null

    if (existente) {
      if (!existente.activo_en_turno) {
        const { error } = await supabase
          .from('turno_trabajadores')
          .update({ activo_en_turno: true })
          .eq('id', existente.id)
        operacionError = error
      }
      // Si ya esta activo, no hacemos nada (evita duplicados)
    } else {
      const { error } = await supabase.from('turno_trabajadores').insert([
        {
          jornada_id: jornadaId,
          usuario_id: usuarioId,
          rol,
          activo_en_turno: true
        }
      ])
      operacionError = error
    }

    // CRITICO: Si hubo error, lanzarlo para que el frontend lo muestre
    if (operacionError) {
      console.error('[turnoService] Error real al agregar:', operacionError)
      throw new Error(
        operacionError.message || 'No se pudo guardar la asignacion en la base de datos'
      )
    }

    // 2. Re-balanceo
    if (rol === 'mesero' && rebalancear) {
      try {
        const meserosActivos = await asignacionMesasService.getMeserosActivos(
          jornadaId
        )
        if (meserosActivos.length > 0) {
          await asignacionMesasService.repartirMesas(
            jornadaId,
            meserosActivos.map((m) => m.usuario_id)
          )
        }
      } catch (rebalanceError) {
        console.error('Error en re-balanceo (la asignacion si se guardo):', rebalanceError)
      }
    }

    // 3. Auditoria
    try {
      await supabase.rpc('registrar_auditoria', {
        p_tipo_evento: 'agregar_trabajador_turno',
        p_entidad_id: jornadaId,
        p_entidad_tipo: 'jornada',
        p_motivo: null,
        p_descripcion: `Se agrego un ${rol} al turno`,
        p_datos_anteriores: null,
        p_datos_nuevos: { usuario_id: usuarioId, rol, rebalancear },
        p_jornada_id: jornadaId
      })
    } catch (e) {
      console.error('[auditoria] No se pudo registrar:', e)
    }
  },

  /**
   * Quita un trabajador de la jornada activa sin cerrarla.
   */
  async quitarTrabajador(
    jornadaId: string,
    usuarioId: string,
    rol: RolTurno
  ): Promise<void> {
    const supabase = createClient()

    // 1. Marcar como inactivo
    const { error } = await supabase
      .from('turno_trabajadores')
      .update({ activo_en_turno: false })
      .eq('jornada_id', jornadaId)
      .eq('usuario_id', usuarioId)

    if (error) {
      throw new Error(error.message || 'No se pudo quitar al trabajador')
    }

    // 2. Si es mesero, liberar sus mesas
    if (rol === 'mesero') {
      await asignacionMesasService.liberarMesasDeMesero(usuarioId, jornadaId)
    }

    // 3. Auditoria
    try {
      await supabase.rpc('registrar_auditoria', {
        p_tipo_evento: 'quitar_trabajador_turno',
        p_entidad_id: jornadaId,
        p_entidad_tipo: 'jornada',
        p_motivo: null,
        p_descripcion: `Se quito un ${rol} del turno`,
        p_datos_anteriores: { usuario_id: usuarioId, rol },
        p_datos_nuevos: null,
        p_jornada_id: jornadaId
      })
    } catch (e) {
      console.error('[auditoria] No se pudo registrar:', e)
    }
  },

  /**
   * Genera un NIP nuevo para un trabajador en una jornada.
   * Invalida el anterior.
   */
  async generarNIP(
    jornadaId: string,
    usuarioId: string
  ): Promise<{ nip: string; expiracion: string }> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('generar_nip_trabajador', {
      p_jornada_id: jornadaId,
      p_usuario_id: usuarioId
    })

    if (error) {
      console.error('Error al generar NIP:', error)
      throw new Error(error.message || 'No se pudo generar el NIP')
    }

    return data as { nip: string; expiracion: string }
  },

  /**
   * Revoca el acceso de un trabajador en la jornada actual.
   */
  async revocarAcceso(usuarioId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('usuarios')
      .update({
        codigo_acceso: null,
        codigo_expiracion: null
      })
      .eq('id', usuarioId)

    if (error) {
      throw new Error(error.message || 'No se pudo revocar el acceso')
    }
  }
}
