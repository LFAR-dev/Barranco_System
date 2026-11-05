import { createClient } from '@/lib/supabase/client'
import { cuentaService } from './cuentaService'

// ============================================================
// SERVICIO DE VENTAS
// Consulta, gestion de ventas historicas, cancelaciones y reportes
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

export interface Cancelacion {
  id: string
  mesa: string | null
  total: number
  motivo_cancelacion: string | null
  cancelado_por: string | null
  cancelado_en: string | null
  created_at: string
  jornada_id: string | null
  mesero_id: string | null
  mesero_nombre: string
  cancelador_nombre: string
  cancelador_rol: string
}

export interface PropinaPorMesero {
  mesero_id: string
  nombre: string
  ventas_count: number
  total: number
  propinas: number
}

export interface DesgloseMetodosPago {
  efectivo: { count: number; total: number }
  tarjeta: { count: number; total: number }
  transferencia: { count: number; total: number }
}

export const ventaService = {
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

    if (filtros.fechaInicio) query = query.gte('created_at', filtros.fechaInicio)
    if (filtros.fechaFin) query = query.lte('created_at', filtros.fechaFin)
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

  async registrarVentaDesdeCuenta(
    cuentaId: string,
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia',
    efectivoRecibido: number = 0,
    propina: number = 0
  ): Promise<{ id: string; total: number; propina: number }> {
    const supabase = createClient()

    const cuenta = await cuentaService.getCuentaConPedidos(cuentaId)
    if (!cuenta) throw new Error('Cuenta no encontrada')

    const total = Number(cuenta.total_actual || 0)
    if (total <= 0) throw new Error('La cuenta no tiene total a cobrar')

    const propinaFinal = Number(propina || 0)
    if (propinaFinal < 0) throw new Error('La propina no puede ser negativa')

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

    const esEfectivo = metodoPago === 'efectivo'
    const montoRecibido = esEfectivo ? Number(efectivoRecibido || 0) : total + propinaFinal
    const montoCambio = esEfectivo ? Math.max(0, montoRecibido - total - propinaFinal) : 0

    if (esEfectivo && montoRecibido < total + propinaFinal) {
      throw new Error('El efectivo recibido es insuficiente')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay usuario autenticado')

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

    if (error) throw new Error('No se pudo registrar la venta: ' + error.message)
    if (!data) throw new Error('No se pudo registrar la venta')

    return {
      id: data.id,
      total: Number(data.total),
      propina: Number(data.propina)
    }
  },

  /**
   * Obtiene las cancelaciones (pedidos cancelados) con datos del mesero
   * y del usuario que cancelo.
   */
  async getCancelaciones(filtros: VentaFiltros = {}): Promise<Cancelacion[]> {
    const supabase = createClient()

    let query = supabase
      .from('pedidos')
      .select(`
        id, mesa, total, motivo_cancelacion, cancelado_por, cancelado_en,
        created_at, jornada_id, mesero_id,
        mesero:usuarios!mesero_id(nombre, apellido),
        cancelador:usuarios!cancelado_por(nombre, apellido, rol)
      `)
      .eq('estado', 'cancelado')
      .order('cancelado_en', { ascending: false, nullsFirst: false })
      .limit(500)

    if (filtros.fechaInicio) query = query.gte('cancelado_en', filtros.fechaInicio)
    if (filtros.fechaFin) query = query.lte('cancelado_en', filtros.fechaFin)
    if (filtros.jornadaId) query = query.eq('jornada_id', filtros.jornadaId)
    if (filtros.meseroId) query = query.eq('mesero_id', filtros.meseroId)

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener cancelaciones:', error)
      return []
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      mesa: p.mesa,
      total: Number(p.total) || 0,
      motivo_cancelacion: p.motivo_cancelacion,
      cancelado_por: p.cancelado_por,
      cancelado_en: p.cancelado_en,
      created_at: p.created_at,
      jornada_id: p.jornada_id,
      mesero_id: p.mesero_id,
      mesero_nombre: p.mesero
        ? `${p.mesero.nombre || ''} ${p.mesero.apellido || ''}`.trim()
        : 'Sin mesero',
      cancelador_nombre: p.cancelador
        ? `${p.cancelador.nombre || ''} ${p.cancelador.apellido || ''}`.trim()
        : 'Sin usuario',
      cancelador_rol: p.cancelador?.rol || ''
    }))
  },

  /**
   * Agrupa ventas por mesero, sumando total y propinas.
   */
  async getPropinasPorMesero(filtros: VentaFiltros = {}): Promise<PropinaPorMesero[]> {
    const ventas = await this.getVentas(filtros)
    const mapa = new Map<string, PropinaPorMesero>()

    for (const v of ventas) {
      if (v.estado === 'cancelada') continue
      const key = v.mesero_id || 'sin_mesero'
      const nombre = v.mesero
        ? `${v.mesero.nombre || ''} ${v.mesero.apellido || ''}`.trim()
        : 'Sin mesero'

      if (!mapa.has(key)) {
        mapa.set(key, {
          mesero_id: key,
          nombre,
          ventas_count: 0,
          total: 0,
          propinas: 0
        })
      }
      const entry = mapa.get(key)!
      entry.ventas_count += 1
      entry.total += v.total || 0
      entry.propinas += v.propina || 0
    }

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  },

  /**
   * Devuelve el desglose por metodo de pago: count y total.
   */
  async getDesgloseMetodosPago(filtros: VentaFiltros = {}): Promise<DesgloseMetodosPago> {
    const ventas = await this.getVentas(filtros)
    const desglose: DesgloseMetodosPago = {
      efectivo: { count: 0, total: 0 },
      tarjeta: { count: 0, total: 0 },
      transferencia: { count: 0, total: 0 }
    }

    for (const v of ventas) {
      if (v.estado === 'cancelada') continue
      const m = v.metodo_pago
      if (m === 'efectivo') {
        desglose.efectivo.count += 1
        desglose.efectivo.total += v.total || 0
      } else if (m === 'tarjeta') {
        desglose.tarjeta.count += 1
        desglose.tarjeta.total += v.total || 0
      } else if (m === 'transferencia') {
        desglose.transferencia.count += 1
        desglose.transferencia.total += v.total || 0
      }
    }

    return desglose
  }
}
