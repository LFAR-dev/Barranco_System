'use client'

import { useEffect } from 'react'
import { HerramientaEditor } from '@/components/mesas/EditorToolbar'

interface UseEditorKeyboardProps {
  enabled: boolean
  onHerramientaChange: (h: HerramientaEditor) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onToggleGrid: () => void
  onDelete?: () => void
  onEscape?: () => void
}

export function useEditorKeyboard({
  enabled,
  onHerramientaChange,
  onUndo,
  onRedo,
  onSave,
  onToggleGrid,
  onDelete,
  onEscape
}: UseEditorKeyboardProps) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está en un input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+Z: Undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo()
        return
      }

      // Ctrl+Y o Ctrl+Shift+Z: Redo
      if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        onRedo()
        return
      }

      // Ctrl+S: Guardar
      if (ctrl && e.key === 's') {
        e.preventDefault()
        onSave()
        return
      }

      // Ctrl+G: Grid
      if (ctrl && e.key === 'g') {
        e.preventDefault()
        onToggleGrid()
        return
      }

      // V: Seleccionar
      if (e.key === 'v' || e.key === 'V') {
        onHerramientaChange('seleccionar')
        return
      }

      // M: Agregar mesa
      if (e.key === 'm' || e.key === 'M') {
        onHerramientaChange('agregar_mesa')
        return
      }

      // G: Grid (sin ctrl)
      if (e.key === 'g' || e.key === 'G') {
        onToggleGrid()
        return
      }

      // Delete/Backspace: Eliminar
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        e.preventDefault()
        onDelete()
        return
      }

      // Escape: Cancelar
      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onHerramientaChange, onUndo, onRedo, onSave, onToggleGrid, onDelete, onEscape])
}
