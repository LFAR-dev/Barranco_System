'use client'

import { useState, useCallback, useRef } from 'react'

// ============================================================
// HOOK: Historial de cambios para Undo/Redo
// ============================================================

interface UseEditorHistoryReturn<T> {
  state: T
  setState: (newState: T, options?: { addToHistory?: boolean }) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  historySize: number
  resetHistory: () => void
  hasChanges: boolean
}

export function useEditorHistory<T>(initialState: T, maxHistory = 50): UseEditorHistoryReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [initialSnapshot] = useState<T>(initialState)

  const state = history[currentIndex]

  const setState = useCallback((newState: T, options?: { addToHistory?: boolean }) => {
    const shouldAdd = options?.addToHistory !== false

    if (!shouldAdd) {
      // Actualizar sin historial (para drag en tiempo real)
      setHistory(prev => {
        const newHistory = [...prev]
        newHistory[currentIndex] = newState
        return newHistory
      })
      return
    }

    // Agregar nueva entrada al historial
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(newState)
      if (newHistory.length > maxHistory) {
        newHistory.shift()
        setCurrentIndex(prev => prev) // Mantener índice
        return newHistory
      }
      return newHistory
    })
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1))
  }, [currentIndex, maxHistory])

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, history.length])

  const resetHistory = useCallback(() => {
    setHistory([state])
    setCurrentIndex(0)
  }, [state])

  const hasChanges = JSON.stringify(state) !== JSON.stringify(initialSnapshot)

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    historySize: history.length,
    resetHistory,
    hasChanges
  }
}
