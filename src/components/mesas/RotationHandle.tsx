'use client'

import { useRef } from 'react'
import { RotateCw } from 'lucide-react'

interface RotationHandleProps {
  onRotate: (deltaAngle: number) => void
  color?: string
}

export function RotationHandle({ onRotate, color = '#3b82f6' }: RotationHandleProps) {
  const dragRef = useRef<{ startAngle: number } | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  const getAngle = (e: PointerEvent | React.PointerEvent) => {
    if (!handleRef.current) return 0
    const rect = handleRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    return Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { startAngle: getAngle(e) }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.stopPropagation()
    const currentAngle = getAngle(e)
    const delta = currentAngle - dragRef.current.startAngle
    onRotate(delta)
    dragRef.current.startAngle = currentAngle
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.stopPropagation()
    dragRef.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div
      ref={handleRef}
      className="absolute z-50 select-none touch-none"
      style={{
        top: -28,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 20,
        height: 20,
        backgroundColor: color,
        borderRadius: '50%',
        cursor: 'grab',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="Rotar"
    >
      <RotateCw className="h-3 w-3 text-white" />
    </div>
  )
}
