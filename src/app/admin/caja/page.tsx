'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Search, ArrowLeft, RefreshCw, 
  CheckCircle, XCircle, Plus, Trash2, Camera, 
  DollarSign, Wallet, Edit, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/lib/services/userService'
import CajaForm from '@/components/admin/CajaForm'
import { UserNIPCard } from '@/components/admin/UserNIPCard'
import { useToast } from '@/hooks/use-toast'
import { updateStats } from '../stats'

export default function CajaPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [cajeros, setCajeros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCajero, setSelectedCajero] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      fetchCajeros()
    }
  }, [user])

  const fetchCajeros = async () => {
    setLoading(true)
    try {
      const data = await userService.getAll('caja')
      setCajeros(data || [])
      await updateStats()
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: '❌ Error al cargar',
        description: error.message || 'No se pudieron cargar los usuarios de caja',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDesactivar = async (usuarioId: string) => {
    setActionLoading(usuarioId)
    try {
      await userService.desactivarUsuario(usuarioId)
      await fetchCajeros()
      toast({
        title: '✅ Usuario desactivado',
        description: 'El usuario ha sido desactivado correctamente',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo desactivar el usuario',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivar = async (usuarioId: string) => {
    setActionLoading(usuarioId)
    try {
      await userService.activarUsuario(usuarioId)
      await fetchCajeros()
      toast({
        title: '✅ Usuario activado',
        description: 'El usuario ha sido activado correctamente',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo activar el usuario',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!selectedCajero) return
    try {
      await userService.deleteUser(selectedCajero.id)
      await fetchCajeros()
      setIsDeleteDialogOpen(false)
      setSelectedCajero(null)
      toast({
        title: '✅ Usuario eliminado',
        description: 'El usuario ha sido eliminado correctamente',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo eliminar el usuario',
        variant: 'destructive'
      })
    }
  }

  const handleUploadImage = async (usuarioId: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '❌ Imagen muy grande',
        description: 'La imagen debe ser menor a 2MB',
        variant: 'destructive'
      })
      return
    }

    setUploadingImage(usuarioId)
    try {
      await userService.uploadAdminFoto(file, usuarioId)
      await fetchCajeros()
      toast({
        title: '✅ Foto actualizada',
        description: 'La foto ha sido actualizada correctamente',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo subir la imagen',
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpenEdit = (cajero: any) => {
    setSelectedCajero(cajero)
    setIsEditDialogOpen(true)
  }

  const getInitials = (nombre: string, apellido: string) => {
    const first = nombre?.charAt(0) || ''
    const last = apellido?.charAt(0) || ''
    return (first + last).toUpperCase()
  }

  const getColor = (index: number) => {
    const colors = ['bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-green-600']
    return colors[index % colors.length]
  }

  const filteredCajeros = cajeros.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
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
                Caja
              </h1>
              <p className="text-sm text-gray-500">Gestiona los usuarios de caja</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario de Caja
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    Crear Nuevo Usuario de Caja
                  </DialogTitle>
                </DialogHeader>
                <CajaForm
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    fetchCajeros()
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchCajeros}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, apellido o correo..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCajeros.map((cajero, index) => {
            const isActivo = cajero.activo

            return (
              <Card key={cajero.id} className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                isActivo ? 'border-t-emerald-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative group">
                      <Avatar className={`h-16 w-16 ${getColor(index)}`}>
                        {cajero.avatar_url ? (
                          <AvatarImage src={cajero.avatar_url} alt={cajero.nombre} />
                        ) : null}
                        <AvatarFallback className="text-white text-lg font-semibold">
                          {getInitials(cajero.nombre, cajero.apellido)}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadImage(cajero.id, e.target.files[0])
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-6 w-6 p-0 rounded-full bg-white shadow-md hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage === cajero.id}
                      >
                        {uploadingImage === cajero.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {cajero.nombre} {cajero.apellido}
                        </h3>
                        <Badge className={isActivo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        📧 {cajero.email}
                      </p>
                      {cajero.phone_number && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          📱 {cajero.phone_number}
                        </p>
                      )}
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs mt-1">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Caja
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3">
                    <UserNIPCard
                      usuarioId={cajero.id}
                      usuarioNombre={`${cajero.nombre} ${cajero.apellido}`}
                      onNIPChange={fetchCajeros}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Wallet className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Usuario de caja
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleOpenEdit(cajero)}
                        title="Editar"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {isActivo ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDesactivar(cajero.id)}
                          disabled={actionLoading === cajero.id}
                          title="Desactivar"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleActivar(cajero.id)}
                          disabled={actionLoading === cajero.id}
                          title="Activar"
                        >
                          {actionLoading === cajero.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setSelectedCajero(cajero)
                          setIsDeleteDialogOpen(true)
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

        {filteredCajeros.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron usuarios de caja</p>
            <Button 
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear primer usuario de caja
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Usuario de Caja
            </DialogTitle>
          </DialogHeader>
          {selectedCajero && (
            <CajaForm
              isEdit={true}
              userId={selectedCajero.id}
              defaultValues={{
                nombre: selectedCajero.nombre,
                apellido: selectedCajero.apellido,
                email: selectedCajero.email,
                telefono: selectedCajero.phone_number || '',
                avatar_url: selectedCajero.avatar_url
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false)
                setSelectedCajero(null)
                fetchCajeros()
              }}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedCajero(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario de caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente al usuario{' '}
              <strong>{selectedCajero?.nombre} {selectedCajero?.apellido}</strong>.
              Esta acción no se puede deshacer.
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
