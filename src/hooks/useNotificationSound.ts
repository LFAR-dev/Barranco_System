'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playNotification, playSuccess, playInfo, playWarning } from 'earcons'

export type SonidoTipo =
  | 'pedido_nuevo'
  | 'pedido_entregado'
  | 'pedido_atendido'
  | 'pedido_listo_bartender'

interface UseNotificationSoundProps {
  usuarioId?: string
}

interface EarconsOptions {
  volume?: number
  variant?: 'short' | 'medium' | 'long'
}

const STORAGE_KEY_PREFIX = 'barranco_sound_muted_'

export function useNotificationSound({ usuarioId }: UseNotificationSoundProps = {}) {
  const [muted, setMuted] = useState(false)
  const [inicializado, setInicializado] = useState(false)
  const audioDesbloqueadoRef = useRef(false)

  // Cargar preferencia de mute desde localStorage
  useEffect(() => {
    if (!usuarioId) {
      setInicializado(true)
      return
    }
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${usuarioId}`)
      setMuted(stored === 'true')
    } catch {
      // localStorage no disponible
    }
    setInicializado(true)
  }, [usuarioId])

  // Desbloquear el contexto de audio en el primer click/tap del usuario.
  // Los navegadores modernos bloquean audio sin interacción previa.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const desbloquear = () => {
      if (audioDesbloqueadoRef.current) return
      audioDesbloqueadoRef.current = true
      try {
        // Reproducir el sonido más suave con volumen 0 para "calentar" el contexto
        playInfo({ volume: 0.01 }).catch(() => {})
      } catch {
        // Silencioso
      }
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }

    window.addEventListener('pointerdown', desbloquear, { once: true })
    window.addEventListener('keydown', desbloquear, { once: true })

    return () => {
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!usuarioId) return
    setMuted((prev) => {
      const nuevoValor = !prev
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${usuarioId}`, String(nuevoValor))
      } catch {
        // localStorage no disponible
      }
      return nuevoValor
    })
  }, [usuarioId])

  const play = useCallback(
    async (tipo: SonidoTipo) => {
      if (muted || !inicializado) return

      try {
        const opciones: EarconsOptions = { volume: 0.35 }

        switch (tipo) {
          case 'pedido_nuevo':
            await playNotification(opciones)
            break
          case 'pedido_entregado':
            await playSuccess(opciones)
            break
          case 'pedido_atendido':
            await playInfo(opciones)
            break
          case 'pedido_listo_bartender':
            await playWarning({ volume: 0.3 })
            break
        }
      } catch {
        // Audio bloqueado por el navegador o no soportado
      }
    },
    [muted, inicializado]
  )

  return {
    muted,
    toggleMute,
    play,
    listo: inicializado,
    desbloqueado: audioDesbloqueadoRef.current
  }
}
