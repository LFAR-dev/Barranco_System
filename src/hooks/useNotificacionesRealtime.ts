'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './use-toast'
import { useAuth } from './useAuth'
import { useNotificationSound } from './useNotificationSound'

type TablaNotif =
  | 'notificaciones_admin'
  | 'notificaciones_bartender'
  | 'notificaciones_mesero'
  | 'notificaciones_caja'

interface FiltroNotif {
  campo: string
  valor: string
}

interface UseNotificacionesRealtimeProps {
  tabla: TablaNotif
  filtro?: FiltroNotif
  sonido?: boolean
  limite?: number
  jornadaId?: string | null
}

interface NotificacionRow {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  motivo?: string | null
  pedido_id?: string | null
  jornada_id?: string | null
  created_at: string
  [key: string]: any
}

export function useNotificacionesRealtime({
  tabla,
  filtro,
  sonido = true,
  limite = 50,
  jornadaId
}: UseNotificacionesRealtimeProps) {
  // Supabase estable entre renders
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  // Filtro en ref para que no dispare el useEffect cuando cambia la referencia
  const filtroRef = useRef(filtro)
  filtroRef.current = filtro
  const jornadaIdRef = useRef(jornadaId)
  jornadaIdRef.current = jornadaId

  const [notificaciones, setNotificaciones] = useState<NotificacionRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { play } = useNotificationSound({ usuarioId: user?.id })
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Verificar si el filtro es valido (no vacio, no null)
  const filtroValido = !filtro || (filtro.valor && filtro.valor.trim() !== '')

  useEffect(() => {
    setIsMounted(true)
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reproducirSonido = useCallback(
    (tipo: string) => {
      if (!sonido) return

      const mapaSonidos: Record<
        string,
        'pedido_nuevo' | 'pedido_entregado' | 'pedido_atendido' | 'pedido_listo_bartender'
      > = {
        nuevo_pedido: 'pedido_nuevo',
        pedido_listo: 'pedido_entregado',
        pedido_cobrado: 'pedido_atendido',
        pedido_asignado: 'pedido_nuevo',
        pedido_actualizado: 'pedido_nuevo',
        pedido_en_preparacion: 'pedido_listo_bartender',
        venta_realizada: 'pedido_atendido',
        pedido_cancelado: 'pedido_nuevo',
        stock_bajo: 'pedido_listo_bartender',
        stock_agotado: 'pedido_listo_bartender',
        pedido_sin_bartender: 'pedido_listo_bartender',
        cierre_sesion_operativo: 'pedido_atendido'
      }

      const sonidoTipo = mapaSonidos[tipo] || 'pedido_nuevo'
      play(sonidoTipo)
    },
    [sonido, play]
  )

  const cargar = useCallback(async () => {
    const f = filtroRef.current
    const jid = jornadaIdRef.current
    const fValido = !f || (f.valor && f.valor.trim() !== '')

    if (!fValido) {
      if (mountedRef.current) {
        setNotificaciones([])
        setUnreadCount(0)
        setLoading(false)
      }
      return
    }

    try {
      let query = supabase
        .from(tabla)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)

      if (f && f.valor) {
        query = query.eq(f.campo, f.valor)
      }

      if (jid) {
        query = query.eq('jornada_id', jid)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn(`Sin permisos para ${tabla}`)
          if (mountedRef.current) {
            setNotificaciones([])
            setUnreadCount(0)
          }
          return
        }
        throw error
      }

      if (mountedRef.current) {
        setNotificaciones(data || [])
        setUnreadCount((data || []).filter((n: any) => !n.leida).length)
      }
    } catch (error) {
      console.error(`Error al cargar ${tabla}:`, error)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [supabase, tabla, limite])

  useEffect(() => {
    if (!isMounted) return

    cargar()

    const channelName = `${tabla}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: tabla },
        (payload) => {
          const nueva = payload.new as NotificacionRow
          const f = filtroRef.current
          const jid = jornadaIdRef.current

          if (f && f.valor && nueva[f.campo] !== f.valor) return
          if (jid && nueva.jornada_id !== jid) return

          if (!mountedRef.current) return

          setNotificaciones((prev) => [nueva, ...prev])
          setUnreadCount((prev) => prev + 1)

          const tipo = nueva.tipo || 'notificacion'

          toast({
            title: tituloPorTipo(tipo),
            description: nueva.mensaje,
            variant:
              tipo === 'pedido_cancelado' || tipo === 'stock_agotado'
                ? 'destructive'
                : 'default',
            duration: 6000
          })

          reproducirSonido(tipo)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: tabla },
        (payload) => {
          const actualizada = payload.new as NotificacionRow
          const f = filtroRef.current
          const jid = jornadaIdRef.current

          if (f && f.valor && actualizada[f.campo] !== f.valor) return
          if (jid && actualizada.jornada_id !== jid) return

          if (!mountedRef.current) return

          setNotificaciones((prev) =>
            prev.map((n) => (n.id === actualizada.id ? actualizada : n))
          )

          setUnreadCount((prev) => {
            const lista = notificaciones.map((n) =>
              n.id === actualizada.id ? actualizada : n
            )
            return lista.filter((n) => !n.leida).length
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Recargar al conectar para recuperar eventos perdidos durante reconexion
          if (mountedRef.current) cargar()
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (e) {
          console.warn('Error removing channel:', e)
        }
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, tabla])

  const marcarLeida = useCallback(
    async (id: string) => {
      try {
        await supabase.from(tabla).update({ leida: true }).eq('id', id)

        setNotificaciones((prev) =>
          prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Error al marcar leida:', error)
      }
    },
    [supabase, tabla]
  )

  const marcarTodasLeidas = useCallback(async () => {
    try {
      const f = filtroRef.current
      const jid = jornadaIdRef.current

      let query = supabase.from(tabla).update({ leida: true }).eq('leida', false)

      if (f && f.valor) {
        query = query.eq(f.campo, f.valor)
      }

      if (jid) {
        query = query.eq('jornada_id', jid)
      }

      await query

      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error al marcar todas:', error)
    }
  }, [supabase, tabla])

  return {
    notificaciones,
    unreadCount,
    loading,
    marcarLeida,
    marcarTodasLeidas,
    recargar: cargar
  }
}

function tituloPorTipo(tipo: string): string {
  const titulos: Record<string, string> = {
    nuevo_pedido: 'Nuevo pedido',
    pedido_listo: 'Pedido listo',
    pedido_cancelado: 'Pedido cancelado',
    pedido_cobrado: 'Pedido cobrado',
    pedido_asignado: 'Pedido asignado',
    pedido_actualizado: 'Pedido actualizado',
    pedido_en_preparacion: 'En preparacion',
    cierre_sesion_operativo: 'Cierre de sesion',
    stock_bajo: 'Stock bajo',
    stock_agotado: 'Producto agotado',
    pedido_sin_bartender: 'Sin bartender',
    venta_realizada: 'Venta realizada'
  }
  return titulos[tipo] || 'Notificacion'
}
