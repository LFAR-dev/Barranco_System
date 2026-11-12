'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sesionCajaService, SesionCaja } from '@/lib/services/sesionCajaService'

// ============================================================
// HOOK: estado de la sesion de caja abierta
// Se actualiza en tiempo real via Realtime + polling de respaldo.
// El canal se mantiene estable entre renders (no se recrea).
// ============================================================

export function useSesionCaja() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  const [sesion, setSesion] = useState<SesionCaja | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)
  const pollingRef = useRef<any>(null)
  const mountedRef = useRef(true)

  const cargar = useCallback(async () => {
    try {
      const data = await sesionCajaService.getSesionAbierta()
      if (mountedRef.current) setSesion(data)
    } catch (error) {
      console.error('[useSesionCaja] Error al cargar:', error)
      if (mountedRef.current) setSesion(null)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    cargar()

    const channelName = `sesion_caja_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sesiones_caja' },
        () => {
          if (mountedRef.current) cargar()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (mountedRef.current) cargar()
        }
      })

    channelRef.current = channel

    // Polling de respaldo cada 10s
    pollingRef.current = setInterval(() => {
      if (mountedRef.current) cargar()
    }, 10000)

    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current) } catch {}
        channelRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    sesion,
    loading,
    haySesion: !!sesion,
    recargar: cargar
  }
}
