import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE ESTADÍSTICAS DE JORNADA
// Recopila todos los datos para el reporte de cierre
// ============================================================

export interface JornadaStats {
  jornada: {
    id: string
    nombre: string
    fecha: string
    hora_inicio: string
    hora_cierre: string | null
    notas: string | null
  }
  resumen: {
    total_ventas: number
    total_pedidos: number
    total_propinas: number
    ticket_promedio: number
    pedidos_cancelados: number
    pedidos_pendientes: number
  }
  metodos_pago: {
    efectivo: number
    tarjeta: number
    transferencia: number
    otro: number
  }
  ventas_por_mesero: Array<{
    nombre: string
    pedidos: number
    ventas: number
    propinas: number
  }>
  ventas_por_bartender: Array<{
    nombre: string
    pedidos_preparados: number
  }>
  ventas_por_caja: Array<{
    nombre: string
    cobros: number
    importe: number
    propinas: number
  }>
  productos_top: Array<{
    nombre: string
    cantidad: number
    total: number
  }>
  sesiones_caja: Array<{
    cajero: string
    caja_fisica: string
    saldo_inicial: number
    total_cobrado: number
    saldo_final: number | null
    diferencia: number | null
    estado: string
  }>
  cancelaciones: Array<{
    pedido_id: string
    mesa: string
    motivo: string
    cancelado_por: string
    hora: string
  }>
}

