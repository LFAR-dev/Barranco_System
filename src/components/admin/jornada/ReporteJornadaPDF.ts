import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { JornadaStats } from '@/lib/services/jornadaStatsService'

// ============================================================
// GENERADOR DE PDF DEL REPORTE DE JORNADA
// Crea un PDF profesional con estadísticas y gráficas
// ============================================================

const COLORS = {
  primary: [16, 185, 129] as [number, number, number],
  secondary: [59, 130, 246] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number]
}

function formatearMoneda(n: number): string {
  return `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Dibuja una gráfica de barras horizontal en el PDF
 */
function dibujarBarraHorizontal(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  valor: number,
  maximo: number,
  color: [number, number, number]
) {
  // Fondo
  doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2])
  doc.roundedRect(x, y, width, height, 1, 1, 'F')

  // Barra
  if (maximo > 0) {
    const anchoBarra = Math.max(0, Math.min(width, (valor / maximo) * width))
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(x, y, anchoBarra, height, 1, 1, 'F')
  }
}

/**
 * Dibuja una gráfica de dona (pie chart) en el PDF
 */
function dibujarDona(
  doc: jsPDF,
  cx: number,
  cy: number,
  radioExterior: number,
  radioInterior: number,
  datos: Array<{ valor: number; color: [number, number, number] }>
) {
  const total = datos.reduce((s, d) => s + d.valor, 0)
  if (total === 0) return

  let anguloInicio = -Math.PI / 2 // Empezar arriba

  datos.forEach(({ valor, color }) => {
    const anguloFin = anguloInicio + (valor / total) * 2 * Math.PI

    // Dibujar sector (muchos segmentos pequeños)
    const pasos = Math.max(20, Math.floor((anguloFin - anguloInicio) * 20))
    for (let i = 0; i <= pasos; i++) {
      const angulo = anguloInicio + (anguloFin - anguloInicio) * (i / pasos)
      const x1 = cx + Math.cos(angulo) * radioExterior
      const y1 = cy + Math.sin(angulo) * radioExterior
      const x2 = cx + Math.cos(angulo) * radioInterior
      const y2 = cy + Math.sin(angulo) * radioInterior

      doc.setFillColor(color[0], color[1], color[2])
      doc.triangle(
        cx, cy,
        x1, y1,
        x2, y2,
        'F'
      )
    }

    anguloInicio = anguloFin
  })

  // Círculo central blanco
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy, radioInterior - 2, 'F')
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
export function generarReporteJornadaPDF(stats: JornadaStats, nombreAdmin: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  let y = margin

  // ============================================================
  // HEADER CON LOGO
  // ============================================================
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
  doc.rect(0, 0, pageWidth, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('BARRANCO', margin, 15)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Cierre de Jornada', margin, 22)

  doc.setFontSize(9)
  doc.text(
    `Generado: ${new Date().toLocaleString('es-MX')}`,
    pageWidth - margin,
    15,
    { align: 'right' }
  )
  doc.text(
    `Por: ${nombreAdmin}`,
    pageWidth - margin,
    21,
    { align: 'right' }
  )

  y = 40

  // ============================================================
  // INFO DE LA JORNADA
  // ============================================================
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(stats.jornada.nombre, margin + 5, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const fecha = new Date(stats.jornada.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  doc.text(
    `Fecha: ${fecha.charAt(0).toUpperCase() + fecha.slice(1)}`,
    margin + 5,
    y + 15
  )

  doc.text(
    `Apertura: ${formatearFecha(stats.jornada.hora_inicio)}`,
    pageWidth - margin - 5,
    y + 8,
    { align: 'right' }
  )
  doc.text(
    `Cierre: ${stats.jornada.hora_cierre ? formatearFecha(stats.jornada.hora_cierre) : 'En curso'}`,
    pageWidth - margin - 5,
    y + 15,
    { align: 'right' }
  )

  y += 28

  // ============================================================
  // MÉTRICAS PRINCIPALES (4 tarjetas)
  // ============================================================
  const cardWidth = (contentWidth - 6) / 4
  const cardHeight = 22

  const metricas = [
    { label: 'VENTAS TOTALES', valor: formatearMoneda(stats.resumen.total_ventas), color: COLORS.primary },
    { label: 'PROPINAS', valor: formatearMoneda(stats.resumen.total_propinas), color: COLORS.secondary },
    { label: 'PEDIDOS', valor: stats.resumen.total_pedidos.toString(), color: COLORS.warning },
    { label: 'TICKET PROMEDIO', valor: formatearMoneda(stats.resumen.ticket_promedio), color: COLORS.dark }
  ]

  metricas.forEach((m, i) => {
    const x = margin + i * (cardWidth + 2)
    
    doc.setFillColor(m.color[0], m.color[1], m.color[2])
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(m.label, x + cardWidth / 2, y + 7, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(m.valor, x + cardWidth / 2, y + 16, { align: 'center' })
  })

  y += cardHeight + 8

  // ============================================================
  // GRÁFICA DE BARRAS: Ventas por mesero
  // ============================================================
  if (stats.ventas_por_mesero.length > 0) {
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Ventas por Mesero', margin, y)
    y += 6

    const maxVentas = Math.max(...stats.ventas_por_mesero.map(m => m.ventas))
    
    stats.ventas_por_mesero.forEach((m, i) => {
      if (y > pageHeight - 40) {
        doc.addPage()
        y = margin
      }

      // Nombre del mesero
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
      doc.text(m.nombre, margin, y + 4)

      // Barra
      dibujarBarraHorizontal(
        doc,
        margin + 50,
        y,
        contentWidth - 80,
        5,
        m.ventas,
        maxVentas,
        COLORS.primary
      )

      // Valor
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
      doc.text(
        formatearMoneda(m.ventas),
        pageWidth - margin,
        y + 4,
        { align: 'right' }
      )

      y += 8
    })
    y += 4
  }

  // ============================================================
  // GRÁFICA DE DONA: Métodos de pago
  // ============================================================
  const metodosConValor = [
    { label: 'Efectivo', valor: stats.metodos_pago.efectivo, color: COLORS.primary },
    { label: 'Tarjeta', valor: stats.metodos_pago.tarjeta, color: COLORS.secondary },
    { label: 'Transferencia', valor: stats.metodos_pago.transferencia, color: COLORS.warning },
    { label: 'Otro', valor: stats.metodos_pago.otro, color: COLORS.gray }
  ].filter(m => m.valor > 0)

  if (metodosConValor.length > 0 && y < pageHeight - 80) {
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Métodos de Pago', margin, y)
    y += 8

    // Dona a la izquierda
    const donaCx = margin + 25
    const donaCy = y + 22
    dibujarDona(doc, donaCx, donaCy, 22, 12, metodosConValor)

    // Total al centro
    const totalMetodos = metodosConValor.reduce((s, m) => s + m.valor, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.text('Total', donaCx, donaCy - 1, { align: 'center' })
    doc.setFontSize(7)
    doc.text(formatearMoneda(totalMetodos), donaCx, donaCy + 3, { align: 'center' })

    // Leyenda a la derecha
    let legendY = y + 8
    const legendX = margin + 60
    metodosConValor.forEach(m => {
      // Cuadro de color
      doc.setFillColor(m.color[0], m.color[1], m.color[2])
      doc.rect(legendX, legendY - 3, 4, 4, 'F')

      // Texto
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
      doc.text(m.label, legendX + 7, legendY)

      doc.setFont('helvetica', 'bold')
      doc.text(
        formatearMoneda(m.valor),
        pageWidth - margin,
        legendY,
        { align: 'right' }
      )

      legendY += 8
    })

    y = donaCy + 30
  }

  // ============================================================
  // TOP PRODUCTOS
  // ============================================================
  if (stats.productos_top.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Productos Vendidos', margin, y)
    y += 4

    const productosData = stats.productos_top.map(p => [
      p.nombre,
      p.cantidad.toString(),
      formatearMoneda(p.total)
    ])

    autoTable(doc, {
      startY: y,
      head: [['Producto', 'Cantidad', 'Total']],
      body: productosData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.55 },
        1: { cellWidth: contentWidth * 0.20, halign: 'center' },
        2: { cellWidth: contentWidth * 0.25, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================================
  // RENDIMIENTO POR BARTENDER
  // ============================================================
  if (stats.ventas_por_bartender.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Rendimiento por Bartender', margin, y)
    y += 4

    const bartendersData = stats.ventas_por_bartender.map(b => [
      b.nombre,
      b.pedidos_preparados.toString()
    ])

    autoTable(doc, {
      startY: y,
      head: [['Bartender', 'Pedidos Preparados']],
      body: bartendersData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================================
  // RENDIMIENTO POR CAJERO
  // ============================================================
  if (stats.ventas_por_caja.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Rendimiento por Cajero', margin, y)
    y += 4

    const cajaData = stats.ventas_por_caja.map(c => [
      c.nombre,
      c.cobros.toString(),
      formatearMoneda(c.importe),
      formatearMoneda(c.propinas)
    ])

    autoTable(doc, {
      startY: y,
      head: [['Cajero', 'Cobros', 'Importe', 'Propinas']],
      body: cajaData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.warning,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.15, halign: 'center' },
        2: { cellWidth: contentWidth * 0.25, halign: 'right' },
        3: { cellWidth: contentWidth * 0.25, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================================
  // SESIONES DE CAJA
  // ============================================================
  if (stats.sesiones_caja.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Sesiones de Caja', margin, y)
    y += 4

    const sesionesData = stats.sesiones_caja.map(s => [
      s.cajero,
      s.caja_fisica,
      formatearMoneda(s.saldo_inicial),
      formatearMoneda(s.total_cobrado),
      s.saldo_final !== null ? formatearMoneda(s.saldo_final) : '-',
      s.diferencia !== null 
        ? (s.diferencia >= 0 ? '+' : '') + formatearMoneda(s.diferencia)
        : '-',
      s.estado === 'cerrada' ? 'Cerrada' : 'Abierta'
    ])

    autoTable(doc, {
      startY: y,
      head: [['Cajero', 'Caja', 'Inicial', 'Cobrado', 'Final', 'Diferencia', 'Estado']],
      body: sesionesData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.dark,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================================
  // CANCELACIONES
  // ============================================================
  if (stats.cancelaciones.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage()
      y = margin
    }

    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Pedidos Cancelados', margin, y)
    y += 4

    const cancelData = stats.cancelaciones.map(c => [
      c.pedido_id,
      c.mesa,
      c.motivo,
      c.hora
    ])

    autoTable(doc, {
      startY: y,
      head: [['Pedido', 'Mesa', 'Motivo', 'Hora']],
      body: cancelData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.danger,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================================
  // NOTAS Y FIRMA
  // ============================================================
  if (y > pageHeight - 50) {
    doc.addPage()
    y = margin
  }

  if (stats.jornada.notas) {
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Notas del día:', margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    const lineas = doc.splitTextToSize(stats.jornada.notas, contentWidth)
    doc.text(lineas, margin, y)
    y += lineas.length * 4 + 8
  }

  // Firma
  y = pageHeight - 30
  doc.setDrawColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2])
  doc.line(margin, y, margin + 70, y)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2])
  doc.text('Firma del Administrador', margin, y + 5)
  doc.text(nombreAdmin, margin, y + 10)

  // Fecha
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y)
  doc.text('Fecha y Hora', pageWidth - margin - 70, y + 5)
  doc.text(new Date().toLocaleString('es-MX'), pageWidth - margin - 70, y + 10)

  // ============================================================
  // FOOTER EN TODAS LAS PÁGINAS
  // ============================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2])
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F')

    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(
      'Barranco - Sistema de Gestión',
      margin,
      pageHeight - 3
    )
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 3,
      { align: 'right' }
    )
  }

  // ============================================================
  // GUARDAR
  // ============================================================
  const fechaArchivo = new Date().toISOString().split('T')[0]
  const nombreArchivo = `Reporte_${stats.jornada.nombre.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`
  doc.save(nombreArchivo)
}
