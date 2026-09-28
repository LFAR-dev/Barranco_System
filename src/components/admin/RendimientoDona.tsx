'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, PieChart as PieIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface DonaData {
  name: string
  value: number
  color: string
}

export function RendimientoDona() {
  const [data, setData] = useState<DonaData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const { data: productos, error } = await supabase
        .from('productos')
        .select('stock_actual, stock_minimo, stock_maximo')
        .eq('activo', true)
        .eq('es_bebida_principal', true)

      if (error) throw error

      const items = productos || []
      const optimos = items.filter(p => p.stock_actual > (p.stock_minimo * 1.5)).length
      const normales = items.filter(p => 
        p.stock_actual > p.stock_minimo && p.stock_actual <= (p.stock_minimo * 1.5)
      ).length
      const bajos = items.filter(p => 
        p.stock_actual > 0 && p.stock_actual <= p.stock_minimo
      ).length
      const agotados = items.filter(p => p.stock_actual <= 0).length

      setData([
        { name: 'Óptimas', value: optimos, color: '#10b981' },
        { name: 'Normales', value: normales, color: '#3b82f6' },
        { name: 'Stock Bajo', value: bajos, color: '#f59e0b' },
        { name: 'Agotadas', value: agotados, color: '#ef4444' },
      ].filter(d => d.value > 0))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="h-5 w-5 text-purple-600" />
          Estado del Inventario
        </CardTitle>
        <CardDescription>
          Distribución de {total} botellas por estado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [`${value} botellas`, '']}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend 
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Centro del donut */}
        <div className="text-center -mt-40 mb-24 pointer-events-none">
          <p className="text-3xl font-black text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Botellas</p>
        </div>
      </CardContent>
    </Card>
  )
}