export const jornadaStatsService = {
  async getStatsCompletas(jornadaId: string): Promise<JornadaStats | null> {
    const supabase = createClient()

    try {
      // 1. Obtener jornada
      const { data: jornada, error: jornadaError } = await supabase
        .from('jornadas')
        .select('*')
        .eq('id', jornadaId)
        .maybeSingle()

      if (jornadaError || !jornada) {
        console.error('Error al obtener jornada:', jornadaError)
        return null
      }

      // 2. Obtener ventas de la jornada
      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select(`
          id, total, propina, metodo_pago, mesero_id, cajero_id, bartender_id,
          sesion_caja_id, created_at,
          mesero:usuarios!mesero_id(nombre, apellido),
          cajero:usuarios!cajero_id(nombre, apellido)
        `)
        .eq('jornada_id', jornadaId)

      if (ventasError) {
        console.error('Error al obtener ventas:', ventasError)
      }

      const ventasList = ventas || []

      // 3. Obtener pedidos de la jornada
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id, estado, total, mesero_id, bartender_id, mesa, items,
          mesero:usuarios!mesero_id(nombre, apellido),
          bartender:bartenders!bartender_id(nombre_completo)
        `)
        .eq('jornada_id', jornadaId)

      if (pedidosError) {
        console.error('Error al obtener pedidos:', pedidosError)
      }

      const pedidosList = pedidos || []

      // 4. Obtener sesiones de caja
      const { data: sesiones } = await supabase
        .from('sesiones_caja')
        .select(`
          *,
          cajero:usuarios!usuario_id(nombre, apellido),
          caja:cajas_fisicas!caja_fisica_id(nombre)
        `)
        .eq('jornada_id', jornadaId)

      const sesionesList = sesiones || []

      // 5. Calcular resumen
      const totalVentas = ventasList.reduce((s, v) => s + (v.total || 0), 0)
      const totalPropinas = ventasList.reduce((s, v) => s + (v.propina || 0), 0)
      const pedidosCancelados = pedidosList.filter(p => p.estado === 'cancelado').length
      const pedidosPendientes = pedidosList.filter(p => 
        ['pendiente', 'preparando', 'listo'].includes(p.estado)
      ).length

      // 6. Métodos de pago
      const metodosPago = {
        efectivo: ventasList.filter(v => v.metodo_pago === 'efectivo')
          .reduce((s, v) => s + (v.total || 0), 0),
        tarjeta: ventasList.filter(v => v.metodo_pago === 'tarjeta')
          .reduce((s, v) => s + (v.total || 0), 0),
        transferencia: ventasList.filter(v => v.metodo_pago === 'transferencia')
          .reduce((s, v) => s + (v.total || 0), 0),
        otro: ventasList.filter(v => !['efectivo', 'tarjeta', 'transferencia'].includes(v.metodo_pago || ''))
          .reduce((s, v) => s + (v.total || 0), 0)
      }

      // 7. Rendimiento por mesero
      const meserosMap = new Map<string, { nombre: string; pedidos: number; ventas: number; propinas: number }>()
      pedidosList.forEach(p => {
        if (!p.mesero_id) return
        const key = p.mesero_id
        const nombre = p.mesero ? `${(p.mesero as any).nombre} ${(p.mesero as any).apellido}` : 'N/A'
        const existing = meserosMap.get(key) || { nombre, pedidos: 0, ventas: 0, propinas: 0 }
        existing.pedidos++
        meserosMap.set(key, existing)
      })
      ventasList.forEach(v => {
        if (!v.mesero_id) return
        const key = v.mesero_id
        const existing = meserosMap.get(key)
        if (existing) {
          existing.ventas += v.total || 0
          existing.propinas += v.propina || 0
        }
      })

      // 8. Rendimiento por bartender
      const bartendersMap = new Map<string, { nombre: string; pedidos_preparados: number }>()
      pedidosList.forEach(p => {
        if (!p.bartender_id) return
        const key = p.bartender_id
        const nombre = p.bartender ? (p.bartender as any).nombre_completo : 'N/A'
        const existing = bartendersMap.get(key) || { nombre, pedidos_preparados: 0 }
        if (['listo', 'servido'].includes(p.estado)) {
          existing.pedidos_preparados++
        }
        bartendersMap.set(key, existing)
      })

      // 9. Rendimiento por caja
      const cajaMap = new Map<string, { nombre: string; cobros: number; importe: number; propinas: number }>()
      ventasList.forEach(v => {
        if (!v.cajero_id) return
        const key = v.cajero_id
        const nombre = v.cajero ? `${(v.cajero as any).nombre} ${(v.cajero as any).apellido}` : 'N/A'
        const existing = cajaMap.get(key) || { nombre, cobros: 0, importe: 0, propinas: 0 }
        existing.cobros++
        existing.importe += v.total || 0
        existing.propinas += v.propina || 0
        cajaMap.set(key, existing)
      })

      // 10. Productos top
      const productosMap = new Map<string, { nombre: string; cantidad: number; total: number }>()
      pedidosList.forEach(p => {
        if (p.estado === 'cancelado') return
        const items = p.items || []
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const nombre = item.nombre || 'Producto'
            const cantidad = item.cantidad || 1
            const total = (item.precio || 0) * cantidad
            const existing = productosMap.get(nombre) || { nombre, cantidad: 0, total: 0 }
            existing.cantidad += cantidad
            existing.total += total
            productosMap.set(nombre, existing)
          })
        }
      })

      const productosTop = Array.from(productosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)

      // 11. Cancelaciones
      const cancelacionesList = pedidosList
        .filter(p => p.estado === 'cancelado')
        .map(p => ({
          pedido_id: p.id.slice(0, 8),
          mesa: p.mesa || 'N/A',
          motivo: 'Ver auditoría',
          cancelado_por: 'N/A',
          hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        }))

      return {
        jornada: {
          id: jornada.id,
          nombre: jornada.nombre,
          fecha: jornada.fecha,
          hora_inicio: jornada.hora_inicio,
          hora_cierre: jornada.hora_cierre,
          notas: jornada.notas
        },
        resumen: {
          total_ventas: totalVentas,
          total_pedidos: pedidosList.length,
          total_propinas: totalPropinas,
          ticket_promedio: ventasList.length > 0 ? totalVentas / ventasList.length : 0,
          pedidos_cancelados: pedidosCancelados,
          pedidos_pendientes: pedidosPendientes
        },
        metodos_pago: metodosPago,
        ventas_por_mesero: Array.from(meserosMap.values()),
        ventas_por_bartender: Array.from(bartendersMap.values()),
        ventas_por_caja: Array.from(cajaMap.values()),
        productos_top: productosTop,
        sesiones_caja: sesionesList.map((s: any) => ({
          cajero: s.cajero ? `${s.cajero.nombre} ${s.cajero.apellido}` : 'N/A',
          caja_fisica: s.caja ? s.caja.nombre : 'N/A',
          saldo_inicial: s.saldo_inicial || 0,
          total_cobrado: s.total_cobrado || 0,
          saldo_final: s.saldo_final,
          diferencia: s.diferencia,
          estado: s.estado
        })),
        cancelaciones: cancelacionesList
      }

    } catch (error) {
      console.error('Error general en stats:', error)
      return null
    }
  }
}
