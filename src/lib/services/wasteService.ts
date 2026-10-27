import { createClient } from '@/lib/supabase/client'
import { jornadaService } from './jornadaService'

// ============================================================
// SERVICIO DE MERMAS
// Usa RPC atomico que valida, inserta, descuenta inventario
// y registra movimiento en una sola transaccion.
// ============================================================

export interface MermaInput {
  producto_id: string
  cantidad: number
  motivo: string
  descripcion?: string
  tipo?: 'no_esperada' | 'derrame' | 'caducidad' | 'robo' | 'error_preparacion' | 'otro'
  jornada_id?: string | null
}

export interface MermaResult {
  success: boolean
  merma_id: string
  valor_perdido: number
  stock_anterior: number
  stock_nuevo: number
}

export const wasteService = {
  /**
   * Registra una merma de forma atomica:
   * - Valida que el usuario sea bartender
   * - Resuelve el bartender_id real (FK a bartenders, no a usuarios)
   * - Inserta la merma
   * - Descuenta el inventario
   * - Registra el movimiento en movimientos_inventario
   * - Registra auditoria
   *
   * Todo en una transaccion: si algo falla, rollback total.
   */
  async create(data: MermaInput): Promise<MermaResult> {
    const supabase = createClient()

    let jornadaId = data.jornada_id
    if (jornadaId === undefined) {
      jornadaId = await jornadaService.getJornadaActualId()
    }

    const { data: result, error } = await supabase.rpc('registrar_merma', {
      p_producto_id: data.producto_id,
      p_cantidad: data.cantidad,
      p_motivo: data.motivo,
      p_descripcion: data.descripcion || null,
      p_tipo: data.tipo || 'no_esperada',
      p_jornada_id: jornadaId || null
    })

    if (error) {
      console.error('[wasteService] Error al registrar merma:', error)
      throw new Error(error.message || 'No se pudo registrar la merma')
    }

    return result as MermaResult
  },

  /**
   * Obtiene las mermas de un bartender.
   * Acepta usuario_id o bartender_id indistintamente (resuelve internamente).
   */
  async getByBartender(
    usuarioIdOBartenderId: string,
    jornadaId?: string
  ): Promise<any[]> {
    const supabase = createClient()

    // Resolver el bartender_id real desde el usuario_id
    const { data: bartender } = await supabase
      .from('bartenders')
      .select('id')
      .eq('usuario_id', usuarioIdOBartenderId)
      .maybeSingle()

    const bartenderId = bartender?.id || usuarioIdOBartenderId

    let query = supabase
      .from('mermas')
      .select(`
        *,
        productos (nombre, marca),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .eq('bartender_id', bartenderId)
      .order('fecha', { ascending: false })

    if (jornadaId) query = query.eq('jornada_id', jornadaId)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Obtiene las mermas de una jornada completa (para admin)
   */
  async getByJornada(jornadaId: string): Promise<any[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('mermas')
      .select(`
        *,
        productos (nombre, marca),
        bartender:bartenders!bartender_id(nombre_completo)
      `)
      .eq('jornada_id', jornadaId)
      .order('fecha', { ascending: false })

    if (error) throw error
    return data || []
  }
}
