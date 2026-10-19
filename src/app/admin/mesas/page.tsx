'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, RefreshCw, LayoutGrid, List, MousePointer2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { mesaService, Mesa, CategoriaMesa } from '@/lib/services/mesaService'
import { MapaMesas } from '@/components/mesas/MapaMesas'
import { MesaDetalleModal } from '@/components/mesas/MesaDetalleModal'

export default function MesasPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [isCrearOpen, setIsCrearOpen] = useState(false)

  const [nuevaMesa, setNuevaMesa] = useState({
    numero: '',
    categoria: 'social' as CategoriaMesa,
    capacidad: 4,
    mapa_x: 50,
    mapa_y: 50
  })

  const cargarMesas = async () => {
    setLoading(true)
    try {
      const data = await mesaService.getAll(true)
      setMesas(data)
    } catch (error) {
      console.error('Error al cargar mesas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarMesas()
  }, [])

  const handleMesaClick = (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
    setIsDetalleOpen(true)
  }

  const handleCrearMesa = async () => {
    if (!nuevaMesa.numero.trim()) {
      toast({
        title: 'Número requerido',
        description: 'La mesa debe tener un número',
        variant: 'destructive'
      })
      return
    }

    try {
      await mesaService.crear({
        numero: nuevaMesa.numero.toUpperCase(),
        categoria: nuevaMesa.categoria,
        capacidad: nuevaMesa.capacidad,
        mapa_x: nuevaMesa.mapa_x,
        mapa_y: nuevaMesa.mapa_y
      })
      toast({
        title: 'Mesa creada',
        description: `Mesa ${nuevaMesa.numero} agregada al mapa`,
        variant: 'success'
      })
      setIsCrearOpen(false)
      setNuevaMesa({ numero: '', categoria: 'social', capacidad: 4, mapa_x: 50, mapa_y: 50 })
      cargarMesas()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la mesa',
        variant: 'destructive'
      })
    }
  }

  if (!user) return null

  const stats = {
    total: mesas.length,
    disponibles: mesas.filter(m => m.estado === 'disponible').length,
    ocupadas: mesas.filter(m => m.estado === 'ocupada').length,
    cuentaSolicitada: mesas.filter(m => m.estado === 'cuenta_solicitada').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mapa de Mesas</h1>
              <p className="text-sm text-gray-500">
                Gestión visual del establecimiento
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            >
              <MousePointer2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isEditing ? 'Guardar Vista' : 'Modo Edición'}</span>
              <span className="sm:hidden">{isEditing ? 'Guardar' : 'Editar'}</span>
            </Button>
            <Button
              onClick={() => setIsCrearOpen(true)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Mesa</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
            <Button variant="outline" size="sm" onClick={cargarMesas}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LayoutGrid className="h-4 w-4 text-blue-600" />
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
                  <List className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Ocupadas</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600">{stats.ocupadas}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <LayoutGrid className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Cuenta pedida</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-600">{stats.cuentaSolicitada}</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <LayoutGrid className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        {loading && mesas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto" />
            </CardContent>
          </Card>
        ) : (
          <MapaMesas
            onMesaClick={handleMesaClick}
            editable={user.rol === 'admin'}
            isEditing={isEditing}
            mesaSeleccionadaId={mesaSeleccionada?.id}
          />
        )}
      </div>

      {/* Modal de detalle/edición */}
      <MesaDetalleModal
        mesa={mesaSeleccionada}
        isOpen={isDetalleOpen}
        onClose={() => {
          setIsDetalleOpen(false)
          setMesaSeleccionada(null)
        }}
        onSuccess={cargarMesas}
        editable={user.rol === 'admin'}
      />

      {/* Modal de crear mesa */}
      <Dialog open={isCrearOpen} onOpenChange={setIsCrearOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nueva Mesa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="numero">Número / Identificador</Label>
              <Input
                id="numero"
                value={nuevaMesa.numero}
                onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })}
                placeholder="Ej: T12, E6, X1..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="categoria">Categoría</Label>
                <select
                  id="categoria"
                  value={nuevaMesa.categoria}
                  onChange={(e) => setNuevaMesa({ ...nuevaMesa, categoria: e.target.value as CategoriaMesa })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="especial">Especial</option>
                  <option value="social">Social</option>
                  <option value="privada">Privada</option>
                  <option value="terraza">Terraza</option>
                  <option value="temporal">Temporal</option>
                </select>
              </div>
              <div>
                <Label htmlFor="capacidad">Capacidad</Label>
                <Input
                  id="capacidad"
                  type="number"
                  min="1"
                  value={nuevaMesa.capacidad}
                  onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: parseInt(e.target.value) || 4 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Posición X (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={nuevaMesa.mapa_x}
                  onChange={(e) => setNuevaMesa({ ...nuevaMesa, mapa_x: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Posición Y (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={nuevaMesa.mapa_y}
                  onChange={(e) => setNuevaMesa({ ...nuevaMesa, mapa_y: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCrearOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCrearMesa} className="flex-1 bg-rose-600 hover:bg-rose-700">
                Crear Mesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
