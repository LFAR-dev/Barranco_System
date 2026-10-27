'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, UserCog, Users, Wallet, DollarSign,
  Package, ClipboardList, ShieldAlert, Table
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ToastContainer } from '@/components/ui/toast-container'
import { EditProfileModal } from '@/components/admin/EditProfileModal'
import { NotificationBellUniversal } from '@/components/shared/NotificationBellUniversal'
import { JornadaButton } from '@/components/admin/jornada/JornadaButton'
import { CerrarTurnoModal } from '@/components/admin/jornada/CerrarTurnoModal'
import { AppShell } from '@/components/layout/AppShell'
import { UserMenu } from '@/components/layout/UserMenu'
import { SidebarSection } from '@/components/layout/AppSidebar'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'

const SECTIONS: SidebarSection[] = [
  {
    title: 'Operacion',
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Ventas', href: '/admin/sales', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Cajas Fisicas', href: '/admin/cajas', icon: <Wallet className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Equipo',
    items: [
      { label: 'Bartenders', href: '/admin/bartenders', icon: <UserCog className="h-4 w-4" /> },
      { label: 'Meseros', href: '/admin/meseros', icon: <Users className="h-4 w-4" /> },
      { label: 'Caja', href: '/admin/caja', icon: <Wallet className="h-4 w-4" />, highlight: true, color: 'emerald' },
      { label: 'Usuarios', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Recursos',
    items: [
      { label: 'Inventario', href: '/admin/inventory', icon: <Package className="h-4 w-4" /> },
      { label: 'Recetas', href: '/admin/recipes', icon: <ClipboardList className="h-4 w-4" /> },
      { label: 'Mesas', href: '/admin/mesas', icon: <Table className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Supervision',
    items: [
      { label: 'Auditoria', href: '/admin/auditoria', icon: <ShieldAlert className="h-4 w-4" />, highlight: true, color: 'purple' },
    ]
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('admin')
  const router = useRouter()
  const { toast } = useToast()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [jornadaActiva, setJornadaActiva] = useState<Jornada | null>(null)
  const [isCerrarTurnoOpen, setIsCerrarTurnoOpen] = useState(false)

  const jornadaId = jornadaActiva?.id || null

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true)
      router.push('/admin-login')
    }
  }, [user, loading, router, redirecting])

  useEffect(() => {
    if (user) {
      cargarJornada()
    }
  }, [user])

  const cargarJornada = async () => {
    try {
      const data = await jornadaService.getJornadaActual()
      setJornadaActiva(data)
    } catch (error) {
      console.error('Error al cargar jornada:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: 'Sesion cerrada', description: 'Has cerrado sesion correctamente' })
      router.push('/')
    } catch (error) {
      router.push('/')
    }
  }

  const handleJornadaDesdeAvatar = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jornada:abrir-modal-desde-avatar'))
    }
  }

  const handleAbrirCerrarTurno = async () => {
    try {
      const data = await jornadaService.getJornadaActual()
      if (!data) {
        toast({
          title: 'Sin jornada activa',
          description: 'Primero abre la jornada del dia',
          variant: 'destructive'
        })
        return
      }
      setJornadaActiva(data)
      setIsCerrarTurnoOpen(true)
    } catch (error) {
      console.error('Error al abrir modal de cierre:', error)
    }
  }

  const handleCerrarTurnoSuccess = () => {
    cargarJornada()
    toast({
      title: 'Turno cerrado',
      description: 'Los trabajadores fueron notificados'
    })
  }

  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <p className="text-gray-500">Cargando panel...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (user.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="text-gray-500 mt-2">No tienes permisos de administrador</p>
          <Button onClick={handleLogout} className="mt-4">Cerrar Sesion</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppShell
        rol="admin"
        sections={SECTIONS}
        headerRight={
          <>
            <NotificationBellUniversal
              rol="admin"
              usuarioId={user.id}
              jornadaId={jornadaId}
            />
            <UserMenu
              rol="admin"
              onLogout={handleLogout}
              onEditProfile={() => setIsProfileOpen(true)}
              onJornadaClick={handleJornadaDesdeAvatar}
              onCerrarTurnoClick={handleAbrirCerrarTurno}
            />
          </>
        }
      >
        {children}
      </AppShell>

      <ToastContainer />
      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={() => {}}
      />
      <div className="hidden">
        <JornadaButton />
      </div>

      {jornadaActiva && (
        <CerrarTurnoModal
          isOpen={isCerrarTurnoOpen}
          onClose={() => setIsCerrarTurnoOpen(false)}
          jornada={jornadaActiva}
          onSuccess={handleCerrarTurnoSuccess}
        />
      )}
    </>
  )
}
