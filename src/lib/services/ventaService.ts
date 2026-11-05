import { createClient } from '@/lib/supabase/client'
import { cuentaService } from './cuentaService'

// ============================================================
// SERVICIO DE VENTAS
// Consulta y gestion de ventas historicas para el admin
// ============================================================

export interface Venta {
  id: string
  total: number
  propina: number
  descuento: number
  impuestos: number
  metodo_pago: string
  estado: string
  created_at: string
  fecha_hora: string
  jornada_id: string | null
  mesero_id: string | null
  bartender_id: string | null
  cajero_id: string | null
  caja_fisica_id: string | null
  sesion_caja_id: string | null
  receta_id: string | null
  sucursal_id: string | null
  monto_recibido: number | null
  monto_cambio: number | null
  mesero?: { nombre: string; apellido: string } | null
  cajero?: { nombre: string; apellido: string } | null
  bartender?: { nombre_completo: string } | null
  receta?: { nombre: string } | null
  sucursal?: { nombre: string } | null
  caja_fisica?: { nombre: string } | null
  jornada?: { nombre: string } | null
}

export interface VentaDetalle extends Venta {
  pedido?: {
    id: string
    mesa: string
    items: any[]
    estado: string
  } | null
}

export interface VentaFiltros {
  fechaInicio?: string
  fechaFin?: string
  jornadaId?: string
  meseroId?: string
  cajeroId?: string
  bartenderId?: string
  metodoPago?: string
  estado?: string
  searchTerm?: string
}

export interface VentaStats {
  totalVentas: number
  totalPropinas: number
  ticketPromedio: number
  numVentas: number
  efectivo: number
  tarjeta: number
  transferencia: number
  canceladas: number
  canceladasMonto: number
}

