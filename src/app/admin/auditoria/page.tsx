'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, Shield, TrendingDown,
  Loader2, XCircle, List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { AuditFilters } from '@/components/admin/audit/AuditFilters'
import { CancelacionesList } from '@/components/admin/audit/CancelacionesList'
import { MermasList } from '@/components/admin/audit/MermasList'
import { BitacoraList } from '@/components/admin/audit/BitacoraList'
import { auditService, CancelacionAudit, MermaAudit, AuditoriaFiltros } from '@/lib/services/auditService'
import { auditoriaService, EventoAuditoria } from '@/lib/services/auditoriaService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function AuditoriaPage() {
  const { user } = useAuth('admin')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [loadingBitacora, setLoadingBitacora] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const [cancelaciones, setCancelaciones] = useState<CancelacionAudit[]>([])
  const [mermas, setMermas] = useState<MermaAudit[]>([])
  const [eventos, setEventos] = useState<EventoAuditoria[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({})

  const [stats, setStats] = useState({
    cancelaciones: { total: 0, noLeidas: 0, valorTotal: 0 },
    mermas: { total: 0, noAuditadas: 0, valorTotal: 0 }
  })

  useEffect(() => {
    if (user) {
      cargarTodo()
    }
  }, [user])

  const cargarTodo = async () => {
    await Promise.all([
      cargarDatos(),
      cargarBitacora(),
      cargarUsuarios(),
      cargarEstadisticas()
    ])
  }

  const cargarDatos = async (nuevosFiltros?: AuditoriaFiltros) => {
    setLoading(true)
    try {
      const filtrosAplicar = nuevosFiltros || filtros
      const [cancelacionesData, mermasData] = await Promise.all([
        auditService.getCancelaciones(filtrosAplicar),
        auditService.getMermas(filtrosAplicar)
      ])
      setCancelaciones(cancelacionesData || [])
      setMermas(mermasData || [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarBitacora = async () => {
    setLoadingBitacora(true)
    try {
      const data = await auditoriaService.getEventos({})
      setEventos(data || [])
    } catch (error) {
      console.error('Error al cargar bitácora:', error)
    } finally {
      setLoadingBitacora(false)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const data = await auditService.getUsuariosParaFiltro()
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    }
  }

  const cargarEstadisticas = async () => {
    setLoadingStats(true)
    try {
      const data = await auditService.getEstadisticas(filtros)
      setStats(data)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleFiltrosChange = (nuevosFiltros: any) => {
    setFiltros(nuevosFiltros)
    cargarDatos(nuevosFiltros)
    cargarEstadisticas()
  }

  const handleRefrescar = async () => {
    await cargarTodo()
    toast({
      title: 'Datos actualizados',
      description: 'Se recargó toda la información'
    })
  }

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
                <Shield className="h-6 w-6 text-purple-600" />
                Auditoría
              </h1>
              <p className="text-sm text-gray-500">
                Historial completo de eventos, cancelaciones y mermas
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefrescar}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Tabs principales */}
        <Tabs defaultValue="cancelaciones" className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="cancelaciones"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelaciones</span>
              <span className="sm:hidden">Canc.</span>
              {stats.cancelaciones.total > 0 && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0 rounded">
                  {stats.cancelaciones.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="mermas"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">Mermas</span>
              <span className="sm:hidden">Mermas</span>
              {stats.mermas.total > 0 && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0 rounded">
                  {stats.mermas.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="bitacora"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Bitácora</span>
              <span className="sm:hidden">Bitácora</span>
              {eventos.length > 0 && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0 rounded">
                  {eventos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Cancelaciones */}
          <TabsContent value="cancelaciones" className="space-y-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Cancelaciones registradas</h3>
                    <p className="text-sm text-gray-500">
                      {stats.cancelaciones.total} cancelaciones · {stats.cancelaciones.noLeidas} sin revisar
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Valor total</p>
                  <p className="text-lg font-bold text-red-600">
                    ${stats.cancelaciones.valorTotal.toLocaleString('es-MX')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <AuditFilters
              usuarios={usuarios}
              filtrosActuales={filtros}
              onFilterChange={handleFiltrosChange}
            />

            <CancelacionesList
              cancelaciones={cancelaciones}
              onRefresh={() => cargarDatos()}
            />
          </TabsContent>

          {/* Tab: Mermas */}
          <TabsContent value="mermas" className="space-y-4">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mermas registradas</h3>
                    <p className="text-sm text-gray-500">
                      {stats.mermas.total} mermas · {stats.mermas.noAuditadas} sin auditar
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Valor total</p>
                  <p className="text-lg font-bold text-amber-600">
                    ${stats.mermas.valorTotal.toLocaleString('es-MX')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <MermasList
              mermas={mermas}
              onRefresh={() => cargarDatos()}
            />
          </TabsContent>

          {/* Tab: Bitácora */}
          <TabsContent value="bitacora" className="space-y-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <List className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Bitácora de eventos</h3>
                    <p className="text-sm text-gray-500">
                      Registro cronológico de todas las acciones importantes del sistema
                    </p>
                  </div>
                </div>
                <div className="text-center px-3">
                  <p className="text-[10px] text-gray-500 uppercase">Total</p>
                  <p className="text-lg font-bold text-purple-600">{eventos.length}</p>
                </div>
              </CardContent>
            </Card>

            <BitacoraList
              eventos={eventos}
              loading={loadingBitacora}
              onRecargar={cargarBitacora}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
