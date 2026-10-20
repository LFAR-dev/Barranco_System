'use client'

import { useRef, useState, useEffect } from 'react'
import { Mesa } from '@/lib/services/mesaService'
import { MesaConSillas } from './MesaConSillas'
import { ResizeHandles, HandlePosition } from './ResizeHandles'
import { RotationHandle } from './RotationHandle'

interface MesaCardEditableProps {
  mesa: Mesa
  isSelected: boolean
  onSelect: (mesa: Mesa) => void
  onDragEnd: (id: string, x: number, y: number, ancho?: number, alto?: number, rotacion?: number) => void
  onSnappingChange?: (guides: Array<{ orientation: 'horizontal' | 'vertical'; position: number }>) => void
  otrasMesas?: Mesa[]
  gridSize?: number
  snapEnabled?: boolean
}

const SNAP_THRESHOLD = 1.5 // % de tolerancia para snapping

export function MesaCardEditable({
  mesa,
  isSelected,
  onSelect,
  onDragEnd,
  onSnappingChange,
  otrasMesas = [],
  gridSize = 5,
  snapEnabled = true
}: MesaCardEditableProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos] = useState({
    x: mesa.mapa_x,
    y: mesa.mapa_y,
    ancho: mesa.mapa_ancho,
    alto: mesa.mapa_alto,
    rotacion: mesa.mapa_rotacion
  })
  const dragStart = useRef({ x: 0, y: 0, mesaX: 0, mesaY: 0 })
  const resizeStart = useRef({ x: 0, y: 0, ancho: 0, alto: 0, mesaX: 0, mesaY: 0 })

  useEffect(() => {
    if (!isDragging) {
      setPos({
        x: mesa.mapa_x,
        y: mesa.mapa_y,
        ancho: mesa.mapa_ancho,
        alto: mesa.mapa_alto,
        rotacion: mesa.mapa_rotacion
      })
    }
  }, [mesa.mapa_x, mesa.mapa_y, mesa.mapa_ancho, mesa.mapa_alto, mesa.mapa_rotacion, isDragging])

  // ============================================================
  // SNAPPING al grid
  // ============================================================
  const snapToGrid = (value: number): number => {
    if (!snapEnabled) return value
    return Math.round(value / gridSize) * gridSize
  }

  const snapToGridWithTolerance = (value: number): number => {
    if (!snapEnabled) return value
    const closest = Math.round(value / gridSize) * gridSize
    return Math.abs(value - closest) < SNAP_THRESHOLD ? closest : value
  }

  // ============================================================
  // DETECCIÓN de guías de alineación
  // ============================================================
  const detectGuides = (newX: number, newY: number, newAncho: number, newAlto: number) => {
    if (!onSnappingChange) return
    const guides: Array<{ orientation: 'horizontal' | 'vertical'; position: number }> = []

    // Centro de la mesa actual
    const centerX = newX + newAncho / 2
    const centerY = newY + newAlto / 2

    otrasMesas.forEach((otra) => {
      if (otra.id === mesa.id) return
      
      const otraCenterX = otra.mapa_x + otra.mapa_ancho / 2
      const otraCenterY = otra.mapa_y + otra.mapa_alto / 2

      // Alineación vertical (centros X coinciden)
      if (Math.abs(centerX - otraCenterX) < SNAP_THRESHOLD) {
        guides.push({ orientation: 'vertical', position: otraCenterX })
      }

      // Alineación horizontal (centros Y coinciden)
      if (Math.abs(centerY - otraCenterY) < SNAP_THRESHOLD) {
        guides.push({ orientation: 'horizontal', position: otraCenterY })
      }
    })

    onSnappingChange(guides)
  }

  // ============================================================
  // HANDLER de drag
  // ============================================================
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    
    e.preventDefault()
    e.stopPropagation()
    
    onSelect(mesa)
    setIsDragging(true)
    
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      mesaX: pos.x,
      mesaY: pos.y
    }

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const parentRect = (e.target as HTMLElement).closest('.mapa-container')?.getBoundingClientRect()
    if (!parentRect) return

    const deltaX = ((e.clientX - dragStart.current.x) / parentRect.width) * 100
    const deltaY = ((e.clientY - dragStart.current.y) / parentRect.height) * 100

    let newX = dragStart.current.mesaX + deltaX
    let newY = dragStart.current.mesaY + deltaY

    // Aplicar snapping con tolerancia
    newX = snapToGridWithTolerance(newX)
    newY = snapToGridWithTolerance(newY)

    // Detectar guías de alineación
    detectGuides(newX, newY, pos.ancho, pos.alto)

    // Limitar al área
    newX = Math.max(0, Math.min(100 - pos.ancho, newX))
    newY = Math.max(0, Math.min(100 - pos.alto, newY))

    setPos(p => ({ ...p, x: newX, y: newY }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    onSnappingChange?.([])
    onDragEnd(mesa.id, pos.x, pos.y, pos.ancho, pos.alto, pos.rotacion)
  }

  // ============================================================
  // HANDLER de resize
  // ============================================================
  const handleResize = (handle: HandlePosition, deltaPxX: number, deltaPxY: number) => {
    const parentRect = document.querySelector('.mapa-container')?.getBoundingClientRect()
    if (!parentRect) return

    const deltaX = (deltaPxX / parentRect.width) * 100
    const deltaY = (deltaPxY / parentRect.height) * 100

    let { x, y, ancho, alto } = pos

    if (handle.includes('e')) ancho = Math.max(3, ancho + deltaX)
    if (handle.includes('w')) {
      x = Math.max(0, x + deltaX)
      ancho = Math.max(3, ancho - deltaX)
    }
    if (handle.includes('s')) alto = Math.max(3, alto + deltaY)
    if (handle.includes('n')) {
      y = Math.max(0, y + deltaY)
      alto = Math.max(3, alto - deltaY)
    }

    // Snap al grid en resize
    x = snapToGridWithTolerance(x)
    y = snapToGridWithTolerance(y)
    ancho = Math.max(3, snapToGridWithTolerance(ancho))
    alto = Math.max(3, snapToGridWithTolerance(alto))

    // Limitar
    if (x + ancho > 100) ancho = 100 - x
    if (y + alto > 100) alto = 100 - y

    setPos(p => ({ ...p, x, y, ancho, alto }))
  }

  const handleResizeEnd = () => {
    onDragEnd(mesa.id, pos.x, pos.y, pos.ancho, pos.alto, pos.rotacion)
  }

  // ============================================================
  // HANDLER de rotación
  // ============================================================
  const handleRotate = (deltaAngle: number) => {
    const newRotacion = (pos.rotacion + deltaAngle) % 360
    setPos(p => ({ ...p, rotacion: newRotacion }))
  }

  const handleRotateEnd = () => {
    onDragEnd(mesa.id, pos.x, pos.y, pos.ancho, pos.alto, pos.rotacion)
  }

  return (
    <div
      className={`absolute touch-none transition-colors ${
        isSelected ? 'z-50' : 'hover:z-30'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.ancho}%`,
        height: `${pos.alto}%`,
        transform: `rotate(${pos.rotacion}deg)`,
        zIndex: isSelected ? 50 : mesa.mapa_z
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <MesaConSillas
        mesa={{ ...mesa, mapa_x: pos.x, mapa_y: pos.y, mapa_ancho: pos.ancho, mapa_alto: pos.alto }}
        onClick={() => onSelect(mesa)}
        isSelected={isSelected}
      />

      {/* Handles de resize (solo si seleccionada) */}
      {isSelected && (
        <ResizeHandles
          onResize={handleResize}
          color="#3b82f6"
        />
      )}

      {/* Handle de rotación (solo si seleccionada) */}
      {isSelected && (
        <div onPointerUp={handleRotateEnd} className="contents">
          <RotationHandle
            onRotate={handleRotate}
            color="#3b82f6"
          />
        </div>
      )}

      {/* Indicador de dimensiones */}
      {isSelected && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
          {pos.ancho.toFixed(1)}% × {pos.alto.toFixed(1)}% · {pos.rotacion.toFixed(0)}°
        </div>
      )}
    </div>
  )
}
