'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Shield, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { AuditStats } from '@/components/admin/audit/AuditStats'
import { AuditFilters } from '@/components/admin/audit/AuditFilters'
import { CancelacionesList } from '@/components/admin/audit/CancelacionesList'
import { MermasList } from '@/components/admin/audit/MermasList'
import { auditService, CancelacionAudit, MermaAudit, AuditoriaFiltros } from '@/lib/services/auditService'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function AuditoriaPage() {
  const { user } = useAuth('admin')
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [cancelaciones, setCancelaciones] = useState<CancelacionAudit[]>([])
  const [mermas, setMermas] = useState<MermaAudit[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({})
  const [stats, setStats] = useState({
    cancelaciones: { total: 0, noLeidas: 0, valorTotal: 0 },
    mermas: { total: 0, noAuditadas: 0, valorTotal: 0 }
  })

  // Cargar filtros y datos iniciales
  useEffect(() => {
    if (user) {
      cargarTodo()
    }
  }, [user])

  const cargarTodo = async () => {
    await Promise.all([
      cargarDatos(),
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
      setCancelaciones(cancelacionesData)
      setMermas(mermasData)
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: '❌ Error',
        description: 'No se pudieron cargar los datos de auditoría',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const data = await auditService.getUsuariosParaFiltro()
      setUsuarios(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarEstadisticas = async (nuevosFiltros?: AuditoriaFiltros) => {
    setLoadingStats(true)
    try {
      const filtrosAplicar = nuevosFiltros || filtros
      const data = await auditService.getEstadisticas(filtrosAplicar)
      setStats(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleFilterChange = async (nuevosFiltros: AuditoriaFiltros) => {
    setFiltros(nuevosFiltros)
    await Promise.all([
      cargarDatos(nuevosFiltros),
      cargarEstadisticas(nuevosFiltros)
    ])
  }

  const handleRefresh = async () => {
    await cargarTodo()
    toast({
      title: '✅ Actualizado',
      description: 'Los datos se han actualizado correctamente',
      variant: 'success'
    })
  }

  if (!user || user.rol !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Panel de Auditoría
              </h1>
              <p className="text-sm text-gray-500">
                Revisa cancelaciones, mermas y actividad de tus trabajadores
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>

        {/* Estadísticas */}
        {loadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <AuditStats stats={stats} />
        )}

        {/* Filtros */}
        <AuditFilters
          onFilterChange={handleFilterChange}
          usuarios={usuarios}
          filtrosActuales={filtros}
        />

        {/* Tabs de contenido */}
        <Tabs defaultValue="cancelaciones" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cancelaciones" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cancelaciones
              {stats.cancelaciones.noLeidas > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {stats.cancelaciones.noLeidas}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mermas" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Mermas
              {stats.mermas.noAuditadas > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
                  {stats.mermas.noAuditadas}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cancelaciones" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Cargando cancelaciones...</p>
                </CardContent>
              </Card>
            ) : (
              <CancelacionesList
                cancelaciones={cancelaciones}
                onRefresh={handleRefresh}
              />
            )}
          </TabsContent>

          <TabsContent value="mermas" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Cargando mermas...</p>
                </CardContent>
              </Card>
            ) : (
              <MermasList
                mermas={mermas}
                onRefresh={handleRefresh}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
