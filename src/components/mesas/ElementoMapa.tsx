'use client'

import { Utensils, DoorOpen, Bath, Armchair, ArrowLeft, TreePine } from 'lucide-react'

interface ElementoMapaProps {
  elemento: any
}

export function ElementoMapa({ elemento }: ElementoMapaProps) {
  const { tipo, nombre, x, y, ancho, alto, rotacion, z_index, metadata } = elemento

  const getEstilo = () => {
    switch (tipo) {
      case 'barra':
        return {
          bg: 'bg-gradient-to-b from-[#2a1f1a] to-[#1a1410]',
          border: 'border-[#d4af37]/40',
          shadow: 'shadow-[0_10px_30px_rgba(212,175,55,0.2)]',
          icon: <Utensils className="h-3 w-3 text-[#d4af37]" />
        }
      case 'acceso':
        return {
          bg: 'bg-gradient-to-b from-[#2a1f1a] to-[#1a1410]',
          border: 'border-amber-500/40',
          shadow: 'shadow-[0_5px_15px_rgba(245,158,11,0.3)]',
          icon: <DoorOpen className="h-3 w-3 text-amber-500" />
        }
      case 'bano':
        return {
          bg: 'bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]',
          border: 'border-cyan-500/50',
          shadow: 'shadow-[0_0_20px_rgba(0,212,255,0.4)]',
          icon: <Bath className="h-3 w-3 text-cyan-400" />
        }
      case 'separador':
        return {
          bg: 'bg-gradient-to-b from-[#3d2817] to-[#1a1410]',
          border: 'border-black/50',
          shadow: 'shadow-md',
          icon: null
        }
      case 'planta':
        return {
          bg: 'bg-transparent',
          border: 'border-none',
          shadow: 'drop-shadow-lg',
          icon: <TreePine className="h-4 w-4 text-green-600" />
        }
      default:
        return {
          bg: 'bg-gray-700',
          border: 'border-gray-600',
          shadow: '',
          icon: null
        }
    }
  }

  const estilo = getEstilo()

  // Plantas se renderizan como iconos (no como bloques)
  if (tipo === 'planta') {
    return (
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${ancho}%`,
          height: `${alto}%`,
          transform: `rotate(${rotacion}deg)`,
          zIndex: z_index
        }}
      >
        <div className="w-full h-full flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,255,0,0.3)]">
          <TreePine className="h-full w-full text-green-700 opacity-80" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        absolute rounded-lg ${estilo.bg} ${estilo.border} ${estilo.shadow}
        border flex items-center justify-center
        pointer-events-none
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${ancho}%`,
        height: `${alto}%`,
        transform: `rotate(${rotacion}deg)`,
        zIndex: z_index
      }}
    >
      {/* Brillo superior (efecto 3D) */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/5 rounded-t-lg" />
      
      {/* Icono y nombre */}
      <div className="relative z-10 flex items-center gap-1.5 text-white px-1">
        {estilo.icon}
        {nombre && tipo !== 'planta' && (
          <span className="text-[8px] sm:text-[10px] font-medium tracking-wider whitespace-nowrap">
            {nombre}
          </span>
        )}
      </div>
    </div>
  )
}
