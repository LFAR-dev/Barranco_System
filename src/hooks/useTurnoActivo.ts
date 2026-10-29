'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseTurnoActivoReturn {
  activo: boolean | null
  loading: boolean
  jornadaId: string | null
  recargar: () => Promise<void>
}

/**
 * Hook que verifica si el usuario actual esta activo en el turno.
 *
 * activo = null: cargando
 * activo = true: esta activo
 * activo = false: NO esta activo
 *
 * Admin siempre activo. Operativos consultan turno_trabajadores.
 */
export function useTurnoActivo(): UseTurnoActivoReturn {
  const [activo, setActivo] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [jornadaId, setJornadaId] = useState<string | null>(null)
  const supabase = createClient()

  const verificar = async () => {
    setLoading(true)
    try {
      // getSession es mas rapido que getUser (usa cache local)
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user

      if (!user) {
        setActivo(false)
        setJornadaId(null)
        return
      }

      // Ver rol
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()

      // Admin siempre esta activo
      if (userData?.rol === 'admin') {
        setActivo(true)
        const { data: jornada } = await supabase
          .from('jornadas')
          .select('id')
          .eq('estado', 'activa')
          .maybeSingle()
        setJornadaId(jornada?.id || null)
        return
      }

      // Operativos: obtener jornada activa
      const { data: jornada } = await supabase
        .from('jornadas')
        .select('id')
        .eq('estado', 'activa')
        .maybeSingle()

      if (!jornada) {
        setActivo(false)
        setJornadaId(null)
        return
      }

      setJornadaId(jornada.id)

      // Ver si esta en turno_trabajadores
      const { data: registro, error: turnoError } = await supabase
        .from('turno_trabajadores')
        .select('activo_en_turno')
        .eq('jornada_id', jornada.id)
        .eq('usuario_id', user.id)
        .maybeSingle()

      if (turnoError) {
        console.error('[useTurnoActivo] Error consultando turno:', turnoError)
      }

      setActivo(registro?.activo_en_turno === true)
    } catch (error) {
      console.error('Error al verificar turno activo:', error)
      setActivo(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verificar()

    // Polling cada 60s
    const interval = setInterval(verificar, 60000)

    return () => clearInterval(interval)
  }, [])

  return {
    activo,
    loading,
    jornadaId,
    recargar: verificar
  }
}
