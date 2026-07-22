'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserProfile } from '@/components/layout/UserProfile'
import { ToastContainer } from '@/components/ui/toast-container'
import { EditProfileModal } from '@/components/admin/EditProfileModal'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: '👋 Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
        variant: 'default'
      })
      router.push('/')
    } catch (error) {
      console.error('Error en logout:', error)
    }
  }

  const handleEditProfile = () => {
    setIsProfileOpen(true)
  }

  const handleProfileUpdate = () => {
    // Recargar datos si es necesario
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <p className="text-gray-500">Cargando panel...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (user.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="text-gray-500 mt-2">No tienes permisos de administrador</p>
          <Button onClick={handleLogout} className="mt-4">
            Volver
          </Button>
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
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">BARRANCO</span>
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Admin</span>
              </div>
              <div className="flex items-center gap-3">
                <UserProfile 
                  onLogout={handleLogout}
                  onEditProfile={handleEditProfile}
                />
              </div>
            </div>
          </div>
        </header>
        <div className="relative">
          {children}
        </div>
      </div>

      <ToastContainer />

      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
    </>
  )
}
