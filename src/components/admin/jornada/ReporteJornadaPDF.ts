import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { JornadaStats } from '@/lib/services/jornadaStatsService'

// ============================================================
// PALETA FORMAL - Estilo Apple/Microsoft/Google
// ============================================================
const C = {
  ink: [31, 41, 55] as [number, number, number],            // #1F2937 gris oscuro
  inkSoft: [75, 85, 99] as [number, number, number],        // #4B5563 gris medio
  muted: [107, 114, 128] as [number, number, number],       // #6B7280 gris claro
  hairline: [229, 231, 235] as [number, number, number],    // #E5E7EB linea sutil
  surface: [249, 250, 251] as [number, number, number],     // #F9FAFB fondo suave
  white: [255, 255, 255] as [number, number, number],
  accent: [30, 64, 175] as [number, number, number],        // #1E40AF azul profundo
  accentSoft: [219, 234, 254] as [number, number, number],  // #DBEAFE azul muy claro
  success: [4, 120, 87] as [number, number, number],        // #047857 verde formal
  successSoft: [209, 250, 229] as [number, number, number], // #D1FAE5 verde suave
  danger: [185, 28, 28] as [number, number, number],        // #B91C1C rojo formal
  dangerSoft: [254, 226, 226] as [number, number, number],  // #FEE2E2 rojo suave
  warning: [161, 98, 7] as [number, number, number],        // #A16207 ambar
  warningSoft: [254, 243, 199] as [number, number, number]  // #FEF3C7 ambar suave
}

