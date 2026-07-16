'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Filter,
  Clock,
  Download
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

const Select = ({ value, onValueChange, children }: any) => (
  <div className="w-40">
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
    >
      {children}
    </select>
  </div>
)

const SelectTrigger = ({ children }: any) => <>{children}</>
const SelectValue = ({ placeholder }: any) => (
  <option value="" disabled>{placeholder}</option>
)
const SelectContent = ({ children }: any) => <>{children}</>
const SelectItem = ({ value, children }: any) => (
  <option value={value}>{children}</option>
)

interface Sale {
  id: string
  fecha_hora: string
  total: number
  total_pagado: number
  propina: number
  metodo_pago: string
  estado: string
  receta_nombre: string
  bartender_nombre: string
  mesero_nombre: string
  sucursal_nombre: string
}

export default function SalesPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState('hoy')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchSales()
  }, [period])

  const fetchSales = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('ventas')
        .select(`
          *,
          recetas (nombre),
          bartenders (nombre_completo),
          usuarios!mesero_id (nombre, apellido),
          sucursales (nombre)
        `)
        .order('fecha_hora', { ascending: false })

      // Filtros de período
      const now = new Date()
      let start = new Date()
      if (period === 'hoy') {
        start.setHours(0,0,0,0)
        query = query.gte('fecha_hora', start.toISOString())
      } else if (period === 'semana') {
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        start = new Date(now.getFullYear(), now.getMonth(), diff)
        start.setHours(0,0,0,0)
        query = query.gte('fecha_hora', start.toISOString())
      } else if (period === 'mes') {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        start.setHours(0,0,0,0)
        query = query.gte('fecha_hora', start.toISOString())
      } else if (period === 'personalizado' && startDate && endDate) {
        query = query.gte('fecha_hora', new Date(startDate).toISOString())
          .lte('fecha_hora', new Date(endDate + 'T23:59:59').toISOString())
      }

      const { data, error } = await query
      if (error) throw error

      const formattedData = data?.map((item: any) => ({
        ...item,
        receta_nombre: item.recetas?.nombre || 'Sin receta',
        bartender_nombre: item.bartenders?.nombre_completo || 'Sin bartender',
        mesero_nombre: item.usuarios ? `${item.usuarios.nombre} ${item.usuarios.apellido}` : 'Sin mesero',
        sucursal_nombre: item.sucursales?.nombre || 'Sin sucursal',
        // Asegurar valores numéricos
        total: Number(item.total) || 0,
        total_pagado: Number(item.total_pagado) || 0,
        propina: Number(item.propina) || 0,
      })) || []

      setSales(formattedData)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter(sale =>
    sale.receta_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.bartender_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.mesero_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Cálculos
  const totalVentas = sales.reduce((sum, s) => sum + s.total, 0)
  const totalPagado = sales.reduce((sum, s) => sum + (s.total_pagado || 0), 0)
  const totalPropina = sales.reduce((sum, s) => sum + (s.propina || 0), 0)
  const promedio = sales.length ? totalVentas / sales.length : 0
  const ventasConPropina = sales.filter(s => s.propina > 0).length
  const propinaPromedio = ventasConPropina ? totalPropina / ventasConPropina : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
              <p className="text-sm text-gray-500">Historial y análisis de ventas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSales}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === 'personalizado' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
              <span>a</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
              <Button variant="outline" size="sm" onClick={fetchSales}>Aplicar</Button>
            </div>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por receta, bartender, mesero..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tarjetas de resumen con propina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Cuenta</p>
                  <p className="text-2xl font-bold text-gray-900">${totalVentas.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{sales.length} ventas</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-600">${totalPagado.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Lo que dejaron los clientes</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Propina Total</p>
                  <p className="text-2xl font-bold text-purple-600">${totalPropina.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">
                    {ventasConPropina > 0 
                      ? `${ventasConPropina} ventas con propina (prom. $${propinaPromedio.toFixed(2)})` 
                      : 'Sin propinas registradas'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Promedio por Venta</p>
                  <p className="text-2xl font-bold text-gray-900">${promedio.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Ticket promedio</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla con todas las columnas */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Receta</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Bartender</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Mesero</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Pagado</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Propina</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No se encontraron ventas
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(sale.fecha_hora).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {sale.receta_nombre}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sale.bartender_nombre}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sale.mesero_nombre}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sale.metodo_pago || 'Efectivo'}
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                        ${sale.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        ${sale.total_pagado.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sale.propina > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            ${sale.propina.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin propina</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={sale.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {sale.estado || 'Completada'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}