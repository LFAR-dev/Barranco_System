'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Bell,
  Search,
  Menu,
  LogOut,
  Package,
  ClipboardList,
  ShoppingCart,
  UserCog,
  UserCheck,
  Table
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'

const salesData = [
  { time: '09:00', ventas: 2000 },
  { time: '10:00', ventas: 3500 },
  { time: '11:00', ventas: 4500 },
  { time: '12:00', ventas: 8000 },
  { time: '13:00', ventas: 12000 },
  { time: '14:00', ventas: 10000 },
  { time: '15:00', ventas: 8500 },
  { time: '16:00', ventas: 7000 },
  { time: '17:00', ventas: 9000 },
  { time: '18:00', ventas: 15000 },
  { time: '19:00', ventas: 18000 },
  { time: '20:00', ventas: 20000 },
  { time: '21:00', ventas: 22000 },
  { time: '22:00', ventas: 18000 },
  { time: '23:00', ventas: 12000 },
  { time: '00:00', ventas: 8000 },
]

const topProducts = [
  { name: 'La Margarina', sales: 45 },
  { name: 'Mojito', sales: 38 },
  { name: 'Cuba Libre', sales: 32 },
  { name: 'Piña Colada', sales: 28 },
  { name: 'Paloma', sales: 25 },
]

const branchSales = [
  { name: 'Barra Centro', value: 45230, color: '#3b82f6' },
  { name: 'Barra Terraza', value: 34150, color: '#22c55e' },
  { name: 'Mercado Continua', value: 15050, color: '#eab308' },
]

const alerts = [
  {
    type: 'stock',
    message: 'Stock bajo: Tequila Don Julio',
    detail: 'Quedan 2 botellas',
    time: 'Hace 5 min',
    severity: 'high',
  },
  {
    type: 'waste',
    message: 'Merma registrada',
    detail: '120 ml - Whisky Johnny Walker',
    time: 'Hace 15 min',
    severity: 'medium',
  },
  {
    type: 'stock',
    message: 'Producto por debajo del mínimo',
    detail: 'Vodka Absolut - 3 unidades',
    time: 'Hace 10 min',
    severity: 'low',
  },
]

export default function AdminDashboardPage() {
  const { logout } = useAuth()
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center ml-2 lg:ml-0">
                <span className="text-xl font-bold text-gray-900">BARRANCO</span>
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 w-48 lg:w-64"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <Avatar className="cursor-pointer">
                <AvatarFallback className="bg-blue-600 text-white">AD</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Administrador</h1>
          <p className="text-gray-500">Resumen general del sistema</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Link href="/admin/inventory">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 bg-blue-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Inventario</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/recipes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 bg-green-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Recetas</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/sales">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 bg-purple-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Ventas</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/bartenders">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-100 bg-orange-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <UserCog className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Bartenders</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/meseros">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-teal-100 bg-teal-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-teal-100 rounded-lg">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Meseros</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/mesas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-rose-100 bg-rose-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 rounded-lg">
                  <Table className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Mesas</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">VENTAS DEL DÍA</p>
                  <p className="text-2xl font-bold text-gray-900">$85,430</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-500 font-medium">12.5%</span>
                    <span className="text-xs text-gray-400 ml-1">vs. 8.2%</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">RENDIMIENTO PROMEDIO</p>
                  <p className="text-2xl font-bold text-gray-900">87%</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-500 font-medium">5.2%</span>
                    <span className="text-xs text-gray-400 ml-1">vs. 82%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">BARTENDERS ACTIVOS</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-500 font-medium">3</span>
                    <span className="text-xs text-gray-400 ml-1">nuevos</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">MERMA DEL DÍA</p>
                  <p className="text-2xl font-bold text-red-600">$1,250</p>
                  <div className="flex items-center mt-1">
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-xs text-red-500 font-medium">5.4%</span>
                    <span className="text-xs text-gray-400 ml-1">vs. 8.2%</span>
                  </div>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">VENTAS POR HORA</CardTitle>
              <CardDescription>Distribución de ventas durante el día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} />
                    <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TOP 5 BEBIDAS</CardTitle>
              <CardDescription>Más vendidas del día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                      <span className="text-sm text-gray-700">{product.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {product.sales} ventas
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">VENTAS POR SUCURSAL</CardTitle>
              <CardDescription>Distribución de ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={branchSales}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {branchSales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                ALERTAS RECIENTES
                <Button variant="link" className="text-sm text-blue-600">
                  Ver todas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div
                      className={`p-2 rounded-full ${
                        alert.severity === 'high'
                          ? 'bg-red-100'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          alert.severity === 'high'
                            ? 'text-red-600'
                            : alert.severity === 'medium'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500">{alert.detail}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {alert.severity === 'high' ? 'Crítica' : alert.severity === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
