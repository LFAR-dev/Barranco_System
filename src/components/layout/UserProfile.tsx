'use client'

import { useState, useRef, useEffect } from 'react'
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
  Loader2,
  RefreshCw,
  CheckCircle
} from 'lucide-react'
import { userService } from '@/lib/services/userService'
import { useToast } from '@/hooks/use-toast'

interface UserProfileProps {
  onLogout?: () => void
  onEditProfile?: () => void
}

export function UserProfile({ onLogout, onEditProfile }: UserProfileProps) {
  const { user, loading: authLoading } = useAuth()
  const { greeting } = useGreeting()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!user) {
      setLoading(false)
      setError('No hay usuario autenticado')
      return
    }

    loadUserData()
  }, [user, authLoading])

  const loadUserData = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const data = await userService.getById(user.id)
      if (!data) {
        throw new Error('No se encontraron datos del usuario')
      }
      setUserData(data)
    } catch (error: any) {
      console.error('Error loading user data:', error)
      setError(error.message || 'Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userData) return

    setUploading(true)
    setUploadSuccess(false)
    
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
      
      await loadUserData()
      
      toast({
        title: '✅ Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada correctamente',
        variant: 'success'
      })
      
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
      
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast({
        title: 'Error',
        description: error.message || 'Error al subir la foto. Intenta de nuevo.',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleEditProfileClick = () => {
    setIsDropdownOpen(false)
    if (onEditProfile) {
      setTimeout(() => {
        onEditProfile()
      }, 100)
    }
  }

  const handleLogoutClick = async () => {
    setIsDropdownOpen(false)
    if (onLogout) {
      setTimeout(async () => {
        await onLogout()
      }, 100)
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
    return `${userData.nombre} ${userData.apellido}`.trim() || 'Usuario'
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-3 px-3 py-1">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
        <div className="hidden md:block">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        </div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="flex items-center gap-3 px-3 py-1">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <User className="h-5 w-5 text-red-500" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-red-700">Error de perfil</p>
          <p className="text-xs text-red-500 max-w-[150px] truncate">
            {error || 'Sin datos'}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-600 hover:text-red-700"
          onClick={loadUserData}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reintentar
        </Button>
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
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 gap-2 px-3 hover:bg-gray-100 rounded-full">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <AvatarWithViewer
                  src={getAvatarUrl()}
                  fallback={getInitials()}
                  size="md"
                />
                {uploadSuccess && (
                  <div className="absolute -top-1 -right-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
                <div 
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
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
        <DropdownMenuContent align="end" className="w-64" sideOffset={5}>
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
            disabled={uploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>{uploading ? 'Subiendo...' : 'Cambiar foto de perfil'}</span>
            {uploadSuccess && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogoutClick} className="cursor-pointer text-red-600 hover:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
