'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Search, Users, ArrowLeft, RefreshCw, Star, User, 
  CheckCircle, XCircle, Key, Clock, Plus,
  Edit, Trash2, Camera, DollarSign, TrendingUp, Award
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
import BartenderForm from '@/components/admin/BartenderForm'
import { UserNIPCard } from '@/components/admin/UserNIPCard'
import { useToast } from '@/hooks/use-toast'

export default function BartendersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const [bartenders, setBartenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBartender, setSelectedBartender] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [showNip, setShowNip] = useState<{ id: string; nip: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBartenders()
  }, [])

  const fetchBartenders = async () => {
    setLoading(true)
    try {
      const data = await userService.getBartenders()
      setBartenders(data || [])
    } catch (error) {
      console.error('Error fetching bartenders:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los bartenders',
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
      await fetchBartenders()
      toast({
        title: '✅ Usuario desactivado',
        description: 'El usuario ha sido desactivado correctamente',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al desactivar el usuario',
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
      await fetchBartenders()
      toast({
        title: '✅ Usuario activado',
        description: 'El usuario ha sido activado correctamente',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al activar el usuario',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerarNIP = async (usuarioId: string) => {
    setActionLoading(usuarioId)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar al administrador',
          variant: 'destructive'
        })
        return
      }
      const codigo = await userService.generarNIP(usuarioId, currentUser.id)
      setShowNip({ id: usuarioId, nip: codigo })
      await fetchBartenders()
      toast({
        title: '✅ NIP Generado',
        description: `Nuevo NIP: ${codigo}`,
        variant: 'success'
      })
      setTimeout(() => setShowNip(null), 30000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al generar el NIP',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!selectedBartender) return
    try {
      await userService.deleteBartender(selectedBartender.id)
      await fetchBartenders()
      setIsDeleteDialogOpen(false)
      setSelectedBartender(null)
      toast({
        title: '✅ Bartender eliminado',
        description: 'El bartender ha sido eliminado correctamente',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el bartender',
        variant: 'destructive'
      })
    }
  }

  const handleUploadImage = async (bartenderId: string, file: File) => {
    setUploadingImage(bartenderId)
    try {
      const bartender = bartenders.find(b => b.id === bartenderId)
      const url = await userService.uploadBartenderFoto(file, bartenderId, bartender?.usuario_id || '')
      await fetchBartenders()
      toast({
        title: '✅ Foto actualizada',
        description: 'La foto del bartender ha sido actualizada',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir la imagen',
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getColor = (index: number) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-teal-600', 'bg-pink-600']
    return colors[index % colors.length]
  }

  const getEfficiencyColor = (value: number) => {
    if (value >= 90) return 'text-green-600'
    if (value >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredBartenders = bartenders.filter(b =>
    b.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.usuarios?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Bartenders</h1>
              <p className="text-sm text-gray-500">Gestiona el equipo de bartenders</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Bartender
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Crear Nuevo Bartender
                  </DialogTitle>
                </DialogHeader>
                <BartenderForm
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    fetchBartenders()
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchBartenders}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar bartenders por nombre, código o email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBartenders.map((bartender, index) => {
            const usuario = bartender.usuarios || {}
            const isActivo = usuario.activo
            const eficiencia = bartender.calificacion_eficiencia || 0

            return (
              <Card key={bartender.id} className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                isActivo ? 'border-t-green-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative group">
                      <Avatar className={`h-16 w-16 ${getColor(index)}`}>
                        {bartender.foto_url ? (
                          <AvatarImage src={bartender.foto_url} alt={bartender.nombre_completo} />
                        ) : usuario.avatar_url ? (
                          <AvatarImage src={usuario.avatar_url} alt={bartender.nombre_completo} />
                        ) : null}
                        <AvatarFallback className="text-white text-lg font-semibold">
                          {getInitials(bartender.nombre_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadImage(bartender.id, e.target.files[0])
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-6 w-6 p-0 rounded-full bg-white shadow-md hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage === bartender.id}
                      >
                        {uploadingImage === bartender.id ? (
                          <div className="h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{bartender.nombre_completo}</h3>
                        <Badge className={isActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Código: {bartender.codigo || 'N/A'}</p>
                      <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <UserNIPCard
                      usuarioId={usuario.id}
                      usuarioNombre={bartender.nombre_completo}
                      onNIPChange={fetchBartenders}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <DollarSign className="h-4 w-4 text-blue-600 mx-auto" />
                      <p className="text-xs text-gray-500">Ventas</p>
                      <p className="text-sm font-bold text-gray-900">${bartender.ventas_totales?.toFixed(0) || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                      <p className="text-xs text-gray-500">Bebidas</p>
                      <p className="text-sm font-bold text-gray-900">{bartender.bebidas_preparadas || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <Award className="h-4 w-4 text-purple-600 mx-auto" />
                      <p className="text-xs text-gray-500">Eficiencia</p>
                      <p className={`text-sm font-bold ${getEfficiencyColor(eficiencia)}`}>
                        {eficiencia.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Progress value={Math.min(eficiencia, 100)} className="h-1.5" />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>Rendimiento</span>
                      <span className="font-medium">
                        {eficiencia >= 90 ? '🌟 Excelente' : eficiencia >= 70 ? '👍 Bueno' : '📈 Mejorable'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Star className={`h-4 w-4 ${eficiencia >= 90 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      <span className="text-sm text-gray-600">
                        {eficiencia >= 90 ? 'Top Bartender' : eficiencia >= 70 ? 'Profesional' : 'En formación'}
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
                              setSelectedBartender(bartender)
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

        {filteredBartenders.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron bartenders</p>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al bartender <strong>{selectedBartender?.nombre_completo}</strong>.
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
