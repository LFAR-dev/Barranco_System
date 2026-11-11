'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sesionCajaService, SesionCaja } from '@/lib/services/sesionCajaService'

// ============================================================
// HOOK: estado de la sesion de caja abierta
// Sin sesion de caja, nadie puede vender (ni cajero, ni mesero, ni bartender).
// ============================================================

export function useSesionCaja() {
  const supabase = createClient()
  const [sesion, setSesion] = useState<SesionCaja | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const cargar = useCallback(async () => {
    try {
      const data = await sesionCajaService.getSesionAbierta()
      setSesion(data)
    } catch (error) {
      console.error('[useSesionCaja] Error al cargar:', error)
      setSesion(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()

    const channelName = `sesion_caja_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sesiones_caja' },
        () => cargar()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current) } catch {}
        channelRef.current = null
      }
    }
  }, [cargar, supabase])

  return {
    sesion,
    loading,
    haySesion: !!sesion,
    recargar: cargar
  }
}
