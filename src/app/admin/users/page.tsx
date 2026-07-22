'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Search, Users, ArrowLeft, RefreshCw, User, 
  CheckCircle, XCircle, Plus,
  Edit, Trash2, Camera, Mail, Phone,
  Shield, ShieldCheck, ShieldAlert, Eye, EyeOff,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { createClient } from '@/lib/supabase/client'
import { userService } from '@/lib/services/userService'
import { useToast } from '@/hooks/use-toast'

export default function UsersManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Formulario para nuevo usuario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Formulario para editar usuario
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  })
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.getAll('admin')
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los administradores',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isEdit) {
      setEditAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('create')

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive'
      })
      setActionLoading(null)
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive'
      })
      setActionLoading(null)
      return
    }

    try {
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido,
            rol: 'admin',
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      const userId = authData.user.id

      // Crear en tabla usuarios
      const { error: userError } = await supabase
        .from('usuarios')
        .insert([{
          id: userId,
          email: formData.email,
          password_hash: 'auth_managed',
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol: 'admin',
          telefono: formData.telefono || null,
          activo: true,
          email_verificado: true,
          pin: Math.floor(100000 + Math.random() * 900000).toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (userError) throw userError

      // Subir avatar si se seleccionó
      if (avatarFile) {
        try {
          const extension = avatarFile.name.split('.').pop()
          const fileName = `${Date.now()}.${extension}`
          const path = `admins/${userId}/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('barranco-images')
            .upload(path, avatarFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: avatarFile.type
            })
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('barranco-images')
              .getPublicUrl(path)
            
            await supabase
              .from('usuarios')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', userId)
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
        }
      }

      toast({
        title: '✅ Administrador creado',
        description: `${formData.nombre} ${formData.apellido} ha sido creado correctamente`,
        variant: 'success'
      })

      // Resetear formulario
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        password: '',
        confirmPassword: '',
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      setIsDialogOpen(false)
      fetchUsers()

    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el administrador',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setActionLoading('edit')
    try {
      // Actualizar usuario
      await userService.updateUser(selectedUser.id, {
        nombre: editFormData.nombre,
        apellido: editFormData.apellido,
        phone_number: editFormData.telefono,
      })

      // Subir nueva foto si se seleccionó
      if (editAvatarFile) {
        try {
          const extension = editAvatarFile.name.split('.').pop()
          const fileName = `${Date.now()}.${extension}`
          const path = `admins/${selectedUser.id}/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('barranco-images')
            .upload(path, editAvatarFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: editAvatarFile.type
            })
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('barranco-images')
              .getPublicUrl(path)
            
            await supabase
              .from('usuarios')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', selectedUser.id)
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
        }
      }

      toast({
        title: '✅ Administrador actualizado',
        description: `${editFormData.nombre} ${editFormData.apellido} ha sido actualizado`,
        variant: 'success'
      })

      setIsEditDialogOpen(false)
      setSelectedUser(null)
      setEditAvatarFile(null)
      setEditAvatarPreview(null)
      fetchUsers()

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el administrador',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setActionLoading('delete')
    try {
      await userService.deleteUser(userToDelete.id)
      await fetchUsers()
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      toast({
        title: '✅ Administrador eliminado',
        description: `${userToDelete.nombre} ${userToDelete.apellido} ha sido eliminado`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el administrador',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDesactivar = async (id: string) => {
    setActionLoading(id)
    try {
      await userService.desactivarUsuario(id)
      await fetchUsers()
      toast({
        title: '✅ Usuario desactivado',
        description: 'El administrador ha sido desactivado',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al desactivar el administrador',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivar = async (id: string) => {
    setActionLoading(id)
    try {
      await userService.activarUsuario(id)
      await fetchUsers()
      toast({
        title: '✅ Usuario activado',
        description: 'El administrador ha sido activado',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al activar el administrador',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const openEditDialog = (user: any) => {
    setSelectedUser(user)
    setEditFormData({
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email: user.email || '',
      telefono: user.phone_number || '',
    })
    setEditAvatarPreview(user.avatar_url || null)
    setEditAvatarFile(null)
    setIsEditDialogOpen(true)
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase()
  }

  const getColor = (index: number) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-indigo-600', 'bg-rose-600', 'bg-emerald-600']
    return colors[index % colors.length]
  }

  const filteredUsers = users.filter(u => {
    const fullName = `${u.nombre} ${u.apellido}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase()) ||
           u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
                <Shield className="h-6 w-6 text-blue-600" />
                Administradores
              </h1>
              <p className="text-sm text-gray-500">Gestiona los administradores del sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Administrador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Crear Nuevo Administrador
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Foto de perfil */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 border-4 border-blue-100">
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} alt="Preview" />
                        ) : null}
                        <AvatarFallback className="text-3xl bg-blue-600 text-white">
                          {formData.nombre && formData.apellido 
                            ? getInitials(formData.nombre, formData.apellido)
                            : <User className="h-10 w-10" />}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e, false)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Haz clic en la cámara para agregar foto</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        value={formData.apellido}
                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+52 123 456 7890"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setFormData({
                          nombre: '',
                          apellido: '',
                          email: '',
                          telefono: '',
                          password: '',
                          confirmPassword: '',
                        })
                        setAvatarFile(null)
                        setAvatarPreview(null)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={actionLoading === 'create'}
                    >
                      {actionLoading === 'create' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        'Crear Administrador'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar administradores..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((usuario, index) => {
            const isActivo = usuario.activo
            const isCurrentUser = usuario.id === user?.id

            return (
              <Card key={usuario.id} className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                isActivo ? 'border-t-green-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className={`h-16 w-16 ${getColor(index)}`}>
                      {usuario.avatar_url ? (
                        <AvatarImage src={usuario.avatar_url} alt={usuario.nombre} />
                      ) : null}
                      <AvatarFallback className="text-white text-lg font-semibold">
                        {getInitials(usuario.nombre, usuario.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {usuario.nombre} {usuario.apellido}
                        </h3>
                        <Badge className={isActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {usuario.email}
                      </p>
                      {usuario.phone_number && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {usuario.phone_number}
                        </p>
                      )}
                      {isCurrentUser && (
                        <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Tú
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                    <Badge className="bg-purple-100 text-purple-700">
                      <Shield className="h-3 w-3 mr-1" />
                      Administrador
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => openEditDialog(usuario)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      {!isCurrentUser && (
                        <>
                          {isActivo ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDesactivar(usuario.id)}
                              disabled={actionLoading === usuario.id}
                            >
                              {actionLoading === usuario.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleActivar(usuario.id)}
                              disabled={actionLoading === usuario.id}
                            >
                              {actionLoading === usuario.id ? (
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
                              setUserToDelete(usuario)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron administradores</p>
            <Button 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear primer administrador
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Editar Administrador
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-blue-100">
                  {editAvatarPreview ? (
                    <AvatarImage src={editAvatarPreview} alt="Preview" />
                  ) : null}
                  <AvatarFallback className="text-3xl bg-blue-600 text-white">
                    {editFormData.nombre && editFormData.apellido 
                      ? getInitials(editFormData.nombre, editFormData.apellido)
                      : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, true)}
                />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Haz clic en la cámara para cambiar foto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apellido">Apellido</Label>
                <Input
                  id="edit-apellido"
                  value={editFormData.apellido}
                  onChange={(e) => setEditFormData({ ...editFormData, apellido: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-400">El email no se puede cambiar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-telefono">Teléfono</Label>
              <Input
                id="edit-telefono"
                value={editFormData.telefono}
                onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                placeholder="+52 123 456 7890"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedUser(null)
                  setEditAvatarFile(null)
                  setEditAvatarPreview(null)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={actionLoading === 'edit'}
              >
                {actionLoading === 'edit' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al administrador <strong>{userToDelete?.nombre} {userToDelete?.apellido}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
