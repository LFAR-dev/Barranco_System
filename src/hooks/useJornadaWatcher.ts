'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './use-toast'

interface UseJornadaWatcherOptions {
  enabled?: boolean
  intervaloMs?: number
  onJornadaCerrada?: () => void
}

/**
 * Hook que monitorea la jornada activa en la BD.
 * Si la jornada cambia o se cierra, ejecuta onJornadaCerrada y fuerza logout.
 */
export function useJornadaWatcher({
  enabled = true,
  intervaloMs = 30000,
  onJornadaCerrada
}: UseJornadaWatcherOptions = {}) {
  const [jornadaId, setJornadaId] = useState<string | null>(null)
  const [jornadaActiva, setJornadaActiva] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const primeraCarga = useRef(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    let mounted = true
    let interval: NodeJS.Timeout

    const verificarJornada = async () => {
      try {
        const { data, error } = await supabase
          .from('jornadas')
          .select('id, nombre, estado')
          .eq('estado', 'activa')
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error('Error al verificar jornada:', error)
          return
        }

        // Primera carga: guardar el ID inicial
        if (primeraCarga.current) {
          primeraCarga.current = false
          setJornadaId(data?.id || null)
          setJornadaActiva(!!data)
          setLoading(false)
          return
        }

        // Si NO hay jornada activa y antes SÍ había → admin cerró la jornada
        if (!data && jornadaId) {
          setJornadaActiva(false)
          toast({
            title: '⚠️ Jornada cerrada',
            description: 'El administrador cerró la jornada. Tu sesión se cerrará en 5 segundos.',
            variant: 'destructive'
          })
          
          if (onJornadaCerrada) onJornadaCerrada()
          
          setTimeout(async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }, 5000)
          return
        }

        // Si hay una jornada DIFERENTE a la que teníamos → admin abrió nueva jornada
        if (data && jornadaId && data.id !== jornadaId) {
          setJornadaId(data.id)
          toast({
            title: '🔄 Nueva jornada activa',
            description: `"${data.nombre}" está activa. Actualizando...`,
            variant: 'default'
          })
          
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          return
        }

        // Actualizar estados si todo está normal
        setJornadaId(data?.id || null)
        setJornadaActiva(!!data)
        setLoading(false)
      } catch (error) {
        console.error('Error en watcher de jornada:', error)
      }
    }

    verificarJornada()
    interval = setInterval(verificarJornada, intervaloMs)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [enabled, intervaloMs, jornadaId, supabase, toast, onJornadaCerrada])

  return {
    jornadaId,
    jornadaActiva,
    loading
  }
}
