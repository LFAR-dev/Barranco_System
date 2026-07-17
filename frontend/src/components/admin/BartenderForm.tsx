'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, Mail, Lock, User, Calendar, Camera } from 'lucide-react'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'

const bartenderSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  pin: z.string().min(4, 'El PIN debe tener al menos 4 dígitos').max(6, 'El PIN debe tener máximo 6 dígitos'),
  telefono: z.string().optional(),
  fecha_contratacion: z.string().optional(),
})

type BartenderFormData = z.infer<typeof bartenderSchema>

interface BartenderFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function BartenderForm({ onSuccess, onCancel }: BartenderFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<BartenderFormData>({
    resolver: zodResolver(bartenderSchema),
    defaultValues: {
      pin: '1234',
    }
  })

  const onSubmit = async (data: BartenderFormData) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await userService.createFullUser({
        email: data.email,
        password: data.password,
        nombre: data.nombre,
        apellido: data.apellido,
        rol: 'bartender',
        pin: data.pin,
        telefono: data.telefono,
        fecha_contratacion: data.fecha_contratacion,
      })

      setSuccess('✅ Bartender creado exitosamente')
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'Error al crear el bartender')
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="bartender@barranco.com" className="pl-9" {...register('email')} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN de acceso *</Label>
              <Input id="pin" type="text" placeholder="1234" maxLength={6} {...register('pin')} />
              {errors.pin && <p className="text-xs text-red-500">{errors.pin.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" placeholder="+52 123 456 7890" {...register('telefono')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_contratacion">Fecha de contratación</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input id="fecha_contratacion" type="date" className="pl-9" {...register('fecha_contratacion')} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Creando...' : 'Crear Bartender'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
