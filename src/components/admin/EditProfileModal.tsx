'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Camera, 
  Loader2,
  CheckCircle,
  Key,
  Mail,
  Phone,
  UserCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onUpdate: () => void
}

export function EditProfileModal({ isOpen, onClose, user, onUpdate }: EditProfileModalProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    telefono: user?.phone_number || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setUploadSuccess(false)
    
    try {
      let newAvatarUrl: string | null = null
      
      if (user.rol === 'bartender') {
        const bartender = await userService.getBartenderByUsuarioId(user.id)
        if (bartender) {
          newAvatarUrl = await userService.uploadBartenderFoto(file, bartender.id, user.id)
        }
      } else if (user.rol === 'mesero') {
        const mesero = await userService.getMeseroByUsuarioId(user.id)
        if (mesero) {
          newAvatarUrl = await userService.uploadMeseroFoto(file, mesero.id, user.id)
        }
      } else {
        newAvatarUrl = await userService.uploadAdminFoto(file, user.id)
      }
      
      // Solo actualizar si tenemos una URL válida
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl)
      }
      
      setUploadSuccess(true)
      
      toast({
        title: '✅ Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada',
        variant: 'success'
      })
      
      setTimeout(() => setUploadSuccess(false), 3000)
      
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Error',
        description: error.message || 'Error al subir la foto',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Actualizar perfil
      await userService.updateUser(user.id, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        phone_number: formData.telefono,
      })

      // Si hay nueva contraseña, actualizarla
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          toast({
            title: 'Error',
            description: 'Las contraseñas no coinciden',
            variant: 'destructive'
          })
          setLoading(false)
          return
        }

        if (formData.newPassword.length < 6) {
          toast({
            title: 'Error',
            description: 'La contraseña debe tener al menos 6 caracteres',
            variant: 'destructive'
          })
          setLoading(false)
          return
        }

        // Verificar contraseña actual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: formData.currentPassword,
        })

        if (signInError) {
          toast({
            title: 'Error',
            description: 'Contraseña actual incorrecta',
            variant: 'destructive'
          })
          setLoading(false)
          return
        }

        await userService.updatePassword(user.id, formData.newPassword)
      }

      toast({
        title: '✅ Perfil actualizado',
        description: 'Todos los cambios han sido guardados correctamente',
        variant: 'success'
      })

      onUpdate()
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el perfil',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    const nombre = formData.nombre || ''
    const apellido = formData.apellido || ''
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserCircle className="h-6 w-6 text-blue-600" />
            Editar Perfil
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-blue-100">
                <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
                <AvatarFallback className="text-3xl bg-blue-600 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              {uploadSuccess && (
                <div className="absolute -top-1 -right-1">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Haz clic en la cámara para cambiar tu foto
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Nombre
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Apellido
              </Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                required
                className="focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400">El email no se puede cambiar</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              Teléfono
            </Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+52 123 456 7890"
              className="focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-gray-500" />
              Cambiar Contraseña
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="•••••••• (mínimo 6 caracteres)"
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Deja los campos de contraseña vacíos si no deseas cambiarla
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
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
  )
}
