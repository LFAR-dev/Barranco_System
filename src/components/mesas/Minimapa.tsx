'use client'

import { Mesa } from '@/lib/services/mesaService'

interface MinimapaProps {
  mesas: Mesa[]
  viewport?: { x: number; y: number; width: number; height: number } // 0-100
  onClick?: (x: number, y: number) => void // % para mover la vista
}

const COLORES_CATEGORIA: Record<string, string> = {
  especial: '#fef3c7',
  social: '#1e40af',
  privada: '#065f46',
  terraza: '#9a3412',
  temporal: '#4b5563'
}

export function Minimapa({ mesas, viewport, onClick }: MinimapaProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onClick(x, y)
  }

  return (
    <div
      className="bg-[#1a1410]/95 backdrop-blur-md border-2 border-amber-500/30 rounded-lg shadow-2xl overflow-hidden cursor-crosshair"
      style={{ width: 160, height: 90 }}
      onClick={handleClick}
    >
      <div className="relative w-full h-full">
        {/* Mesas miniaturizadas */}
        {mesas.map((mesa) => (
          <div
            key={mesa.id}
            className="absolute rounded-full"
            style={{
              left: `${mesa.mapa_x}%`,
              top: `${mesa.mapa_y}%`,
              width: `${mesa.mapa_ancho}%`,
              height: `${mesa.mapa_alto}%`,
              backgroundColor: COLORES_CATEGORIA[mesa.categoria] || '#4b5563',
              border: '0.5px solid rgba(255,255,255,0.3)'
            }}
          />
        ))}

        {/* Rectángulo del viewport */}
        {viewport && (
          <div
            className="absolute border-2 border-amber-400 bg-amber-400/10 rounded-sm pointer-events-none"
            style={{
              left: `${viewport.x}%`,
              top: `${viewport.y}%`,
              width: `${viewport.width}%`,
              height: `${viewport.height}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}
