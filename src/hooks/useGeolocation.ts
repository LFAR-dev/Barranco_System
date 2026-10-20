'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type GPSEstado = 'inicial' | 'solicitando' | 'activo' | 'denegado' | 'error' | 'no_soportado'

interface UseGeolocationReturn {
  estado: GPSEstado
  latitud: number | null
  longitud: number | null
  precision: number | null
  ultimaActualizacion: Date | null
  error: string | null
  solicitar: () => void
  detener: () => void
}

interface UseGeolocationProps {
  usuarioId?: string
  autoStart?: boolean
  updateInterval?: number // ms
}

export function useGeolocation({
  usuarioId,
  autoStart = false,
  updateInterval = 30000
}: UseGeolocationProps = {}): UseGeolocationReturn {
  const [estado, setEstado] = useState<GPSEstado>('inicial')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [precision, setPrecision] = useState<number | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const supabase = createClient()

  // Guardar en BD
  const guardarUbicacion = useCallback(async (
    lat: number,
    lng: number,
    prec: number
  ) => {
    if (!usuarioId) return
    try {
      await supabase
        .from('ubicaciones_meseros')
        .upsert({
          usuario_id: usuarioId,
          latitud: lat,
          longitud: lng,
          precision_metros: prec,
          gps_activo: true,
          gps_denegado: false,
          ultima_actualizacion: new Date().toISOString()
        }, { onConflict: 'usuario_id' })
    } catch (e) {
      console.error('[GPS] Error al guardar:', e)
    }
  }, [supabase, usuarioId])

  const guardarDenegado = useCallback(async () => {
    if (!usuarioId) return
    try {
      await supabase
        .from('ubicaciones_meseros')
        .upsert({
          usuario_id: usuarioId,
          gps_activo: false,
          gps_denegado: true,
          ultima_actualizacion: new Date().toISOString()
        }, { onConflict: 'usuario_id' })
    } catch (e) {
      console.error('[GPS] Error al guardar denegado:', e)
    }
  }, [supabase, usuarioId])

  const detener = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setEstado('inicial')
  }, [])

  const solicitar = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setEstado('no_soportado')
      setError('Tu dispositivo no soporta geolocalización')
      return
    }

    setEstado('solicitando')
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLatitud(latitude)
        setLongitud(longitude)
        setPrecision(accuracy)
        setUltimaActualizacion(new Date())
        setEstado('activo')
        setError(null)
        guardarUbicacion(latitude, longitude, accuracy)
      },
      (err) => {
        console.error('[GPS] Error:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setEstado('denegado')
          setError('Permiso de ubicación denegado')
          guardarDenegado()
        } else {
          setEstado('error')
          setError(err.message || 'Error al obtener ubicación')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    )
  }, [guardarUbicacion, guardarDenegado])

  // Auto-start si se solicita
  useEffect(() => {
    if (autoStart && usuarioId) {
      solicitar()
    }
    return () => {
      detener()
    }
  }, [autoStart, usuarioId])

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    estado,
    latitud,
    longitud,
    precision,
    ultimaActualizacion,
    error,
    solicitar,
    detener
  }
}
