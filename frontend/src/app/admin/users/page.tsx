'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, Users, ArrowLeft, RefreshCw, Plus, 
  UserPlus, Filter, Mail, Phone, Edit, Trash2,
  UserCog, UserCheck, UserX, Key, Shield
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import UserForm from '@/components/admin/UserForm'

export default function UsersManagementPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRol, setFilterRol] = useState('todos')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showNip, setShowNip] = useState<{ id: string; nip: string } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.getAll()
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutorizar = async (usuarioId: string) => {
    if (!user) return
    setActionLoading(usuarioId)
    try {
      const codigo = await userService.autorizarUsuario(usuarioId, user.id)
      setShowNip({ id: usuarioId, nip: codigo })
      await fetchUsers()
      setTimeout(() => setShowNip(null), 30000)
    } catch (error: any) {
      alert('Error al autorizar el usuario: ' + (error.message || 'Error desconocido'))
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Desactivar este usuario?')) return
    setActionLoading(id)
    try {
      await userService.desactivarUsuario(id)
      await fetchUsers()
    } catch (error) {
      alert('Error al desactivar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivar = async (id: string) => {
    setActionLoading(id)
    try {
      await userService.activarUsuario(id)
      await fetchUsers()
    } catch (error) {
      alert('Error al activar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await userService.deleteUser(userToDelete.id)
      await fetchUsers()
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      alert('Usuario eliminado correctamente')
    } catch (error) {
      alert('Error al eliminar el usuario')
      console.error(error)
    }
  }

  const getRolBadge = (rol: string) => {
    switch (rol) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-700">👑 Admin</Badge>
      case 'bartender':
        return <Badge className="bg-green-100 text-green-700">🍸 Bartender</Badge>
      case 'mesero':
        return <Badge className="bg-orange-100 text-orange-700">🍽️ Mesero</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700">{rol}</Badge>
    }
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase()
  }

  const getColor = (index: number) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-teal-600', 'bg-pink-600']
    return colors[index % colors.length]
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRol = filterRol === 'todos' || u.rol === filterRol
    return matchesSearch && matchesRol
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
              <p className="text-sm text-gray-500">Gestiona todos los usuarios del sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Crear Nuevo Usuario
                  </DialogTitle>
                </DialogHeader>
                <UserForm
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    fetchUsers()
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuarios..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">👑 Administradores</option>
            <option value="bartender">🍸 Bartenders</option>
            <option value="mesero">🍽️ Meseros</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((usuario, index) => {
            const isActivo = usuario.activo
            const esAdmin = usuario.rol === 'admin'
            const tieneCodigo = usuario.codigo_acceso
            const codigoExpiracion = usuario.codigo_expiracion
              ? new Date(usuario.codigo_expiracion)
              : null
            const isExpirado = codigoExpiracion && codigoExpiracion < new Date()

            return (
              <Card key={usuario.id} className={`hover:shadow-lg transition-all duration-300 border-t-4 ${
                isActivo ? 'border-t-green-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className={`h-14 w-14 ${getColor(index)}`}>
                      <AvatarFallback className="text-white text-lg font-semibold">
                        {getInitials(usuario.nombre, usuario.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {usuario.nombre} {usuario.apellido}
                        </h3>
                        {getRolBadge(usuario.rol)}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {usuario.email}
                      </p>
                      {usuario.telefono && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {usuario.telefono}
                        </p>
                      )}
                      {showNip && showNip.id === usuario.id && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-medium text-green-700">🎯 NIP de acceso:</p>
                          <p className="text-xl font-bold text-green-600 tracking-widest">{showNip.nip}</p>
                          <p className="text-xs text-gray-500">Expira en 24 horas</p>
                        </div>
                      )}
                      {tieneCodigo && !showNip && !esAdmin && (
                        <div className="flex items-center gap-1 mt-1">
                          <Key className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600 font-mono">{tieneCodigo}</span>
                          <span className="text-xs text-gray-400">
                            {isExpirado ? '(Expirado)' : `Expira: ${codigoExpiracion?.toLocaleTimeString()}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Badge className={isActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {isActivo ? '✅ Activo' : '❌ Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {!esAdmin && isActivo && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleAutorizar(usuario.id)}
                          disabled={actionLoading === usuario.id}
                        >
                          {actionLoading === usuario.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <Key className="h-3 w-3 mr-1" />
                              Nuevo NIP
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedUser(usuario)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {!esAdmin && (
                        <>
                          {isActivo ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDesactivar(usuario.id)}
                              disabled={actionLoading === usuario.id}
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleActivar(usuario.id)}
                              disabled={actionLoading === usuario.id}
                            >
                              <UserCheck className="h-3 w-3" />
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
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Dialog para editar usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserForm
              isEdit={true}
              userId={selectedUser.id}
              defaultValues={{
                nombre: selectedUser.nombre,
                apellido: selectedUser.apellido,
                rol: selectedUser.rol,
                pin: selectedUser.pin,
                telefono: selectedUser.telefono || '',
                email: selectedUser.email,
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false)
                setSelectedUser(null)
                fetchUsers()
              }}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedUser(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al usuario <strong>{userToDelete?.nombre} {userToDelete?.apellido}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
