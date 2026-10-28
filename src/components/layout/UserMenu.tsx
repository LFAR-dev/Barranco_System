'use client'

import { useState, useRef, useEffect } from 'react'
import {
  User, Camera, Loader2, CheckCircle, LogOut,
  Calendar, CheckCircle2, XCircle, Lock, AlertTriangle, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarWithViewer } from '@/components/ui/AvatarWithViewer'
import { userService } from '@/lib/services/userService'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import { useToast } from '@/hooks/use-toast'
import { escucharEventosJornada } from '@/lib/events/jornadaEvents'
import { NotificationSoundToggle } from '@/components/shared/NotificationSoundToggle'
import { GestionPersonalJornadaModal } from '@/components/admin/jornada/GestionPersonalJornadaModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Rol = 'admin' | 'bartender' | 'mesero' | 'caja'

interface UserMenuProps {
  rol: Rol
  onLogout: () => void
  onSalirTurno?: () => void
  onEditProfile?: () => void
  onJornadaClick?: () => void
  onCerrarTurnoClick?: () => void
}

const rolColors: Record<Rol, { bg: string; text: string; label: string; avatarBg: string }> = {
  admin: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Admin', avatarBg: 'bg-blue-600' },
  bartender: { bg: 'bg-green-100', text: 'text-green-600', label: 'Bartender', avatarBg: 'bg-green-600' },
  mesero: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mesero', avatarBg: 'bg-orange-600' },
  caja: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Caja', avatarBg: 'bg-emerald-600' },
}

