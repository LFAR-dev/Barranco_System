import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE ESTADISTICAS DE JORNADA
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
    duracion_minutos: number
  }
  resumen: {
    total_ventas: number
    total_pedidos: number
    total_propinas: number
    ticket_promedio: number
    pedidos_cancelados: number
    pedidos_pendientes: number
    valor_cancelados: number
    total_mermas: number
    valor_mermas: number
  }
  metodos_pago: {
    efectivo: number
    tarjeta: number
    transferencia: number
    otro: number
    total: number
    efectivo_pct: number
    tarjeta_pct: number
    transferencia_pct: number
  }
  ventas_por_mesero: Array<{
    usuario_id: string | null
    nombre: string
    color_mapa: string | null
    mesas_asignadas: number
    pedidos: number
    ventas: number
    propinas: number
    ayudas_dadas: number
    ayudas_recibidas: number
  }>
  ventas_por_bartender: Array<{
    usuario_id: string | null
    nombre: string
    pedidos_preparados: number
    bebidas_preparadas: number
    mermas_count: number
    valor_mermas: number
  }>
  ventas_por_caja: Array<{
    usuario_id: string | null
    nombre: string
    cobros: number
    importe: number
    propinas: number
    efectivo: number
    tarjeta: number
    transferencia: number
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
    mesero: string
    motivo: string
    monto: number
    cancelado_por: string
    hora: string
  }>
  mermas: Array<{
    producto: string
    bartender: string
    cantidad: number
    motivo: string
    valor: number
    fecha: string
  }>
  ayudas: Array<{
    mesa: string
    titular: string
    ayudante: string
    items: number
    total: number
    hora: string
  }>
}

function calcularDuracion(
  inicio: string,
  fin: string | null
): number {
  if (!fin) return 0
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  return Math.max(0, Math.floor(ms / 60000))
}

