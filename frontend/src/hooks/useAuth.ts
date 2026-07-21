'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        setUserData(data)
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          setUserData(data)
        } else {
          setUserData(null)
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (data.user) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      setUserData(userData)
    }
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setUser(null)
    setUserData(null)
    return { error }
  }

  const logout = async () => {
    await signOut()
    router.push('/')
  }

  return { user, userData, loading, signIn, signOut, logout }
}
