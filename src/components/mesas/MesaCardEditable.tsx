'use client'

import { useRef, useState, useEffect } from 'react'
import { Mesa } from '@/lib/services/mesaService'
import { MesaCard3D } from './MesaCard3D'

interface MesaCardEditableProps {
  mesa: Mesa
  isSelected: boolean
  onSelect: (mesa: Mesa) => void
  onDragEnd: (id: string, x: number, y: number) => void
}

export function MesaCardEditable({
  mesa,
  isSelected,
  onSelect,
  onDragEnd
}: MesaCardEditableProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos] = useState({ x: mesa.mapa_x, y: mesa.mapa_y })
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, mesaX: 0, mesaY: 0 })

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: mesa.mapa_x, y: mesa.mapa_y })
    }
  }, [mesa.mapa_x, mesa.mapa_y, isDragging])

  const handlePointerDown = (e: React.PointerEvent) => {
    // Solo click izquierdo o touch
    if (e.button !== 0 && e.pointerType === 'mouse') return
    
    e.preventDefault()
    e.stopPropagation()
    
    onSelect(mesa)
    setIsDragging(true)
    
    const parentRect = (e.target as HTMLElement).closest('.mapa-container')?.getBoundingClientRect()
    if (!parentRect) return

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      mesaX: pos.x,
      mesaY: pos.y
    }

    // Pointer capture para recibir eventos fuera del elemento
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const parentRect = (e.target as HTMLElement).closest('.mapa-container')?.getBoundingClientRect()
    if (!parentRect) return

    // Calcular delta en porcentaje
    const deltaX = ((e.clientX - dragStart.current.x) / parentRect.width) * 100
    const deltaY = ((e.clientY - dragStart.current.y) / parentRect.height) * 100

    // Limitar al área del mapa (0-100)
    const newX = Math.max(0, Math.min(100 - mesa.mapa_ancho, dragStart.current.mesaX + deltaX))
    const newY = Math.max(0, Math.min(100 - mesa.mapa_alto, dragStart.current.mesaY + deltaY))

    setPos({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    onDragEnd(mesa.id, pos.x, pos.y)
  }

  return (
    <div
      className={`absolute touch-none transition-colors ${
        isSelected ? 'ring-4 ring-offset-4 ring-blue-500 rounded-full z-50' : 'hover:ring-2 hover:ring-blue-300 hover:rounded-full'
      } ${isDragging ? 'cursor-grabbing opacity-90 shadow-2xl scale-105 z-50' : 'cursor-grab'}`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${mesa.mapa_ancho}%`,
        height: `${mesa.mapa_alto}%`,
        transform: `rotate(${mesa.mapa_rotacion}deg)`,
        zIndex: isSelected ? 50 : mesa.mapa_z
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <MesaCard3D
        mesa={{ ...mesa, mapa_x: pos.x, mapa_y: pos.y }}
        onClick={() => onSelect(mesa)} // Click normal si no se arrastró
      />
    </div>
  )
}