export const jornadaStatsService = {
  async getStatsCompletas(jornadaId: string): Promise<JornadaStats | null> {
    const supabase = createClient()

    try {
      // 1. Jornada
      const { data: jornada, error: jornadaError } = await supabase
        .from('jornadas')
        .select('*')
        .eq('id', jornadaId)
        .maybeSingle()

      if (jornadaError || !jornada) {
        console.error('Error al obtener jornada:', jornadaError)
        return null
      }

      // 2. Ventas
      const { data: ventas } = await supabase
        .from('ventas')
        .select(`
          id, total, propina, metodo_pago, mesero_id, cajero_id, bartender_id,
          sesion_caja_id, created_at,
          mesero:usuarios!mesero_id(nombre, apellido),
          cajero:usuarios!cajero_id(nombre, apellido)
        `)
        .eq('jornada_id', jornadaId)

      const ventasList = ventas || []

      // 3. Pedidos
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select(`
          id, estado, total, mesero_id, bartender_id, mesa, items,
          created_at, motivo_cancelacion, cancelado_por, cancelado_en,
          ayudado_por_id,
          mesero:usuarios!mesero_id(nombre, apellido, color_mapa),
          bartender:bartenders!bartender_id(nombre_completo, usuario_id),
          ayudante:usuarios!ayudado_por_id(nombre, apellido),
          cancelador:usuarios!cancelado_por(nombre, apellido)
        `)
        .eq('jornada_id', jornadaId)

      const pedidosList = pedidos || []

      // 4. Mesas asignadas (para conteo por mesero)
      const { data: mesas } = await supabase
        .from('mesas')
        .select('id, mesero_id')
        .eq('jornada_id', jornadaId)
        .eq('activa', true)

      const mesasList = mesas || []

      // 5. Sesiones de caja
      const { data: sesiones } = await supabase
        .from('sesiones_caja')
        .select(`
          *,
          cajero:usuarios!usuario_id(nombre, apellido),
          caja:cajas_fisicas!caja_fisica_id(nombre)
        `)
        .eq('jornada_id', jornadaId)

      const sesionesList = sesiones || []

      // 6. Mermas
      const { data: mermas } = await supabase
        .from('mermas')
        .select(`
          id, cantidad, motivo, valor_perdido, fecha,
          productos(nombre),
          bartender:bartenders!bartender_id(nombre_completo)
        `)
        .eq('jornada_id', jornadaId)
        .order('fecha', { ascending: true })

      const mermasList = mermas || []

      // ============================================================
      // CALCULOS
      // ============================================================
      const totalVentas = ventasList.reduce((s, v) => s + (v.total || 0), 0)
      const totalPropinas = ventasList.reduce(
        (s, v) => s + (v.propina || 0),
        0
      )
      const pedidosCancelados = pedidosList.filter(
        (p) => p.estado === 'cancelado'
      )
      const pedidosPendientes = pedidosList.filter((p) =>
        ['pendiente', 'preparando', 'listo'].includes(p.estado)
      ).length

      const valorCancelados = pedidosCancelados.reduce(
        (s, p) => s + (p.total || 0),
        0
      )

      const valorMermas = mermasList.reduce(
        (s, m: any) => s + (m.valor_perdido || 0),
        0
      )

      // Metodos de pago
      const efectivo = ventasList
        .filter((v) => v.metodo_pago === 'efectivo')
        .reduce((s, v) => s + (v.total || 0), 0)
      const tarjeta = ventasList
        .filter((v) => v.metodo_pago === 'tarjeta')
        .reduce((s, v) => s + (v.total || 0), 0)
      const transferencia = ventasList
        .filter((v) => v.metodo_pago === 'transferencia')
        .reduce((s, v) => s + (v.total || 0), 0)
      const otro = ventasList
        .filter(
          (v) =>
            !['efectivo', 'tarjeta', 'transferencia'].includes(
              v.metodo_pago || ''
            )
        )
        .reduce((s, v) => s + (v.total || 0), 0)
      const totalMetodos = efectivo + tarjeta + transferencia + otro

      // Por mesero
      const meserosMap = new Map<
        string,
        {
          usuario_id: string
          nombre: string
          color_mapa: string | null
          mesas_asignadas: number
          pedidos: number
          ventas: number
          propinas: number
          ayudas_dadas: number
          ayudas_recibidas: number
        }
      >()

      // Inicializar por pedidos
      pedidosList.forEach((p: any) => {
        if (!p.mesero_id) return
        if (!meserosMap.has(p.mesero_id)) {
          meserosMap.set(p.mesero_id, {
            usuario_id: p.mesero_id,
            nombre: p.mesero
              ? `${p.mesero.nombre || ''} ${p.mesero.apellido || ''}`.trim()
              : 'N/A',
            color_mapa: p.mesero?.color_mapa || null,
            mesas_asignadas: 0,
            pedidos: 0,
            ventas: 0,
            propinas: 0,
            ayudas_dadas: 0,
            ayudas_recibidas: 0
          })
        }
        const m = meserosMap.get(p.mesero_id)!
        if (p.estado !== 'cancelado') m.pedidos++

        // Ayudas recibidas: este mesero es titular y otro ayudó
        if (p.ayudado_por_id && p.ayudado_por_id !== p.mesero_id) {
          m.ayudas_recibidas++
        }
      })

      // Ayudas dadas: pedidos donde este usuario es el ayudante
      pedidosList.forEach((p: any) => {
        if (!p.ayudado_por_id) return
        if (p.ayudado_por_id === p.mesero_id) return
        if (!meserosMap.has(p.ayudado_por_id)) {
          meserosMap.set(p.ayudado_por_id, {
            usuario_id: p.ayudado_por_id,
            nombre: p.ayudante
              ? `${p.ayudante.nombre || ''} ${p.ayudante.apellido || ''}`.trim()
              : 'N/A',
            color_mapa: null,
            mesas_asignadas: 0,
            pedidos: 0,
            ventas: 0,
            propinas: 0,
            ayudas_dadas: 0,
            ayudas_recibidas: 0
          })
        }
        meserosMap.get(p.ayudado_por_id)!.ayudas_dadas++
      })

      // Ventas y propinas por mesero
      ventasList.forEach((v: any) => {
        if (!v.mesero_id) return
        const m = meserosMap.get(v.mesero_id)
        if (m) {
          m.ventas += v.total || 0
          m.propinas += v.propina || 0
        }
      })

      // Mesas asignadas por mesero
      mesasList.forEach((mesa: any) => {
        if (!mesa.mesero_id) return
        const m = meserosMap.get(mesa.mesero_id)
        if (m) m.mesas_asignadas++
      })

      // Por bartender
      const bartendersMap = new Map<
        string,
        {
          usuario_id: string
          nombre: string
          pedidos_preparados: number
          bebidas_preparadas: number
          mermas_count: number
          valor_mermas: number
        }
      >()

      pedidosList.forEach((p: any) => {
        if (!p.bartender_id) return
        if (!bartendersMap.has(p.bartender_id)) {
          bartendersMap.set(p.bartender_id, {
            usuario_id: p.bartender?.usuario_id || p.bartender_id,
            nombre: p.bartender?.nombre_completo || 'N/A',
            pedidos_preparados: 0,
            bebidas_preparadas: 0,
            mermas_count: 0,
            valor_mermas: 0
          })
        }
        const b = bartendersMap.get(p.bartender_id)!
        if (['listo', 'servido'].includes(p.estado)) {
          b.pedidos_preparados++
          b.bebidas_preparadas += Array.isArray(p.items) ? p.items.length : 0
        }
      })

      // Mermas por bartender
      mermasList.forEach((m: any) => {
        if (!m.bartender_id) return
        // Si el bartender no está en el map todavía, agregarlo
        if (!bartendersMap.has(m.bartender_id)) {
          bartendersMap.set(m.bartender_id, {
            usuario_id: m.bartender_id,
            nombre: m.bartender?.nombre_completo || 'N/A',
            pedidos_preparados: 0,
            bebidas_preparadas: 0,
            mermas_count: 0,
            valor_mermas: 0
          })
        }
        const b = bartendersMap.get(m.bartender_id)!
        b.mermas_count++
        b.valor_mermas += m.valor_perdido || 0
      })

      // Por caja (cajero)
      const cajaMap = new Map<
        string,
        {
          usuario_id: string
          nombre: string
          cobros: number
          importe: number
          propinas: number
          efectivo: number
          tarjeta: number
          transferencia: number
        }
      >()

      ventasList.forEach((v: any) => {
        if (!v.cajero_id) return
        if (!cajaMap.has(v.cajero_id)) {
          cajaMap.set(v.cajero_id, {
            usuario_id: v.cajero_id,
            nombre: v.cajero
              ? `${v.cajero.nombre || ''} ${v.cajero.apellido || ''}`.trim()
              : 'N/A',
            cobros: 0,
            importe: 0,
            propinas: 0,
            efectivo: 0,
            tarjeta: 0,
            transferencia: 0
          })
        }
        const c = cajaMap.get(v.cajero_id)!
        c.cobros++
        c.importe += v.total || 0
        c.propinas += v.propina || 0
        if (v.metodo_pago === 'efectivo') c.efectivo += v.total || 0
        else if (v.metodo_pago === 'tarjeta') c.tarjeta += v.total || 0
        else if (v.metodo_pago === 'transferencia')
          c.transferencia += v.total || 0
      })

      // Productos top
      const productosMap = new Map<
        string,
        { nombre: string; cantidad: number; total: number }
      >()
      pedidosList.forEach((p: any) => {
        if (p.estado === 'cancelado') return
        const items = Array.isArray(p.items) ? p.items : []
        items.forEach((item: any) => {
          const nombre = item.nombre || 'Producto'
          const cantidad = Number(item.cantidad) || 1
          const total = (Number(item.precio) || 0) * cantidad
          const existing = productosMap.get(nombre) || {
            nombre,
            cantidad: 0,
            total: 0
          }
          existing.cantidad += cantidad
          existing.total += total
          productosMap.set(nombre, existing)
        })
      })

      const productosTop = Array.from(productosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 15)

      // Cancelaciones detalladas
      const cancelacionesList = pedidosCancelados.map((p: any) => ({
        pedido_id: p.id.slice(0, 8),
        mesa: p.mesa || 'N/A',
        mesero: p.mesero
          ? `${p.mesero.nombre || ''} ${p.mesero.apellido || ''}`.trim()
          : 'N/A',
        motivo: p.motivo_cancelacion || 'Sin motivo',
        monto: Number(p.total) || 0,
        cancelado_por: p.cancelador
          ? `${p.cancelador.nombre || ''} ${p.cancelador.apellido || ''}`.trim()
          : 'N/A',
        hora: p.cancelado_en
          ? new Date(p.cancelado_en).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'N/A'
      }))

      // Ayudas detalladas
      const ayudasList = pedidosList
        .filter(
          (p: any) => p.ayudado_por_id && p.ayudado_por_id !== p.mesero_id
        )
        .map((p: any) => ({
          mesa: p.mesa || 'N/A',
          titular: p.mesero
            ? `${p.mesero.nombre || ''} ${p.mesero.apellido || ''}`.trim()
            : 'N/A',
          ayudante: p.ayudante
            ? `${p.ayudante.nombre || ''} ${p.ayudante.apellido || ''}`.trim()
            : 'N/A',
          items: Array.isArray(p.items) ? p.items.length : 0,
          total: Number(p.total) || 0,
          hora: new Date(p.created_at).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }))

      // Mermas detalladas
      const mermasDetalle = mermasList.map((m: any) => ({
        producto: m.productos?.nombre || 'N/A',
        bartender: m.bartender?.nombre_completo || 'N/A',
        cantidad: Number(m.cantidad) || 0,
        motivo: m.motivo || 'Sin motivo',
        valor: Number(m.valor_perdido) || 0,
        fecha: new Date(m.fecha).toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }))

      // Duracion
      const duracion = calcularDuracion(
        jornada.hora_inicio,
        jornada.hora_cierre
      )

      return {
        jornada: {
          id: jornada.id,
          nombre: jornada.nombre,
          fecha: jornada.fecha,
          hora_inicio: jornada.hora_inicio,
          hora_cierre: jornada.hora_cierre,
          notas: jornada.notas,
          duracion_minutos: duracion
        },
        resumen: {
          total_ventas: totalVentas,
          total_pedidos: pedidosList.length,
          total_propinas: totalPropinas,
          ticket_promedio:
            ventasList.length > 0 ? totalVentas / ventasList.length : 0,
          pedidos_cancelados: pedidosCancelados.length,
          pedidos_pendientes: pedidosPendientes,
          valor_cancelados: valorCancelados,
          total_mermas: mermasList.length,
          valor_mermas: valorMermas
        },
        metodos_pago: {
          efectivo,
          tarjeta,
          transferencia,
          otro,
          total: totalMetodos,
          efectivo_pct: totalMetodos > 0 ? (efectivo / totalMetodos) * 100 : 0,
          tarjeta_pct: totalMetodos > 0 ? (tarjeta / totalMetodos) * 100 : 0,
          transferencia_pct:
            totalMetodos > 0 ? (transferencia / totalMetodos) * 100 : 0
        },
        ventas_por_mesero: Array.from(meserosMap.values()).sort(
          (a, b) => b.ventas - a.ventas
        ),
        ventas_por_bartender: Array.from(bartendersMap.values()).sort(
          (a, b) => b.pedidos_preparados - a.pedidos_preparados
        ),
        ventas_por_caja: Array.from(cajaMap.values()).sort(
          (a, b) => b.importe - a.importe
        ),
        productos_top: productosTop,
        sesiones_caja: sesionesList.map((s: any) => ({
          cajero: s.cajero
            ? `${s.cajero.nombre || ''} ${s.cajero.apellido || ''}`.trim()
            : 'N/A',
          caja_fisica: s.caja?.nombre || 'N/A',
          saldo_inicial: s.saldo_inicial || 0,
          total_cobrado: s.total_cobrado || 0,
          saldo_final: s.saldo_final,
          diferencia: s.diferencia,
          estado: s.estado
        })),
        cancelaciones: cancelacionesList,
        mermas: mermasDetalle,
        ayudas: ayudasList
      }
    } catch (error) {
      console.error('Error general en stats:', error)
      return null
    }
  }
}
