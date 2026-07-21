'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Search, Users, ArrowLeft, RefreshCw, Star, User, 
  CheckCircle, XCircle, Key, Clock, Plus,
  Edit, Trash2, Camera, DollarSign, ShoppingBag, Award
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
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'
import MeseroForm from '@/components/admin/MeseroForm'
import { UserNIPCard } from '@/components/admin/UserNIPCard'

export default function MeserosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [meseros, setMeseros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMesero, setSelectedMesero] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMeseros()
  }, [])

  const fetchMeseros = async () => {
    setLoading(true)
    try {
      const data = await userService.getMeseros()
      setMeseros(data || [])
    } catch (error) {
      console.error('Error fetching meseros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDesactivar = async (usuarioId: string) => {
    if (!confirm('¿Desactivar este usuario?')) return
    setActionLoading(usuarioId)
    try {
      await userService.desactivarUsuario(usuarioId)
      await fetchMeseros()
    } catch (error) {
      alert('Error al desactivar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivar = async (usuarioId: string) => {
    setActionLoading(usuarioId)
    try {
      await userService.activarUsuario(usuarioId)
      await fetchMeseros()
    } catch (error) {
      alert('Error al activar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!selectedMesero) return
    try {
      await userService.deleteMesero(selectedMesero.id)
      await fetchMeseros()
      setIsDeleteDialogOpen(false)
      setSelectedMesero(null)
    } catch (error) {
      alert('Error al eliminar el mesero')
      console.error(error)
    }
  }

  const handleUploadImage = async (meseroId: string, file: File) => {
    setUploadingImage(meseroId)
    try {
      const url = await userService.uploadMeseroFoto(file, meseroId, selectedMesero?.usuario_id || '')
      await fetchMeseros()
    } catch (error) {
      alert('Error al subir la imagen')
      console.error(error)
    } finally {
      setUploadingImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getColor = (index: number) => {
    const colors = ['bg-orange-600', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600']
    return colors[index % colors.length]
  }

  const getRatingStars = (rating: number) => {
    const full = Math.floor(rating)
    const half = rating % 1 >= 0.5 ? 1 : 0
    const empty = 5 - full - half
    return '⭐'.repeat(full) + (half ? '⭐' : '') + '☆'.repeat(empty)
  }

  const filteredMeseros = meseros.filter(m =>
    m.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.usuarios?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Meseros</h1>
              <p className="text-sm text-gray-500">Gestiona el equipo de meseros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Mesero
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Crear Nuevo Mesero
                  </DialogTitle>
                </DialogHeader>
                <MeseroForm
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    fetchMeseros()
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchMeseros}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar meseros por nombre, código o email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMeseros.map((mesero, index) => {
            const usuario = mesero.usuarios || {}
            const isActivo = usuario.activo
            const calificacion = mesero.calificacion || 0

            return (
              <Card key={mesero.id} className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                isActivo ? 'border-t-green-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative group">
                      <Avatar className={`h-16 w-16 ${getColor(index)}`}>
                        {mesero.foto_url ? (
                          <AvatarImage src={mesero.foto_url} alt={mesero.nombre_completo} />
                        ) : usuario.avatar_url ? (
                          <AvatarImage src={usuario.avatar_url} alt={mesero.nombre_completo} />
                        ) : null}
                        <AvatarFallback className="text-white text-lg font-semibold">
                          {getInitials(mesero.nombre_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadImage(mesero.id, e.target.files[0])
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-6 w-6 p-0 rounded-full bg-white shadow-md hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage === mesero.id}
                      >
                        {uploadingImage === mesero.id ? (
                          <div className="h-3 w-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{mesero.nombre_completo}</h3>
                        <Badge className={isActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Código: {mesero.codigo || 'N/A'}</p>
                      <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
                    </div>
                  </div>

                  {/* Componente NIP */}
                  <div className="mt-3">
                    <UserNIPCard
                      usuarioId={usuario.id}
                      usuarioNombre={mesero.nombre_completo}
                      onNIPChange={fetchMeseros}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <ShoppingBag className="h-4 w-4 text-blue-600 mx-auto" />
                      <p className="text-xs text-gray-500">Pedidos</p>
                      <p className="text-sm font-bold text-gray-900">{mesero.pedidos_atendidos || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600 mx-auto" />
                      <p className="text-xs text-gray-500">Ventas</p>
                      <p className="text-sm font-bold text-gray-900">${mesero.ventas_totales?.toFixed(0) || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                      <Award className="h-4 w-4 text-yellow-600 mx-auto" />
                      <p className="text-xs text-gray-500">Calificación</p>
                      <p className="text-sm font-bold text-yellow-600">{calificacion.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-700">Calificación:</span>
                      <span className="text-sm">{getRatingStars(calificacion)}</span>
                      <span className="text-xs text-gray-400 ml-1">({calificacion.toFixed(1)})</span>
                    </div>
                    <Progress value={Math.min((calificacion / 5) * 100, 100)} className="h-1.5 mt-1" />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {calificacion >= 4.5 ? '🌟 Excelente' : calificacion >= 3.5 ? '👍 Bueno' : '📈 Mejorable'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {isActivo ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDesactivar(usuario.id)}
                            disabled={actionLoading === usuario.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Desactivar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setSelectedMesero(mesero)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleActivar(usuario.id)}
                          disabled={actionLoading === usuario.id}
                        >
                          {actionLoading === usuario.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Reactivar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredMeseros.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron meseros</p>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al mesero <strong>{selectedMesero?.nombre_completo}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
