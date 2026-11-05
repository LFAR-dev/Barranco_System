'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Search, ArrowLeft, RefreshCw, DollarSign, TrendingUp,
  Filter, Clock, Eye, CreditCard, Wallet, TrendingDown, X,
  FileText, Image as ImageIcon, FileSpreadsheet, Download,
  Calendar, UserCircle, Receipt, XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  ventaService,
  Venta,
  VentaStats,
  Cancelacion,
  PropinaPorMesero,
  DesgloseMetodosPago
} from '@/lib/services/ventaService'
import { jornadaService } from '@/lib/services/jornadaService'
import { DetalleVentaModal } from '@/components/admin/DetalleVentaModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

type Periodo = 'jornada_activa' | 'hoy' | 'ayer' | 'semana' | 'mes' | 'jornada' | 'custom'

interface ReporteData {
  ventas: Venta[]
  cancelaciones: Cancelacion[]
  stats: VentaStats
  propinasPorMesero: PropinaPorMesero[]
  desgloseMetodos: DesgloseMetodosPago
  rangoTexto: string
  jornadaTexto: string
  fechaGeneracion: string
}

export default function SalesPage() {
  const { toast } = useToast()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cancelaciones, setCancelaciones] = useState<Cancelacion[]>([])
  const [stats, setStats] = useState<VentaStats | null>(null)
  const [propinasPorMesero, setPropinasPorMesero] = useState<PropinaPorMesero[]>([])
  const [desgloseMetodos, setDesgloseMetodos] = useState<DesgloseMetodosPago | null>(null)
  const [loading, setLoading] = useState(true)
  const [jornadaActivaId, setJornadaActivaId] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<{
    periodo: Periodo
    fechaInicio: string
    fechaFin: string
    metodoPago: string
    meseroId: string
    cajeroId: string
    jornadaId: string
    searchTerm: string
  }>({
    periodo: 'jornada_activa',
    fechaInicio: '',
    fechaFin: '',
    metodoPago: '',
    meseroId: '',
    cajeroId: '',
    jornadaId: '',
    searchTerm: ''
  })

  const [opciones, setOpciones] = useState<{
    meseros: Array<{ id: string; nombre: string }>
    cajeros: Array<{ id: string; nombre: string }>
    bartenders: Array<{ id: string; nombre: string }>
    jornadas: Array<{ id: string; nombre: string; fecha: string }>
  }>({ meseros: [], cajeros: [], bartenders: [], jornadas: [] })

  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [descargando, setDescargando] = useState<string | null>(null)
  const reporteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarOpciones()
    cargarJornadaActiva()
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [filtros])

  const cargarJornadaActiva = async () => {
    try {
      const jornada = await jornadaService.getJornadaActual()
      setJornadaActivaId(jornada?.id || null)
    } catch (e) {
      console.error('Error al cargar jornada activa:', e)
    }
  }

  const cargarOpciones = async () => {
    try {
      const data = await ventaService.getFiltrosDisponibles()
      setOpciones(data)
    } catch (error) {
      console.error('Error al cargar opciones:', error)
    }
  }

  const calcularRangoFechas = (): { inicio: string; fin: string } => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fin = new Date()
    fin.setHours(23, 59, 59, 999)

    switch (filtros.periodo) {
      case 'jornada_activa':
        return { inicio: '', fin: '' }
      case 'hoy':
        return { inicio: hoy.toISOString(), fin: fin.toISOString() }
      case 'ayer': {
        const ayer = new Date(hoy)
        ayer.setDate(ayer.getDate() - 1)
        const ayerFin = new Date(ayer)
        ayerFin.setHours(23, 59, 59, 999)
        return { inicio: ayer.toISOString(), fin: ayerFin.toISOString() }
      }
      case 'semana': {
        const semana = new Date(hoy)
        semana.setDate(semana.getDate() - 7)
        return { inicio: semana.toISOString(), fin: fin.toISOString() }
      }
      case 'mes': {
        const mes = new Date(hoy)
        mes.setDate(mes.getDate() - 30)
        return { inicio: mes.toISOString(), fin: fin.toISOString() }
      }
      case 'custom':
        return {
          inicio: filtros.fechaInicio ? new Date(filtros.fechaInicio).toISOString() : '',
          fin: filtros.fechaFin ? new Date(filtros.fechaFin + 'T23:59:59').toISOString() : ''
        }
      default:
        return { inicio: '', fin: '' }
    }
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const rango = calcularRangoFechas()
      const jornadaIdFiltro =
        filtros.periodo === 'jornada_activa'
          ? jornadaActivaId
          : filtros.periodo === 'jornada'
          ? filtros.jornadaId || undefined
          : undefined

      const filtrosBase: any = {
        fechaInicio: rango.inicio,
        fechaFin: rango.fin,
        metodoPago: filtros.metodoPago || undefined,
        meseroId: filtros.meseroId || undefined,
        cajeroId: filtros.cajeroId || undefined,
        jornadaId: jornadaIdFiltro,
        searchTerm: filtros.searchTerm || undefined
      }

      const [ventasData, statsData, cancelData, propinasData, desgloseData] = await Promise.all([
        ventaService.getVentas(filtrosBase),
        ventaService.getStats(filtrosBase),
        ventaService.getCancelaciones({
          fechaInicio: rango.inicio,
          fechaFin: rango.fin,
          jornadaId: jornadaIdFiltro,
          meseroId: filtros.meseroId || undefined
        }),
        ventaService.getPropinasPorMesero(filtrosBase),
        ventaService.getDesgloseMetodosPago(filtrosBase)
      ])

      setVentas(ventasData)
      setStats({
        ...statsData,
        canceladas: cancelData.length,
        canceladasMonto: cancelData.reduce((s, c) => s + c.total, 0)
      })
      setCancelaciones(cancelData)
      setPropinasPorMesero(propinasData)
      setDesgloseMetodos(desgloseData)
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las ventas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getRangoTexto = (): string => {
    switch (filtros.periodo) {
      case 'jornada_activa': return 'Jornada activa'
      case 'hoy': return 'Hoy'
      case 'ayer': return 'Ayer'
      case 'semana': return 'Ultimos 7 dias'
      case 'mes': return 'Ultimos 30 dias'
      case 'jornada': {
        const j = opciones.jornadas.find(j => j.id === filtros.jornadaId)
        return j ? `${j.nombre}` : 'Todas las jornadas'
      }
      case 'custom':
        return `${filtros.fechaInicio || '?'} a ${filtros.fechaFin || '?'}`
      default: return ''
    }
  }

  const construirReporteData = (): ReporteData => {
    return {
      ventas,
      cancelaciones,
      stats: stats || {
        totalVentas: 0, totalPropinas: 0, ticketPromedio: 0, numVentas: 0,
        efectivo: 0, tarjeta: 0, transferencia: 0, canceladas: 0, canceladasMonto: 0
      },
      propinasPorMesero,
      desgloseMetodos: desgloseMetodos || {
        efectivo: { count: 0, total: 0 },
        tarjeta: { count: 0, total: 0 },
        transferencia: { count: 0, total: 0 }
      },
      rangoTexto: getRangoTexto(),
      jornadaTexto: opciones.jornadas.find(j => j.id === jornadaActivaId)?.nombre || 'Sin jornada activa',
      fechaGeneracion: new Date().toLocaleString('es-MX')
    }
  }

  const descargarPDF = async () => {
    if (ventas.length === 0 && cancelaciones.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay informacion para exportar', variant: 'destructive' })
      return
    }
    setDescargando('pdf')
    try {
      const data = construirReporteData()
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let y = 20

      // Portada
      doc.setFillColor(16, 185, 129)
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BARRANCO SYSTEM', pageWidth / 2, 18, { align: 'center' })
      doc.setFontSize(11)
      doc.text('Reporte de Ventas', pageWidth / 2, 28, { align: 'center' })

      doc.setTextColor(60, 60, 60)
      y = 50
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Rango: ${data.rangoTexto}`, 15, y); y += 6
      doc.text(`Jornada: ${data.jornadaTexto}`, 15, y); y += 6
      doc.text(`Generado: ${data.fechaGeneracion}`, 15, y); y += 12

      // Resumen
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Resumen General', 15, y); y += 3
      doc.setDrawColor(16, 185, 129)
      doc.line(15, y, pageWidth - 15, y); y += 6

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const resumen = [
        ['Ventas totales', `$${data.stats.totalVentas.toFixed(2)}`],
        ['Propinas totales', `$${data.stats.totalPropinas.toFixed(2)}`],
        ['Transacciones', `${data.stats.numVentas}`],
        ['Ticket promedio', `$${data.stats.ticketPromedio.toFixed(2)}`],
        ['Cancelaciones', `${data.stats.canceladas} ($${data.stats.canceladasMonto.toFixed(2)})`]
      ]
      resumen.forEach(([label, valor]) => {
        doc.text(`${label}:`, 15, y)
        doc.setFont('helvetica', 'bold')
        doc.text(valor, pageWidth - 15, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        y += 6
      })
      y += 6

      // Metodos de pago
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Metodos de Pago', 15, y); y += 3
      doc.line(15, y, pageWidth - 15, y); y += 6
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const metodos = [
        ['Efectivo', `$${data.desgloseMetodos.efectivo.total.toFixed(2)}`, data.desgloseMetodos.efectivo.count],
        ['Tarjeta', `$${data.desgloseMetodos.tarjeta.total.toFixed(2)}`, data.desgloseMetodos.tarjeta.count],
        ['Transferencia', `$${data.desgloseMetodos.transferencia.total.toFixed(2)}`, data.desgloseMetodos.transferencia.count]
      ]
      metodos.forEach(([label, valor, count]) => {
        doc.text(`${label}:`, 15, y)
        doc.setFont('helvetica', 'bold')
        doc.text(`${valor} (${count} txns)`, pageWidth - 15, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        y += 6
      })

      // Nueva pagina para propinas y ventas
      doc.addPage()
      y = 20

      // Propinas por mesero
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Propinas por Mesero', 15, y); y += 3
      doc.line(15, y, pageWidth - 15, y); y += 4

      autoTable(doc, {
        startY: y,
        head: [['Mesero', 'Ventas', 'Total vendido', 'Propinas']],
        body: data.propinasPorMesero.map(p => [
          p.nombre,
          String(p.ventas_count),
          `$${p.total.toFixed(2)}`,
          `$${p.propinas.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      })
      y = (doc as any).lastAutoTable.finalY + 12

      // Ventas
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text(`Ventas (${data.ventas.length})`, 15, y); y += 3
      doc.line(15, y, pageWidth - 15, y); y += 4

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Mesero', 'Cajero', 'Metodo', 'Propina', 'Total']],
        body: data.ventas.map(v => [
          new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          v.mesero ? `${v.mesero.nombre} ${v.mesero.apellido}` : '-',
          v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : '-',
          v.metodo_pago || '-',
          `$${(v.propina || 0).toFixed(2)}`,
          `$${(v.total || 0).toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
      })

      // Cancelaciones
      if (data.cancelaciones.length > 0) {
        doc.addPage()
        y = 20
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(`Cancelaciones (${data.cancelaciones.length})`, 15, y); y += 3
        doc.line(15, y, pageWidth - 15, y); y += 4

        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Mesa', 'Total', 'Mesero', 'Cancelo', 'Motivo']],
          body: data.cancelaciones.map(c => [
            c.cancelado_en
              ? new Date(c.cancelado_en).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : '-',
            c.mesa || '-',
            `$${c.total.toFixed(2)}`,
            c.mesero_nombre,
            `${c.cancelador_nombre}${c.cancelador_rol ? ` (${c.cancelador_rol})` : ''}`,
            c.motivo_cancelacion || '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        })
      }

      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        doc.text('Barranco System', 15, pageHeight - 8)
      }

      doc.save(`reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: 'PDF generado', description: 'El reporte se descargo correctamente', variant: 'success' })
    } catch (error: any) {
      console.error('Error al generar PDF:', error)
      toast({ title: 'Error', description: error.message || 'No se pudo generar el PDF', variant: 'destructive' })
    } finally {
      setDescargando(null)
    }
  }

  const descargarImagen = async () => {
    if (!reporteRef.current) return
    if (ventas.length === 0 && cancelaciones.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay informacion para exportar', variant: 'destructive' })
      return
    }
    setDescargando('imagen')
    try {
      const canvas = await html2canvas(reporteRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.png`
      link.click()
      toast({ title: 'Imagen generada', description: 'El reporte se descargo como PNG', variant: 'success' })
    } catch (error: any) {
      console.error('Error al generar imagen:', error)
      toast({ title: 'Error', description: error.message || 'No se pudo generar la imagen', variant: 'destructive' })
    } finally {
      setDescargando(null)
    }
  }

  const descargarExcel = async () => {
    if (ventas.length === 0 && cancelaciones.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay informacion para exportar', variant: 'destructive' })
      return
    }
    setDescargando('excel')
    try {
      const data = construirReporteData()
      const wb = XLSX.utils.book_new()

      const resumenData = [
        ['BARRANCO SYSTEM', 'Reporte de Ventas'],
        [],
        ['Rango', data.rangoTexto],
        ['Jornada', data.jornadaTexto],
        ['Generado', data.fechaGeneracion],
        [],
        ['RESUMEN GENERAL', ''],
        ['Ventas totales', data.stats.totalVentas],
        ['Propinas totales', data.stats.totalPropinas],
        ['Transacciones', data.stats.numVentas],
        ['Ticket promedio', data.stats.ticketPromedio],
        ['Cancelaciones', data.stats.canceladas],
        ['Monto cancelado', data.stats.canceladasMonto],
        [],
        ['METODOS DE PAGO', 'Count', 'Total'],
        ['Efectivo', data.desgloseMetodos.efectivo.count, data.desgloseMetodos.efectivo.total],
        ['Tarjeta', data.desgloseMetodos.tarjeta.count, data.desgloseMetodos.tarjeta.total],
        ['Transferencia', data.desgloseMetodos.transferencia.count, data.desgloseMetodos.transferencia.total]
      ]
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      const ventasData = [
        ['ID', 'Fecha', 'Mesero', 'Cajero', 'Bartender', 'Metodo', 'Propina', 'Total', 'Estado'],
        ...data.ventas.map(v => [
          v.id,
          new Date(v.created_at).toLocaleString('es-MX'),
          v.mesero ? `${v.mesero.nombre} ${v.mesero.apellido}` : '',
          v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : '',
          v.bartender?.nombre_completo || '',
          v.metodo_pago || '',
          v.propina || 0,
          v.total || 0,
          v.estado || ''
        ])
      ]
      const wsVentas = XLSX.utils.aoa_to_sheet(ventasData)
      XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas')

      const propinasData = [
        ['Mesero', 'Ventas', 'Total vendido', 'Propinas'],
        ...data.propinasPorMesero.map(p => [p.nombre, p.ventas_count, p.total, p.propinas])
      ]
      const wsPropinas = XLSX.utils.aoa_to_sheet(propinasData)
      XLSX.utils.book_append_sheet(wb, wsPropinas, 'Propinas')

      const cancData = [
        ['ID', 'Fecha cancelacion', 'Mesa', 'Total', 'Mesero', 'Cancelo', 'Rol', 'Motivo'],
        ...data.cancelaciones.map(c => [
          c.id,
          c.cancelado_en ? new Date(c.cancelado_en).toLocaleString('es-MX') : '',
          c.mesa || '',
          c.total,
          c.mesero_nombre,
          c.cancelador_nombre,
          c.cancelador_rol,
          c.motivo_cancelacion || ''
        ])
      ]
      const wsCanc = XLSX.utils.aoa_to_sheet(cancData)
      XLSX.utils.book_append_sheet(wb, wsCanc, 'Cancelaciones')

      XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: 'Excel generado', description: 'El reporte se descargo como XLSX', variant: 'success' })
    } catch (error: any) {
      console.error('Error al generar Excel:', error)
      toast({ title: 'Error', description: error.message || 'No se pudo generar el Excel', variant: 'destructive' })
    } finally {
      setDescargando(null)
    }
  }

  const descargarCSV = () => {
    if (ventas.length === 0 && cancelaciones.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay informacion para exportar', variant: 'destructive' })
      return
    }
    try {
      const data = construirReporteData()
      const headersVentas = ['TIPO', 'ID', 'Fecha', 'Mesero', 'Cajero', 'Bartender', 'Metodo', 'Propina', 'Total', 'Estado']
      const rowsVentas = data.ventas.map(v => [
        'VENTA',
        v.id.slice(0, 8),
        new Date(v.created_at).toLocaleString('es-MX'),
        v.mesero ? `${v.mesero.nombre} ${v.mesero.apellido}` : '',
        v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : '',
        v.bartender?.nombre_completo || '',
        v.metodo_pago || '',
        (v.propina || 0).toFixed(2),
        (v.total || 0).toFixed(2),
        v.estado || ''
      ])
      const rowsCancel = data.cancelaciones.map(c => [
        'CANCELADA',
        c.id.slice(0, 8),
        c.cancelado_en ? new Date(c.cancelado_en).toLocaleString('es-MX') : '',
        c.mesero_nombre,
        '',
        '',
        '',
        '',
        c.total.toFixed(2),
        `CANCELADA: ${c.cancelador_nombre} - ${c.motivo_cancelacion || 'Sin motivo'}`
      ])

      const csv = [
        headersVentas.join(','),
        ...[...rowsVentas, ...rowsCancel].map(r => r.map(c => `"${c}"`).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast({ title: 'CSV generado', description: 'El reporte se descargo como CSV', variant: 'success' })
    } catch (error: any) {
      console.error('Error al generar CSV:', error)
      toast({ title: 'Error', description: error.message || 'No se pudo generar el CSV', variant: 'destructive' })
    }
  }

  const limpiarFiltros = () => {
    setFiltros({
      periodo: 'jornada_activa',
      fechaInicio: '',
      fechaFin: '',
      metodoPago: '',
      meseroId: '',
      cajeroId: '',
      jornadaId: '',
      searchTerm: ''
    })
  }

  const handleVerDetalle = (venta: Venta) => {
    setVentaSeleccionada(venta)
    setIsDetalleOpen(true)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada':
      case 'servido':
        return 'bg-emerald-100 text-emerald-700'
      case 'cancelada':
      case 'cancelado':
        return 'bg-red-100 text-red-700'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'efectivo': return <DollarSign className="h-3 w-3" />
      case 'tarjeta': return <CreditCard className="h-3 w-3" />
      default: return <Wallet className="h-3 w-3" />
    }
  }

  const filtrosActivos = useMemo(() => {
    return (
      filtros.periodo !== 'jornada_activa' ||
      filtros.metodoPago ||
      filtros.meseroId ||
      filtros.cajeroId ||
      filtros.jornadaId ||
      filtros.searchTerm
    )
  }, [filtros])

  const reporteData = construirReporteData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-emerald-600" />
                Historial de Ventas
              </h1>
              <p className="text-sm text-gray-500">
                Ventas, propinas y cancelaciones con trazabilidad completa
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cargarDatos} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={descargarPDF}
              disabled={descargando === 'pdf'}
              className="text-red-700 border-red-200 hover:bg-red-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              {descargando === 'pdf' ? 'Generando...' : 'PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={descargarImagen}
              disabled={descargando === 'imagen'}
              className="text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {descargando === 'imagen' ? 'Generando...' : 'Imagen'}
            </Button>
            <Button
              variant="outline"
              onClick={descargarExcel}
              disabled={descargando === 'excel'}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {descargando === 'excel' ? 'Generando...' : 'Excel'}
            </Button>
            <Button variant="outline" onClick={descargarCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-gray-500">Ventas</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ${stats.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-gray-500">Propinas</p>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  ${stats.totalPropinas.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <p className="text-xs text-gray-500">Ticket prom.</p>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  ${stats.ticketPromedio.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <p className="text-xs text-gray-500">Efectivo</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ${(desgloseMetodos?.efectivo.total || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                  <p className="text-xs text-gray-500">Tarjeta</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ${(desgloseMetodos?.tarjeta.total || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-gray-500">Canceladas</p>
                </div>
                <p className="text-xl font-bold text-red-600">
                  {stats.canceladas}
                </p>
                <p className="text-xs text-red-500">
                  ${stats.canceladasMonto.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {filtrosActivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="ml-auto text-xs text-red-600 hover:text-red-800 h-auto p-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Periodo</label>
                <select
                  value={filtros.periodo}
                  onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value as Periodo })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="jornada_activa">Jornada activa</option>
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Ultimos 7 dias</option>
                  <option value="mes">Ultimos 30 dias</option>
                  <option value="jornada">Por jornada</option>
                  <option value="custom">Rango custom</option>
                </select>
              </div>

              {filtros.periodo === 'jornada' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Jornada</label>
                  <select
                    value={filtros.jornadaId}
                    onChange={(e) => setFiltros({ ...filtros, jornadaId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Todas</option>
                    {opciones.jornadas.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.nombre} ({new Date(j.fecha).toLocaleDateString('es-MX')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filtros.periodo === 'custom' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                    <Input
                      type="date"
                      value={filtros.fechaInicio}
                      onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
                    <Input
                      type="date"
                      value={filtros.fechaFin}
                      onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Metodo de pago</label>
                <select
                  value={filtros.metodoPago}
                  onChange={(e) => setFiltros({ ...filtros, metodoPago: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mesero</label>
                <select
                  value={filtros.meseroId}
                  onChange={(e) => setFiltros({ ...filtros, meseroId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {opciones.meseros.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cajero</label>
                <select
                  value={filtros.cajeroId}
                  onChange={(e) => setFiltros({ ...filtros, cajeroId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {opciones.cajeros.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 md:col-span-3 lg:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Folio, mesero, cajero..."
                    className="pl-9 text-sm"
                    value={filtros.searchTerm}
                    onChange={(e) => setFiltros({ ...filtros, searchTerm: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen: Propinas por mesero + desglose por metodo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-blue-600" />
                Propinas por mesero
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propinasPorMesero.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {propinasPorMesero.map(p => (
                    <div key={p.mesero_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {p.ventas_count} ventas - ${p.total.toFixed(2)}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 ml-2 shrink-0">
                        +${p.propinas.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Desglose por metodo de pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!desgloseMetodos ? (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">Efectivo</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${desgloseMetodos.efectivo.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{desgloseMetodos.efectivo.count} txns</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Tarjeta</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${desgloseMetodos.tarjeta.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{desgloseMetodos.tarjeta.count} txns</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Transferencia</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${desgloseMetodos.transferencia.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{desgloseMetodos.transferencia.count} txns</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Ventas / Canceladas */}
        <Tabs defaultValue="ventas" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="ventas" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas
              <Badge variant="secondary" className="text-xs">{ventas.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="canceladas" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Canceladas
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">{cancelaciones.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ventas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Ventas ({ventas.length})</span>
                  {loading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && ventas.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-500">Cargando ventas...</p>
                  </div>
                ) : ventas.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No hay ventas en este periodo</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Folio</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Fecha</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Mesero</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Cajero</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Metodo</th>
                          <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Propina</th>
                          <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Total</th>
                          <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Estado</th>
                          <th className="text-center py-2 px-2 text-xs font-medium text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map((venta) => (
                          <tr key={venta.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-2">
                              <span className="font-mono text-xs text-gray-600">#{venta.id.slice(0, 6)}</span>
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs">
                                  {new Date(venta.created_at).toLocaleString('es-MX', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              {venta.mesero ? `${venta.mesero.nombre} ${venta.mesero.apellido}` : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              {venta.cajero ? `${venta.cajero.nombre} ${venta.cajero.apellido}` : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="py-2 px-2">
                              <Badge className="bg-gray-100 text-gray-700 text-xs flex items-center gap-1 w-fit">
                                {getMetodoPagoIcon(venta.metodo_pago || '')}
                                {venta.metodo_pago || 'N/A'}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right text-xs text-blue-600 font-medium">
                              ${(venta.propina || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-emerald-600">
                              ${(venta.total || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge className={`text-xs ${getEstadoBadge(venta.estado)}`}>
                                {venta.estado || 'N/A'}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleVerDetalle(venta)}
                                title="Ver detalle"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="canceladas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Cancelaciones ({cancelaciones.length})
                  </span>
                  {cancelaciones.length > 0 && (
                    <Badge className="bg-red-100 text-red-700">
                      ${cancelaciones.reduce((s, c) => s + c.total, 0).toFixed(2)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && cancelaciones.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-500">Cargando cancelaciones...</p>
                  </div>
                ) : cancelaciones.length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Sin cancelaciones en este periodo</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-red-50">
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-600">Fecha cancelacion</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-600">Mesa</th>
                          <th className="text-right py-2 px-2 text-xs font-medium text-gray-600">Total</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-600">Mesero</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-600">Cancelo</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-gray-600">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelaciones.map((c) => (
                          <tr key={c.id} className="border-b border-gray-100 hover:bg-red-50/30 transition-colors">
                            <td className="py-2 px-2 text-xs text-gray-700">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {c.cancelado_en
                                  ? new Date(c.cancelado_en).toLocaleString('es-MX', {
                                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                    })
                                  : '-'}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-xs font-medium">{c.mesa || '-'}</td>
                            <td className="py-2 px-2 text-xs text-right font-semibold text-red-600">
                              ${c.total.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-xs">{c.mesero_nombre}</td>
                            <td className="py-2 px-2 text-xs">
                              <div className="flex items-center gap-1">
                                <UserCircle className="h-3 w-3 text-gray-400" />
                                <span>
                                  {c.cancelador_nombre}
                                  {c.cancelador_rol && (
                                    <span className="text-gray-400 ml-1">({c.cancelador_rol})</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-xs text-gray-600 max-w-xs truncate" title={c.motivo_cancelacion || ''}>
                              {c.motivo_cancelacion || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reporte oculto para html2canvas */}
      <div
        ref={reporteRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '1200px',
          backgroundColor: '#ffffff',
          padding: '40px',
          fontFamily: 'system-ui, sans-serif',
          color: '#111827'
        }}
      >
        <div style={{ borderBottom: '3px solid #10b981', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>BARRANCO SYSTEM</h1>
          <p style={{ fontSize: '18px', color: '#374151', marginTop: '8px' }}>Reporte de Ventas</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div><strong>Rango:</strong> {reporteData.rangoTexto}</div>
          <div><strong>Jornada:</strong> {reporteData.jornadaTexto}</div>
          <div><strong>Generado:</strong> {reporteData.fechaGeneracion}</div>
        </div>

        <div style={{ backgroundColor: '#ecfdf5', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46', marginBottom: '12px' }}>Resumen General</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Ventas totales</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>${reporteData.stats.totalVentas.toFixed(2)}</div></div>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Propinas totales</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>${reporteData.stats.totalPropinas.toFixed(2)}</div></div>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Ticket promedio</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>${reporteData.stats.ticketPromedio.toFixed(2)}</div></div>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Transacciones</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reporteData.stats.numVentas}</div></div>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Cancelaciones</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{reporteData.stats.canceladas}</div></div>
            <div><div style={{ fontSize: '12px', color: '#065f46' }}>Monto cancelado</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>${reporteData.stats.canceladasMonto.toFixed(2)}</div></div>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46', marginBottom: '12px' }}>Propinas por Mesero</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#10b981', color: 'white' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Mesero</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Ventas</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Total</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Propinas</th>
            </tr>
          </thead>
          <tbody>
            {reporteData.propinasPorMesero.map((p, i) => (
              <tr key={p.mesero_id} style={{ backgroundColor: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px', fontSize: '12px' }}>{p.nombre}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{p.ventas_count}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>${p.total.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>${p.propinas.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46', marginBottom: '12px' }}>Metodos de Pago</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#10b981', color: 'white' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Metodo</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Transacciones</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px', fontSize: '12px' }}>Efectivo</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{reporteData.desgloseMetodos.efectivo.count}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>${reporteData.desgloseMetodos.efectivo.total.toFixed(2)}</td>
            </tr>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px', fontSize: '12px' }}>Tarjeta</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{reporteData.desgloseMetodos.tarjeta.count}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>${reporteData.desgloseMetodos.tarjeta.total.toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px', fontSize: '12px' }}>Transferencia</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{reporteData.desgloseMetodos.transferencia.count}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>${reporteData.desgloseMetodos.transferencia.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46', marginBottom: '12px' }}>Ventas ({reporteData.ventas.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#10b981', color: 'white' }}>
              <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Fecha</th>
              <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Mesero</th>
              <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Cajero</th>
              <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Metodo</th>
              <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Propina</th>
              <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {reporteData.ventas.map((v, i) => (
              <tr key={v.id} style={{ backgroundColor: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px', fontSize: '11px' }}>{new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '6px', fontSize: '11px' }}>{v.mesero ? `${v.mesero.nombre} ${v.mesero.apellido}` : '-'}</td>
                <td style={{ padding: '6px', fontSize: '11px' }}>{v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : '-'}</td>
                <td style={{ padding: '6px', fontSize: '11px' }}>{v.metodo_pago || '-'}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontSize: '11px', color: '#2563eb' }}>${(v.propina || 0).toFixed(2)}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>${(v.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {reporteData.cancelaciones.length > 0 && (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', marginBottom: '12px' }}>
              Cancelaciones ({reporteData.cancelaciones.length})
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#dc2626', color: 'white' }}>
                  <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Fecha</th>
                  <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Mesa</th>
                  <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Total</th>
                  <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Mesero</th>
                  <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Cancelo</th>
                  <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {reporteData.cancelaciones.map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 ? '#fef2f2' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '6px', fontSize: '11px' }}>{c.cancelado_en ? new Date(c.cancelado_en).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td style={{ padding: '6px', fontSize: '11px' }}>{c.mesa || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#dc2626' }}>${c.total.toFixed(2)}</td>
                    <td style={{ padding: '6px', fontSize: '11px' }}>{c.mesero_nombre}</td>
                    <td style={{ padding: '6px', fontSize: '11px' }}>{c.cancelador_nombre} {c.cancelador_rol ? `(${c.cancelador_rol})` : ''}</td>
                    <td style={{ padding: '6px', fontSize: '11px' }}>{c.motivo_cancelacion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
          Barranco System - Reporte generado el {reporteData.fechaGeneracion}
        </div>
      </div>

      {/* Modal de detalle */}
      <DetalleVentaModal
        venta={ventaSeleccionada}
        isOpen={isDetalleOpen}
        onClose={() => {
          setIsDetalleOpen(false)
          setVentaSeleccionada(null)
        }}
      />
    </div>
  )
}
