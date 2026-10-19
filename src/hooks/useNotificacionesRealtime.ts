'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './use-toast'

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
}

interface NotificacionRow {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  motivo?: string | null
  pedido_id?: string | null
  created_at: string
  [key: string]: any
}

export function useNotificacionesRealtime({
  tabla,
  filtro,
  sonido = true,
  limite = 50
}: UseNotificacionesRealtimeProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ============================================================
  // Sonido de notificación (Web Audio API)
  // ============================================================
  const reproducirSonido = useCallback(() => {
    if (!sonido) return
    try {
      if (typeof window === 'undefined') return
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1)
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {
      // Audio no soportado o bloqueado
    }
  }, [sonido])

  // ============================================================
  // Cargar notificaciones iniciales
  // ============================================================
  const cargar = useCallback(async () => {
    try {
      let query = supabase
        .from(tabla)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)

      if (filtro) {
        query = query.eq(filtro.campo, filtro.valor)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn(`Sin permisos para ${tabla}`)
          setNotificaciones([])
          setUnreadCount(0)
          return
        }
        throw error
      }

      setNotificaciones(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.leida).length)
    } catch (error) {
      console.error(`Error al cargar ${tabla}:`, error)
    } finally {
      setLoading(false)
    }
  }, [supabase, tabla, filtro, limite])

  // ============================================================
  // Suscripción realtime
  // ============================================================
  useEffect(() => {
    if (!isMounted) return

    cargar()

    const channelName = `${tabla}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tabla
        },
        (payload) => {
          const nueva = payload.new as NotificacionRow
          
          // Si hay filtro, verificar que coincida
          if (filtro && nueva[filtro.campo] !== filtro.valor) {
            return
          }

          // Añadir a la lista
          setNotificaciones(prev => [nueva, ...prev])
          setUnreadCount(prev => prev + 1)

          // Toast automático
          const tipo = nueva.tipo || 'notificacion'
          const iconos: Record<string, string> = {
            nuevo_pedido: '📦',
            pedido_listo: '✅',
            pedido_cancelado: '❌',
            pedido_cobrado: '💰',
            pedido_asignado: '📋',
            pedido_actualizado: '🔄',
            pedido_en_preparacion: '👨‍🍳',
            cierre_sesion_operativo: '🚪',
            stock_bajo: '⚠️',
            stock_agotado: '🚨',
            pedido_sin_bartender: '⚠️',
            venta_realizada: '💵'
          }
          
          toast({
            title: `${iconos[tipo] || '🔔'} ${tituloPorTipo(tipo)}`,
            description: nueva.mensaje,
            variant: tipo === 'pedido_cancelado' || tipo === 'stock_agotado' 
              ? 'destructive' 
              : 'default',
            duration: 6000
          })

          reproducirSonido()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tabla
        },
        (payload) => {
          const actualizada = payload.new as NotificacionRow
          if (filtro && actualizada[filtro.campo] !== filtro.valor) return

          setNotificaciones(prev =>
            prev.map(n => n.id === actualizada.id ? actualizada : n)
          )
          
          // Recalcular no leídas
          setNotificaciones(prev => {
            setUnreadCount(prev.filter(n => !n.leida).length)
            return prev
          })
        }
      )
      .subscribe((status) => {
        console.log(`🔔 ${tabla}: ${status}`)
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
  }, [isMounted, tabla, filtro?.campo, filtro?.valor])

  // ============================================================
  // Marcar como leída
  // ============================================================
  const marcarLeida = useCallback(async (id: string) => {
    try {
      await supabase
        .from(tabla)
        .update({ leida: true })
        .eq('id', id)

      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error al marcar leída:', error)
    }
  }, [supabase, tabla])

  // ============================================================
  // Marcar todas como leídas
  // ============================================================
  const marcarTodasLeidas = useCallback(async () => {
    try {
      let query = supabase
        .from(tabla)
        .update({ leida: true })
        .eq('leida', false)

      if (filtro) {
        query = query.eq(filtro.campo, filtro.valor)
      }

      await query

      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error al marcar todas:', error)
    }
  }, [supabase, tabla, filtro])

  return {
    notificaciones,
    unreadCount,
    loading,
    marcarLeida,
    marcarTodasLeidas,
    recargar: cargar
  }
}

// ============================================================
// Helper: título según tipo
// ============================================================
function tituloPorTipo(tipo: string): string {
  const titulos: Record<string, string> = {
    nuevo_pedido: 'Nuevo pedido',
    pedido_listo: 'Pedido listo',
    pedido_cancelado: 'Pedido cancelado',
    pedido_cobrado: 'Pedido cobrado',
    pedido_asignado: 'Pedido asignado',
    pedido_actualizado: 'Pedido actualizado',
    pedido_en_preparacion: 'En preparación',
    cierre_sesion_operativo: 'Cierre de sesión',
    stock_bajo: 'Stock bajo',
    stock_agotado: 'Producto agotado',
    pedido_sin_bartender: 'Sin bartender',
    venta_realizada: 'Venta realizada'
  }
  return titulos[tipo] || 'Notificación'
}
