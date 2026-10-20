'use client'

import { useRef } from 'react'

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface ResizeHandlesProps {
  onResize: (handle: HandlePosition, deltaX: number, deltaY: number) => void
  color?: string
}

const HANDLES: Array<{
  pos: HandlePosition
  cursor: string
  style: React.CSSProperties
}> = [
  { pos: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4 } },
  { pos: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)' } },
  { pos: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4 } },
  { pos: 'e', cursor: 'ew-resize', style: { top: '50%', right: -4, transform: 'translateY(-50%)' } },
  { pos: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4 } },
  { pos: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' } },
  { pos: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4 } },
  { pos: 'w', cursor: 'ew-resize', style: { top: '50%', left: -4, transform: 'translateY(-50%)' } },
]

export function ResizeHandles({ onResize, color = '#3b82f6' }: ResizeHandlesProps) {
  const dragRef = useRef<{ handle: HandlePosition; startX: number; startY: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent, handle: HandlePosition) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.stopPropagation()
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    onResize(dragRef.current.handle, deltaX, deltaY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.stopPropagation()
    dragRef.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <>
      {HANDLES.map(({ pos, cursor, style }) => (
        <div
          key={pos}
          className="absolute z-50 select-none touch-none"
          style={{
            ...style,
            width: 10,
            height: 10,
            backgroundColor: '#ffffff',
            border: `2px solid ${color}`,
            borderRadius: 2,
            cursor,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          onPointerDown={(e) => handlePointerDown(e, pos)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      ))}
    </>
  )
}
