'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SessionUser {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: 'admin' | 'bartender' | 'mesero'
  avatar_url?: string
  turno_activo?: boolean
  phone_number?: string
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRol, setCurrentRol] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true)
        
        // 1. Obtener el rol de la URL
        const path = window.location.pathname
        let rol = 'admin'
        if (path.includes('/bartender')) rol = 'bartender'
        else if (path.includes('/mesero')) rol = 'mesero'
        else if (path.includes('/admin')) rol = 'admin'
        
        setCurrentRol(rol)

        // 2. Obtener sesión de Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setLoading(false)
          return
        }

        if (session?.user) {
          // 3. Obtener datos completos del usuario desde la tabla usuarios
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userError) {
            console.error('Error getting user data:', userError)
            setLoading(false)
            return
          }

          if (userData) {
            // Verificar que el rol coincida con la URL
            if (userData.rol !== rol) {
              console.warn(`Rol mismatch: URL expects ${rol}, user has ${userData.rol}`)
              setLoading(false)
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
            
            setUser(sessionUser)
            setLoading(false)
            return
          }
        }

        // Si no hay sesión, user se queda null
        setUser(null)
        setLoading(false)

      } catch (error) {
        console.error('Error loading session:', error)
        setUser(null)
        setLoading(false)
      }
    }

    loadSession()
  }, [supabase])

  const login = async (email: string, password: string, rol: string): Promise<SessionUser> => {
    try {
      // 1. Iniciar sesión en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) throw error
      
      if (!data.user) {
        throw new Error('No se pudo obtener el usuario')
      }

      // 2. Obtener datos del usuario desde la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError) throw userError

      if (!userData) {
        throw new Error('Usuario no encontrado en la base de datos')
      }

      // 3. Verificar que el rol coincida
      if (userData.rol !== rol) {
        throw new Error(`No tienes permisos de ${rol}`)
      }

      // 4. Crear objeto de sesión
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

    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
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
