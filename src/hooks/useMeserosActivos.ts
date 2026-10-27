'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MeseroActivo {
  usuario_id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  color_mapa: string | null
  mesa_atendiendo_id: string | null
  mesa_numero: string | null
  latitud: number | null
  longitud: number | null
  gps_activo: boolean
  gps_denegado: boolean
  ultima_actualizacion: string
  conectado: boolean
}

export interface UseMeserosActivosReturn {
  meseros: MeseroActivo[]
  loading: boolean
  recargar: () => Promise<void>
}

async function cargarMeserosDesdeDB(
  supabase: ReturnType<typeof createClient>
): Promise<MeseroActivo[]> {
  const { data, error } = await supabase
    .from('ubicaciones_meseros')
    .select(`
      usuario_id,
      mesa_atendiendo_id,
      latitud,
      longitud,
      gps_activo,
      gps_denegado,
      ultima_actualizacion,
      usuario:usuarios!usuario_id(nombre, apellido, avatar_url, activo, rol, color_mapa)
    `)

  if (error) {
    console.error('Error al cargar meseros:', error)
    return []
  }

  const mesaIds = (data || [])
    .map((m: any) => m.mesa_atendiendo_id)
    .filter(Boolean)

  let mesasMap: Record<string, string> = {}
  if (mesaIds.length > 0) {
    const { data: mesasData } = await supabase
      .from('mesas')
      .select('id, numero')
      .in('id', mesaIds)
    mesasMap = (mesasData || []).reduce((acc: any, m: any) => {
      acc[m.id] = m.numero
      return acc
    }, {})
  }

  const ahora = Date.now()
  return (data || [])
    .filter((m: any) => m.usuario?.activo && m.usuario?.rol === 'mesero')
    .map((m: any) => {
      const lastUpdate = new Date(m.ultima_actualizacion).getTime()
      const minDesdeUpdate = (ahora - lastUpdate) / 60000
      return {
        usuario_id: m.usuario_id,
        nombre: m.usuario?.nombre || '',
        apellido: m.usuario?.apellido || '',
        avatar_url: m.usuario?.avatar_url || null,
        color_mapa: m.usuario?.color_mapa || null,
        mesa_atendiendo_id: m.mesa_atendiendo_id || null,
        mesa_numero: m.mesa_atendiendo_id
          ? mesasMap[m.mesa_atendiendo_id] || null
          : null,
        latitud: m.latitud,
        longitud: m.longitud,
        gps_activo: !!m.gps_activo,
        gps_denegado: !!m.gps_denegado,
        ultima_actualizacion: m.ultima_actualizacion,
        conectado: minDesdeUpdate < 5
      }
    })
}

/**
 * Hook principal. Se suscribe a realtime y hace fetch.
 * Usa canal unico por instancia para evitar colisiones.
 */
export function useMeserosActivos(): UseMeserosActivosReturn {
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const cargarMeseros = useCallback(async () => {
    try {
      const data = await cargarMeserosDesdeDB(supabase)
      setMeseros(data)
    } catch (error) {
      console.error('Error en useMeserosActivos:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    cargarMeseros()

    const channelName = `meseros_activos_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ubicaciones_meseros' },
        () => {
          cargarMeseros()
        }
      )
      .subscribe()

    channelRef.current = channel

    const interval = setInterval(cargarMeseros, 60000)

    return () => {
      clearInterval(interval)
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // silencioso
        }
        channelRef.current = null
      }
    }
  }, [cargarMeseros, supabase])

  return { meseros, loading, recargar: cargarMeseros }
}

/**
 * Hook opcional. Si enabled=false, NO se suscribe ni hace fetch.
 * Util cuando el componente padre ya tiene los meseros
 * y los pasa como prop al hijo.
 */
export function useMeserosActivosOpcional(
  enabled: boolean
): UseMeserosActivosReturn {
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [loading, setLoading] = useState(enabled)
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const cargarMeseros = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await cargarMeserosDesdeDB(supabase)
      setMeseros(data)
    } catch (error) {
      console.error('Error en useMeserosActivosOpcional:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, enabled])

  useEffect(() => {
    if (!enabled) {
      setMeseros([])
      setLoading(false)
      return
    }

    cargarMeseros()

    const channelName = `meseros_activos_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ubicaciones_meseros' },
        () => {
          cargarMeseros()
        }
      )
      .subscribe()

    channelRef.current = channel

    const interval = setInterval(cargarMeseros, 60000)

    return () => {
      clearInterval(interval)
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch {
          // silencioso
        }
        channelRef.current = null
      }
    }
  }, [cargarMeseros, supabase, enabled])

  return { meseros, loading, recargar: cargarMeseros }
}
