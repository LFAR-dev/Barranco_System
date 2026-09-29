'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, User, Camera, Loader2, CheckCircle, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AvatarWithViewer } from '@/components/ui/AvatarWithViewer'
import { userService } from '@/lib/services/userService'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { useAuth } from '@/hooks/useAuth'
import { useGreeting } from '@/hooks/useGreeting'
import { useToast } from '@/hooks/use-toast'
import { escucharEventosJornada } from '@/lib/events/jornadaEvents'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Rol = 'admin' | 'bartender' | 'mesero' | 'caja'

interface NavItem {
  label: string
  href: string
  highlight?: boolean
  color?: 'blue' | 'emerald' | 'purple' | 'gray'
}

interface HeaderRolProps {
  rol: Rol
  navItems?: NavItem[]
  onLogout: () => void
  onSalirTurno?: () => void
  onEditProfile?: () => void
  onJornadaClick?: () => void
  children?: React.ReactNode
}

const rolColors: Record<Rol, { bg: string; text: string; label: string; avatarBg: string }> = {
  admin: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Admin', avatarBg: 'bg-blue-600' },
  bartender: { bg: 'bg-green-100', text: 'text-green-600', label: 'Bartender', avatarBg: 'bg-green-600' },
  mesero: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mesero', avatarBg: 'bg-orange-600' },
  caja: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Caja', avatarBg: 'bg-emerald-600' },
}

export function HeaderRol({
  rol,
  navItems = [],
  onLogout,
  onSalirTurno,
  onEditProfile,
  onJornadaClick,
  children
}: HeaderRolProps) {
  const { user } = useAuth()
  const { greeting } = useGreeting()
  const { toast } = useToast()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [jornada, setJornada] = useState<Jornada | null>(null)
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

      await loadUserData()
      toast({
        title: '✅ Foto actualizada',
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
    if (nombre || apellido) {
      return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
    }
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
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    if (onEditProfile) setTimeout(() => onEditProfile(), 150)
  }

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    setTimeout(() => onLogout(), 150)
  }

  const handleSalirTurnoClick = () => {
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    if (onSalirTurno) setTimeout(() => onSalirTurno(), 150)
  }

  const handleJornadaClick = () => {
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    if (onJornadaClick) setTimeout(() => onJornadaClick(), 150)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
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

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-shrink-0">
              <a href={`/${rol}`} className="flex items-center">
                <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight">
                  BARRANCO
                </span>
                <span className={`ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-semibold ${colores.text} ${colores.bg} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap`}>
                  {colores.label}
                </span>
              </a>

              {navItems.length > 0 && (
                <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 text-sm">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`transition-colors px-2 py-1 rounded-md hover:bg-gray-100 whitespace-nowrap ${
                        item.highlight
                          ? item.color === 'emerald'
                            ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 font-medium'
                            : item.color === 'purple'
                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-50 font-medium'
                            : 'text-gray-900 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
              {children && (
                <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
                  {children}
                </div>
              )}

              <div className="hidden sm:block">
                <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
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
                              handleAvatarClick()
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
                  <DropdownMenuContent align="end" className="w-64" sideOffset={5}>
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

                    {/* SECCIÓN JORNADA — solo admin */}
                    {esAdmin && (
                      <>
                        {jornada ? (
                          <DropdownMenuItem
                            onClick={handleJornadaClick}
                            className="cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                            <div className="flex-1">
                              <p className="text-xs font-medium">Jornada activa</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-[160px]">
                                {jornada.nombre}
                              </p>
                            </div>
                            <XCircle className="h-4 w-4 text-red-500" />
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
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleAvatarClick}
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

                    {esAdmin ? (
                      <DropdownMenuItem
                        onClick={handleLogoutClick}
                        className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
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
              </div>

              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="max-w-sm w-[92vw] sm:w-[400px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-br from-gray-50 to-white">
            <DialogTitle className="flex items-center gap-3">
              <div className="relative group">
                {loadingUser ? (
                  <div className={`h-12 w-12 rounded-full ${colores.avatarBg} flex items-center justify-center`}>
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                ) : (
                  <AvatarWithViewer
                    src={userData?.avatar_url}
                    fallback={getInitials()}
                    size="lg"
                  />
                )}
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white border-2 border-gray-200 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Cambiar foto"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 text-gray-600 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 text-gray-600" />
                  )}
                </button>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {getFullName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userData?.email || user?.email || ''}
                </p>
                <p className={`text-[10px] font-medium mt-0.5 ${colores.text}`}>
                  {getRolLabel()}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 space-y-1">
            {children && (
              <div className="pb-2 border-b mb-2 flex flex-wrap gap-2">
                {children}
              </div>
            )}

            {navItems.length > 0 && (
              <div className="space-y-0.5 pb-2 border-b mb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 py-1 font-semibold">
                  Navegación
                </p>
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 py-1 font-semibold">
                Cuenta
              </p>

              {esAdmin && (
                <>
                  {jornada ? (
                    <button
                      onClick={handleJornadaClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">Jornada activa</p>
                        <p className="text-[10px] text-gray-500 truncate">{jornada.nombre}</p>
                      </div>
                      <span className="text-[10px] text-red-600 font-medium">Cerrar →</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleJornadaClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <Calendar className="h-4 w-4" />
                      Abrir jornada
                    </button>
                  )}
                </>
              )}

              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {uploading ? 'Subiendo foto...' : 'Cambiar foto de perfil'}
                {uploadSuccess && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
              </button>

              {onEditProfile && (
                <button
                  onClick={handleEditProfileClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                >
                  <User className="h-4 w-4" />
                  Editar perfil
                </button>
              )}

              {esAdmin ? (
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              ) : (
                <button
                  onClick={handleSalirTurnoClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Salir del turno
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
