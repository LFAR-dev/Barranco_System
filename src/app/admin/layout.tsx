'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastContainer } from '@/components/ui/toast-container'
import { EditProfileModal } from '@/components/admin/EditProfileModal'
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell'
import { JornadaButton } from '@/components/admin/jornada/JornadaButton'
import { HeaderRol } from '@/components/layout/HeaderRol'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Bartenders', href: '/admin/bartenders' },
  { label: 'Meseros', href: '/admin/meseros' },
  { label: 'Caja', href: '/admin/caja', highlight: true, color: 'emerald' as const },
  { label: 'Cajas Físicas', href: '/admin/cajas' },
  { label: 'Usuarios', href: '/admin/users' },
  { label: 'Inventario', href: '/admin/inventory' },
  { label: 'Recetas', href: '/admin/recipes' },
  { label: 'Auditoría', href: '/admin/auditoria', highlight: true, color: 'purple' as const },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('admin')
  const router = useRouter()
  const { toast } = useToast()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true)
      router.push('/admin-login')
    }
  }, [user, loading, router, redirecting])

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: '👋 Sesión cerrada', description: 'Has cerrado sesión correctamente' })
      router.push('/')
    } catch (error) {
      router.push('/')
    }
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
          <Button onClick={handleLogout} className="mt-4">Cerrar Sesión</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <HeaderRol
          rol="admin"
          userName={`${user.nombre || ''} ${user.apellido || ''}`.trim()}
          userEmail={user.email}
          navItems={NAV_ITEMS}
          onLogout={handleLogout}
          onEditProfile={() => setIsProfileOpen(true)}
        >
          <JornadaButton />
          <AdminNotificationBell />
        </HeaderRol>
        <div className="relative">{children}</div>
      </div>
      <ToastContainer />
      <EditProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onUpdate={() => {}} />
    </>
  )
}
