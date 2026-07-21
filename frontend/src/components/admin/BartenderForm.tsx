'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, Mail, User, Calendar, Phone, Camera, X } from 'lucide-react'
import { userService } from '@/lib/services/userService'

const bartenderSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  telefono: z.string().optional(),
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<BartenderFormData>({
    resolver: zodResolver(bartenderSchema),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const onSubmit = async (data: BartenderFormData) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await userService.createFullUser({
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        rol: 'bartender',
        telefono: data.telefono,
        avatar_file: avatarFile || undefined
      })

      const nipMsg = result.nip ? `\nNIP generado automáticamente: ${result.nip}` : ''
      setSuccess(`✅ ${data.nombre} ${data.apellido} creado exitosamente\n📧 Email: ${data.email}\n📱 Teléfono: ${data.telefono || 'No proporcionado'}${nipMsg}\n\n⚠️ El usuario está INACTIVO. Debes autorizarlo con el botón "Nuevo NIP" para que pueda acceder.`)
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 3000)

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
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm whitespace-pre-line max-h-60 overflow-y-auto">
              {success}
            </div>
          )}

          {/* Avatar */}
          <div className="space-y-2">
            <Label>Foto de perfil</Label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  {avatarPreview ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                {avatarPreview && (
                  <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => {
                    setAvatarPreview(null)
                    setAvatarFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input id="email" type="email" placeholder="bartender@barranco.com" className="pl-9" {...register('email')} />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input id="telefono" placeholder="+52 123 456 7890" className="pl-9" {...register('telefono')} />
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

          <div className="text-xs text-gray-400 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-700">📌 Creación automática:</p>
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 mt-1">
              <li>El PIN y NIP se generan automáticamente</li>
              <li>El usuario se crea en estado <strong>INACTIVO</strong></li>
              <li>El admin debe autorizarlo con el botón <strong>"Nuevo NIP"</strong></li>
              <li>El NIP expira en 24 horas</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
