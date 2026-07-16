'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'

const userSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  phone_number: z.string().optional(),
  pin: z.string().min(6, 'El PIN debe tener al menos 6 caracteres'),
  rol: z.string().min(1, 'El rol es requerido'),
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  user?: any
  rol?: 'bartender' | 'mesero'
  onSuccess: () => void
  onCancel: () => void
}

export default function UserForm({ user, rol = 'bartender', onSuccess, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!user

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: user?.nombre || user?.usuarios?.nombre || '',
      apellido: user?.apellido || user?.usuarios?.apellido || '',
      email: user?.email || user?.usuarios?.email || '',
      phone_number: user?.phone_number || user?.usuarios?.phone_number || '',
      pin: user?.pin || '123456',
      rol: user?.rol || rol,
    }
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const supabase = createClient()
      const path = `avatars/${userId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('barranco-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('barranco-images')
        .getPublicUrl(path)
      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    setError('')
    try {
      // Obtener el ID del usuario (para edición)
      const userId = isEditing ? (user.id || user.usuario_id) : null
      
      // Si es edición, verificar que el usuario existe
      if (isEditing && userId) {
        const existing = await userService.getById(userId)
        if (!existing) {
          throw new Error('El usuario no existe en la base de datos')
        }
        
        // Actualizar
        const updateData = { ...data }
        if (avatarFile) {
          const url = await uploadImage(avatarFile, userId)
          if (url) updateData.avatar_url = url
        }
        
        const result = await userService.update(userId, updateData)
        if (result) {
          alert('Usuario actualizado correctamente')
          onSuccess()
        }
      } else {
        // Crear nuevo usuario
        const userData = { ...data }
        const result = await userService.create(userData)
        if (result) {
          // Si hay imagen, subirla
          if (avatarFile && result.id) {
            const url = await uploadImage(avatarFile, result.id)
            if (url) {
              await userService.update(result.id, { avatar_url: url })
            }
          }
          alert('Usuario creado correctamente')
          onSuccess()
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error)
      setError(error.message || 'Error al guardar el usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Avatar */}
      <div className="space-y-2">
        <Label>Foto de perfil</Label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border-2 border-dashed rounded-full flex items-center justify-center overflow-hidden bg-gray-50">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {avatarPreview && (
              <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => {
                setAvatarPreview('')
                setAvatarFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido *</Label>
          <Input id="apellido" {...register('apellido')} />
          {errors.apellido && <p className="text-xs text-red-500">{errors.apellido.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Teléfono</Label>
        <Input id="phone_number" placeholder="+52 1234567890" {...register('phone_number')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">PIN * (mínimo 6 caracteres)</Label>
        <Input 
          id="pin" 
          type="password" 
          placeholder="123456" 
          minLength={6}
          {...register('pin')} 
        />
        {errors.pin && <p className="text-xs text-red-500">{errors.pin.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol">Rol</Label>
        <Select 
          value={watch('rol')} 
          onValueChange={(value) => setValue('rol', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bartender">Bartender</SelectItem>
            <SelectItem value="mesero">Mesero</SelectItem>
          </SelectContent>
        </Select>
        {errors.rol && <p className="text-xs text-red-500">{errors.rol.message}</p>}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
