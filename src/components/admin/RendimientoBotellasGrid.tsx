'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Wine, RefreshCw, Search, LayoutGrid, List,
  TrendingDown, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { RendimientoBotella } from './RendimientoBotella'
import {
  bottleService,
  RendimientoBotella as BotellaData
} from '@/lib/services/bottleService'

type Filtro = 'todas' | 'disponibles' | 'bajas' | 'agotadas'

export function RendimientoBotellasGrid() {
  const [botellas, setBotellas] = useState<BotellaData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [vista, setVista] = useState<'grid' | 'list'>('grid')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bottleService.getTodasLasBotellas()
      setBotellas(data)
    } catch (error) {
      console.error('Error al cargar botellas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()

    const channelName = `botellas_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movimientos_inventario' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'productos' },
        () => cargar()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // silencioso
        }
        channelRef.current = null
      }
    }
  }, [cargar, supabase])

  const filtradas = botellas.filter((b) => {
    const matchSearch =
      !searchTerm ||
      b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.marca && b.marca.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchSearch) return false

    switch (filtro) {
      case 'disponibles':
        return b.estado_alerta === 'disponible'
      case 'bajas':
        return b.estado_alerta === 'bajo'
      case 'agotadas':
        return b.estado_alerta === 'agotado'
      default:
        return true
    }
  })

  const stats = {
    total: botellas.length,
    disponibles: botellas.filter((b) => b.estado_alerta === 'disponible').length,
    bajas: botellas.filter((b) => b.estado_alerta === 'bajo').length,
    agotadas: botellas.filter((b) => b.estado_alerta === 'agotado').length
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wine className="h-5 w-5 text-purple-600" />
            Rendimiento de Botellas
          </h2>
          <p className="text-sm text-gray-500">
            Control de ml, shots y consumo en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={vista === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVista('grid')}
            className={vista === 'grid' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={vista === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVista('list')}
            className={vista === 'list' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Wine className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Disponibles</p>
                <p className="text-xl font-bold text-emerald-600">
                  {stats.disponibles}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Bajas</p>
                <p className="text-xl font-bold text-amber-600">
                  {stats.bajas}
                </p>
              </div>
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Agotadas</p>
                <p className="text-xl font-bold text-red-600">{stats.agotadas}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar botellas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="disponibles">Buenas</TabsTrigger>
            <TabsTrigger value="bajas">Bajas</TabsTrigger>
            <TabsTrigger value="agotadas">Agotadas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contenido */}
      {loading && botellas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Cargando botellas...</p>
          </CardContent>
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wine className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700">
              No hay botellas {searchTerm ? 'con esa busqueda' : 'en este filtro'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {filtro === 'bajas' && 'Todas las botellas estan en buen nivel'}
              {filtro === 'agotadas' && 'Todas las botellas tienen stock'}
              {filtro === 'disponibles' && 'Ninguna botella tiene stock bajo'}
              {filtro === 'todas' && 'No hay botellas registradas como bebida principal'}
            </p>
          </CardContent>
        </Card>
      ) : vista === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtradas.map((botella) => (
            <RendimientoBotella
              key={botella.id}
              productoId={botella.id}
              nombreProducto={botella.nombre}
              marca={botella.marca || undefined}
              volumenMl={botella.volumen_ml}
              stockActual={botella.stock_actual}
              stockMaximo={botella.stock_maximo}
              stockMinimo={botella.stock_minimo}
              size="sm"
              showAdjustButton
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((botella) => (
            <Card key={botella.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      botella.estado_alerta === 'agotado'
                        ? 'bg-red-100'
                        : botella.estado_alerta === 'bajo'
                        ? 'bg-amber-100'
                        : 'bg-emerald-100'
                    }`}
                  >
                    <Wine
                      className={`h-5 w-5 ${
                        botella.estado_alerta === 'agotado'
                          ? 'text-red-600'
                          : botella.estado_alerta === 'bajo'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {botella.nombre}
                    </p>
                    {botella.marca && (
                      <p className="text-xs text-gray-500 truncate">
                        {botella.marca}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <div className="text-right">
                    <p className="text-gray-500">Stock</p>
                    <p className="font-bold text-gray-900">
                      {botella.stock_actual}/{botella.stock_maximo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Porcentaje</p>
                    <p
                      className={`font-bold ${
                        botella.estado_alerta === 'agotado'
                          ? 'text-red-600'
                          : botella.estado_alerta === 'bajo'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {botella.porcentaje_stock.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Shots</p>
                    <p className="font-bold text-purple-600">
                      {botella.shots_disponibles}
                    </p>
                  </div>
                  <Badge
                    className={`${
                      botella.estado_alerta === 'agotado'
                        ? 'bg-red-100 text-red-700'
                        : botella.estado_alerta === 'bajo'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    } text-[10px]`}
                  >
                    {botella.estado_alerta.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
