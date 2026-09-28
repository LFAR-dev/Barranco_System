'use client'

import { useSession } from './useSession'

export function useAuth(rolForzado?: string) {
  const { user, loading, login, logout, hasRole, currentRol } = useSession(rolForzado)

  return { 
    user, 
    loading, 
    login, 
    logout, 
    hasRole, 
    currentRol 
  }
}
