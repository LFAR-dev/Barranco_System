'use client'

interface GridOverlayProps {
  size?: number // % del tamaño de la cuadrícula (default 5%)
  color?: string
}

export function GridOverlay({ size = 5, color = 'rgba(212, 175, 55, 0.08)' }: GridOverlayProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${size}% ${size}%`,
        backgroundPosition: '0 0, 0 0'
      }}
    />
  )
}
