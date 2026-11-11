import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DEL DASHBOARD ADMIN
// Obtiene todos los KPIs reales via RPC atomico
// ============================================================

export interface DashboardKPIs {
  jornada_id: string | null
  jornada_nombre: string | null
  sin_jornada: boolean
  resumen: {
    ventas_totales: number
    propinas_totales: number
    transacciones: number
    ticket_promedio: number
  }
  por_mesero: Array<{
    usuario_id: string
    nombre: string
    color_mapa: string | null
    ventas: number
    total: number
    propinas: number
    pedidos: number
  }>
  por_bartender: Array<{
    bartender_id: string
    usuario_id: string
    nombre: string
    pedidos_preparados: number
    pedidos_pendientes: number
  }>
  por_cajero: Array<{
    usuario_id: string
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
  metodos_pago: {
    efectivo: number
    tarjeta: number
    transferencia: number
  }
  alertas_stock: Array<{
    nombre: string
    marca: string | null
    stock_actual: number
    stock_minimo: number
    estado: 'agotado' | 'bajo' | 'ok'
  }>
  cuentas_pendientes: {
    cantidad: number
    total: number
  }
  cancelaciones: {
    cantidad: number
    total: number
  }
  ventas_por_hora: Array<{
    hora: string
    ventas: number
  }>
  ventas_por_trabajador: Array<{
    usuario_id: string
    nombre: string
    rol: string
    cobros: number
    total: number
    propinas: number
    primera_venta: string | null
    ultima_venta: string | null
  }>
  cancelaciones_detalladas: Array<{
    pedido_id: string
    mesa: string | null
    total: number
    motivo_cancelacion: string | null
    cancelado_en: string | null
    cancelado_por_nombre: string
    cancelado_por_rol: string
    mesero_nombre: string
  }>
  mermas_detalladas: Array<{
    merma_id: string
    cantidad: number
    motivo: string
    valor_perdido: number
    fecha: string
    producto_nombre: string
    producto_marca: string
    bartender_nombre: string
  }>
}

function numero(v: any): number {
  return Number(v) || 0
}

export const dashboardService = {
  async getKPIs(jornadaId: string | null = null): Promise<DashboardKPIs | null> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('dashboard_admin_kpis', {
      p_jornada_id: jornadaId
    })

    if (error) {
      console.error('[dashboardService] Error al cargar KPIs:', error)
      return null
    }

    return normalizar(data)
  }
}

function normalizar(raw: any): DashboardKPIs {
  return {
    jornada_id: raw.jornada_id || null,
    jornada_nombre: raw.jornada_nombre || null,
    sin_jornada: raw.sin_jornada === true,
    resumen: {
      ventas_totales: numero(raw.resumen?.ventas_totales),
      propinas_totales: numero(raw.resumen?.propinas_totales),
      transacciones: numero(raw.resumen?.transacciones),
      ticket_promedio: numero(raw.resumen?.ticket_promedio)
    },
    por_mesero: (raw.por_mesero || []).map((m: any) => ({
      usuario_id: m.usuario_id,
      nombre: m.nombre || '',
      color_mapa: m.color_mapa || null,
      ventas: numero(m.ventas),
      total: numero(m.total),
      propinas: numero(m.propinas),
      pedidos: numero(m.pedidos)
    })),
    por_bartender: (raw.por_bartender || []).map((b: any) => ({
      bartender_id: b.bartender_id,
      usuario_id: b.usuario_id || '',
      nombre: b.nombre || '',
      pedidos_preparados: numero(b.pedidos_preparados),
      pedidos_pendientes: numero(b.pedidos_pendientes)
    })),
    por_cajero: (raw.por_cajero || []).map((c: any) => ({
      usuario_id: c.usuario_id,
      nombre: c.nombre || '',
      cobros: numero(c.cobros),
      importe: numero(c.importe),
      propinas: numero(c.propinas),
      efectivo: numero(c.efectivo),
      tarjeta: numero(c.tarjeta),
      transferencia: numero(c.transferencia)
    })),
    productos_top: (raw.productos_top || []).map((p: any) => ({
      nombre: p.nombre || '',
      cantidad: numero(p.cantidad),
      total: numero(p.total)
    })),
    metodos_pago: {
      efectivo: numero(raw.metodos_pago?.efectivo),
      tarjeta: numero(raw.metodos_pago?.tarjeta),
      transferencia: numero(raw.metodos_pago?.transferencia)
    },
    alertas_stock: (raw.alertas_stock || []).map((a: any) => ({
      nombre: a.nombre || '',
      marca: a.marca || null,
      stock_actual: numero(a.stock_actual),
      stock_minimo: numero(a.stock_minimo),
      estado: a.estado || 'ok'
    })),
    cuentas_pendientes: {
      cantidad: numero(raw.cuentas_pendientes?.cantidad),
      total: numero(raw.cuentas_pendientes?.total)
    },
    cancelaciones: {
      cantidad: numero(raw.cancelaciones?.cantidad),
      total: numero(raw.cancelaciones?.total)
    },
    ventas_por_hora: (raw.ventas_por_hora || []).map((v: any) => ({
      hora: v.hora || '',
      ventas: numero(v.ventas)
    })),
    ventas_por_trabajador: (raw.ventas_por_trabajador || []).map((t: any) => ({
      usuario_id: t.usuario_id,
      nombre: t.nombre || '',
      rol: t.rol || '',
      cobros: numero(t.cobros),
      total: numero(t.total),
      propinas: numero(t.propinas),
      primera_venta: t.primera_venta || null,
      ultima_venta: t.ultima_venta || null
    })),
    cancelaciones_detalladas: (raw.cancelaciones_detalladas || []).map((c: any) => ({
      pedido_id: c.pedido_id,
      mesa: c.mesa || null,
      total: numero(c.total),
      motivo_cancelacion: c.motivo_cancelacion || null,
      cancelado_en: c.cancelado_en || null,
      cancelado_por_nombre: c.cancelado_por_nombre || 'Sin usuario',
      cancelado_por_rol: c.cancelado_por_rol || 'desconocido',
      mesero_nombre: c.mesero_nombre || 'Sin mesero'
    })),
    mermas_detalladas: (raw.mermas_detalladas || []).map((m: any) => ({
      merma_id: m.merma_id,
      cantidad: numero(m.cantidad),
      motivo: m.motivo || '',
      valor_perdido: numero(m.valor_perdido),
      fecha: m.fecha || '',
      producto_nombre: m.producto_nombre || 'Producto desconocido',
      producto_marca: m.producto_marca || '',
      bartender_nombre: m.bartender_nombre || 'Sin bartender'
    }))
  }
}
