'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastContainer } from '@/components/ui/toast-container'
import { Loader2 } from 'lucide-react'

export default function CajaLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth('caja')
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true)
      router.push('/caja-login')
    }
  }, [user, loading, router, redirecting])

  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Cargando caja...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}
