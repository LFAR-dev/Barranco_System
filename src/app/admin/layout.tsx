'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserProfile } from '@/components/layout/UserProfile'
import { ToastContainer } from '@/components/ui/toast-container'
import { EditProfileModal } from '@/components/admin/EditProfileModal'
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell'
import { JornadaButton } from '@/components/admin/jornada/JornadaButton'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-gray-900">BARRANCO</span>
                  <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Admin</span>
                </div>
                <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-sm">
                  <a href="/admin" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Dashboard</a>
                  <a href="/admin/bartenders" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Bartenders</a>
                  <a href="/admin/meseros" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Meseros</a>
                  <a href="/admin/caja" className="text-emerald-600 hover:text-emerald-800 transition-colors px-2 py-1 rounded-md hover:bg-emerald-50 font-medium">Caja</a>
                  <a href="/admin/users" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Usuarios</a>
                  <a href="/admin/inventory" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Inventario</a>
                  <a href="/admin/recipes" className="text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100">Recetas</a>
                  <a href="/admin/auditoria" className="text-purple-600 hover:text-purple-800 transition-colors px-2 py-1 rounded-md hover:bg-purple-50 font-medium">Auditoría</a>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <JornadaButton />
                <AdminNotificationBell />
                <UserProfile onLogout={handleLogout} onEditProfile={() => setIsProfileOpen(true)} />
              </div>
            </div>
          </div>
        </header>
        <div className="relative">{children}</div>
      </div>
      <ToastContainer />
      <EditProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onUpdate={() => {}} />
    </>
  )
}