export const ventaService = {
  /**
   * Obtiene ventas con filtros avanzados
   */
  async getVentas(filtros: VentaFiltros = {}): Promise<Venta[]> {
    const supabase = createClient()

    let query = supabase
      .from('ventas')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        cajero:usuarios!cajero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo),
        receta:recetas!receta_id(nombre),
        sucursal:sucursales!sucursal_id(nombre),
        caja_fisica:cajas_fisicas!caja_fisica_id(nombre),
        jornada:jornadas!jornada_id(nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filtros.fechaInicio) {
      query = query.gte('created_at', filtros.fechaInicio)
    }
    if (filtros.fechaFin) {
      query = query.lte('created_at', filtros.fechaFin)
    }

    if (filtros.jornadaId) query = query.eq('jornada_id', filtros.jornadaId)
    if (filtros.meseroId) query = query.eq('mesero_id', filtros.meseroId)
    if (filtros.cajeroId) query = query.eq('cajero_id', filtros.cajeroId)
    if (filtros.bartenderId) query = query.eq('bartender_id', filtros.bartenderId)
    if (filtros.metodoPago) query = query.eq('metodo_pago', filtros.metodoPago)
    if (filtros.estado) query = query.eq('estado', filtros.estado)

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener ventas:', error)
      throw new Error('No se pudieron cargar las ventas')
    }

    let ventas = (data || []) as Venta[]

    if (filtros.searchTerm) {
      const term = filtros.searchTerm.toLowerCase()
      ventas = ventas.filter(v =>
        v.id.toLowerCase().includes(term) ||
        v.mesero?.nombre.toLowerCase().includes(term) ||
        v.mesero?.apellido.toLowerCase().includes(term) ||
        v.cajero?.nombre.toLowerCase().includes(term) ||
        v.cajero?.apellido.toLowerCase().includes(term)
      )
    }

    return ventas
  },

  /**
   * Obtiene una venta con su detalle completo
   */
  async getVentaById(id: string): Promise<VentaDetalle | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        cajero:usuarios!cajero_id(nombre, apellido),
        bartender:bartenders!bartender_id(nombre_completo),
        receta:recetas!receta_id(nombre),
        sucursal:sucursales!sucursal_id(nombre),
        caja_fisica:cajas_fisicas!caja_fisica_id(nombre),
        jornada:jornadas!jornada_id(nombre)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error al obtener venta:', error)
      return null
    }

    return data as VentaDetalle
  },

  /**
   * Calcula estadisticas de las ventas filtradas
   */
  async getStats(filtros: VentaFiltros = {}): Promise<VentaStats> {
    const ventas = await this.getVentas(filtros)

    const ventasValidas = ventas.filter(v => v.estado !== 'cancelada')
    const canceladas = ventas.filter(v => v.estado === 'cancelada')

    const totalVentas = ventasValidas.reduce((s, v) => s + (v.total || 0), 0)
    const totalPropinas = ventasValidas.reduce((s, v) => s + (v.propina || 0), 0)

    return {
      totalVentas,
      totalPropinas,
      ticketPromedio: ventasValidas.length > 0 ? totalVentas / ventasValidas.length : 0,
      numVentas: ventasValidas.length,
      efectivo: ventasValidas.filter(v => v.metodo_pago === 'efectivo')
        .reduce((s, v) => s + (v.total || 0), 0),
      tarjeta: ventasValidas.filter(v => v.metodo_pago === 'tarjeta')
        .reduce((s, v) => s + (v.total || 0), 0),
      transferencia: ventasValidas.filter(v => v.metodo_pago === 'transferencia')
        .reduce((s, v) => s + (v.total || 0), 0),
      canceladas: canceladas.length,
      canceladasMonto: canceladas.reduce((s, v) => s + (v.total || 0), 0)
    }
  },

  /**
   * Obtiene las ultimas N ventas para el widget del dashboard
   */
  async getUltimasVentas(limit = 5): Promise<Venta[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido),
        cajero:usuarios!cajero_id(nombre, apellido)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error al obtener ultimas ventas:', error)
      return []
    }

    return (data || []) as Venta[]
  },

  /**
   * Obtiene listas para filtros (meseros, cajeros, bartenders, jornadas)
   */
  async getFiltrosDisponibles(): Promise<{
    meseros: Array<{ id: string; nombre: string }>
    cajeros: Array<{ id: string; nombre: string }>
    bartenders: Array<{ id: string; nombre: string }>
    jornadas: Array<{ id: string; nombre: string; fecha: string }>
  }> {
    const supabase = createClient()

    const [meserosRes, cajerosRes, bartendersRes, jornadasRes] = await Promise.all([
      supabase.from('usuarios').select('id, nombre, apellido').eq('rol', 'mesero').order('nombre'),
      supabase.from('usuarios').select('id, nombre, apellido').eq('rol', 'caja').order('nombre'),
      supabase.from('bartenders').select('id, usuario_id, nombre_completo').eq('activo', true).order('nombre_completo'),
      supabase.from('jornadas').select('id, nombre, fecha').order('fecha', { ascending: false }).limit(30)
    ])

    return {
      meseros: (meserosRes.data || []).map(m => ({ id: m.id, nombre: `${m.nombre} ${m.apellido}` })),
      cajeros: (cajerosRes.data || []).map(c => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}` })),
      bartenders: (bartendersRes.data || []).map(b => ({ id: b.usuario_id, nombre: b.nombre_completo })),
      jornadas: jornadasRes.data || []
    }
  },

  /**
   * Registra una venta al cobrar una cuenta abierta.
   * Inserta UNA fila en `ventas` con el total, propina, metodo de pago,
   * efectivo recibido, cambio, cajero y jornada.
   * NO toca inventario (eso ya lo hace descontar_inventario_por_pedido al crear el pedido).
   * Devuelve el id de la venta creada.
   */
  async registrarVentaDesdeCuenta(
    cuentaId: string,
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia',
    efectivoRecibido: number = 0,
    propina: number = 0
  ): Promise<{ id: string; total: number; propina: number }> {
    const supabase = createClient()

    // 1. Cargar cuenta con pedidos
    const cuenta = await cuentaService.getCuentaConPedidos(cuentaId)
    if (!cuenta) {
      throw new Error('Cuenta no encontrada')
    }

    const total = Number(cuenta.total_actual || 0)
    if (total <= 0) {
      throw new Error('La cuenta no tiene total a cobrar')
    }

    const propinaFinal = Number(propina || 0)
    if (propinaFinal < 0) {
      throw new Error('La propina no puede ser negativa')
    }

    // 2. Heredar bartender_id desde el primer pedido que lo tenga
    let bartenderId: string | null = null
    for (const pedido of cuenta.pedidos) {
      const { data: pedidoFull } = await supabase
        .from('pedidos')
        .select('bartender_id')
        .eq('id', pedido.id)
        .maybeSingle()
      if (pedidoFull?.bartender_id) {
        bartenderId = pedidoFull.bartender_id
        break
      }
    }

    // 3. Calcular monto_recibido y monto_cambio
    const esEfectivo = metodoPago === 'efectivo'
    const montoRecibido = esEfectivo
      ? Number(efectivoRecibido || 0)
      : total + propinaFinal
    const montoCambio = esEfectivo
      ? Math.max(0, montoRecibido - total - propinaFinal)
      : 0

    if (esEfectivo && montoRecibido < total + propinaFinal) {
      throw new Error('El efectivo recibido es insuficiente')
    }

    // 4. Cajero = usuario logueado actualmente
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No hay usuario autenticado')
    }

    // 5. Insertar la venta
    const { data, error } = await supabase
      .from('ventas')
      .insert([{
        receta_id: null,
        bartender_id: bartenderId,
        mesero_id: cuenta.mesero_id,
        sucursal_id: null,
        cierre_caja_id: null,
        total,
        total_pagado: total + propinaFinal,
        propina: propinaFinal,
        metodo_pago: metodoPago,
        estado: 'completada',
        jornada_id: cuenta.jornada_id,
        cajero_id: user.id,
        caja_fisica_id: null,
        sesion_caja_id: null,
        monto_recibido: montoRecibido,
        monto_cambio: montoCambio,
        descuento: 0,
        impuestos: 0
      }])
      .select('id, total, propina')
      .maybeSingle()

    if (error) {
      throw new Error('No se pudo registrar la venta: ' + error.message)
    }
    if (!data) {
      throw new Error('No se pudo registrar la venta')
    }

    return {
      id: data.id,
      total: Number(data.total),
      propina: Number(data.propina)
    }
  }
}
