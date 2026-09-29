import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE SESIONES DE CAJA
// Maneja apertura/cierre de turnos de cajero
// ============================================================

export interface SesionCaja {
  id: string
  caja_fisica_id: string
  usuario_id: string
  jornada_id: string
  saldo_inicial: number
  saldo_final: number | null
  total_cobrado: number
  total_propinas: number
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  diferencia: number | null
  estado: 'abierta' | 'cerrada'
  abierta_en: string
  cerrada_en: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ResumenSesion {
  total_ventas: number
  total_cobrado: number
  total_propinas: number
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  diferencia: number | null
}

export const sesionCajaService = {
  /**
   * Obtiene la sesión de caja abierta del usuario actual
   */
  async getSesionAbierta(): Promise<SesionCaja | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from('sesiones_caja')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (error) {
      console.error('Error al obtener sesión abierta:', error)
      return null
    }
    return data
  },

  /**
   * Obtiene la sesión abierta de una caja física específica
   */
  async getSesionAbiertaPorCaja(cajaFisicaId: string): Promise<SesionCaja | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('sesiones_caja')
      .select('*')
      .eq('caja_fisica_id', cajaFisicaId)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (error) {
      console.error('Error al obtener sesión por caja:', error)
      return null
    }
    return data
  },

  /**
   * Abre una nueva sesión de caja
   */
  async abrirSesion(data: {
    caja_fisica_id: string
    saldo_inicial: number
    jornada_id: string
    notas?: string
  }): Promise<SesionCaja> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('No hay usuario autenticado')

    // Verificar que no haya sesión abierta en esa caja
    const existente = await this.getSesionAbiertaPorCaja(data.caja_fisica_id)
    if (existente) {
      throw new Error('Ya hay una sesión abierta en esta caja física')
    }

    const { data: nueva, error } = await supabase
      .from('sesiones_caja')
      .insert([{
        caja_fisica_id: data.caja_fisica_id,
        usuario_id: user.id,
        jornada_id: data.jornada_id,
        saldo_inicial: data.saldo_inicial,
        notas: data.notas || null,
        estado: 'abierta'
      }])
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error al abrir sesión:', error)
      throw new Error(error.message || 'No se pudo abrir la sesión de caja')
    }

    return nueva
  },

  /**
   * Cierra una sesión de caja calculando totales
   */
  async cerrarSesion(sesionId: string, saldoFinal: number, notas?: string): Promise<SesionCaja> {
    const supabase = createClient()

    // Obtener totales de ventas de esta sesión
    const resumen = await this.getResumenSesion(sesionId)
    const diferencia = saldoFinal - (0 + resumen.total_efectivo)

    const { data, error } = await supabase
      .from('sesiones_caja')
      .update({
        estado: 'cerrada',
        cerrada_en: new Date().toISOString(),
        saldo_final: saldoFinal,
        total_cobrado: resumen.total_cobrado,
        total_propinas: resumen.total_propinas,
        total_efectivo: resumen.total_efectivo,
        total_tarjeta: resumen.total_tarjeta,
        total_transferencia: resumen.total_transferencia,
        diferencia,
        notas: notas || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sesionId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error al cerrar sesión:', error)
      throw new Error('No se pudo cerrar la sesión de caja')
    }

    return data
  },

  /**
   * Obtiene el resumen de una sesión (sin cerrarla)
   */
  async getResumenSesion(sesionId: string): Promise<ResumenSesion> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ventas')
      .select('total, propina, metodo_pago')
      .eq('sesion_caja_id', sesionId)

    if (error) {
      console.error('Error al obtener resumen:', error)
      return {
        total_ventas: 0,
        total_cobrado: 0,
        total_propinas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        diferencia: null
      }
    }

    const ventas = data || []
    return {
      total_ventas: ventas.length,
      total_cobrado: ventas.reduce((s, v) => s + (v.total || 0), 0),
      total_propinas: ventas.reduce((s, v) => s + (v.propina || 0), 0),
      total_efectivo: ventas.filter(v => v.metodo_pago === 'efectivo')
        .reduce((s, v) => s + (v.total || 0), 0),
      total_tarjeta: ventas.filter(v => v.metodo_pago === 'tarjeta')
        .reduce((s, v) => s + (v.total || 0), 0),
      total_transferencia: ventas.filter(v => v.metodo_pago === 'transferencia')
        .reduce((s, v) => s + (v.total || 0), 0),
      diferencia: null
    }
  },

  /**
   * Historial de sesiones del usuario actual
   */
  async getHistorial(limit = 30): Promise<SesionCaja[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
      .from('sesiones_caja')
      .select('*')
      .eq('usuario_id', user.id)
      .order('abierta_en', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error al obtener historial:', error)
      return []
    }
    return data || []
  }
}