export function UserMenu({
  rol,
  onLogout,
  onSalirTurno,
  onEditProfile,
  onJornadaClick,
  onCerrarTurnoClick
}: UserMenuProps) {
  const { user } = useAuth()
  const { greeting } = useGreeting()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [isGestionPersonalOpen, setIsGestionPersonalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const colores = rolColors[rol]
  const esAdmin = rol === 'admin'

  useEffect(() => {
    if (user?.id) {
      loadUserData()
    }
  }, [user?.id])

  useEffect(() => {
    if (esAdmin) {
      cargarJornada()
      const interval = setInterval(cargarJornada, 60000)
      const cleanup = escucharEventosJornada(cargarJornada)
      return () => {
        clearInterval(interval)
        cleanup()
      }
    }
  }, [esAdmin])

  const loadUserData = async () => {
    if (!user?.id) return
    try {
      const data = await userService.getById(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  const cargarJornada = async () => {
    try {
      const data = await jornadaService.getJornadaActual()
      setJornada(data)
    } catch (error) {
      console.error('Error al cargar jornada:', error)
    }
  }

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userData) return

    setUploading(true)
    setUploadSuccess(false)

    try {
      if (userData.rol === 'bartender') {
        const bartender = await userService.getBartenderByUsuarioId(userData.id)
        if (bartender) {
          await userService.uploadBartenderFoto(file, bartender.id, userData.id)
        }
      } else if (userData.rol === 'mesero') {
        const mesero = await userService.getMeseroByUsuarioId(userData.id)
        if (mesero) {
          await userService.uploadMeseroFoto(file, mesero.id, userData.id)
        }
      } else {
        await userService.uploadAdminFoto(file, userData.id)
      }

      // Recargar para obtener la nueva URL
      await loadUserData()
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada',
        variant: 'success'
      })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir la foto',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInitials = () => {
    if (!userData) return rol.charAt(0).toUpperCase()
    const nombre = userData.nombre || ''
    const apellido = userData.apellido || ''
    if (nombre || apellido) return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
    return rol.charAt(0).toUpperCase()
  }

  const getFullName = () => {
    if (!userData) return 'Usuario'
    const full = `${userData.nombre || ''} ${userData.apellido || ''}`.trim()
    return full || userData.email || 'Usuario'
  }

  const getFirstName = () => {
    if (!userData) return 'Usuario'
    return userData.nombre || userData.email?.split('@')[0] || 'Usuario'
  }

  const getRolLabel = () => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      bartender: 'Bartender',
      mesero: 'Mesero',
      caja: 'Cajero'
    }
    return roles[rol] || rol
  }

  const handleEditProfileClick = () => {
    setIsOpen(false)
    if (onEditProfile) setTimeout(() => onEditProfile(), 150)
  }

  const handleLogoutClick = () => {
    setIsOpen(false)
    setTimeout(() => onLogout(), 150)
  }

  const handleSalirTurnoClick = () => {
    setIsOpen(false)
    if (onSalirTurno) setTimeout(() => onSalirTurno(), 150)
  }

  const handleJornadaClick = () => {
    setIsOpen(false)
    if (onJornadaClick) setTimeout(() => onJornadaClick(), 150)
  }

  const handleCerrarTurnoClick = () => {
    setIsOpen(false)
    if (onCerrarTurnoClick) setTimeout(() => onCerrarTurnoClick(), 150)
  }

  const handleGestionPersonalClick = () => {
    setIsOpen(false)
    setTimeout(() => setIsGestionPersonalOpen(true), 150)
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

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-11 sm:h-12 gap-2 px-2 sm:px-3 hover:bg-gray-100 rounded-full"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group">
                {loadingUser ? (
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${colores.avatarBg} flex items-center justify-center`}>
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <AvatarWithViewer
                    src={userData?.avatar_url}
                    fallback={getInitials()}
                    size="md"
                  />
                )}
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
              <div className="hidden lg:block text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                  {greeting}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 leading-tight truncate max-w-[120px]">
                  {getFirstName()}
                </p>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72" sideOffset={5}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{getFullName()}</p>
              <p className="text-xs leading-none text-gray-500">{getRolLabel()}</p>
              <p className="text-xs leading-none text-gray-400 truncate">
                {userData?.email || user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* JORNADA - solo admin */}
          {esAdmin && (
            <>
              {jornada ? (
                <DropdownMenuItem
                  onClick={handleJornadaClick}
                  className="cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Jornada activa</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {jornada.nombre}
                    </p>
                  </div>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={handleJornadaClick}
                  className="cursor-pointer text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Abrir jornada</span>
                </DropdownMenuItem>
              )}

              {jornada && (
                <DropdownMenuItem
                  onClick={handleGestionPersonalClick}
                  className="cursor-pointer text-blue-700 focus:text-blue-800 focus:bg-blue-50"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Gestionar personal</p>
                    <p className="text-[10px] text-blue-600">
                      Agregar o quitar del turno
                    </p>
                  </div>
                </DropdownMenuItem>
              )}

              {jornada && onCerrarTurnoClick && (
                <DropdownMenuItem
                  onClick={handleCerrarTurnoClick}
                  className="cursor-pointer text-red-700 focus:text-red-800 focus:bg-red-50"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Cerrar turno</p>
                    <p className="text-[10px] text-red-600">
                      Bloquea todas las operaciones
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>{uploading ? 'Subiendo...' : 'Cambiar foto'}</span>
            {uploadSuccess && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
          </DropdownMenuItem>

          {onEditProfile && (
            <DropdownMenuItem onClick={handleEditProfileClick} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {user?.id && (
            <>
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Sonido</span>
                  <span className="text-[10px] text-gray-400">notificaciones</span>
                </div>
                <NotificationSoundToggle usuarioId={user.id} />
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {esAdmin ? (
            <DropdownMenuItem
              onClick={handleLogoutClick}
              className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesion</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleSalirTurnoClick}
              className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Salir del turno</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {jornada && (
        <GestionPersonalJornadaModal
          isOpen={isGestionPersonalOpen}
          onClose={() => {
            setIsGestionPersonalOpen(false)
            cargarJornada()
          }}
          jornadaId={jornada.id}
          onSuccess={cargarJornada}
        />
      )}
    </>
  )
}
