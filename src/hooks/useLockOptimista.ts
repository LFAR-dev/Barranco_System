'use client'

import { useState, useCallback, useRef } from 'react'

export interface LockState {
  mesaId: string
  version: number
  timestamp: number
}

// Duración del lock en ms (5 segundos)
const LOCK_DURATION = 5000

export function useLockOptimista() {
  const locksRef = useRef<Record<string, LockState>>({})
  const [locks, setLocks] = useState<Record<string, LockState>>({})

  const adquirirLock = useCallback((mesaId: string, version: number): boolean => {
    const now = Date.now()
    const lockExistente = locksRef.current[mesaId]

    // Si hay un lock activo y de otra versión, rechazar
    if (lockExistente) {
      const isExpired = now - lockExistente.timestamp > LOCK_DURATION
      if (!isExpired && lockExistente.version !== version) {
        return false
      }
    }

    // Adquirir lock
    const nuevoLock: LockState = { mesaId, version, timestamp: now }
    locksRef.current[mesaId] = nuevoLock
    setLocks({ ...locksRef.current })

    // Auto-release después de LOCK_DURATION
    setTimeout(() => {
      if (locksRef.current[mesaId]?.timestamp === now) {
        delete locksRef.current[mesaId]
        setLocks({ ...locksRef.current })
      }
    }, LOCK_DURATION)

    return true
  }, [])

  const liberarLock = useCallback((mesaId: string) => {
    delete locksRef.current[mesaId]
    setLocks({ ...locksRef.current })
  }, [])

  const isLockeada = useCallback((mesaId: string): boolean => {
    const lock = locksRef.current[mesaId]
    if (!lock) return false
    const isExpired = Date.now() - lock.timestamp > LOCK_DURATION
    return !isExpired
  }, [])

  return {
    locks,
    adquirirLock,
    liberarLock,
    isLockeada
  }
}
