'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SessionUser {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: 'admin' | 'bartender' | 'mesero' | 'caja'
  avatar_url?: string
  turno_activo?: boolean
  phone_number?: string
}

export function useSession(rolForzado?: string) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRol, setCurrentRol] = useState<string | null>(null)

  // Crear el cliente UNA sola vez con el rol correcto
  const supabase = useMemo(() => createClient(rolForzado), [rolForzado])

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      try {
        // Detectar rol esperado según la URL
        const path = window.location.pathname
        let expectedRol: string | null = rolForzado || null
        
        if (!expectedRol) {
          if (path.startsWith('/admin') && !path.includes('-login')) expectedRol = 'admin'
          else if (path.startsWith('/bartender') && !path.includes('-login')) expectedRol = 'bartender'
          else if (path.startsWith('/mesero') && !path.includes('-login')) expectedRol = 'mesero'
          else if (path.startsWith('/caja') && !path.includes('-login')) expectedRol = 'caja'
        }

        if (isMounted) setCurrentRol(expectedRol)

        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        const { data: userData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!userData) {
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        const sessionUser: SessionUser = {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          rol: userData.rol,
          avatar_url: userData.avatar_url || null,
          turno_activo: userData.turno_activo || false,
          phone_number: userData.phone_number || ''
        }
        
        if (isMounted) {
          setUser(sessionUser)
          setLoading(false)
        }

      } catch (error) {
        console.error('Error al cargar sesión:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (!isMounted) return
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentRol(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' && session) {
        loadSession()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, rolForzado])

  const login = async (email: string, password: string, rol: string): Promise<SessionUser> => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    
    if (signInError) throw new Error(signInError.message)
    if (!data.user) throw new Error('No se pudo obtener el usuario')

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (userError || !userData) {
      await supabase.auth.signOut()
      throw new Error('Usuario no encontrado en la base de datos')
    }

    if (userData.rol !== rol) {
      await supabase.auth.signOut()
      throw new Error(`No tienes permisos de ${rol}`)
    }

    if (!userData.activo) {
      await supabase.auth.signOut()
      throw new Error('Usuario desactivado. Contacta al administrador.')
    }

    const sessionUser: SessionUser = {
      id: userData.id,
      email: userData.email,
      nombre: userData.nombre || '',
      apellido: userData.apellido || '',
      rol: userData.rol,
      avatar_url: userData.avatar_url || null,
      turno_activo: userData.turno_activo || false,
      phone_number: userData.phone_number || ''
    }

    setUser(sessionUser)
    setCurrentRol(rol)

    return sessionUser
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setUser(null)
      setCurrentRol(null)
    }
  }

  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.rol) : false
  }

  return { 
    user, 
    loading, 
    login, 
    logout, 
    hasRole, 
    currentRol 
  }
}
