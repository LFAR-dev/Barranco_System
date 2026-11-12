'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sesionCajaService, SesionCaja } from '@/lib/services/sesionCajaService'

// ============================================================
// HOOK: estado de la sesion de caja abierta
// Sin sesion de caja, nadie puede vender (ni cajero, ni mesero, ni bartender).
// Se actualiza en tiempo real via Realtime + polling de respaldo.
// ============================================================

export function useSesionCaja() {
  const supabase = createClient()
  const [sesion, setSesion] = useState<SesionCaja | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)
  const pollingRef = useRef<any>(null)

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

  // Carga inicial + Realtime + polling de respaldo
  useEffect(() => {
    cargar()

    const channelName = `sesion_caja_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sesiones_caja' },
        () => {
          console.log('[useSesionCaja] Evento Realtime recibido')
          cargar()
        }
      )
      .subscribe((status) => {
        console.log('[useSesionCaja] Status Realtime:', status)
      })

    channelRef.current = channel

    // Polling de respaldo cada 15s mientras no haya sesion abierta
    pollingRef.current = setInterval(() => {
      cargar()
    }, 15000)

    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current) } catch {}
        channelRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
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
