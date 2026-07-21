'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, BarChart3,
  Bell, Search, Package, ClipboardList, ShoppingCart,
  UserCog, UserCheck, Table, UserPlus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

const salesData = [
  { time: '09:00', ventas: 2000 }, { time: '10:00', ventas: 3500 },
  { time: '11:00', ventas: 4500 }, { time: '12:00', ventas: 8000 },
  { time: '13:00', ventas: 12000 }, { time: '14:00', ventas: 10000 },
  { time: '15:00', ventas: 8500 }, { time: '16:00', ventas: 7000 },
  { time: '17:00', ventas: 9000 }, { time: '18:00', ventas: 15000 },
  { time: '19:00', ventas: 18000 }, { time: '20:00', ventas: 20000 },
  { time: '21:00', ventas: 22000 }, { time: '22:00', ventas: 18000 },
  { time: '23:00', ventas: 12000 }, { time: '00:00', ventas: 8000 }
]

const topProducts = [
  { name: 'La Margarina', sales: 45 }, { name: 'Mojito', sales: 38 },
  { name: 'Cuba Libre', sales: 32 }, { name: 'Piña Colada', sales: 28 },
  { name: 'Paloma', sales: 25 }
]

const branchSales = [
  { name: 'Barra Centro', value: 45230, color: '#3b82f6' },
  { name: 'Barra Terraza', value: 34150, color: '#22c55e' },
  { name: 'Mercado Continua', value: 15050, color: '#eab308' }
]

const alerts = [
  { type: 'stock', message: 'Stock bajo: Tequila Don Julio', detail: 'Quedan 2 botellas', time: 'Hace 5 min', severity: 'high' },
  { type: 'waste', message: 'Merma registrada', detail: '120 ml - Whisky Johnny Walker', time: 'Hace 15 min', severity: 'medium' },
  { type: 'stock', message: 'Producto por debajo del mínimo', detail: 'Vodka Absolut - 3 unidades', time: 'Hace 10 min', severity: 'low' }
]

export default function AdminDashboardPage() {
  const { userData } = useAuth()
  const { greeting, timeIcon } = useGreeting()
  const [stats, setStats] = useState({ bartenders: 0, meseros: 0, productos: 0, ventas: 0, admins: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { count: bartenders } = await supabase
        .from('bartenders').select('*', { count: 'exact', head: true }).eq('activo', true)
      const { count: meseros } = await supabase
        .from('meseros').select('*', { count: 'exact', head: true }).eq('activo', true)
      const { count: productos } = await supabase
        .from('productos').select('*', { count: 'exact', head: true }).eq('activo', true)
      const { count: ventas } = await supabase
        .from('ventas').select('*', { count: 'exact', head: true })
      const { count: admins } = await supabase
        .from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'admin').eq('activo', true)
      
      setStats({
        bartenders: bartenders || 0,
        meseros: meseros || 0,
        admins: admins || 0,
        productos: productos || 0,
        ventas: ventas || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFirstName = () => {
    if (!userData) return 'Administrador'
    return userData.nombre || 'Administrador'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{timeIcon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {getFirstName()}
            </h1>
            <p className="text-gray-500">Resumen general del sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-gray-500">VENTAS DEL DÍA</p><p className="text-2xl font-bold text-gray-900">$85,430</p>
              <div className="flex items-center mt-1"><TrendingUp className="h-4 w-4 text-green-500 mr-1" /><span className="text-xs text-green-500 font-medium">12.5%</span><span className="text-xs text-gray-400 ml-1">vs. 8.2%</span></div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl"><DollarSign className="h-6 w-6 text-blue-600" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-gray-500">RENDIMIENTO PROMEDIO</p><p className="text-2xl font-bold text-gray-900">87%</p>
              <div className="flex items-center mt-1"><TrendingUp className="h-4 w-4 text-green-500 mr-1" /><span className="text-xs text-green-500 font-medium">5.2%</span><span className="text-xs text-gray-400 ml-1">vs. 82%</span></div>
            </div>
            <div className="p-3 bg-green-100 rounded-xl"><BarChart3 className="h-6 w-6 text-green-600" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-gray-500">EQUIPO ACTIVO</p><p className="text-2xl font-bold text-gray-900">{stats.bartenders + stats.meseros}</p>
              <div className="flex items-center mt-1"><TrendingUp className="h-4 w-4 text-green-500 mr-1" /><span className="text-xs text-green-500 font-medium">+</span><span className="text-xs text-gray-400 ml-1">activos</span></div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl"><Users className="h-6 w-6 text-purple-600" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-gray-500">MERMA DEL DÍA</p><p className="text-2xl font-bold text-red-600">$1,250</p>
              <div className="flex items-center mt-1"><TrendingDown className="h-4 w-4 text-red-500 mr-1" /><span className="text-xs text-red-500 font-medium">5.4%</span><span className="text-xs text-gray-400 ml-1">vs. 8.2%</span></div>
            </div>
            <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">VENTAS POR HORA</CardTitle><CardDescription>Distribución de ventas durante el día</CardDescription></CardHeader>
          <CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={salesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} /><Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">TOP 5 BEBIDAS</CardTitle><CardDescription>Más vendidas del día</CardDescription></CardHeader>
          <CardContent><div className="space-y-3">{topProducts.map((product, index) => (<div key={index} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-400">#{index + 1}</span><span className="text-sm text-gray-700">{product.name}</span></div><Badge variant="secondary" className="bg-blue-100 text-blue-700">{product.sales} ventas</Badge></div>))}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">VENTAS POR SUCURSAL</CardTitle><CardDescription>Distribución de ingresos</CardDescription></CardHeader>
          <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={branchSales} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{branchSales.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} /><Legend /></PieChart></ResponsiveContainer></div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">ALERTAS RECIENTES<Button variant="link" className="text-sm text-blue-600">Ver todas</Button></CardTitle>
          </CardHeader>
          <CardContent><div className="space-y-4">{alerts.map((alert, index) => (<div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><div className={`p-2 rounded-full ${alert.severity === 'high' ? 'bg-red-100' : alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}><AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} /></div><div className="flex-1"><p className="text-sm font-medium text-gray-900">{alert.message}</p><p className="text-xs text-gray-500">{alert.detail}</p><p className="text-xs text-gray-400 mt-1">{alert.time}</p></div><Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">{alert.severity === 'high' ? 'Crítica' : alert.severity === 'medium' ? 'Media' : 'Baja'}</Badge></div>))}</div></CardContent>
        </Card>
      </div>
    </div>
  )
}
