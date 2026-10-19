'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, RefreshCw, Coffee, Clock,
  CheckCircle, AlertCircle, UserCircle, DollarSign
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { mesaService, Mesa } from '@/lib/services/mesaService'
import { cuentaService, CuentaAbierta } from '@/lib/services/cuentaService'
import { MapaMesas } from '@/components/mesas/MapaMesas'
import { MesaAccionesPanel } from '@/components/mesas/MesaAccionesPanel'

export default function MeseroOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [mesas, setMesas] = useState<Mesa[]>([])
  const [cuentas, setCuentas] = useState<CuentaAbierta[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    if (user) {
      cargarDatos()
    }
  }, [user])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [mesasData, cuentasData] = await Promise.all([
        mesaService.getAll(true),
        user ? cuentaService.getCuentasDelMesero(user.id) : Promise.resolve([])
      ])
      setMesas(mesasData)
      setCuentas(cuentasData)
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las mesas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMesaClick = (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
    setIsPanelOpen(true)
  }

  const handlePanelSuccess = () => {
    cargarDatos()
  }

  if (!user) return null

  const misCuentasActivas = cuentas.filter(c => c.estado !== 'cerrada')
  const totalMisCuentas = misCuentasActivas.reduce((sum, c) => sum + c.total_actual, 0)

  const stats = {
    total: mesas.length,
    disponibles: mesas.filter(m => m.estado === 'disponible').length,
    misMesas: mesas.filter(m => m.mesero_id === user.id).length,
    cuentasSolicitadas: mesas.filter(m => m.estado === 'cuenta_solicitada').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Link href="/mesero">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mapa de Mesas</h1>
              <p className="text-sm text-gray-500">Selecciona una mesa para atenderla</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={cargarDatos}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total mesas</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Coffee className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Disponibles</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">{stats.disponibles}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Mis mesas</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.misMesas}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UserCircle className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Cuenta pedida</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-600">{stats.cuentasSolicitadas}</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Banner con total de mis cuentas */}
        {misCuentasActivas.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-emerald-500 bg-emerald-50">
            <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700">Mis cuentas activas</p>
                  <p className="text-lg font-bold text-emerald-900">
                    ${totalMisCuentas.toFixed(2)}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white">
                {misCuentasActivas.length} mesa{misCuentasActivas.length === 1 ? '' : 's'}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Mapa */}
        {loading && mesas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
            </CardContent>
          </Card>
        ) : (
          <MapaMesas
            onMesaClick={handleMesaClick}
            mesaSeleccionadaId={mesaSeleccionada?.id}
          />
        )}

        {/* Info adicional */}
        <Card className="mt-4 bg-gray-50 border-gray-200">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Ocupada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Cuenta solicitada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Cobrando</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>Fuera de servicio</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de acciones de mesa */}
      {user && (
        <MesaAccionesPanel
          mesa={mesaSeleccionada}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false)
            setMesaSeleccionada(null)
          }}
          usuarioId={user.id}
          onSuccess={handlePanelSuccess}
        />
      )}
    </div>
  )
}
