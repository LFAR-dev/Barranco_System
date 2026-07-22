'use client'

import { useSession } from './useSession'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { user, loading, login, logout: sessionLogout, hasRole, currentRol } = useSession()
  const router = useRouter()

  const redirectToRole = (rol: string) => {
    const routes: Record<string, string> = {
      admin: '/admin',
      bartender: '/bartender',
      mesero: '/mesero'
    }
    router.push(routes[rol] || '/')
  }

  const loginAs = async (email: string, password: string, rol: string) => {
    try {
      const user = await login(email, password, rol)
      redirectToRole(user.rol)
      return { success: true, user }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await sessionLogout()
    router.push('/')
  }

  return { 
    user, 
    loading, 
    login: loginAs, 
    logout, 
    hasRole, 
    currentRol 
  }
}
