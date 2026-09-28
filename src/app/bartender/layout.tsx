'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastContainer } from '@/components/ui/toast-container'
import { Loader2 } from 'lucide-react'

export default function BartenderLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth('bartender')
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true)
      router.push('/bartender-login')
    }
  }, [user, loading, router, redirecting])

  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
          <p className="text-gray-500">Cargando panel...</p>
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