// ============================================================
// HELPERS
// ============================================================
function money(n: number): string {
  return `$${(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function dibujarLogoB(doc: jsPDF, cx: number, cy: number, radius: number) {
  // Circulo negro
  doc.setFillColor(C.ink[0], C.ink[1], C.ink[2])
  doc.circle(cx, cy, radius, 'F')
  // Letra B blanca centrada
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(radius * 1.6)
  // Ajuste fino de posicion vertical para centrar visualmente
  doc.text('B', cx, cy + radius * 0.55, { align: 'center' })
}

function dibujarSeccionHeader(
  doc: jsPDF,
  y: number,
  margin: number,
  titulo: string,
  subtitulo?: string
): number {
  // Barra vertical de acento a la izquierda
  doc.setFillColor(C.accent[0], C.accent[1], C.accent[2])
  doc.rect(margin, y - 4, 1.2, 7, 'F')

  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(titulo, margin + 4, y + 1)

  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
    doc.text(subtitulo, margin + 4, y + 6)
    return y + 12
  }
  return y + 8
}

function dibujarKPI(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  color: [number, number, number]
) {
  // Fondo suave
  doc.setFillColor(C.surface[0], C.surface[1], C.surface[2])
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'F')

  // Barra de color superior
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x, y, width, 1, 'F')

  // Label
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(label.toUpperCase(), x + 4, y + 8)

  // Valor
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(value, x + 4, y + 19)
}

// ============================================================
// FUNCION PRINCIPAL
// ============================================================
export function generarReporteJornadaPDF(stats: JornadaStats, nombreAdmin: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // ============================================================
  // PORTADA
  // ============================================================
  // Fondo superior blanco puro (sin color)
  doc.setFillColor(C.white[0], C.white[1], C.white[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Logo grande centrado
  const logoY = pageHeight * 0.32
  dibujarLogoB(doc, pageWidth / 2, logoY, 18)

  // BARRANCO
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.text('BARRANCO', pageWidth / 2, logoY + 32, { align: 'center' })

  // Linea sutil
  doc.setDrawColor(C.hairline[0], C.hairline[1], C.hairline[2])
  doc.setLineWidth(0.2)
  doc.line(pageWidth / 2 - 15, logoY + 38, pageWidth / 2 + 15, logoY + 38)

  // Subtitulo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('Reporte de Jornada', pageWidth / 2, logoY + 46, { align: 'center' })

  // Nombre de la jornada
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.text(stats.jornada.nombre, pageWidth / 2, logoY + 62, { align: 'center' })

  // Fecha
  const fechaJornada = new Date(stats.jornada.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text(
    fechaJornada.charAt(0).toUpperCase() + fechaJornada.slice(1),
    pageWidth / 2,
    logoY + 70,
    { align: 'center' }
  )

  // Footer de portada
  const footerY = pageHeight - 30
  doc.setDrawColor(C.hairline[0], C.hairline[1], C.hairline[2])
  doc.line(margin, footerY, pageWidth - margin, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('Generado por', margin, footerY + 5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.text(nombreAdmin, margin, footerY + 10)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text(new Date().toLocaleString('es-MX'), pageWidth - margin, footerY + 10, {
    align: 'right'
  })

  // ============================================================
  // PAGINA 2: RESUMEN EJECUTIVO
  // ============================================================
  doc.addPage()

  // Header minimalista
  doc.setFillColor(C.white[0], C.white[1], C.white[2])
  doc.rect(0, 0, pageWidth, 25, 'F')

  // Logo pequeño en el header
  dibujarLogoB(doc, margin + 5, 12, 5)

  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BARRANCO', margin + 13, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('Reporte de Jornada', margin + 13, 16.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.text(stats.jornada.nombre, pageWidth - margin, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text(
    `${new Date(stats.jornada.hora_inicio).toLocaleDateString('es-MX')}`,
    pageWidth - margin,
    16.5,
    { align: 'right' }
  )

  // Linea inferior del header
  doc.setDrawColor(C.hairline[0], C.hairline[1], C.hairline[2])
  doc.line(margin, 22, pageWidth - margin, 22)

  let y = 32

  // Titulo Resumen
  y = dibujarSeccionHeader(doc, y, margin, 'Resumen Ejecutivo')

  // KPIs en grid 2x2
  const kpiWidth = (contentWidth - 4) / 2
  const kpiHeight = 24

  dibujarKPI(doc, margin, y, kpiWidth, kpiHeight, 'Ventas Totales', money(stats.resumen.total_ventas), C.success)
  dibujarKPI(doc, margin + kpiWidth + 4, y, kpiWidth, kpiHeight, 'Propinas', money(stats.resumen.total_propinas), C.accent)

  y += kpiHeight + 4

  dibujarKPI(doc, margin, y, kpiWidth, kpiHeight, 'Pedidos', stats.resumen.total_pedidos.toString(), C.ink)
  dibujarKPI(doc, margin + kpiWidth + 4, y, kpiWidth, kpiHeight, 'Ticket Promedio', money(stats.resumen.ticket_promedio), C.ink)

  y += kpiHeight + 10

  // Seccion Metodos de Pago
  y = dibujarSeccionHeader(doc, y, margin, 'Metodos de Pago', 'Distribucion de ingresos')

  const metodosData = [
    ['Efectivo', money(stats.metodos_pago.efectivo), `${stats.metodos_pago.efectivo_pct.toFixed(1)}%`],
    ['Tarjeta', money(stats.metodos_pago.tarjeta), `${stats.metodos_pago.tarjeta_pct.toFixed(1)}%`],
    ['Transferencia', money(stats.metodos_pago.transferencia), `${stats.metodos_pago.transferencia_pct.toFixed(1)}%`]
  ]
  if (stats.metodos_pago.otro > 0) {
    metodosData.push(['Otro', money(stats.metodos_pago.otro), '-'])
  }
  metodosData.push(['Total', money(stats.metodos_pago.total), '100%'])

  autoTable(doc, {
    startY: y,
    head: [['Metodo', 'Monto', 'Porcentaje']],
    body: metodosData,
    theme: 'plain',
    headStyles: {
      fillColor: C.surface,
      textColor: C.ink,
      fontSize: 9,
      fontStyle: 'bold',
      lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 },
      lineColor: C.hairline
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: C.ink,
      lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
      lineColor: C.hairline
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.45 },
      1: { cellWidth: contentWidth * 0.30, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: contentWidth * 0.25, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Seccion Cancelaciones y Mermas (si hay)
  if (stats.resumen.pedidos_cancelados > 0 || stats.resumen.total_mermas > 0) {
    y = dibujarSeccionHeader(doc, y, margin, 'Alertas de la Jornada')
    const alertas = [
      ['Pedidos cancelados', stats.resumen.pedidos_cancelados.toString(), money(stats.resumen.valor_cancelados)],
      ['Mermas registradas', stats.resumen.total_mermas.toString(), money(stats.resumen.valor_mermas)]
    ]
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Cantidad', 'Monto']],
      body: alertas,
      theme: 'plain',
      headStyles: {
        fillColor: C.dangerSoft,
        textColor: C.danger,
        fontSize: 9,
        fontStyle: 'bold',
        lineWidth: 0
      },
      bodyStyles: {
        fontSize: 9.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.2, halign: 'center' },
        2: { cellWidth: contentWidth * 0.3, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================================
  // PAGINA 3+: EQUIPO
  // ============================================================
  doc.addPage()
  y = 32

  y = dibujarSeccionHeader(doc, y, margin, 'Rendimiento del Equipo', 'Ventas, propinas y ayudas por trabajador')

  if (stats.ventas_por_mesero.length > 0) {
    doc.setTextColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Meseros', margin, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Mesero', 'Mesas', 'Pedidos', 'Ventas', 'Propinas', 'Ayudas']],
      body: stats.ventas_por_mesero.map(m => [
        m.nombre,
        m.mesas_asignadas.toString(),
        m.pedidos.toString(),
        money(m.ventas),
        money(m.propinas),
        `${m.ayudas_dadas}/${m.ayudas_recibidas}`
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.surface,
        textColor: C.ink,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 },
        lineColor: C.hairline
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.32 },
        1: { cellWidth: contentWidth * 0.10, halign: 'center' },
        2: { cellWidth: contentWidth * 0.12, halign: 'center' },
        3: { cellWidth: contentWidth * 0.18, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: contentWidth * 0.16, halign: 'right', textColor: C.success },
        5: { cellWidth: contentWidth * 0.12, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (stats.ventas_por_caja.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = 32 }
    doc.setTextColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Cajeros', margin, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Cajero', 'Cobros', 'Importe', 'Propinas', 'Efectivo', 'Tarjeta']],
      body: stats.ventas_por_caja.map(c => [
        c.nombre,
        c.cobros.toString(),
        money(c.importe),
        money(c.propinas),
        money(c.efectivo),
        money(c.tarjeta)
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.surface,
        textColor: C.ink,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 },
        lineColor: C.hairline
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (stats.ventas_por_bartender.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = 32 }
    doc.setTextColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Bartenders', margin, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Bartender', 'Pedidos Preparados', 'Bebidas', 'Mermas', 'Valor Mermas']],
      body: stats.ventas_por_bartender.map(b => [
        b.nombre,
        b.pedidos_preparados.toString(),
        b.bebidas_preparadas.toString(),
        b.mermas_count.toString(),
        money(b.valor_mermas)
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.surface,
        textColor: C.ink,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 },
        lineColor: C.hairline
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================================
  // PAGINA: PEDIDOS SERVIDOS (CON MESA Y AYUDANTES)
  // ============================================================
  if (stats.pedidos_servidos_detallados && stats.pedidos_servidos_detallados.length > 0) {
    doc.addPage()
    y = 32

    y = dibujarSeccionHeader(
      doc,
      y,
      margin,
      `Pedidos Servidos (${stats.pedidos_servidos_detallados.length})`,
      'Trazabilidad completa: hora, mesa, mesero y ayudantes'
    )

    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Mesa', 'Mesero', 'Ayudante(s)', 'Items', 'Total']],
      body: stats.pedidos_servidos_detallados.map(p => [
        p.hora,
        p.mesa,
        p.mesero,
        p.ayudantes,
        p.items_count.toString(),
        money(p.total)
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.surface,
        textColor: C.ink,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 },
        lineColor: C.hairline
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 20 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================================
  // CANCELACIONES
  // ============================================================
  if (stats.cancelaciones.length > 0) {
    doc.addPage()
    y = 32

    y = dibujarSeccionHeader(
      doc,
      y,
      margin,
      `Cancelaciones (${stats.cancelaciones.length})`,
      'Motivos, responsables y montos'
    )

    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Mesa', 'Mesero', 'Motivo', 'Monto', 'Cancelo']],
      body: stats.cancelaciones.map(c => [
        c.hora, c.mesa, c.mesero, c.motivo, money(c.monto), c.cancelado_por
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.dangerSoft,
        textColor: C.danger,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: 0
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 20 },
        2: { cellWidth: 36 },
        3: { cellWidth: 50 },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: C.danger },
        5: { cellWidth: 24 }
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================================
  // MERMAS
  // ============================================================
  if (stats.mermas.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = 32 }
    y = dibujarSeccionHeader(
      doc,
      y,
      margin,
      `Mermas (${stats.mermas.length})`,
      `Total perdido: ${money(stats.resumen.valor_mermas)}`
    )

    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Producto', 'Bartender', 'Cantidad', 'Motivo', 'Valor']],
      body: stats.mermas.map(m => [
        m.fecha, m.producto, m.bartender, m.cantidad.toString(), m.motivo, money(m.valor)
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: C.warningSoft,
        textColor: C.warning,
        fontSize: 8.5,
        fontStyle: 'bold',
        lineWidth: 0
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: C.ink,
        lineWidth: { top: 0, right: 0, bottom: 0.1, left: 0 },
        lineColor: C.hairline
      },
      margin: { left: margin, right: margin }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================================
  // FIRMA Y NOTAS
  // ============================================================
  if (y > pageHeight - 50) { doc.addPage(); y = 32 }

  if (stats.jornada.notas) {
    y = dibujarSeccionHeader(doc, y, margin, 'Notas del Dia')
    doc.setTextColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lineas = doc.splitTextToSize(stats.jornada.notas, contentWidth)
    doc.text(lineas, margin, y)
    y += lineas.length * 4 + 12
  }

  // Firma
  y = pageHeight - 35
  doc.setDrawColor(C.inkSoft[0], C.inkSoft[1], C.inkSoft[2])
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('Firma del Administrador', margin, y + 5)
  doc.text('Fecha', pageWidth - margin - 70, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2])
  doc.text(nombreAdmin, margin, y + 10)
  doc.text(new Date().toLocaleString('es-MX'), pageWidth - margin - 70, y + 10)

  // ============================================================
  // FOOTER MINIMALISTA EN TODAS LAS PAGINAS (excepto portada)
  // ============================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)

    // Linea fina superior
    doc.setDrawColor(C.hairline[0], C.hairline[1], C.hairline[2])
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

    // Logo pequeño
    dibujarLogoB(doc, margin + 3, pageHeight - 7, 2.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
    doc.text('Barranco', margin + 8, pageHeight - 6.5)

    doc.text(
      `Pagina ${i - 1} de ${totalPages - 1}`,
      pageWidth / 2,
      pageHeight - 6.5,
      { align: 'center' }
    )

    doc.text(
      new Date().toLocaleDateString('es-MX'),
      pageWidth - margin,
      pageHeight - 6.5,
      { align: 'right' }
    )
  }

  // Guardar
  const fechaArchivo = new Date().toISOString().split('T')[0]
  const nombreArchivo = `Barranco_${stats.jornada.nombre.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`
  doc.save(nombreArchivo)
}

export default generarReporteJornadaPDF
