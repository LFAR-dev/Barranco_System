'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AppSidebar, SidebarSection } from './AppSidebar'

interface AppShellProps {
  rol: 'admin' | 'bartender' | 'mesero' | 'caja'
  sections: SidebarSection[]
  children: React.ReactNode
  // Contenido del header a la derecha: campana, jornada button, etc.
  headerRight?: React.ReactNode
  // Contenido del header a la izquierda (opcional). Por defecto: logo + rol
  headerLeft?: React.ReactNode
  // Slot para agregar contenido al sidebar (por ej., toggle de disponibilidad)
  sidebarHeaderSlot?: React.ReactNode
  sidebarFooterSlot?: React.ReactNode
  // Slot extra abajo del avatar en el header (raro)
  headerExtra?: React.ReactNode
}

export function AppShell({
  rol,
  sections,
  children,
  headerRight,
  headerLeft,
  sidebarHeaderSlot,
  sidebarFooterSlot,
  headerExtra
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR DESKTOP */}
      <div className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        <AppSidebar
          rol={rol}
          sections={sections}
          headerSlot={sidebarHeaderSlot}
          footerSlot={sidebarFooterSlot}
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER STICKY */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="px-3 sm:px-4 lg:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
              {/* IZQUIERDA: ☰ + logo (móvil) o solo título (desktop) */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Botón hamburguesa — solo móvil/tablet */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5 text-gray-700" />
                </button>

                {/* Logo — solo visible en móvil/tablet (en desktop está en sidebar) */}
                <div className="lg:hidden flex items-center gap-1.5 min-w-0">
                  {headerLeft || (
                    <>
                      <span className="text-base sm:text-lg font-bold text-gray-900 truncate">
                        BARRANCO
                      </span>
                    </>
                  )}
                </div>

                {/* En desktop, mostramos un breadcrumb / título vacío */}
                <div className="hidden lg:flex items-center gap-2 min-w-0">
                  {headerLeft}
                </div>
              </div>

              {/* DERECHA: widgets + avatar */}
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
                {headerRight}
              </div>
            </div>
            {headerExtra}
          </div>
        </header>

        {/* CONTENIDO DE LA PÁGINA */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* DRAWER MÓVIL */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-sm p-0 border-r-0"
          hideCloseButton
        >
          <AppSidebar
            rol={rol}
            sections={sections}
            onItemClick={closeMobileMenu}
            headerSlot={sidebarHeaderSlot}
            footerSlot={sidebarFooterSlot}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
