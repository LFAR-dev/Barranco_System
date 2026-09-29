'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Plus, Edit, Trash2, RefreshCw, Search,
  Wallet, MapPin, Tag, AlertTriangle, Loader2,
  CheckCircle, XCircle, DollarSign
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cajaFisicaService, CajaFisicaConSucursal } from '@/lib/services/cajaFisicaService'
import { CajaFisicaForm } from '@/components/admin/CajaFisicaForm'

export default function CajasFisicasPage() {
  const { toast } = useToast()
  const [cajas, setCajas] = useState<CajaFisicaConSucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCaja, setSelectedCaja] = useState<CajaFisicaConSucursal | null>(null)

  useEffect(() => {
    cargarCajas()
  }, [])

  const cargarCajas = async () => {
    setLoading(true)
    try {
      const data = await cajaFisicaService.getAll()
      setCajas(data)
    } catch (error) {
      console.error('Error al cargar cajas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cajas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDesactivar = async (caja: CajaFisicaConSucursal) => {
    try {
      await cajaFisicaService.desactivar(caja.id)
      await cargarCajas()
      toast({
        title: '✅ Caja desactivada',
        description: `"${caja.nombre}" ya no está disponible`,
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desactivar',
        variant: 'destructive'
      })
    }
  }

  const handleReactivar = async (caja: CajaFisicaConSucursal) => {
    try {
      await cajaFisicaService.reactivar(caja.id)
      await cargarCajas()
      toast({
        title: '✅ Caja reactivada',
        description: `"${caja.nombre}" está disponible de nuevo`,
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reactivar',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedCaja) return
    try {
      await cajaFisicaService.delete(selectedCaja.id)
      await cargarCajas()
      setIsDeleteOpen(false)
      setSelectedCaja(null)
      toast({
        title: '✅ Caja eliminada',
        description: 'La caja fue eliminada permanentemente',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se puede eliminar: tiene sesiones asociadas',
        variant: 'destructive'
      })
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'caja': return { label: 'Caja', color: 'bg-emerald-100 text-emerald-700' }
      case 'evento': return { label: 'Evento', color: 'bg-purple-100 text-purple-700' }
      case 'movil': return { label: 'Móvil', color: 'bg-blue-100 text-blue-700' }
      case 'temporal': return { label: 'Temporal', color: 'bg-amber-100 text-amber-700' }
      default: return { label: tipo, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const filteredCajas = cajas.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sucursal_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activas = filteredCajas.filter(c => c.activa).length
  const inactivas = filteredCajas.filter(c => !c.activa).length

  if (loading && cajas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                <Wallet className="h-6 w-6 text-emerald-600" />
                Cajas Físicas
              </h1>
              <p className="text-sm text-gray-500">
                Gestiona las cajas y terminales del sistema
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Caja
            </Button>
            <Button variant="outline" onClick={cargarCajas}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{cajas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Activas</p>
                <p className="text-lg font-bold text-emerald-600">{activas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Inactivas</p>
                <p className="text-lg font-bold text-red-600">{inactivas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar caja por nombre o sucursal..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Grid de cajas */}
        {filteredCajas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hay cajas registradas</p>
              <p className="text-sm text-gray-400 mt-1">
                Crea tu primera caja para empezar a usarla
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear primera caja
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCajas.map((caja) => {
              const tipoBadge = getTipoBadge(caja.tipo)
              return (
                <Card
                  key={caja.id}
                  className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                    caja.activa ? 'border-t-emerald-500' : 'border-t-gray-300'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-3 rounded-xl ${
                          caja.activa ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <Wallet className={`h-6 w-6 ${
                            caja.activa ? 'text-emerald-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {caja.nombre}
                          </h3>
                          {caja.sucursal_nombre && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {caja.sucursal_nombre}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={caja.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                        {caja.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={tipoBadge.color}>
                        <Tag className="h-3 w-3 mr-1" />
                        {tipoBadge.label}
                      </Badge>
                    </div>

                    {caja.notas && (
                      <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">
                        "{caja.notas}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-gray-400">
                        Creada: {new Date(caja.created_at).toLocaleDateString('es-MX')}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedCaja(caja)
                            setIsEditOpen(true)
                          }}
                          title="Editar"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {caja.activa ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleDesactivar(caja)}
                            title="Desactivar"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleReactivar(caja)}
                            title="Reactivar"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setSelectedCaja(caja)
                            setIsDeleteOpen(true)
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Plus className="h-5 w-5" />
              Nueva Caja Física
            </DialogTitle>
          </DialogHeader>
          <CajaFisicaForm
            onSuccess={() => {
              setIsCreateOpen(false)
              cargarCajas()
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Edit className="h-5 w-5" />
              Editar Caja Física
            </DialogTitle>
          </DialogHeader>
          {selectedCaja && (
            <CajaFisicaForm
              caja={selectedCaja}
              onSuccess={() => {
                setIsEditOpen(false)
                setSelectedCaja(null)
                cargarCajas()
              }}
              onCancel={() => {
                setIsEditOpen(false)
                setSelectedCaja(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              ¿Eliminar caja?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <strong>{selectedCaja?.nombre}</strong>.
              Si la caja tiene sesiones asociadas, no se podrá eliminar. En ese caso,
              solo desactívala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
