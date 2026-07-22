'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2 } from 'lucide-react'
import { userService } from '@/lib/services/userService'
import { useToast } from '@/hooks/use-toast'

interface MeseroFormProps {
  onSuccess: () => void
  onCancel: () => void
  isEdit?: boolean
  userId?: string
  defaultValues?: any
}

export default function MeseroForm({ 
  onSuccess, 
  onCancel, 
  isEdit = false,
  userId,
  defaultValues 
}: MeseroFormProps) {
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
        await userService.updateUser(userId, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          phone_number: formData.telefono,
        })

        if (avatarFile) {
          const mesero = await userService.getMeseroByUsuarioId(userId)
          if (mesero) {
            await userService.uploadMeseroFoto(avatarFile, mesero.id, userId)
          }
        }

        toast({
          title: '✅ Mesero actualizado',
          description: `${formData.nombre} ${formData.apellido} ha sido actualizado`,
          variant: 'success'
        })
        onSuccess()
        return
      }

      const result = await userService.createFullUser({
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        rol: 'mesero',
        telefono: formData.telefono,
      })

      if (avatarFile && result.userId) {
        try {
          const mesero = await userService.getMeseroByUsuarioId(result.userId)
          if (mesero) {
            await userService.uploadMeseroFoto(avatarFile, mesero.id, result.userId)
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
        }
      }

      const nipMsg = result.nip ? `\nNIP generado automáticamente: ${result.nip}` : ''

      toast({
        title: '✅ Mesero creado',
        description: `${formData.nombre} ${formData.apellido} ha sido creado correctamente${nipMsg}`,
        variant: 'success'
      })

      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar el mesero',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-orange-100">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt="Preview" />
            ) : null}
            <AvatarFallback className="text-3xl bg-orange-600 text-white">
              {formData.nombre && formData.apellido 
                ? getInitials()
                : <Camera className="h-10 w-10" />}
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
            className="absolute -bottom-1 -right-1 p-1.5 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors shadow-lg"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
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

      {!isEdit && (
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
      )}

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
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? 'Guardando...' : 'Creando...'}
            </>
          ) : (
            isEdit ? 'Guardar Cambios' : 'Crear Mesero'
          )}
        </Button>
      </div>
    </form>
  )
}
