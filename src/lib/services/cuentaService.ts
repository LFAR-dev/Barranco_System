import { createClient } from '@/lib/supabase/client'
import { jornadaService } from './jornadaService'

// ============================================================
// SERVICIO DE CUENTAS ABIERTAS
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
  mesa?: { numero: string; ubicacion: string } | null
  mesero?: { nombre: string; apellido: string } | null
}

export interface CuentaConPedidos extends CuentaAbierta {
  pedidos: Array<{
    id: string
    total: number
    estado: string
    created_at: string
    items: any[]
  }>
  items_totales: number
}

export const cuentaService = {
  /**
   * Abre una nueva cuenta en una mesa
   */
  async abrirCuenta(
    mesaId: string,
    meseroId: string,
    comensales = 1,
    notas?: string
  ): Promise<CuentaAbierta> {
    const supabase = createClient()

    const existente = await this.getCuentaActiva(mesaId)
    if (existente) {
      throw new Error('Ya hay una cuenta abierta en esta mesa')
    }

    const jornadaId = await jornadaService.getJornadaActualId()

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
   * Obtiene una cuenta por ID con todos sus pedidos
   */
  async getCuentaConPedidos(cuentaId: string): Promise<CuentaConPedidos | null> {
    const supabase = createClient()
    
    const { data: cuenta, error: cuentaError } = await supabase
      .from('cuentas_abiertas')
      .select(`
        *,
        mesa:mesas!mesa_id(numero, ubicacion),
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('id', cuentaId)
      .maybeSingle()

    if (cuentaError || !cuenta) return null

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, total, estado, created_at, items')
      .eq('cuenta_abierta_id', cuentaId)
      .neq('estado', 'cancelado')
      .order('created_at', { ascending: true })

    const pedidosList = pedidos || []
    const itemsTotales = pedidosList.reduce((sum, p) => {
      const items = Array.isArray(p.items) ? p.items : []
      return sum + items.reduce((s: number, item: any) => s + (item.cantidad || 0), 0)
    }, 0)

    return {
      ...cuenta,
      pedidos: pedidosList,
      items_totales: itemsTotales
    } as CuentaConPedidos
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
   * Obtiene TODAS las cuentas activas (para caja)
   */
  async getTodasLasCuentasActivas(): Promise<CuentaAbierta[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cuentas_abiertas')
      .select(`
        *,
        mesa:mesas!mesa_id(numero, ubicacion),
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .neq('estado', 'cerrada')
      .order('abierta_en', { ascending: true })

    if (error) return []
    return (data || []) as CuentaAbierta[]
  },

  /**
   * Agrega un pedido a la cuenta (después de crear el pedido)
   */
  async vincularPedidoACuenta(pedidoId: string, cuentaId: string): Promise<void> {
    const supabase = createClient()
    
    // Vincular pedido a cuenta
    await supabase
      .from('pedidos')
      .update({ cuenta_abierta_id: cuentaId })
      .eq('id', pedidoId)

    // Recalcular total de la cuenta
    await this.recalcularTotal(cuentaId)
  },

  /**
   * Recalcula el total de una cuenta basado en sus pedidos
   */
  async recalcularTotal(cuentaId: string): Promise<void> {
    const supabase = createClient()
    
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('total')
      .eq('cuenta_abierta_id', cuentaId)
      .neq('estado', 'cancelado')

    const total = (pedidos || []).reduce((sum, p) => sum + (p.total || 0), 0)

    await supabase
      .from('cuentas_abiertas')
      .update({ 
        total_actual: total,
        updated_at: new Date().toISOString()
      })
      .eq('id', cuentaId)
  },

  /**
   * Marca la cuenta como "cuenta solicitada"
   */
  async solicitarCuenta(mesaId: string): Promise<void> {
    const supabase = createClient()

    const cuenta = await this.getCuentaActiva(mesaId)
    if (!cuenta) throw new Error('No hay cuenta activa en esta mesa')

    await supabase
      .from('cuentas_abiertas')
      .update({ estado: 'cuenta_solicitada', updated_at: new Date().toISOString() })
      .eq('id', cuenta.id)

    await supabase
      .from('mesas')
      .update({ estado: 'cuenta_solicitada', updated_at: new Date().toISOString() })
      .eq('id', mesaId)
  },

  /**
   * Marca la cuenta como "cobrando"
   */
  async marcarCobrando(cuentaId: string): Promise<void> {
    const supabase = createClient()
    await supabase
      .from('cuentas_abiertas')
      .update({ estado: 'cobrando', updated_at: new Date().toISOString() })
      .eq('id', cuentaId)
  },

  /**
   * Cierra la cuenta y libera la mesa
   */
  async cerrarCuenta(cuentaId: string): Promise<void> {
    const supabase = createClient()

    const { data: cuenta } = await supabase
      .from('cuentas_abiertas')
      .select('mesa_id')
      .eq('id', cuentaId)
      .maybeSingle()

    if (!cuenta) throw new Error('Cuenta no encontrada')

    const { error } = await supabase
      .from('cuentas_abiertas')
      .update({ 
        estado: 'cerrada', 
        cerrada_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', cuentaId)

    if (error) throw new Error('No se pudo cerrar la cuenta')

    // Marcar todos los pedidos como servidos
    await supabase
      .from('pedidos')
      .update({ estado: 'servido', updated_at: new Date().toISOString() })
      .eq('cuenta_abierta_id', cuentaId)
      .neq('estado', 'cancelado')

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
