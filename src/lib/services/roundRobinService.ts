import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE ROUND-ROBIN
// Wrappers para asignación automática de bartenders/meseros
// ============================================================

export interface AsignacionBartender {
  usuario_id: string | null
  sin_disponibles: boolean
}

export const roundRobinService = {
  /**
   * Asigna el siguiente bartender disponible (round-robin)
   * Retorna el usuario_id del bartender o null si no hay disponibles
   */
  async asignarBartender(): Promise<AsignacionBartender> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('asignar_siguiente_bartender')

    if (error) {
      console.error('Error al asignar bartender:', error)
      return { usuario_id: null, sin_disponibles: true }
    }

    return {
      usuario_id: data,
      sin_disponibles: data === null
    }
  },

  /**
   * Asigna el siguiente mesero disponible (round-robin)
   */
  async asignarMesero(): Promise<AsignacionBartender> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('asignar_siguiente_mesero')

    if (error) {
      console.error('Error al asignar mesero:', error)
      return { usuario_id: null, sin_disponibles: true }
    }

    return {
      usuario_id: data,
      sin_disponibles: data === null
    }
  },

  /**
   * Toggle disponibilidad de un bartender
   */
  async toggleDisponibilidadBartender(bartenderId: string, disponible: boolean): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('bartenders')
      .update({ 
        disponible,
        // Al volver a estar disponible, resetear contador para que no quede al final
        ...(disponible ? { ultima_asignacion: null } : {})
      })
      .eq('id', bartenderId)

    if (error) {
      console.error('Error al cambiar disponibilidad:', error)
      throw new Error('No se pudo cambiar la disponibilidad')
    }
  },

  /**
   * Toggle disponibilidad de un mesero
   */
  async toggleDisponibilidadMesero(meseroId: string, disponible: boolean): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('meseros')
      .update({ 
        disponible,
        ...(disponible ? { ultima_asignacion: null } : {})
      })
      .eq('id', meseroId)

    if (error) {
      console.error('Error al cambiar disponibilidad:', error)
      throw new Error('No se pudo cambiar la disponibilidad')
    }
  },

  /**
   * Obtiene los bartenders disponibles
   */
  async getBartendersDisponibles(): Promise<any[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bartenders')
      .select('id, usuario_id, nombre_completo, disponible, ultima_asignacion, pedidos_activos_count')
      .eq('activo', true)
      .eq('disponible', true)
      .order('ultima_asignacion', { ascending: true, nullsFirst: true })

    if (error) {
      console.error('Error al obtener bartenders disponibles:', error)
      return []
    }
    return data || []
  },

  /**
   * Obtiene los meseros disponibles
   */
  async getMeserosDisponibles(): Promise<any[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meseros')
      .select('id, usuario_id, nombre_completo, disponible, ultima_asignacion, mesas_activas_count')
      .eq('activo', true)
      .eq('disponible', true)
      .order('ultima_asignacion', { ascending: true, nullsFirst: true })

    if (error) {
      console.error('Error al obtener meseros disponibles:', error)
      return []
    }
    return data || []
  }
}
