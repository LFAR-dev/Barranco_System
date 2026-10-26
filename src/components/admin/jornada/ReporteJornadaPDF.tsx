'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { JornadaStats } from '@/lib/services/jornadaStatsService'

// ============================================================
// GENERADOR DE PDF DEL REPORTE DE JORNADA
// Multi-pagina, profesional, sin emojis
// ============================================================

const COLOR_PRIMARY: [number, number, number] = [139, 92, 246]
const COLOR_DARK: [number, number, number] = [30, 30, 30]
const COLOR_GRAY: [number, number, number] = [100, 100, 100]
const COLOR_LIGHT: [number, number, number] = [245, 245, 245]
const COLOR_GREEN: [number, number, number] = [16, 185, 129]
const COLOR_RED: [number, number, number] = [239, 68, 68]
const COLOR_AMBER: [number, number, number] = [245, 158, 11]

function formatoMoneda(n: number): string {
  return `$${(n || 0).toFixed(2)}`
}

function formatoFecha(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function formatoFechaCorta(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

function formatoDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h}h ${m}min`
}

export function generarReporteJornadaPDF(
  stats: JornadaStats,
  nombreAdmin: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = margin

  // ============================================================
  // PORTADA
  // ============================================================
  doc.setFillColor(...COLOR_PRIMARY)
  doc.rect(0, 0, pageWidth, 60, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.text('BARRANCO', pageWidth / 2, 25, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('REPORTE DE CIERRE DE JORNADA', pageWidth / 2, 33, {
    align: 'center'
  })

  doc.setFontSize(9)
  doc.text('Sistema de Gestion Operativa', pageWidth / 2, 40, {
    align: 'center'
  })

  y = 75
  doc.setTextColor(...COLOR_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(stats.jornada.nombre, margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_GRAY)
  doc.text(`Fecha: ${formatoFechaCorta(stats.jornada.fecha)}`, margin, y)
  y += 5
  doc.text(
    `Inicio: ${formatoFecha(stats.jornada.hora_inicio)}`,
    margin,
    y
  )
  y += 5
  if (stats.jornada.hora_cierre) {
    doc.text(
      `Cierre: ${formatoFecha(stats.jornada.hora_cierre)}`,
      margin,
      y
    )
    y += 5
  }
  doc.text(
    `Duracion: ${formatoDuracion(stats.jornada.duracion_minutos)}`,
    margin,
    y
  )
  y += 5
  doc.text(`Generado por: ${nombreAdmin}`, margin, y)
  y += 5
  doc.text(
    `Generado el: ${formatoFecha(new Date().toISOString())}`,
    margin,
    y
  )

  if (stats.jornada.notas) {
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_DARK)
    doc.text('Notas de cierre:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR_GRAY)
    const notasLines = doc.splitTextToSize(
      stats.jornada.notas,
      pageWidth - margin * 2
    )
    doc.text(notasLines, margin, y)
    y += notasLines.length * 5
  }

  // ============================================================
  // SECCION 1 — RESUMEN EJECUTIVO
  // ============================================================
  doc.addPage()
  y = margin

  doc.setFillColor(...COLOR_PRIMARY)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RESUMEN EJECUTIVO', margin, 13)

  y = 30
  doc.setTextColor(...COLOR_DARK)

  // KPIs principales en grid de 2x3
  const kpis = [
    {
      label: 'VENTAS TOTALES',
      valor: formatoMoneda(stats.resumen.total_ventas),
      color: COLOR_GREEN
    },
    {
      label: 'PROPINAS',
      valor: formatoMoneda(stats.resumen.total_propinas),
      color: COLOR_PRIMARY
    },
    {
      label: 'TICKET PROMEDIO',
      valor: formatoMoneda(stats.resumen.ticket_promedio),
      color: COLOR_DARK
    },
    {
      label: 'PEDIDOS',
      valor: String(stats.resumen.total_pedidos),
      color: COLOR_DARK
    },
    {
      label: 'CANCELADOS',
      valor: String(stats.resumen.pedidos_cancelados),
      color: COLOR_RED
    },
    {
      label: 'PENDIENTES',
      valor: String(stats.resumen.pedidos_pendientes),
      color: COLOR_AMBER
    }
  ]

  const kpiWidth = (pageWidth - margin * 2 - 5) / 2
  const kpiHeight = 22

  kpis.forEach((kpi, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = margin + col * (kpiWidth + 5)
    const yKpi = y + row * (kpiHeight + 5)

    doc.setFillColor(...COLOR_LIGHT)
    doc.roundedRect(x, yKpi, kpiWidth, kpiHeight, 2, 2, 'F')

    doc.setTextColor(...COLOR_GRAY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(kpi.label, x + 3, yKpi + 7)

    doc.setTextColor(...kpi.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(kpi.valor, x + 3, yKpi + 17)
  })

  y += 3 * (kpiHeight + 5) + 10

  // Métodos de pago
  doc.setTextColor(...COLOR_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Desglose por metodo de pago', margin, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [['Metodo', 'Monto', 'Porcentaje']],
    body: [
      [
        'Efectivo',
        formatoMoneda(stats.metodos_pago.efectivo),
        `${stats.metodos_pago.efectivo_pct.toFixed(1)}%`
      ],
      [
        'Tarjeta',
        formatoMoneda(stats.metodos_pago.tarjeta),
        `${stats.metodos_pago.tarjeta_pct.toFixed(1)}%`
      ],
      [
        'Transferencia',
        formatoMoneda(stats.metodos_pago.transferencia),
        `${stats.metodos_pago.transferencia_pct.toFixed(1)}%`
      ],
      [
        'Otro',
        formatoMoneda(stats.metodos_pago.otro),
        '-'
      ],
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
        {
          content: formatoMoneda(stats.metodos_pago.total),
          styles: { fontStyle: 'bold' as const }
        },
        {
          content: '100%',
          styles: { fontStyle: 'bold' as const }
        }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin }
  })

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10

  // Advertencia si hay pedidos pendientes o cancelados
  if (
    stats.resumen.pedidos_pendientes > 0 ||
    stats.resumen.pedidos_cancelados > 0
  ) {
    doc.setFillColor(255, 245, 220)
    doc.roundedRect(
      margin,
      y,
      pageWidth - margin * 2,
      20,
      2,
      2,
      'F'
    )
    doc.setTextColor(...COLOR_AMBER)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    let alertaY = y + 6
    if (stats.resumen.pedidos_pendientes > 0) {
      doc.text(
        `Atencion: ${stats.resumen.pedidos_pendientes} pedidos quedaron pendientes al cierre`,
        margin + 3,
        alertaY
      )
      alertaY += 5
    }
    if (stats.resumen.pedidos_cancelados > 0) {
      doc.text(
        `Cancelaciones: ${stats.resumen.pedidos_cancelados} (${formatoMoneda(stats.resumen.valor_cancelados)})`,
        margin + 3,
        alertaY
      )
    }
    y += 25
  }

  // Mermas
  if (stats.resumen.total_mermas > 0) {
    doc.setTextColor(...COLOR_DARK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Mermas registradas', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR_GRAY)
    doc.text(
      `Total: ${stats.resumen.total_mermas} mermas - Valor: ${formatoMoneda(stats.resumen.valor_mermas)}`,
      margin,
      y
    )
  }

  // ============================================================
  // SECCION 2 — DESGLOSE POR MESERO
  // ============================================================
  if (stats.ventas_por_mesero.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('DESGLOSE POR MESERO', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Mesero',
          'Mesas',
          'Pedidos',
          'Ventas',
          'Propinas',
          'Ayudas D',
          'Ayudas R'
        ]
      ],
      body: stats.ventas_por_mesero.map((m) => [
        m.nombre,
        String(m.mesas_asignadas),
        String(m.pedidos),
        formatoMoneda(m.ventas),
        formatoMoneda(m.propinas),
        String(m.ayudas_dadas),
        String(m.ayudas_recibidas)
      ]),
      foot: [
        [
          'TOTALES',
          String(
            stats.ventas_por_mesero.reduce(
              (s, m) => s + m.mesas_asignadas,
              0
            )
          ),
          String(
            stats.ventas_por_mesero.reduce((s, m) => s + m.pedidos, 0)
          ),
          formatoMoneda(
            stats.ventas_por_mesero.reduce((s, m) => s + m.ventas, 0)
          ),
          formatoMoneda(
            stats.ventas_por_mesero.reduce((s, m) => s + m.propinas, 0)
          ),
          String(
            stats.ventas_por_mesero.reduce((s, m) => s + m.ayudas_dadas, 0)
          ),
          String(
            stats.ventas_por_mesero.reduce(
              (s, m) => s + m.ayudas_recibidas,
              0
            )
          )
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLOR_LIGHT,
        textColor: COLOR_DARK,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 3 — DESGLOSE POR BARTENDER
  // ============================================================
  if (stats.ventas_por_bartender.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('DESGLOSE POR BARTENDER', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Bartender',
          'Pedidos preparados',
          'Bebidas preparadas',
          'Mermas',
          'Valor mermas'
        ]
      ],
      body: stats.ventas_por_bartender.map((b) => [
        b.nombre,
        String(b.pedidos_preparados),
        String(b.bebidas_preparadas),
        String(b.mermas_count),
        formatoMoneda(b.valor_mermas)
      ]),
      foot: [
        [
          'TOTALES',
          String(
            stats.ventas_por_bartender.reduce(
              (s, b) => s + b.pedidos_preparados,
              0
            )
          ),
          String(
            stats.ventas_por_bartender.reduce(
              (s, b) => s + b.bebidas_preparadas,
              0
            )
          ),
          String(
            stats.ventas_por_bartender.reduce(
              (s, b) => s + b.mermas_count,
              0
            )
          ),
          formatoMoneda(
            stats.ventas_por_bartender.reduce(
              (s, b) => s + b.valor_mermas,
              0
            )
          )
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLOR_LIGHT,
        textColor: COLOR_DARK,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 4 — DESGLOSE POR CAJERO
  // ============================================================
  if (stats.ventas_por_caja.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('DESGLOSE POR CAJERO', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Cajero',
          'Cobros',
          'Importe',
          'Propinas',
          'Efectivo',
          'Tarjeta',
          'Transfer.'
        ]
      ],
      body: stats.ventas_por_caja.map((c) => [
        c.nombre,
        String(c.cobros),
        formatoMoneda(c.importe),
        formatoMoneda(c.propinas),
        formatoMoneda(c.efectivo),
        formatoMoneda(c.tarjeta),
        formatoMoneda(c.transferencia)
      ]),
      foot: [
        [
          'TOTALES',
          String(stats.ventas_por_caja.reduce((s, c) => s + c.cobros, 0)),
          formatoMoneda(
            stats.ventas_por_caja.reduce((s, c) => s + c.importe, 0)
          ),
          formatoMoneda(
            stats.ventas_por_caja.reduce((s, c) => s + c.propinas, 0)
          ),
          formatoMoneda(
            stats.ventas_por_caja.reduce((s, c) => s + c.efectivo, 0)
          ),
          formatoMoneda(
            stats.ventas_por_caja.reduce((s, c) => s + c.tarjeta, 0)
          ),
          formatoMoneda(
            stats.ventas_por_caja.reduce(
              (s, c) => s + c.transferencia,
              0
            )
          )
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLOR_LIGHT,
        textColor: COLOR_DARK,
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 5 — AYUDAS ENTRE MESEROS
  // ============================================================
  if (stats.ayudas.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('AYUDAS ENTRE MESEROS', margin, 13)

    y = 30
    doc.setTextColor(...COLOR_GRAY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      'Pedidos creados por un mesero en mesa de otro companero.',
      margin,
      y
    )
    y += 8

    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Mesa', 'Titular', 'Ayudante', 'Items', 'Total']],
      body: stats.ayudas.map((a) => [
        a.hora,
        a.mesa,
        a.titular,
        a.ayudante,
        String(a.items),
        formatoMoneda(a.total)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 6 — MERMAS DETALLADAS
  // ============================================================
  if (stats.mermas.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('MERMAS REGISTRADAS', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Producto', 'Bartender', 'Cant.', 'Motivo', 'Valor']],
      body: stats.mermas.map((m) => [
        m.fecha,
        m.producto,
        m.bartender,
        String(m.cantidad),
        m.motivo,
        formatoMoneda(m.valor)
      ]),
      foot: [
        [
          'TOTAL',
          '',
          '',
          '',
          '',
          formatoMoneda(stats.mermas.reduce((s, m) => s + m.valor, 0))
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLOR_LIGHT,
        textColor: COLOR_DARK,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 7 — CANCELACIONES
  // ============================================================
  if (stats.cancelaciones.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('CANCELACIONES', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [
        ['Hora', 'Mesa', 'Mesero', 'Motivo', 'Monto', 'Cancelado por']
      ],
      body: stats.cancelaciones.map((c) => [
        c.hora,
        c.mesa,
        c.mesero,
        c.motivo,
        formatoMoneda(c.monto),
        c.cancelado_por
      ]),
      foot: [
        [
          'TOTAL',
          '',
          '',
          '',
          formatoMoneda(
            stats.cancelaciones.reduce((s, c) => s + c.monto, 0)
          ),
          ''
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLOR_LIGHT,
        textColor: COLOR_DARK,
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION 8 — PRODUCTOS TOP
  // ============================================================
  if (stats.productos_top.length > 0) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLOR_PRIMARY)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('PRODUCTOS MAS VENDIDOS', margin, 13)

    y = 30

    autoTable(doc, {
      startY: y,
      head: [['#', 'Producto', 'Cantidad', 'Total']],
      body: stats.productos_top.map((p, idx) => [
        String(idx + 1),
        p.nombre,
        String(p.cantidad),
        formatoMoneda(p.total)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin }
    })
  }

  // ============================================================
  // SECCION FINAL — FIRMAS
  // ============================================================
  doc.addPage()
  y = margin

  doc.setFillColor(...COLOR_PRIMARY)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('FIRMAS Y OBSERVACIONES', margin, 13)

  y = 50

  // Firmas
  doc.setTextColor(...COLOR_DARK)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const firmaY = y + 30
  const firmaWidth = (pageWidth - margin * 2 - 20) / 2

  doc.line(margin, firmaY, margin + firmaWidth, firmaY)
  doc.text('Administrador', margin, firmaY + 5)
  doc.text(nombreAdmin, margin, firmaY + 10)
  doc.text(
    `Fecha: ${formatoFechaCorta(new Date().toISOString())}`,
    margin,
    firmaY + 15
  )

  doc.line(
    margin + firmaWidth + 20,
    firmaY,
    pageWidth - margin,
    firmaY
  )
  doc.text('Auditor', margin + firmaWidth + 20, firmaY + 5)
  doc.text(
    '________________________',
    margin + firmaWidth + 20,
    firmaY + 10
  )
  doc.text(
    `Fecha: ____ / ____ / ______`,
    margin + firmaWidth + 20,
    firmaY + 15
  )

  // Observaciones
  y = firmaY + 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Observaciones:', margin, y)
  y += 5
  doc.setDrawColor(...COLOR_GRAY)
  for (let i = 0; i < 6; i++) {
    doc.line(margin, y + i * 8, pageWidth - margin, y + i * 8)
  }

  // Pie de página final
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_GRAY)
    doc.text(
      `Barranco - Reporte de Jornada - Pagina ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // Nombre del archivo
  const fecha = stats.jornada.fecha.replace(/[^0-9]/g, '')
  const nombreArchivo = `Barranco_Reporte_${stats.jornada.nombre.replace(
    /[^a-zA-Z0-9]/g,
    '_'
  )}_${fecha}.pdf`

  doc.save(nombreArchivo)
}
