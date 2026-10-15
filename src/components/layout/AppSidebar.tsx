'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  label: string
  href: string
  icon?: React.ReactNode
  highlight?: boolean
  color?: 'blue' | 'emerald' | 'purple' | 'orange' | 'green' | 'gray'
}

export interface SidebarSection {
  title?: string
  items: SidebarNavItem[]
}

interface AppSidebarProps {
  rol: 'admin' | 'bartender' | 'mesero' | 'caja'
  sections: SidebarSection[]
  onItemClick?: () => void
  headerSlot?: React.ReactNode
  footerSlot?: React.ReactNode
}

const rolColors = {
  admin: {
    bg: 'from-blue-50 to-indigo-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Admin',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700',
    activeBorder: 'border-blue-500',
  },
  bartender: {
    bg: 'from-green-50 to-emerald-50',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
    label: 'Bartender',
    activeBg: 'bg-green-50',
    activeText: 'text-green-700',
    activeBorder: 'border-green-500',
  },
  mesero: {
    bg: 'from-orange-50 to-amber-50',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    label: 'Mesero',
    activeBg: 'bg-orange-50',
    activeText: 'text-orange-700',
    activeBorder: 'border-orange-500',
  },
  caja: {
    bg: 'from-emerald-50 to-teal-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Caja',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700',
    activeBorder: 'border-emerald-500',
  },
}

export function AppSidebar({
  rol,
  sections,
  onItemClick,
  headerSlot,
  footerSlot
}: AppSidebarProps) {
  const pathname = usePathname()
  const colores = rolColors[rol]

  return (
    <aside className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header del sidebar */}
      <div className={cn(
        'p-4 border-b border-gray-100 bg-gradient-to-br',
        colores.bg
      )}>
        <Link 
          href={`/${rol}`} 
          className="flex items-center gap-2"
          onClick={onItemClick}
        >
          <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            BARRANCO
          </span>
          <span className={cn(
            'text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full',
            colores.badge
          )}>
            {colores.label}
          </span>
        </Link>
        {headerSlot && (
          <div className="mt-3">
            {headerSlot}
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 py-1 font-semibold">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== `/${rol}` && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                    isActive
                      ? cn(colores.activeBg, colores.activeText, 'font-medium')
                      : 'text-gray-700 hover:bg-gray-50',
                    item.highlight && !isActive && (
                      item.color === 'emerald'
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : item.color === 'purple'
                        ? 'text-purple-600 hover:bg-purple-50'
                        : item.color === 'orange'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : ''
                    )
                  )}
                >
                  {isActive && (
                    <span className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full',
                      colores.activeBorder
                    )} />
                  )}
                  {item.icon && (
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer del sidebar */}
      {footerSlot && (
        <div className="p-3 border-t border-gray-100">
          {footerSlot}
        </div>
      )}
    </aside>
  )
}
