'use client'

import {
  MousePointer2, Plus, Square, Minus, Trash2, Copy,
  Undo2, Redo2, Save, X, Grid3x3, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export type HerramientaEditor = 'seleccionar' | 'agregar_mesa'

interface EditorToolbarProps {
  herramienta: HerramientaEditor
  onHerramientaChange: (h: HerramientaEditor) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  hasChanges: boolean
  cambiosPendientes: number
  onGuardar: () => void
  onDescartar: () => void
  showGrid: boolean
  onToggleGrid: () => void
  mesaSeleccionada?: boolean
  onDuplicar?: () => void
  onEliminar?: () => void
  guardando?: boolean
}

export function EditorToolbar({
  herramienta,
  onHerramientaChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasChanges,
  cambiosPendientes,
  onGuardar,
  onDescartar,
  showGrid,
  onToggleGrid,
  mesaSeleccionada,
  onDuplicar,
  onEliminar,
  guardando = false
}: EditorToolbarProps) {
  const [expandida, setExpandida] = useState(true)

  return (
    <div className="absolute top-24 left-4 z-20 flex flex-col gap-2">
      {/* Botón colapsar/expandir */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setExpandida(!expandida)}
        className="bg-black/80 backdrop-blur-md border-amber-500/30 text-amber-300 hover:bg-black/95 hover:text-amber-200 self-end"
        title={expandida ? 'Colapsar herramientas' : 'Expandir herramientas'}
      >
        {expandida ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expandida && (
        <>
          {/* Indicador de cambios pendientes */}
          {hasChanges && (
            <div className="bg-amber-500/90 backdrop-blur-md text-black px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              {cambiosPendientes} cambio{cambiosPendientes === 1 ? '' : 's'} pendiente{cambiosPendientes === 1 ? '' : 's'}
            </div>
          )}

          {/* Herramientas principales */}
          <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1">
            {/* Seleccionar */}
            <Button
              variant={herramienta === 'seleccionar' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onHerramientaChange('seleccionar')}
              className={`h-9 w-9 ${
                herramienta === 'seleccionar'
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-200'
              }`}
              title="Seleccionar (V)"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>

            {/* Agregar mesa */}
            <Button
              variant={herramienta === 'agregar_mesa' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onHerramientaChange('agregar_mesa')}
              className={`h-9 w-9 ${
                herramienta === 'agregar_mesa'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-200'
              }`}
              title="Agregar Mesa (M) - Click en el mapa"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <div className="h-px bg-amber-500/20 my-0.5" />

            {/* Grid */}
            <Button
              variant={showGrid ? 'default' : 'ghost'}
              size="icon"
              onClick={onToggleGrid}
              className={`h-9 w-9 ${
                showGrid
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-200'
              }`}
              title="Cuadrícula (G)"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>

            <div className="h-px bg-amber-500/20 my-0.5" />

            {/* Undo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-9 w-9 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>

            {/* Redo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-9 w-9 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            {/* Acciones sobre mesa seleccionada */}
            {mesaSeleccionada && (
              <>
                <div className="h-px bg-amber-500/20 my-0.5" />
                {onDuplicar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDuplicar}
                    className="h-9 w-9 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
                    title="Duplicar mesa"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                {onEliminar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEliminar}
                    className="h-9 w-9 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                    title="Eliminar mesa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Botones de guardar/descartar */}
          {hasChanges && (
            <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onGuardar}
                disabled={guardando}
                className="h-10 w-10 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white"
                title="Guardar cambios (Ctrl+S)"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDescartar}
                disabled={guardando}
                className="h-10 w-10 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white"
                title="Descartar cambios"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
