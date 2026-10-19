import { createClient } from '@/lib/supabase/client'
import { jornadaService } from './jornadaService'

// ============================================================
// SERVICIO DE CUENTAS ABIERTAS
// Permite dejar la cuenta abierta en una mesa hasta que el cliente se vaya
// ============================================================

export type EstadoCuenta = 'abierta' | 'cuenta_solicitada' | 'cobrando' | 'cerrada'

export interface CuentaAbierta {
  id: string
  mesa_id: string
  mesero_id: string
  jornada_id: string | null
  estado: EstadoCuenta
  total_actual: number
  comensales: number
  abierta_en: string
  cerrada_en: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // Relaciones
  mesa?: { numero: string; ubicacion: string } | null
  mesero?: { nombre: string; apellido: string } | null
}

export const cuentaService = {
  /**
   * Abre una nueva cuenta en una mesa
   * - Verifica que no haya otra cuenta abierta en esa mesa
   * - Actualiza el estado de la mesa a "ocupada"
   */
  async abrirCuenta(
    mesaId: string,
    meseroId: string,
    comensales = 1,
    notas?: string
  ): Promise<CuentaAbierta> {
    const supabase = createClient()

    // Verificar que no exista cuenta abierta
    const existente = await this.getCuentaActiva(mesaId)
    if (existente) {
      throw new Error('Ya hay una cuenta abierta en esta mesa')
    }

    // Obtener jornada activa
    const jornadaId = await jornadaService.getJornadaActualId()

    // Crear cuenta
    const { data, error } = await supabase
      .from('cuentas_abiertas')
      .insert([{
        mesa_id: mesaId,
        mesero_id: meseroId,
        jornada_id: jornadaId,
        estado: 'abierta',
        total_actual: 0,
        comensales,
        notas: notas || null
      }])
      .select()
      .maybeSingle()

    if (error) throw new Error(error.message || 'No se pudo abrir la cuenta')

    // Actualizar mesa a ocupada
    await supabase
      .from('mesas')
      .update({
        estado: 'ocupada',
        mesero_id: meseroId,
        abierta_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', mesaId)

    return data as CuentaAbierta
  },

  /**
   * Obtiene la cuenta activa de una mesa
   */
  async getCuentaActiva(mesaId: string): Promise<CuentaAbierta | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cuentas_abiertas')
      .select(`
        *,
        mesa:mesas!mesa_id(numero, ubicacion),
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('mesa_id', mesaId)
      .neq('estado', 'cerrada')
      .maybeSingle()

    if (error) return null
    return data as CuentaAbierta
  },

  /**
   * Obtiene todas las cuentas activas de un mesero
   */
  async getCuentasDelMesero(meseroId: string): Promise<CuentaAbierta[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cuentas_abiertas')
      .select(`
        *,
        mesa:mesas!mesa_id(numero, ubicacion),
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('mesero_id', meseroId)
      .neq('estado', 'cerrada')
      .order('abierta_en', { ascending: false })

    if (error) return []
    return (data || []) as CuentaAbierta[]
  },

  /**
   * Actualiza el total de una cuenta (cuando se agrega un pedido)
   */
  async actualizarTotal(cuentaId: string, nuevoTotal: number): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('cuentas_abiertas')
      .update({ 
        total_actual: nuevoTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', cuentaId)

    if (error) throw new Error('No se pudo actualizar el total de la cuenta')
  },

  /**
   * Marca la cuenta como "cuenta solicitada" (el cliente pidió la cuenta)
   */
  async solicitarCuenta(mesaId: string): Promise<void> {
    const supabase = createClient()

    // Actualizar cuenta
    const cuenta = await this.getCuentaActiva(mesaId)
    if (!cuenta) throw new Error('No hay cuenta activa en esta mesa')

    await supabase
      .from('cuentas_abiertas')
      .update({ estado: 'cuenta_solicitada', updated_at: new Date().toISOString() })
      .eq('id', cuenta.id)

    // Actualizar mesa
    await supabase
      .from('mesas')
      .update({ estado: 'cuenta_solicitada', updated_at: new Date().toISOString() })
      .eq('id', mesaId)
  },

  /**
   * Marca la cuenta como "cobrando" (caja está procesando el cobro)
   */
  async marcarCobrando(cuentaId: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('cuentas_abiertas')
      .update({ estado: 'cobrando', updated_at: new Date().toISOString() })
      .eq('id', cuentaId)
  },

  /**
   * Cierra la cuenta (cuando el cliente pagó y se va)
   */
  async cerrarCuenta(cuentaId: string): Promise<void> {
    const supabase = createClient()

    // Obtener cuenta para liberar la mesa
    const { data: cuenta } = await supabase
      .from('cuentas_abiertas')
      .select('mesa_id')
      .eq('id', cuentaId)
      .maybeSingle()

    if (!cuenta) throw new Error('Cuenta no encontrada')

    // Cerrar cuenta
    const { error } = await supabase
      .from('cuentas_abiertas')
      .update({ 
        estado: 'cerrada', 
        cerrada_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', cuentaId)

    if (error) throw new Error('No se pudo cerrar la cuenta')

    // Liberar mesa
    await supabase
      .from('mesas')
      .update({
        estado: 'disponible',
        mesero_id: null,
        abierta_en: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', cuenta.mesa_id)
  }
}
