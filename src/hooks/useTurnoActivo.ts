'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { turnoService } from '@/lib/services/turnoService'

interface UseTurnoActivoReturn {
  activo: boolean | null
  loading: boolean
  jornadaId: string | null
  recargar: () => Promise<void>
}

/**
 * Hook que verifica si el usuario actual está activo en el turno.
 * - activo = null: cargando
 * - activo = true: está activo en el turno
 * - activo = false: NO está activo
 * 
 * Solo aplica para bartender, mesero y caja.
 * Admin siempre tiene acceso (devuelve activo = true).
 */
export function useTurnoActivo(): UseTurnoActivoReturn {
  const [activo, setActivo] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [jornadaId, setJornadaId] = useState<string | null>(null)
  const supabase = createClient()

  const verificar = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
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

      // Admin siempre está activo
      if (userData?.rol === 'admin') {
        setActivo(true)
        // Obtener jornada activa para info
        const { data: jornada } = await supabase
          .from('jornadas')
          .select('id')
          .eq('estado', 'activa')
          .maybeSingle()
        setJornadaId(jornada?.id || null)
        return
      }

      // Obtener jornada activa
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

      // Ver si está en turno_trabajadores
      const { data: registro } = await supabase
        .from('turno_trabajadores')
        .select('activo_en_turno')
        .eq('jornada_id', jornada.id)
        .eq('usuario_id', user.id)
        .maybeSingle()

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
