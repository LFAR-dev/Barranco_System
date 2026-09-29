'use client'

import { useEffect, useState } from 'react'
import { 
  BarChart3, Award, TrendingUp, Users, DollarSign,
  Clock, AlertCircle, Loader2, Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { rendimientoService } from '@/lib/services/rendimientoService'

type Rol = 'mesero' | 'bartender' | 'caja'

interface RendimientoRolTabProps {
  rol: Rol
}

export function RendimientoRolTab({ rol }: RendimientoRolTabProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [jornadaId, setJornadaId] = useState<string | null>(null)
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (jornadaId) {
      cargarRendimiento()
    }
  }, [jornadaId, rol])

  const cargarDatos = async () => {
    try {
      const actual = await jornadaService.getJornadaActual()
      const historial = await jornadaService.getHistorial(20)
      
      setJornada(actual)
      setJornadas(historial)
      
      if (actual) {
        setJornadaId(actual.id)
      } else if (historial.length > 0) {
        setJornadaId(historial[0].id)
      }
    } catch (error) {
      console.error('Error al cargar jornadas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarRendimiento = async () => {
    if (!jornadaId) return
    setLoading(true)
    try {
      let datos: any[] = []
      if (rol === 'mesero') {
        datos = await rendimientoService.getRendimientoMeseros(jornadaId)
      } else if (rol === 'bartender') {
        datos = await rendimientoService.getRendimientoBartenders(jornadaId)
      } else if (rol === 'caja') {
        datos = await rendimientoService.getRendimientoCaja(jornadaId)
      }
      setData(datos)
    } catch (error) {
      console.error('Error al cargar rendimiento:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && jornadas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (jornadas.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay jornadas registradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Abre una jornada desde el botón del header para empezar
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calcular totales
  const totales = {
    ventas: data.reduce((s, d) => s + (d.ventas_totales || d.importe_cobrado || 0), 0),
    propinas: data.reduce((s, d) => s + (d.propinas || d.propinas_recibidas || 0), 0),
    pedidos: data.reduce((s, d) => s + (d.pedidos_atendidos || d.pedidos_preparados || d.ventas_cobradas || 0), 0)
  }

  return (
    <div className="space-y-4">
      {/* Selector de jornada */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Mostrando rendimiento de</p>
              <select
                value={jornadaId || ''}
                onChange={(e) => setJornadaId(e.target.value)}
                className="text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-0 cursor-pointer pr-6"
              >
                {jornadas.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} {j.estado === 'activa' ? '🟢 (activa)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {jornada?.id === jornadaId && (
            <Badge className="bg-emerald-100 text-emerald-700">
              🟢 Jornada activa
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">
                {rol === 'caja' ? 'Total cobrado' : 'Total ventas'}
              </p>
              <p className="text-lg font-bold text-gray-900">
                ${totales.ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">
                {rol === 'mesero' ? 'Pedidos atendidos' : 
                 rol === 'bartender' ? 'Pedidos preparados' : 
                 'Ventas cobradas'}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {totales.pedidos}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total propinas</p>
              <p className="text-lg font-bold text-gray-900">
                ${totales.propinas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de rendimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            Rendimiento por {rol === 'caja' ? 'cajero' : rol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No hay actividad registrada en esta jornada
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data
                .sort((a, b) => {
                  const aVal = a.ventas_totales || a.importe_cobrado || a.pedidos_preparados || 0
                  const bVal = b.ventas_totales || b.importe_cobrado || b.pedidos_preparados || 0
                  return bVal - aVal
                })
                .map((item, index) => (
                  <RendimientoRow 
                    key={item.usuario_id || item.bartender_id || index} 
                    item={item} 
                    rol={rol} 
                    index={index}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Fila individual de rendimiento
// ============================================================
function RendimientoRow({ item, rol, index }: { item: any; rol: Rol; index: number }) {
  const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`

  // Config por rol
  const config = {
    mesero: {
      valor: item.ventas_totales || 0,
      valorLabel: 'Ventas',
      stats: [
        { label: 'Pedidos', value: item.pedidos_atendidos || 0 },
        { label: 'Propinas', value: `$${(item.propinas || 0).toFixed(0)}` },
        { label: 'Ticket prom.', value: `$${(item.ticket_promedio || 0).toFixed(0)}` },
        { label: 'Cancelados', value: item.cancelaciones || 0 }
      ]
    },
    bartender: {
      valor: item.pedidos_preparados || 0,
      valorLabel: 'Preparados',
      stats: [
        { label: 'Preparados', value: item.pedidos_preparados || 0 },
        { label: 'Pendientes', value: item.pedidos_pendientes || 0 }
      ]
    },
    caja: {
      valor: item.importe_cobrado || 0,
      valorLabel: 'Cobrado',
      stats: [
        { label: 'Cobros', value: item.ventas_cobradas || 0 },
        { label: 'Propinas', value: `$${(item.propinas_recibidas || 0).toFixed(0)}` }
      ]
    }
  }[rol]

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
      index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 
      'bg-gray-50 border-gray-100 hover:bg-gray-100'
    }`}>
      <div className="text-2xl flex-shrink-0">{medalla}</div>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{item.nombre}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {config.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{s.label}:</span>
              <span className="text-xs font-semibold text-gray-700">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-500">{config.valorLabel}</p>
        <p className="text-lg font-bold text-emerald-600">
          {rol === 'bartender' 
            ? config.valor 
            : `$${config.valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
        </p>
      </div>
    </div>
  )
}
