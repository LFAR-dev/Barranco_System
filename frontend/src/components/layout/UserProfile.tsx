'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import { AvatarWithViewer } from '@/components/ui/AvatarWithViewer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  User, 
  LogOut, 
  Camera,
  Edit,
  Key
} from 'lucide-react'
import { userService } from '@/lib/services/userService'

interface UserProfileProps {
  onLogout?: () => void
  onEditProfile?: () => void
  onChangePassword?: () => void
}

export function UserProfile({ onLogout, onEditProfile, onChangePassword }: UserProfileProps) {
  const { userData, logout } = useAuth()
  const { greeting, timeIcon } = useGreeting()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userData) return

    setUploading(true)
    try {
      let avatarUrl
      if (userData.rol === 'bartender') {
        const bartender = await userService.getBartenderByUsuarioId(userData.id)
        if (bartender) {
          avatarUrl = await userService.uploadBartenderFoto(file, bartender.id, userData.id)
        }
      } else if (userData.rol === 'mesero') {
        const mesero = await userService.getMeseroByUsuarioId(userData.id)
        if (mesero) {
          avatarUrl = await userService.uploadMeseroFoto(file, mesero.id, userData.id)
        }
      } else {
        avatarUrl = await userService.uploadAdminFoto(file, userData.id)
      }
      
      window.location.reload()
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Error al subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInitials = () => {
    if (!userData) return 'U'
    const nombre = userData.nombre || ''
    const apellido = userData.apellido || ''
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const getFullName = () => {
    if (!userData) return 'Usuario'
    return `${userData.nombre} ${userData.apellido}`
  }

  const getFirstName = () => {
    if (!userData) return 'Usuario'
    return userData.nombre || 'Usuario'
  }

  const getRolLabel = () => {
    if (!userData) return ''
    const roles: Record<string, string> = {
      admin: 'Administrador',
      bartender: 'Bartender',
      mesero: 'Mesero'
    }
    return roles[userData.rol] || userData.rol
  }

  const getAvatarUrl = () => {
    if (userData?.avatar_url) return userData.avatar_url
    return null
  }

  const handleLogout = async () => {
    await logout()
    if (onLogout) onLogout()
  }

  if (!userData) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="hidden md:block">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadPhoto}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 gap-2 px-3 hover:bg-gray-100 rounded-full">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <AvatarWithViewer
                  src={getAvatarUrl()}
                  fallback={getInitials()}
                  size="md"
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {greeting}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {getFirstName()}
                </p>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{getFullName()}</p>
              <p className="text-xs leading-none text-gray-500">{getRolLabel()}</p>
              <p className="text-xs leading-none text-gray-400">{userData.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>Cambiar foto de perfil</span>
            {uploading && <span className="ml-2 text-xs text-gray-400">Subiendo...</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEditProfile} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onChangePassword} className="cursor-pointer">
            <Key className="mr-2 h-4 w-4" />
            <span>Cambiar Contraseña</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
