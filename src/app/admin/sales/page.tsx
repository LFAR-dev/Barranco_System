'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, ArrowLeft, RefreshCw, DollarSign, Calendar,
  TrendingUp, Users, Filter, Clock, Download, Eye,
  CreditCard, Wallet, TrendingDown, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ventaService, Venta, VentaStats } from '@/lib/services/ventaService'
import { DetalleVentaModal } from '@/components/admin/DetalleVentaModal'

type Periodo = 'hoy' | 'ayer' | 'semana' | 'mes' | 'jornada' | 'custom'

export default function SalesPage() {
  const { toast } = useToast()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [stats, setStats] = useState<VentaStats | null>(null)
  const [loading, setLoading] = useState(true)
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
    periodo: 'hoy',
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

  // ============================================================
  // Cargar opciones de filtros al montar
  // ============================================================
  useEffect(() => {
    cargarOpciones()
  }, [])

  // ============================================================
  // Cargar ventas cuando cambian los filtros
  // ============================================================
  useEffect(() => {
    cargarVentas()
  }, [filtros])

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
      case 'hoy':
        return {
          inicio: hoy.toISOString(),
          fin: fin.toISOString()
        }
      case 'ayer': {
        const ayer = new Date(hoy)
        ayer.setDate(ayer.getDate() - 1)
        const ayerFin = new Date(ayer)
        ayerFin.setHours(23, 59, 59, 999)
        return {
          inicio: ayer.toISOString(),
          fin: ayerFin.toISOString()
        }
      }
      case 'semana': {
        const semana = new Date(hoy)
        semana.setDate(semana.getDate() - 7)
        return {
          inicio: semana.toISOString(),
          fin: fin.toISOString()
        }
      }
      case 'mes': {
        const mes = new Date(hoy)
        mes.setDate(mes.getDate() - 30)
        return {
          inicio: mes.toISOString(),
          fin: fin.toISOString()
        }
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

  const cargarVentas = async () => {
    setLoading(true)
    try {
      const rango = filtros.periodo === 'jornada' ? { inicio: '', fin: '' } : calcularRangoFechas()
      
      const filtrosAplicados: any = {
        fechaInicio: rango.inicio,
        fechaFin: rango.fin,
        metodoPago: filtros.metodoPago || undefined,
        meseroId: filtros.meseroId || undefined,
        cajeroId: filtros.cajeroId || undefined,
        jornadaId: filtros.periodo === 'jornada' ? filtros.jornadaId : undefined,
        searchTerm: filtros.searchTerm || undefined
      }

      const [ventasData, statsData] = await Promise.all([
        ventaService.getVentas(filtrosAplicados),
        ventaService.getStats(filtrosAplicados)
      ])

      setVentas(ventasData)
      setStats(statsData)
    } catch (error: any) {
      console.error('Error al cargar ventas:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las ventas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportarCSV = () => {
    if (ventas.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay ventas para exportar',
        variant: 'destructive'
      })
      return
    }

    const headers = ['ID', 'Fecha', 'Total', 'Propina', 'Método Pago', 'Estado', 'Mesero', 'Cajero']
    const rows = ventas.map(v => [
      v.id.slice(0, 8),
      new Date(v.created_at).toLocaleString('es-MX'),
      v.total?.toFixed(2) || '0.00',
      v.propina?.toFixed(2) || '0.00',
      v.metodo_pago || 'N/A',
      v.estado || 'N/A',
      v.mesero ? `${v.mesero.nombre} ${v.mesero.apellido}` : 'N/A',
      v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : 'N/A'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: '✅ Exportado',
      description: `${ventas.length} ventas exportadas a CSV`,
      variant: 'success'
    })
  }

  const limpiarFiltros = () => {
    setFiltros({
      periodo: 'hoy',
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
      filtros.periodo !== 'hoy' ||
      filtros.metodoPago ||
      filtros.meseroId ||
      filtros.cajeroId ||
      filtros.jornadaId ||
      filtros.searchTerm
    )
  }, [filtros])

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
                Consulta todas las ventas con trazabilidad completa
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargarVentas}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={exportarCSV}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
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
                  ${stats.efectivo.toFixed(0)}
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
                  ${stats.tarjeta.toFixed(0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-gray-500">Canceladas</p>
                </div>
                <p className="text-xl font-bold text-red-600">
                  {stats.canceladas}
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
                  Limpiar filtros
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Período */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Período</label>
                <select
                  value={filtros.periodo}
                  onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value as Periodo })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Últimos 30 días</option>
                  <option value="jornada">Por jornada</option>
                  <option value="custom">Rango custom</option>
                </select>
              </div>

              {/* Jornada (si periodo = jornada) */}
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

              {/* Rango custom */}
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

              {/* Método de pago */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método de pago</label>
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

              {/* Mesero */}
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

              {/* Cajero */}
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

              {/* Búsqueda */}
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

        {/* Tabla */}
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
                <p className="text-gray-500 font-medium">No hay ventas en este período</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filtrosActivos ? 'Intenta cambiar los filtros' : 'Las ventas aparecerán aquí'}
                </p>
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
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Método</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Propina</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Total</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => (
                      <tr
                        key={venta.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-2">
                          <span className="font-mono text-xs text-gray-600">
                            #{venta.id.slice(0, 6)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-700">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">
                              {new Date(venta.created_at).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-xs">
                          {venta.mesero
                            ? `${venta.mesero.nombre} ${venta.mesero.apellido}`
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-2 text-gray-700 text-xs">
                          {venta.cajero
                            ? `${venta.cajero.nombre} ${venta.cajero.apellido}`
                            : <span className="text-gray-400">—</span>}
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
