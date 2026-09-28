'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2, DollarSign, Save } from 'lucide-react'
import { userService } from '@/lib/services/userService'
import { useToast } from '@/hooks/use-toast'

interface CajaFormProps {
  onSuccess: () => void
  onCancel: () => void
  isEdit?: boolean
  userId?: string
  defaultValues?: {
    nombre?: string
    apellido?: string
    email?: string
    telefono?: string
    avatar_url?: string
  }
}

export default function CajaForm({ 
  onSuccess, 
  onCancel, 
  isEdit = false,
  userId,
  defaultValues 
}: CajaFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    nombre: defaultValues?.nombre || '',
    apellido: defaultValues?.apellido || '',
    email: defaultValues?.email || '',
    telefono: defaultValues?.telefono || '',
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultValues?.avatar_url || null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '❌ Imagen muy grande',
        description: 'La imagen debe ser menor a 2MB. Intenta con una más pequeña.',
        variant: 'destructive'
      })
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEdit && userId) {
        // ACTUALIZAR usuario existente
        await userService.updateUser(userId, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          phone_number: formData.telefono,

        })

        if (avatarFile) {
          await userService.uploadAdminFoto(avatarFile, userId)
        }

        toast({
          title: '✅ Usuario actualizado',
          description: `${formData.nombre} ${formData.apellido} ha sido actualizado correctamente`,
          variant: 'success'
        })
      } else {
        // CREAR nuevo usuario
        const result = await userService.createFullUser({
          email: formData.email,
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol: 'caja',

        })

        if (avatarFile && result.userId) {
          try {
            await userService.uploadAdminFoto(avatarFile, result.userId)
          } catch (error) {
            console.error('Error al subir avatar:', error)
          }
        }

        toast({
          title: '✅ Usuario de caja creado',
          description: `${formData.nombre} ${formData.apellido} ha sido creado. NIP: ${result.nip}`,
          variant: 'success',
          duration: 10000
        })
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo guardar el usuario. Intenta de nuevo.',
        variant: 'destructive',
        duration: 8000
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-emerald-100">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt="Preview" />
            ) : null}
            <AvatarFallback className="text-3xl bg-emerald-600 text-white">
              {formData.nombre && formData.apellido 
                ? getInitials()
                : <DollarSign className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-lg"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {avatarPreview ? 'Cambiar foto (máx. 2MB)' : 'Haz clic en la cámara para agregar foto'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Juan"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido *</Label>
          <Input
            id="apellido"
            value={formData.apellido}
            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            placeholder="Ej: Pérez"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="usuario@ejemplo.com"
          required
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-xs text-gray-500">El correo no se puede cambiar</p>
        )}
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

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
