'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wine, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie
} from 'recharts'

interface BotellaData {
  nombre: string
  corto: string
  porcentaje: number
  shots: number
  stock: number
  marca: string
}

export function RendimientoChart() {
  const [data, setData] = useState<BotellaData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const { data: productos, error } = await supabase
        .from('productos')
        .select('id, nombre, marca, stock_actual, stock_maximo, stock_minimo, volumen_ml')
        .eq('activo', true)
        .eq('es_bebida_principal', true)
        .order('stock_actual', { ascending: true })
        .limit(10)

      if (error) throw error

      const botellasData: BotellaData[] = (productos || []).map((p: any) => {
        const porcentaje = p.stock_maximo > 0 
          ? (p.stock_actual / p.stock_maximo) * 100 
          : 0
        const shots = Math.floor((p.volumen_ml * p.stock_actual) / 45)

        const nombreCorto = p.nombre.length > 15 
          ? p.nombre.slice(0, 13) + '...' 
          : p.nombre

        return {
          nombre: p.nombre,
          corto: nombreCorto,
          porcentaje: Math.round(porcentaje * 10) / 10,
          shots,
          stock: p.stock_actual,
          marca: p.marca
        }
      })

      setData(botellasData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Colores según porcentaje
  const getBarColor = (porcentaje: number) => {
    if (porcentaje <= 0) return '#ef4444'    // Rojo - agotado
    if (porcentaje <= 20) return '#f59e0b'   // Ámbar - crítico
    if (porcentaje <= 40) return '#eab308'   // Amarillo - bajo
    if (porcentaje <= 70) return '#3b82f6'   // Azul - normal
    return '#10b981'                          // Verde - óptimo
  }

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{d.nombre}</p>
          <p className="text-xs text-gray-500 mb-1">{d.marca}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">{d.stock}</span> botellas
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">{d.shots}</span> shots disponibles
            </p>
            <p className={`font-bold ${
              d.porcentaje <= 20 ? 'text-red-600' : 
              d.porcentaje <= 40 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {d.porcentaje}% restante
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-purple-600" />
            Rendimiento de Botellas
          </CardTitle>
          <CardDescription>Productos con menor stock</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <Wine className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay botellas registradas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estadísticas rápidas
  const totalBotellas = data.reduce((sum, d) => sum + d.stock, 0)
  const totalShots = data.reduce((sum, d) => sum + d.shots, 0)
  const criticas = data.filter(d => d.porcentaje <= 20).length

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wine className="h-5 w-5 text-purple-600" />
              Rendimiento de Botellas
            </CardTitle>
            <CardDescription>
              Top 10 productos con menor stock · Actualizado en tiempo real
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-purple-100 text-purple-700">
              {totalBotellas} botellas
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700">
              {totalShots} shots
            </Badge>
            {criticas > 0 && (
              <Badge className="bg-red-100 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticas} críticas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="corto" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <YAxis 
                unit="%" 
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar 
                dataKey="porcentaje" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.porcentaje)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-600">Óptimo (70-100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">Normal (40-70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600">Bajo (20-40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-600">Crítico (0-20%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">Agotado (0%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
