'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MeseroActivo {
  usuario_id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  mesa_atendiendo_id: string | null
  mesa_numero: string | null
  latitud: number | null
  longitud: number | null
  gps_activo: boolean
  gps_denegado: boolean
  ultima_actualizacion: string
  conectado: boolean
}

export function useMeserosActivos() {
  const [meseros, setMeseros] = useState<MeseroActivo[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const cargarMeseros = useCallback(async () => {
    try {
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
          usuario:usuarios!usuario_id(nombre, apellido, avatar_url, activo, rol)
        `)

      if (error) {
        console.error('Error al cargar meseros:', error)
        return
      }

      // Obtener números de mesas si hay mesa_atendiendo_id
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
      const meserosFormateados: MeseroActivo[] = (data || [])
        .filter((m: any) => m.usuario?.activo && m.usuario?.rol === 'mesero')
        .map((m: any) => {
          const lastUpdate = new Date(m.ultima_actualizacion).getTime()
          const minDesdeUpdate = (ahora - lastUpdate) / 60000
          return {
            usuario_id: m.usuario_id,
            nombre: m.usuario.nombre || '',
            apellido: m.usuario.apellido || '',
            avatar_url: m.usuario.avatar_url,
            mesa_atendiendo_id: m.mesa_atendiendo_id,
            mesa_numero: m.mesa_atendiendo_id ? (mesasMap[m.mesa_atendiendo_id] || null) : null,
            latitud: m.latitud,
            longitud: m.longitud,
            gps_activo: m.gps_activo,
            gps_denegado: m.gps_denegado,
            ultima_actualizacion: m.ultima_actualizacion,
            conectado: minDesdeUpdate < 5 // conectado si actualizó en últimos 5 min
          }
        })

      setMeseros(meserosFormateados)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    cargarMeseros()

    const channel = supabase
      .channel('meseros_activos_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ubicaciones_meseros' 
      }, () => {
        cargarMeseros()
      })
      .subscribe()

    channelRef.current = channel

    const interval = setInterval(cargarMeseros, 60000)

    return () => {
      clearInterval(interval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [cargarMeseros, supabase])

  return { meseros, loading, recargar: cargarMeseros }
}
