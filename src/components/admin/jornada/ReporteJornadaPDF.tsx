'use client'

import { useState } from 'react'
import { FileText, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { jornadaStatsService, JornadaStats } from '@/lib/services/jornadaStatsService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReporteJornadaPDFProps {
  jornadaId: string
  jornadaNombre?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function ReporteJornadaPDF({
  jornadaId,
  jornadaNombre,
  variant = 'outline',
  size = 'default',
  className = ''
}: ReporteJornadaPDFProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const generarPDF = async () => {
    setLoading(true)
    try {
      const stats = await jornadaStatsService.getStatsCompletas(jornadaId)
      if (!stats) {
        toast({ title: 'Error', description: 'No se pudieron cargar las estadisticas', variant: 'destructive' })
        return
      }

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // ============================================================
      // PORTADA
      // ============================================================
      doc.setFillColor(16, 16, 16)
      doc.rect(0, 0, pageWidth, 40, 'F')

      // Logo: circulo negro con B blanca (simula el logo real)
      doc.setFillColor(255, 255, 255)
      doc.circle(20, 20, 10, 'F')
      doc.setFillColor(16, 16, 16)
      doc.circle(20, 20, 8.5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('B', 20, 22, { align: 'center' })

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.text('BARRANCO', 35, 18)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestion', 35, 24)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE JORNADA', pageWidth - 15, 22, { align: 'right' })

      // Info de la jornada
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(stats.jornada.nombre, 15, 55)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      const fecha = new Date(stats.jornada.fecha).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      doc.text(fecha, 15, 62)

      doc.setDrawColor(200, 200, 200)
      doc.line(15, 68, pageWidth - 15, 68)

      // Detalles
      let y = 78
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold')
      doc.text('Hora de inicio:', 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(stats.jornada.hora_inicio).toLocaleString('es-MX'), 55, y)
      y += 6

      doc.setFont('helvetica', 'bold')
      doc.text('Hora de cierre:', 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(stats.jornada.hora_cierre ? new Date(stats.jornada.hora_cierre).toLocaleString('es-MX') : 'En curso', 55, y)
      y += 6

      doc.setFont('helvetica', 'bold')
      doc.text('Duracion:', 15, y)
      doc.setFont('helvetica', 'normal')
      const horas = Math.floor(stats.jornada.duracion_minutos / 60)
      const mins = stats.jornada.duracion_minutos % 60
      doc.text(`${horas}h ${mins}min`, 55, y)
      y += 6

      doc.setFont('helvetica', 'bold')
      doc.text('Generado:', 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date().toLocaleString('es-MX'), 55, y)
      y += 15

      // ============================================================
      // RESUMEN
      // ============================================================
      doc.setFillColor(240, 253, 244)
      doc.rect(15, y - 5, pageWidth - 30, 45, 'F')

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Resumen General', 20, y + 3)
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      const resumenItems = [
        ['Ventas totales', `$${stats.resumen.total_ventas.toFixed(2)}`],
        ['Propinas totales', `$${stats.resumen.total_propinas.toFixed(2)}`],
        ['Pedidos totales', String(stats.resumen.total_pedidos)],
        ['Ticket promedio', `$${stats.resumen.ticket_promedio.toFixed(2)}`]
      ]
      resumenItems.forEach(([label, valor]) => {
        doc.text(label + ':', 20, y)
        doc.setFont('helvetica', 'bold')
        doc.text(valor, pageWidth - 20, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        y += 6
      })

      y += 10

      // ============================================================
      // METODOS DE PAGO
      // ============================================================
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Metodos de Pago', 15, y)
      doc.setDrawColor(16, 185, 129)
      doc.line(15, y + 1, pageWidth - 15, y + 1)
      y += 6

      autoTable(doc, {
        startY: y,
        head: [['Metodo', 'Monto', 'Porcentaje']],
        body: [
          ['Efectivo', `$${stats.metodos_pago.efectivo.toFixed(2)}`, `${stats.metodos_pago.efectivo_pct.toFixed(1)}%`],
          ['Tarjeta', `$${stats.metodos_pago.tarjeta.toFixed(2)}`, `${stats.metodos_pago.tarjeta_pct.toFixed(1)}%`],
          ['Transferencia', `$${stats.metodos_pago.transferencia.toFixed(2)}`, `${stats.metodos_pago.transferencia_pct.toFixed(1)}%`],
          ['Total', `$${stats.metodos_pago.total.toFixed(2)}`, '100%']
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      })

      y = (doc as any).lastAutoTable.finalY + 12

      // ============================================================
      // VENTAS POR MESERO
      // ============================================================
      doc.addPage()
      y = 20

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Ventas por Mesero', 15, y)
      doc.setDrawColor(16, 185, 129)
      doc.line(15, y + 1, pageWidth - 15, y + 1)
      y += 6

      autoTable(doc, {
        startY: y,
        head: [['Mesero', 'Mesas', 'Pedidos', 'Ventas', 'Propinas', 'Ayudas']],
        body: stats.ventas_por_mesero.map(m => [
          m.nombre,
          String(m.mesas_asignadas),
          String(m.pedidos),
          `$${m.ventas.toFixed(2)}`,
          `$${m.propinas.toFixed(2)}`,
          `${m.ayudas_dadas}/${m.ayudas_recibidas}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
      })

      y = (doc as any).lastAutoTable.finalY + 12

      // ============================================================
      // PEDIDOS SERVIDOS (CON MESA Y AYUDANTES)
      // ============================================================
      if (y > pageHeight - 80) { doc.addPage(); y = 20 }

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text(`Pedidos Servidos (${stats.pedidos_servidos_detallados.length})`, 15, y)
      doc.setDrawColor(16, 185, 129)
      doc.line(15, y + 1, pageWidth - 15, y + 1)
      y += 6

      autoTable(doc, {
        startY: y,
        head: [['Hora', 'Mesa', 'Mesero', 'Ayudante(s)', 'Items', 'Total']],
        body: stats.pedidos_servidos_detallados.map(p => [
          p.hora,
          p.mesa,
          p.mesero,
          p.ayudantes,
          String(p.items_count),
          `$${p.total.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 22 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      })

      y = (doc as any).lastAutoTable.finalY + 12

      // ============================================================
      // CANCELACIONES
      // ============================================================
      if (stats.cancelaciones.length > 0) {
        if (y > pageHeight - 60) { doc.addPage(); y = 20 }

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(`Cancelaciones (${stats.cancelaciones.length})`, 15, y)
        doc.setDrawColor(220, 38, 38)
        doc.line(15, y + 1, pageWidth - 15, y + 1)
        y += 6

        autoTable(doc, {
          startY: y,
          head: [['Hora', 'Mesa', 'Mesero', 'Motivo', 'Monto', 'Cancelo']],
          body: stats.cancelaciones.map(c => [
            c.hora, c.mesa, c.mesero, c.motivo,
            `$${c.monto.toFixed(2)}`, c.cancelado_por
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        })
        y = (doc as any).lastAutoTable.finalY + 12
      }

      // ============================================================
      // MERMAS
      // ============================================================
      if (stats.mermas.length > 0) {
        if (y > pageHeight - 60) { doc.addPage(); y = 20 }

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(234, 88, 12)
        doc.text(`Mermas (${stats.mermas.length}) - Total: $${stats.resumen.valor_mermas.toFixed(2)}`, 15, y)
        doc.setDrawColor(234, 88, 12)
        doc.line(15, y + 1, pageWidth - 15, y + 1)
        y += 6

        autoTable(doc, {
          startY: y,
          head: [['Hora', 'Producto', 'Bartender', 'Cant.', 'Motivo', 'Valor']],
          body: stats.mermas.map(m => [
            m.fecha, m.producto, m.bartender, String(m.cantidad), m.motivo,
            `$${m.valor.toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [234, 88, 12], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        })
        y = (doc as any).lastAutoTable.finalY + 12
      }

      // ============================================================
      // PIE DE PAGINA EN TODAS LAS PAGINAS
      // ============================================================
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)

        // Linea superior del pie
        doc.setDrawColor(220, 220, 220)
        doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12)

        // Logo pequeño en el pie
        doc.setFillColor(16, 16, 16)
        doc.circle(18, pageHeight - 7, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(5)
        doc.setFont('helvetica', 'bold')
        doc.text('B', 18, pageHeight - 6, { align: 'center' })

        doc.setTextColor(120, 120, 120)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text('Barranco System', 23, pageHeight - 6)

        doc.text(
          `Pagina ${i} de ${totalPages} | Generado el ${new Date().toLocaleDateString('es-MX')}`,
          pageWidth - 15,
          pageHeight - 6,
          { align: 'right' }
        )
      }

      // Guardar
      const nombreArchivo = `reporte_jornada_${stats.jornada.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nombreArchivo)

      toast({
        title: 'PDF generado',
        description: 'El reporte de jornada se descargo correctamente',
        variant: 'success'
      })
    } catch (error: any) {
      console.error('Error al generar PDF:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo generar el PDF',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={generarPDF}
      disabled={loading}
      className={`text-red-700 border-red-200 hover:bg-red-50 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF{jornadaNombre ? ` - ${jornadaNombre}` : ''}
        </>
      )}
    </Button>
  )
}
