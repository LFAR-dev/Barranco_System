import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE VENTAS
// Consulta y gestión de ventas históricas para el admin
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
  // Relaciones
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

    // Filtro por rango de fechas
    if (filtros.fechaInicio) {
      query = query.gte('created_at', filtros.fechaInicio)
    }
    if (filtros.fechaFin) {
      query = query.lte('created_at', filtros.fechaFin)
    }

    // Filtros por IDs
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

    // Filtro de búsqueda por ID o nombre de mesero (post-query)
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
   * Calcula estadísticas de las ventas filtradas
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
   * Obtiene las últimas N ventas para el widget del dashboard
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
      console.error('Error al obtener últimas ventas:', error)
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
  }
}
