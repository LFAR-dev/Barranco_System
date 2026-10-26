'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Loader2, FileText, Users,
  Coffee, ShoppingCart, DollarSign, TrendingUp,
  AlertTriangle, HeartHandshake, XCircle, Package
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  jornadaStatsService,
  JornadaStats
} from '@/lib/services/jornadaStatsService'
import { generarReporteJornadaPDF } from '@/components/admin/jornada/ReporteJornadaPDF'

function fmtMoney(n: number): string {
  return `$${(n || 0).toFixed(2)}`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}min`
}

export default function ReporteJornadaPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const jornadaId = params?.id as string

  const [stats, setStats] = useState<JornadaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    if (!jornadaId) return
    cargar()
  }, [jornadaId])

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await jornadaStatsService.getStatsCompletas(jornadaId)
      setStats(data)
    } catch (error) {
      console.error('Error al cargar stats:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el reporte',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarPDF = () => {
    if (!stats) return
    setGenerando(true)
    try {
      const nombre = user?.nombre
        ? `${user.nombre} ${user.apellido || ''}`.trim()
        : 'Administrador'
      generarReporteJornadaPDF(stats, nombre)
      toast({
        title: 'PDF generado',
        description: 'El reporte se descargo correctamente',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive'
      })
    } finally {
      setGenerando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-gray-500 text-sm">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-500">No se encontro el reporte</p>
        <Link href="/admin">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al panel
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.jornada.nombre}
              </h1>
              <p className="text-sm text-gray-500">
                Reporte de cierre de jornada
              </p>
            </div>
          </div>
          <Button
            onClick={handleDescargarPDF}
            disabled={generando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar PDF
          </Button>
        </div>

        {/* Info jornada */}
        <Card className="mb-4">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p className="font-semibold">
                {new Date(stats.jornada.fecha).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Inicio</p>
              <p className="font-semibold">{fmtDate(stats.jornada.hora_inicio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cierre</p>
              <p className="font-semibold">
                {stats.jornada.hora_cierre
                  ? fmtDate(stats.jornada.hora_cierre)
                  : 'En curso'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Duracion</p>
              <p className="font-semibold">
                {fmtDuration(stats.jornada.duracion_minutos)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[10px] text-emerald-700 font-medium">
                  VENTAS
                </p>
              </div>
              <p className="text-base font-bold text-emerald-700 truncate">
                {fmtMoney(stats.resumen.total_ventas)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-[10px] text-blue-700 font-medium">
                  PROPINAS
                </p>
              </div>
              <p className="text-base font-bold text-blue-700 truncate">
                {fmtMoney(stats.resumen.total_propinas)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-purple-600" />
                <p className="text-[10px] text-purple-700 font-medium">
                  PEDIDOS
                </p>
              </div>
              <p className="text-base font-bold text-purple-700">
                {stats.resumen.total_pedidos}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-gray-600" />
                <p className="text-[10px] text-gray-600 font-medium">
                  TICKET PROM
                </p>
              </div>
              <p className="text-base font-bold text-gray-700 truncate">
                {fmtMoney(stats.resumen.ticket_promedio)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <XCircle className="h-3.5 w-3.5 text-red-600" />
                <p className="text-[10px] text-red-700 font-medium">
                  CANCELADOS
                </p>
              </div>
              <p className="text-base font-bold text-red-700">
                {stats.resumen.pedidos_cancelados}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-[10px] text-amber-700 font-medium">
                  PENDIENTES
                </p>
              </div>
              <p className="text-base font-bold text-amber-700">
                {stats.resumen.pedidos_pendientes}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Metodos de pago */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Metodos de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Efectivo</p>
                <p className="text-sm font-bold">
                  {fmtMoney(stats.metodos_pago.efectivo)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {stats.metodos_pago.efectivo_pct.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tarjeta</p>
                <p className="text-sm font-bold">
                  {fmtMoney(stats.metodos_pago.tarjeta)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {stats.metodos_pago.tarjeta_pct.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Transferencia</p>
                <p className="text-sm font-bold">
                  {fmtMoney(stats.metodos_pago.transferencia)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {stats.metodos_pago.transferencia_pct.toFixed(1)}%
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="text-xs text-emerald-700">Total</p>
                <p className="text-sm font-bold text-emerald-700">
                  {fmtMoney(stats.metodos_pago.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Por mesero */}
        {stats.ventas_por_mesero.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Desglose por mesero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Mesero</th>
                      <th className="text-right p-2">Mesas</th>
                      <th className="text-right p-2">Pedidos</th>
                      <th className="text-right p-2">Ventas</th>
                      <th className="text-right p-2">Propinas</th>
                      <th className="text-right p-2">Ayudas D</th>
                      <th className="text-right p-2">Ayudas R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ventas_por_mesero.map((m, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {m.color_mapa && (
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: m.color_mapa }}
                              />
                            )}
                            {m.nombre}
                          </div>
                        </td>
                        <td className="text-right p-2">{m.mesas_asignadas}</td>
                        <td className="text-right p-2">{m.pedidos}</td>
                        <td className="text-right p-2 font-semibold">
                          {fmtMoney(m.ventas)}
                        </td>
                        <td className="text-right p-2">
                          {fmtMoney(m.propinas)}
                        </td>
                        <td className="text-right p-2">
                          <Badge className="bg-purple-100 text-purple-700 text-[10px]">
                            {m.ayudas_dadas}
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                            {m.ayudas_recibidas}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Por bartender */}
        {stats.ventas_por_bartender.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coffee className="h-4 w-4 text-green-600" />
                Desglose por bartender
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Bartender</th>
                      <th className="text-right p-2">Pedidos</th>
                      <th className="text-right p-2">Bebidas</th>
                      <th className="text-right p-2">Mermas</th>
                      <th className="text-right p-2">Valor mermas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ventas_por_bartender.map((b, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{b.nombre}</td>
                        <td className="text-right p-2">
                          {b.pedidos_preparados}
                        </td>
                        <td className="text-right p-2">
                          {b.bebidas_preparadas}
                        </td>
                        <td className="text-right p-2">{b.mermas_count}</td>
                        <td className="text-right p-2 text-red-600">
                          {fmtMoney(b.valor_mermas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Por cajero */}
        {stats.ventas_por_caja.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                Desglose por cajero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Cajero</th>
                      <th className="text-right p-2">Cobros</th>
                      <th className="text-right p-2">Importe</th>
                      <th className="text-right p-2">Propinas</th>
                      <th className="text-right p-2">Efectivo</th>
                      <th className="text-right p-2">Tarjeta</th>
                      <th className="text-right p-2">Transfer.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ventas_por_caja.map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{c.nombre}</td>
                        <td className="text-right p-2">{c.cobros}</td>
                        <td className="text-right p-2 font-semibold">
                          {fmtMoney(c.importe)}
                        </td>
                        <td className="text-right p-2">
                          {fmtMoney(c.propinas)}
                        </td>
                        <td className="text-right p-2">
                          {fmtMoney(c.efectivo)}
                        </td>
                        <td className="text-right p-2">
                          {fmtMoney(c.tarjeta)}
                        </td>
                        <td className="text-right p-2">
                          {fmtMoney(c.transferencia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ayudas */}
        {stats.ayudas.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-purple-600" />
                Ayudas entre meseros ({stats.ayudas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Hora</th>
                      <th className="text-left p-2">Mesa</th>
                      <th className="text-left p-2">Titular</th>
                      <th className="text-left p-2">Ayudante</th>
                      <th className="text-right p-2">Items</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ayudas.map((a, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{a.hora}</td>
                        <td className="p-2 font-medium">{a.mesa}</td>
                        <td className="p-2">{a.titular}</td>
                        <td className="p-2 text-purple-700 font-medium">
                          {a.ayudante}
                        </td>
                        <td className="text-right p-2">{a.items}</td>
                        <td className="text-right p-2 font-semibold">
                          {fmtMoney(a.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mermas */}
        {stats.mermas.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-red-600" />
                Mermas ({stats.mermas.length}) - Total:{' '}
                {fmtMoney(stats.resumen.valor_mermas)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Hora</th>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Bartender</th>
                      <th className="text-right p-2">Cant.</th>
                      <th className="text-left p-2">Motivo</th>
                      <th className="text-right p-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.mermas.map((m, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{m.fecha}</td>
                        <td className="p-2">{m.producto}</td>
                        <td className="p-2">{m.bartender}</td>
                        <td className="text-right p-2">{m.cantidad}</td>
                        <td className="p-2">{m.motivo}</td>
                        <td className="text-right p-2 text-red-600 font-semibold">
                          {fmtMoney(m.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelaciones */}
        {stats.cancelaciones.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Cancelaciones ({stats.cancelaciones.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Hora</th>
                      <th className="text-left p-2">Mesa</th>
                      <th className="text-left p-2">Mesero</th>
                      <th className="text-left p-2">Motivo</th>
                      <th className="text-right p-2">Monto</th>
                      <th className="text-left p-2">Cancelado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.cancelaciones.map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{c.hora}</td>
                        <td className="p-2">{c.mesa}</td>
                        <td className="p-2">{c.mesero}</td>
                        <td className="p-2">{c.motivo}</td>
                        <td className="text-right p-2 text-red-600 font-semibold">
                          {fmtMoney(c.monto)}
                        </td>
                        <td className="p-2">{c.cancelado_por}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Productos top */}
        {stats.productos_top.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Productos mas vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.productos_top.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                        #{idx + 1}
                      </Badge>
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">x{p.cantidad}</span>
                      <span className="font-semibold">
                        {fmtMoney(p.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
