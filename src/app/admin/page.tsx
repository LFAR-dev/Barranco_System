'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import { getStats } from './stats'
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, BarChart3,
  Package, ClipboardList, ShoppingCart, UserCog, UserCheck, Table,
  UserPlus, Wallet, Loader2, RefreshCw, Eye, Wine, FileText,
  XCircle, FlaskConical, List
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { dashboardService, DashboardKPIs } from '@/lib/services/dashboardService'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORES_PAGO = {
  efectivo: '#10b981',
  tarjeta: '#3b82f6',
  transferencia: '#8b5cf6'
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { greeting, timeIcon } = useGreeting()
  const supabase = createClient()

  const [stats, setStats] = useState({
    bartenders: 0, meseros: 0, productos: 0, ventas: 0, admins: 0, cajas: 0
  })
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [loadingKPIs, setLoadingKPIs] = useState(true)
  const [jornadaActual, setJornadaActual] = useState<Jornada | null>(null)
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<string>('actual')
  const [descargando, setDescargando] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    cargarStats()
    cargarJornadas()
    const interval = setInterval(cargarStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const cargarStats = async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const cargarJornadas = async () => {
    try {
      const actual = await jornadaService.getJornadaActual()
      setJornadaActual(actual)
      const historico = await jornadaService.getHistorial(10)
      setJornadas(historico)
    } catch (error) {
      console.error('Error cargando jornadas:', error)
    }
  }

  const cargarKPIs = useCallback(async () => {
    setLoadingKPIs(true)
    try {
      const jornadaId =
        jornadaSeleccionada === 'actual'
          ? null
          : jornadaSeleccionada === 'todas'
          ? null
          : jornadaSeleccionada

      const data = await dashboardService.getKPIs(jornadaId)
      setKpis(data)
    } catch (error) {
      console.error('Error cargando KPIs:', error)
    } finally {
      setLoadingKPIs(false)
    }
  }, [jornadaSeleccionada])

  useEffect(() => {
    cargarKPIs()
  }, [cargarKPIs])

  useEffect(() => {
    const channelName = `dashboard_kpis_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jornadas' }, () => cargarJornadas())
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current) } catch {}
        channelRef.current = null
      }
    }
  }, [cargarKPIs, supabase])

  const getFirstName = () => user?.nombre || 'Administrador'

  const getJornadaLabel = () => jornadaActual?.nombre || 'Sin jornada activa'

  // KPIs forzados a cero si no hay jornada activa
  const sinJornada = !jornadaActual && jornadaSeleccionada === 'actual'
  const resumen = sinJornada ? null : kpis?.resumen
  const ventasTotales = sinJornada ? 0 : (resumen?.ventas_totales || 0)
  const propinasTotales = sinJornada ? 0 : (resumen?.propinas_totales || 0)
  const transacciones = sinJornada ? 0 : (resumen?.transacciones || 0)
  const ticketPromedio = sinJornada ? 0 : (resumen?.ticket_promedio || 0)
  const cuentasPendientesTotal = sinJornada ? 0 : (kpis?.cuentas_pendientes.total || 0)
  const cuentasPendientesCantidad = sinJornada ? 0 : (kpis?.cuentas_pendientes.cantidad || 0)

  const datosPago = !sinJornada && kpis
    ? [
        { name: 'Efectivo', value: kpis.metodos_pago.efectivo, color: COLORES_PAGO.efectivo },
        { name: 'Tarjeta', value: kpis.metodos_pago.tarjeta, color: COLORES_PAGO.tarjeta },
        { name: 'Transferencia', value: kpis.metodos_pago.transferencia, color: COLORES_PAGO.transferencia }
      ].filter(d => d.value > 0)
    : []

  const descargarDetallePDF = async () => {
    if (!kpis || sinJornada) {
      alert('No hay datos para descargar')
      return
    }
    setDescargando(true)
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const jornadaNombre = kpis.jornada_nombre || 'Jornada'
      const fechaGen = new Date().toLocaleString('es-MX')

      doc.setFillColor(16, 185, 129)
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BARRANCO SYSTEM', pageWidth / 2, 18, { align: 'center' })
      doc.setFontSize(11)
      doc.text(`Detalle de ${jornadaNombre}`, pageWidth / 2, 28, { align: 'center' })

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado: ${fechaGen}`, 15, 48)

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Resumen de la jornada', 15, 60)
      doc.setDrawColor(16, 185, 129)
      doc.line(15, 62, pageWidth - 15, 62)

      autoTable(doc, {
        startY: 66,
        body: [
          ['Ventas totales', `$${(kpis.resumen.ventas_totales || 0).toFixed(2)}`],
          ['Propinas totales', `$${(kpis.resumen.propinas_totales || 0).toFixed(2)}`],
          ['Transacciones', String(kpis.resumen.transacciones || 0)],
          ['Ticket promedio', `$${(kpis.resumen.ticket_promedio || 0).toFixed(2)}`],
          ['Cuentas abiertas', `${kpis.cuentas_pendientes.cantidad} ($${kpis.cuentas_pendientes.total.toFixed(2)})`],
          ['Cancelaciones', `${kpis.cancelaciones.cantidad} ($${kpis.cancelaciones.total.toFixed(2)})`]
        ],
        theme: 'plain',
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 }
      })

      let y = (doc as any).lastAutoTable.finalY + 12

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Ventas por trabajador', 15, y); y += 4

      if (kpis.ventas_por_trabajador.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Trabajador', 'Rol', 'Cobros', 'Total', 'Propinas']],
          body: kpis.ventas_por_trabajador.map(t => [
            t.nombre, t.rol, String(t.cobros),
            `$${t.total.toFixed(2)}`, `$${t.propinas.toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 15, right: 15 }
        })
        y = (doc as any).lastAutoTable.finalY + 12
      } else {
        doc.text('Sin ventas registradas', 15, y + 6)
        y += 16
      }

      if (y > pageHeight - 60) { doc.addPage(); y = 20 }

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(`Cancelaciones (${kpis.cancelaciones_detalladas.length})`, 15, y); y += 4

      if (kpis.cancelaciones_detalladas.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Mesa', 'Total', 'Mesero', 'Cancelo', 'Motivo']],
          body: kpis.cancelaciones_detalladas.map(c => [
            c.cancelado_en ? new Date(c.cancelado_en).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
            c.mesa || '-',
            `$${c.total.toFixed(2)}`,
            c.mesero_nombre,
            `${c.cancelado_por_nombre} (${c.cancelado_por_rol})`,
            c.motivo_cancelacion || '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        })
        y = (doc as any).lastAutoTable.finalY + 12
      } else {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text('Sin cancelaciones', 15, y + 6)
        y += 16
      }

      if (y > pageHeight - 60) { doc.addPage(); y = 20 }

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(234, 88, 12)
      doc.text(`Mermas (${kpis.mermas_detalladas.length})`, 15, y); y += 4

      if (kpis.mermas_detalladas.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Producto', 'Cant.', 'Valor', 'Bartender', 'Motivo']],
          body: kpis.mermas_detalladas.map(m => [
            m.fecha ? new Date(m.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
            `${m.producto_nombre} ${m.producto_marca}`.trim(),
            String(m.cantidad),
            `$${m.valor_perdido.toFixed(2)}`,
            m.bartender_nombre,
            m.motivo || '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [234, 88, 12], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        })
      } else {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text('Sin mermas registradas', 15, y + 6)
      }

      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        doc.text('Barranco System', 15, pageHeight - 8)
      }

      doc.save(`detalle_jornada_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('No se pudo generar el PDF')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{timeIcon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {getFirstName()}
            </h1>
            <p className="text-gray-500 flex items-center gap-2 flex-wrap">
              {jornadaActual ? (
                <>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {getJornadaLabel()}
                  </span>
                  <span className="text-xs text-gray-400">· Actualizacion en tiempo real</span>
                </>
              ) : (
                <span className="text-amber-600 font-medium">Sin jornada activa - datos en cero</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={jornadaSeleccionada} onValueChange={setJornadaSeleccionada}>
            <SelectTrigger className="w-[220px] bg-white">
              <SelectValue placeholder="Seleccionar jornada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Jornada actual</SelectItem>
              <SelectItem value="todas">Todas las jornadas</SelectItem>
              {jornadas.filter(j => j.id !== jornadaActual?.id).map(j => (
                <SelectItem key={j.id} value={j.id}>
                  {j.nombre} ({new Date(j.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarKPIs} disabled={loadingKPIs}>
            <RefreshCw className={`h-4 w-4 ${loadingKPIs ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <Link href="/admin/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 bg-blue-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Inventario</p><p className="text-xs text-gray-500">{stats.productos}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/recipes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 bg-green-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg"><ClipboardList className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Recetas</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 bg-purple-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-lg"><ShoppingCart className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Ventas</p><p className="text-xs text-gray-500">{stats.ventas}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/bartenders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 bg-green-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg"><UserCog className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Bartenders</p><p className="text-xs text-gray-500">{stats.bartenders}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/meseros">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-100 bg-orange-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded-lg"><UserCheck className="h-4 w-4 text-orange-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Meseros</p><p className="text-xs text-gray-500">{stats.meseros}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/caja">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg"><Wallet className="h-4 w-4 text-emerald-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Caja</p><p className="text-xs text-gray-500">{stats.cajas}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/cajas">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-teal-100 bg-teal-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded-lg"><Wallet className="h-4 w-4 text-teal-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Cajas Fisicas</p><p className="text-xs text-gray-500">Terminales</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 bg-purple-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-lg"><UserPlus className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Usuarios</p><p className="text-xs text-gray-500">{stats.admins}</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/mesas">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-rose-100 bg-rose-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 rounded-lg"><Table className="h-4 w-4 text-rose-600" /></div>
              <div><p className="text-xs font-medium text-gray-900">Mesas</p></div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {loadingKPIs && !kpis ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Cargando metricas...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-white to-blue-50/50 border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">VENTAS DEL DIA</p>
                    <p className="text-2xl font-bold text-gray-900 truncate">
                      ${ventasTotales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center mt-1 gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-gray-500">{transacciones} transacciones</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl shrink-0"><DollarSign className="h-6 w-6 text-blue-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-emerald-50/50 border-emerald-100">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">PROPINAS</p>
                    <p className="text-2xl font-bold text-emerald-700 truncate">
                      ${propinasTotales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center mt-1 gap-1">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-gray-500">Acumuladas en la jornada</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl shrink-0"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-purple-50/50 border-purple-100">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">TICKET PROMEDIO</p>
                    <p className="text-2xl font-bold text-gray-900 truncate">${ticketPromedio.toFixed(2)}</p>
                    <div className="flex items-center mt-1 gap-1">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-gray-500">Por transaccion</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl shrink-0"><BarChart3 className="h-6 w-6 text-purple-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-amber-50/50 border-amber-100">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">CUENTAS ABIERTAS</p>
                    <p className="text-2xl font-bold text-amber-600 truncate">${cuentasPendientesTotal.toFixed(2)}</p>
                    <div className="flex items-center mt-1 gap-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-gray-500">{cuentasPendientesCantidad} pendientes</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl shrink-0"><AlertTriangle className="h-6 w-6 text-amber-600" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ventas" className="mb-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
              <TabsTrigger value="equipo">Equipo</TabsTrigger>
              <TabsTrigger value="detalle">
                <List className="h-3.5 w-3.5 mr-1" />
                Detalle
              </TabsTrigger>
              <TabsTrigger value="productos">Productos</TabsTrigger>
              <TabsTrigger value="alertas">
                Alertas
                {(kpis?.alertas_stock.length || 0) > 0 && (
                  <Badge className="ml-1 bg-red-100 text-red-700 text-[10px] px-1">{kpis?.alertas_stock.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ventas" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Ventas por hora</CardTitle>
                    <CardDescription className="text-xs">Distribucion de ingresos durante la jornada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!sinJornada && kpis?.ventas_por_hora && kpis.ventas_por_hora.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={kpis.ventas_por_hora}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hora" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ventas']} />
                            <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
                        Sin ventas registradas en este periodo
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Metodos de pago</CardTitle>
                    <CardDescription className="text-xs">Distribucion de ingresos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {datosPago.length > 0 ? (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={datosPago} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                                {datosPago.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                              </Pie>
                              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1 mt-2">
                          {datosPago.map(d => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-gray-700">{d.name}</span>
                              </div>
                              <span className="font-semibold">${d.value.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin pagos</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {!sinJornada && (kpis?.cancelaciones.cantidad || 0) > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
                      <div>
                        <p className="text-sm font-semibold text-red-900">{kpis?.cancelaciones.cantidad} cancelaciones</p>
                        <p className="text-xs text-red-700">Total cancelado: ${(kpis?.cancelaciones.total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <Link href="/admin/sales?tab=canceladas">
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver detalle
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="equipo" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rendimiento por mesero</CardTitle>
                    <CardDescription className="text-xs">Ventas, propinas y pedidos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!sinJornada && kpis?.por_mesero && kpis.por_mesero.length > 0 ? (
                      <div className="space-y-2">
                        {kpis.por_mesero.map(m => (
                          <div key={m.usuario_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: m.color_mapa || '#6b7280' }}>
                                {m.nombre?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{m.nombre}</p>
                                <p className="text-[10px] text-gray-500">{m.ventas} ventas · {m.pedidos} pedidos</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900">${m.total.toFixed(2)}</p>
                              <p className="text-[10px] text-emerald-600">+${m.propinas.toFixed(2)} prop</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Sin datos de meseros</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rendimiento por bartender</CardTitle>
                    <CardDescription className="text-xs">Pedidos preparados vs pendientes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!sinJornada && kpis?.por_bartender && kpis.por_bartender.length > 0 ? (
                      <div className="space-y-2">
                        {kpis.por_bartender.map(b => (
                          <div key={b.bartender_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                                {b.nombre?.charAt(0)}
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate">{b.nombre}</p>
                            </div>
                            <div className="flex gap-3 shrink-0 text-xs">
                              <div className="text-right"><p className="text-gray-500">Listos</p><p className="font-bold text-emerald-600">{b.pedidos_preparados}</p></div>
                              <div className="text-right"><p className="text-gray-500">Pend.</p><p className="font-bold text-amber-600">{b.pedidos_pendientes}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Sin datos de bartenders</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rendimiento por cajero</CardTitle>
                  <CardDescription className="text-xs">Cobros, metodos de pago y propinas</CardDescription>
                </CardHeader>
                <CardContent>
                  {!sinJornada && kpis?.por_cajero && kpis.por_cajero.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-medium">Cajero</th>
                            <th className="text-right p-2 font-medium">Cobros</th>
                            <th className="text-right p-2 font-medium">Importe</th>
                            <th className="text-right p-2 font-medium">Propinas</th>
                            <th className="text-right p-2 font-medium">Efectivo</th>
                            <th className="text-right p-2 font-medium">Tarjeta</th>
                            <th className="text-right p-2 font-medium">Transf.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.por_cajero.map(c => (
                            <tr key={c.usuario_id} className="border-t">
                              <td className="p-2 font-medium">{c.nombre}</td>
                              <td className="text-right p-2">{c.cobros}</td>
                              <td className="text-right p-2 font-semibold">${c.importe.toFixed(2)}</td>
                              <td className="text-right p-2 text-emerald-600">${c.propinas.toFixed(2)}</td>
                              <td className="text-right p-2">${c.efectivo.toFixed(2)}</td>
                              <td className="text-right p-2">${c.tarjeta.toFixed(2)}</td>
                              <td className="text-right p-2">${c.transferencia.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Sin datos de cajeros</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detalle" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={descargarDetallePDF}
                  disabled={descargando || sinJornada}
                  className="text-red-700 border-red-200 hover:bg-red-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {descargando ? 'Generando...' : 'Descargar detalle PDF'}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Ventas por trabajador
                  </CardTitle>
                  <CardDescription className="text-xs">Quien vendio, cuanto y cuando</CardDescription>
                </CardHeader>
                <CardContent>
                  {!sinJornada && kpis?.ventas_por_trabajador && kpis.ventas_por_trabajador.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Trabajador</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Rol</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Cobros</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Total</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Propinas</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600 hidden md:table-cell">Primera</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600 hidden md:table-cell">Ultima</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.ventas_por_trabajador.map(t => (
                            <tr key={t.usuario_id} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{t.nombre}</td>
                              <td className="p-2"><Badge className="text-[10px] bg-blue-100 text-blue-700">{t.rol}</Badge></td>
                              <td className="p-2 text-right">{t.cobros}</td>
                              <td className="p-2 text-right font-semibold text-emerald-700">${t.total.toFixed(2)}</td>
                              <td className="p-2 text-right text-blue-600">${t.propinas.toFixed(2)}</td>
                              <td className="p-2 text-xs text-gray-500 hidden md:table-cell">
                                {t.primera_venta ? new Date(t.primera_venta).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-2 text-xs text-gray-500 hidden md:table-cell">
                                {t.ultima_venta ? new Date(t.ultima_venta).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Sin ventas registradas</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Cancelaciones
                  </CardTitle>
                  <CardDescription className="text-xs">Quien cancelo, motivo, monto y hora</CardDescription>
                </CardHeader>
                <CardContent>
                  {!sinJornada && kpis?.cancelaciones_detalladas && kpis.cancelaciones_detalladas.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 border-b border-red-200">
                          <tr>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Fecha</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Mesa</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Total</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Mesero</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Cancelo</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.cancelaciones_detalladas.map(c => (
                            <tr key={c.pedido_id} className="border-b hover:bg-red-50/30">
                              <td className="p-2 text-xs">
                                {c.cancelado_en ? new Date(c.cancelado_en).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-2 text-xs font-medium">{c.mesa || '-'}</td>
                              <td className="p-2 text-right font-semibold text-red-700">${c.total.toFixed(2)}</td>
                              <td className="p-2 text-xs">{c.mesero_nombre}</td>
                              <td className="p-2 text-xs">
                                {c.cancelado_por_nombre}
                                <Badge className="ml-1 text-[9px] bg-gray-100 text-gray-600">{c.cancelado_por_rol}</Badge>
                              </td>
                              <td className="p-2 text-xs text-gray-600 max-w-xs truncate" title={c.motivo_cancelacion || ''}>
                                {c.motivo_cancelacion || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Sin cancelaciones</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <FlaskConical className="h-4 w-4" />
                    Mermas de bartender
                  </CardTitle>
                  <CardDescription className="text-xs">Quien, producto, cantidad y valor perdido</CardDescription>
                </CardHeader>
                <CardContent>
                  {!sinJornada && kpis?.mermas_detalladas && kpis.mermas_detalladas.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-50 border-b border-orange-200">
                          <tr>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Fecha</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Producto</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Cant.</th>
                            <th className="text-right p-2 font-medium text-xs text-gray-600">Valor</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Bartender</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.mermas_detalladas.map(m => (
                            <tr key={m.merma_id} className="border-b hover:bg-orange-50/30">
                              <td className="p-2 text-xs">
                                {m.fecha ? new Date(m.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-2 text-xs">
                                <div className="font-medium">{m.producto_nombre}</div>
                                {m.producto_marca && <div className="text-gray-400 text-[10px]">{m.producto_marca}</div>}
                              </td>
                              <td className="p-2 text-right text-xs">{m.cantidad}</td>
                              <td className="p-2 text-right font-semibold text-orange-700">${m.valor_perdido.toFixed(2)}</td>
                              <td className="p-2 text-xs">{m.bartender_nombre}</td>
                              <td className="p-2 text-xs text-gray-600 max-w-xs truncate" title={m.motivo}>
                                {m.motivo}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Sin mermas registradas</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="productos" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top productos vendidos</CardTitle>
                    <CardDescription className="text-xs">Por cantidad de unidades</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!sinJornada && kpis?.productos_top && kpis.productos_top.length > 0 ? (
                      <>
                        <div className="h-72 mb-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kpis.productos_top.slice(0, 5)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" fontSize={11} />
                              <YAxis dataKey="nombre" type="category" width={100} fontSize={11} />
                              <Tooltip />
                              <Bar dataKey="cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1 pt-3 border-t">
                          {kpis.productos_top.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">#{idx + 1}</span>
                                <span className="text-gray-700 truncate">{p.nombre}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500">{p.cantidad} u</span>
                                <span className="font-semibold">${p.total.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">Sin ventas registradas</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wine className="h-4 w-4 text-purple-600" />
                      Botellas y consumo
                    </CardTitle>
                    <CardDescription className="text-xs">Control de rendimiento en tiempo real</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/admin/inventory">
                      <Button variant="outline" className="w-full text-purple-700 border-purple-300 hover:bg-purple-50">
                        <Wine className="h-4 w-4 mr-2" />
                        Ver rendimiento de botellas
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alertas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Alertas de stock
                  </CardTitle>
                  <CardDescription className="text-xs">Productos por debajo del minimo</CardDescription>
                </CardHeader>
                <CardContent>
                  {kpis?.alertas_stock && kpis.alertas_stock.length > 0 ? (
                    <div className="space-y-2">
                      {kpis.alertas_stock.map((a, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${a.estado === 'agotado' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-full ${a.estado === 'agotado' ? 'bg-red-100' : 'bg-amber-100'}`}>
                              <AlertTriangle className={`h-4 w-4 ${a.estado === 'agotado' ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{a.nombre}</p>
                              {a.marca && <p className="text-xs text-gray-500">{a.marca}</p>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold ${a.estado === 'agotado' ? 'text-red-700' : 'text-amber-700'}`}>{a.stock_actual} / {a.stock_minimo}</p>
                            <Badge className={`text-[9px] ${a.estado === 'agotado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {a.estado === 'agotado' ? 'AGOTADO' : 'BAJO'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Sin alertas de stock</p>
                    </div>
                  )}
                  <div className="pt-3 mt-3 border-t">
                    <Link href="/admin/inventory">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver inventario completo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {!sinJornada && (kpis?.cuentas_pendientes.cantidad || 0) > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                      <AlertTriangle className="h-4 w-4" />
                      Cuentas abiertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-800">{kpis?.cuentas_pendientes.cantidad} cuentas sin cerrar</p>
                        <p className="text-lg font-bold text-amber-900">${(kpis?.cuentas_pendientes.total || 0).toFixed(2)}</p>
                      </div>
                      <Link href="/caja">
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ir a caja
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
