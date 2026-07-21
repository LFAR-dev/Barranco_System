'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, Mail, Lock, User, Briefcase, Calendar, Phone } from 'lucide-react'
import { userService } from '@/lib/services/userService'

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  rol: z.enum(['admin', 'bartender', 'mesero']),
  pin: z.string().min(4, 'El PIN debe tener al menos 4 dígitos').max(6, 'El PIN debe tener máximo 6 dígitos'),
  telefono: z.string().optional(),
  fecha_contratacion: z.string().optional(),
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultValues?: Partial<UserFormData>
  isEdit?: boolean
  userId?: string
}

export default function UserForm({ onSuccess, onCancel, defaultValues, isEdit = false, userId }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userData, setUserData] = useState<any>(null)

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: defaultValues || {
      rol: 'bartender',
      pin: '1234',
    }
  })

  const rol = watch('rol')

  useEffect(() => {
    if (isEdit && userId) {
      loadUserData()
    }
  }, [isEdit, userId])

  const loadUserData = async () => {
    try {
      const data = await userService.getById(userId!)
      if (data) {
        reset({
          email: data.email,
          nombre: data.nombre,
          apellido: data.apellido,
          rol: data.rol as any,
          pin: data.pin,
          telefono: data.phone_number || '',
        })
        setUserData(data)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isEdit && userId) {
        // Actualizar usuario existente
        await userService.updateUser(userId, {
          nombre: data.nombre,
          apellido: data.apellido,
          pin: data.pin,
          telefono: data.telefono,
          phone_number: data.telefono,
        })
        setSuccess('✅ Usuario actualizado exitosamente')
      } else {
        // Crear nuevo usuario
        await userService.createFullUser({
          email: data.email,
          password: data.password,
          nombre: data.nombre,
          apellido: data.apellido,
          rol: data.rol,
          pin: data.pin,
          telefono: data.telefono,
          fecha_contratacion: data.fecha_contratacion,
        })
        setSuccess('✅ Usuario creado exitosamente')
      }
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input id="nombre" placeholder="Juan" className="pl-9" {...register('nombre')} />
              </div>
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input id="apellido" placeholder="Pérez" className="pl-9" {...register('apellido')} />
              </div>
              {errors.apellido && <p className="text-xs text-red-500">{errors.apellido.message}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input id="email" type="email" placeholder="usuario@barranco.com" className="pl-9" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register('password')} />
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rol">Rol *</Label>
              <Select
                onValueChange={(value) => setValue('rol', value as any)}
                defaultValue={defaultValues?.rol || 'bartender'}
                disabled={isEdit && userData?.rol === 'admin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">👑 Administrador</SelectItem>
                  <SelectItem value="bartender">🍸 Bartender</SelectItem>
                  <SelectItem value="mesero">🍽️ Mesero</SelectItem>
                </SelectContent>
              </Select>
              {errors.rol && <p className="text-xs text-red-500">{errors.rol.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN de acceso *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input id="pin" type="text" placeholder="1234" maxLength={6} className="pl-9" {...register('pin')} />
              </div>
              {errors.pin && <p className="text-xs text-red-500">{errors.pin.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input id="telefono" placeholder="+52 123 456 7890" className="pl-9" {...register('telefono')} />
              </div>
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="fecha_contratacion">Fecha de contratación</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input id="fecha_contratacion" type="date" className="pl-9" {...register('fecha_contratacion')} />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-700">📌 Nota importante:</p>
            {isEdit ? (
              <p>Puedes actualizar la información del usuario. El rol de administrador no se puede cambiar.</p>
            ) : (
              <p>El usuario se creará en estado <strong>INACTIVO</strong> (excepto administradores).</p>
            )}
            <p>El administrador debe autorizarlo con el botón <strong>"Autorizar"</strong> para generar un NIP.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
