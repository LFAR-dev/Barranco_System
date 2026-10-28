import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE CONTROL DE BOTELLAS
// Lee de la vista materializada vista_rendimiento_botellas
// y permite registrar movimientos manuales de ml.
// ============================================================

export interface RendimientoBotella {
  id: string
  nombre: string
  marca: string | null
  volumen_ml: number
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  es_bebida_principal: boolean
  es_insumo: boolean
  umbral_alerta_pct: number
  ml_consumidos: number
  ml_en_stock_actual: number
  ml_totales_historicos: number
  porcentaje_stock: number
  shots_disponibles: number
  shots_consumidos: number
  bebidas_disponibles: number
  estado_alerta: 'agotado' | 'bajo' | 'disponible'
  imagen_url: string | null
  categoria_nombre: string | null
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface MovimientoBotella {
  id: string
  producto_id: string
  tipo_movimiento: TipoMovimiento
  cantidad_movimiento: number
  stock_anterior: number
  stock_posterior: number
  motivo: string | null
  observaciones: string | null
  usuario_id: string
  created_at: string
  usuarios?: {
    nombre: string
    apellido: string
  } | null
}

export const bottleService = {
  /**
   * Obtiene todas las botellas con su rendimiento calculado.
   */
  async getTodasLasBotellas(): Promise<RendimientoBotella[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('vista_rendimiento_botellas')
      .select('*')
      .eq('es_bebida_principal', true)
      .order('nombre')

    if (error) {
      console.error('[bottleService] Error al cargar botellas:', error)
      return []
    }

    return (data || []).map(normalizar)
  },

  /**
   * Obtiene una botella especifica por su producto_id.
   */
  async getBotella(productoId: string): Promise<RendimientoBotella | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('vista_rendimiento_botellas')
      .select('*')
      .eq('id', productoId)
      .maybeSingle()

    if (error || !data) {
      console.error('[bottleService] Error al cargar botella:', error)
      return null
    }

    return normalizar(data)
  },

  /**
   * Obtiene solo las botellas con alerta (bajo o agotado).
   */
  async getBotellasConAlerta(): Promise<RendimientoBotella[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('vista_rendimiento_botellas')
      .select('*')
      .eq('es_bebida_principal', true)
      .in('estado_alerta', ['agotado', 'bajo'])
      .order('porcentaje_stock', { ascending: true })

    if (error) {
      console.error('[bottleService] Error al cargar alertas:', error)
      return []
    }

    return (data || []).map(normalizar)
  },

  /**
   * Obtiene los movimientos recientes de una botella.
   */
  async getMovimientos(productoId: string, limit = 20): Promise<MovimientoBotella[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select(`
        id,
        producto_id,
        tipo_movimiento,
        cantidad_movimiento,
        stock_anterior,
        stock_posterior,
        motivo,
        observaciones,
        usuario_id,
        created_at,
        usuarios:usuarios!usuario_id(nombre, apellido)
      `)
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[bottleService] Error al cargar movimientos:', error)
      return []
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      producto_id: m.producto_id,
      tipo_movimiento: m.tipo_movimiento as TipoMovimiento,
      cantidad_movimiento: Number(m.cantidad_movimiento) || 0,
      stock_anterior: Number(m.stock_anterior) || 0,
      stock_posterior: Number(m.stock_posterior) || 0,
      motivo: m.motivo || null,
      observaciones: m.observaciones || null,
      usuario_id: m.usuario_id,
      created_at: m.created_at,
      usuarios: Array.isArray(m.usuarios) && m.usuarios[0]
        ? { nombre: m.usuarios[0].nombre, apellido: m.usuarios[0].apellido }
        : m.usuarios && !Array.isArray(m.usuarios)
        ? m.usuarios
        : null
    }))
  },

  /**
   * Registra un movimiento manual (entrada, salida o ajuste de ml).
   * Solo admin o auditor.
   */
  async registrarMovimiento(
    productoId: string,
    tipo: TipoMovimiento,
    cantidadMl: number,
    motivo: string,
    descripcion?: string
  ): Promise<{ success: boolean; ml_consumidos_nuevo: number }> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('registrar_movimiento_botella', {
      p_producto_id: productoId,
      p_tipo: tipo,
      p_cantidad_ml: cantidadMl,
      p_motivo: motivo,
      p_descripcion: descripcion || null
    })

    if (error) {
      console.error('[bottleService] Error al registrar movimiento:', error)
      throw new Error(error.message || 'No se pudo registrar el movimiento')
    }

    return data as { success: boolean; ml_consumidos_nuevo: number }
  },

  /**
   * Actualiza el umbral de alerta de una botella especifica.
   */
  async actualizarUmbral(productoId: string, umbralPct: number): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('productos')
      .update({ umbral_alerta_pct: umbralPct })
      .eq('id', productoId)

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar el umbral')
    }
  }
}

// ============================================================
// Helper: normalizar los numeros (Supabase devuelve strings para numeric)
// ============================================================
function normalizar(row: any): RendimientoBotella {
  return {
    id: row.id,
    nombre: row.nombre || '',
    marca: row.marca || null,
    volumen_ml: Number(row.volumen_ml) || 0,
    stock_actual: Number(row.stock_actual) || 0,
    stock_minimo: Number(row.stock_minimo) || 0,
    stock_maximo: Number(row.stock_maximo) || 0,
    es_bebida_principal: !!row.es_bebida_principal,
    es_insumo: !!row.es_insumo,
    umbral_alerta_pct: Number(row.umbral_alerta_pct) || 20,
    ml_consumidos: Number(row.ml_consumidos) || 0,
    ml_en_stock_actual: Number(row.ml_en_stock_actual) || 0,
    ml_totales_historicos: Number(row.ml_totales_historicos) || 0,
    porcentaje_stock: Number(row.porcentaje_stock) || 0,
    shots_disponibles: Number(row.shots_disponibles) || 0,
    shots_consumidos: Number(row.shots_consumidos) || 0,
    bebidas_disponibles: Number(row.bebidas_disponibles) || 0,
    estado_alerta: row.estado_alerta || 'disponible',
    imagen_url: row.imagen_url || null,
    categoria_nombre: row.categoria_nombre || null
  }
}
