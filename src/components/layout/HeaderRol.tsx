'use client'

import { useState } from 'react'
import { Menu, X, LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  userName?: string
  userEmail?: string
  navItems?: NavItem[]
  onLogout: () => void
  onEditProfile?: () => void
  children?: React.ReactNode  // Widgets adicionales (toggle, campana, jornada, etc)
}

const rolColors: Record<Rol, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Admin' },
  bartender: { bg: 'bg-green-100', text: 'text-green-600', label: 'Bartender' },
  mesero: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mesero' },
  caja: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Caja' },
}

export function HeaderRol({
  rol,
  userName,
  userEmail,
  navItems = [],
  onLogout,
  onEditProfile,
  children
}: HeaderRolProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const colores = rolColors[rol]
  const inicial = userName?.charAt(0).toUpperCase() || rol.charAt(0).toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo + Rol */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-shrink-0">
            <div className="flex items-center">
              <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight">
                BARRANCO
              </span>
              <span className={`ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-semibold ${colores.text} ${colores.bg} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap`}>
                {colores.label}
              </span>
            </div>

            {/* Nav Desktop */}
            {navItems.length > 0 && (
              <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm">
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

          {/* Widgets + User */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
            {/* Widgets custom (jornada, toggle, campana, etc) - ocultos en móvil si son muchos */}
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
              {children}
            </div>

            {/* Avatar + Logout Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="cursor-pointer h-8 w-8 sm:h-9 sm:w-9">
                <AvatarFallback className={`${colores.text.replace('text-', 'bg-').replace('-600', '-600')} text-white text-xs sm:text-sm`}>
                  {inicial}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-600 hover:text-gray-900 hidden md:flex"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden lg:inline">Salir</span>
              </Button>
            </div>

            {/* Menu Hamburguesa - siempre visible */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menú"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile / Dialog */}
      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="max-w-sm w-[90vw] p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${colores.bg} ${colores.text} font-bold`}>
                    {inicial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userName || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userEmail || ''}
                  </p>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 space-y-1">
            {/* Widgets custom para móvil */}
            {children && (
              <div className="pb-2 border-b mb-2 flex flex-wrap gap-2">
                {children}
              </div>
            )}

            {/* Nav items */}
            {navItems.length > 0 && (
              <div className="space-y-0.5 pb-2 border-b mb-2">
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

            {/* Acciones */}
            {onEditProfile && (
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  onEditProfile()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                <User className="h-4 w-4" />
                Editar perfil
              </button>
            )}

            <button
              onClick={() => {
                setIsMenuOpen(false)
                onLogout()
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
