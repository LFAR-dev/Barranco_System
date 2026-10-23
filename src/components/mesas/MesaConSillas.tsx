'use client'

import { Mesa } from '@/lib/services/mesaService'
import { AlertCircle, CheckCircle, Clock, Lock, Users } from 'lucide-react'

interface MesaConSillasProps {
  mesa: Mesa
  onClick: (mesa: Mesa) => void
  isSelected?: boolean
  colorMesero?: string | null
}

const CONFIG = {
  categorias: {
    especial: {
      gradient: 'from-amber-50 via-white to-amber-100',
      innerGlow: 'from-white/80 via-white/40 to-transparent',
      border: 'border-amber-400',
      ring: 'ring-amber-400',
      text: 'text-amber-900',
      chairColor: '#fef3c7',
      chairBorder: '#d97706',
      metalRing: '#d4af37'
    },
    social: {
      gradient: 'from-blue-500 via-blue-600 to-blue-800',
      innerGlow: 'from-blue-300/60 via-blue-400/20 to-transparent',
      border: 'border-blue-300',
      ring: 'ring-blue-500',
      text: 'text-white',
      chairColor: '#1e40af',
      chairBorder: '#3b82f6',
      metalRing: '#c0c0c0'
    },
    privada: {
      gradient: 'from-emerald-500 via-green-600 to-emerald-800',
      innerGlow: 'from-emerald-300/60 via-emerald-400/20 to-transparent',
      border: 'border-emerald-300',
      ring: 'ring-emerald-500',
      text: 'text-white',
      chairColor: '#065f46',
      chairBorder: '#10b981',
      metalRing: '#c0c0c0'
    },
    terraza: {
      gradient: 'from-orange-400 via-orange-600 to-red-700',
      innerGlow: 'from-orange-300/60 via-orange-400/20 to-transparent',
      border: 'border-orange-300',
      ring: 'ring-orange-500',
      text: 'text-white',
      chairColor: '#9a3412',
      chairBorder: '#f97316',
      metalRing: '#c0c0c0'
    },
    temporal: {
      gradient: 'from-gray-300 via-gray-400 to-gray-600',
      innerGlow: 'from-gray-200/60 via-gray-300/20 to-transparent',
      border: 'border-gray-400',
      ring: 'ring-gray-500',
      text: 'text-white',
      chairColor: '#4b5563',
      chairBorder: '#9ca3af',
      metalRing: '#9ca3af'
    }
  },
  estados: {
    disponible: { icon: CheckCircle, label: 'Disponible', color: 'bg-green-500' },
    ocupada: { icon: Users, label: 'Ocupada', color: 'bg-red-500' },
    cuenta_solicitada: {
      icon: AlertCircle,
      label: 'Cuenta',
      color: 'bg-amber-500 animate-pulse'
    },
    cobrando: { icon: Clock, label: 'Cobrando', color: 'bg-blue-500' },
    reservada: { icon: Clock, label: 'Reservada', color: 'bg-purple-500' },
    fuera_servicio: { icon: Lock, label: 'Inactiva', color: 'bg-gray-500' }
  }
}

function Silla({
  posicion,
  color,
  border
}: {
  posicion: 'top' | 'bottom' | 'left' | 'right'
  color: string
  border: string
}) {
  const estilos: Record<string, React.CSSProperties> = {
    top: { top: '-18%', left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: '-18%', left: '50%', transform: 'translateX(-50%)' },
    left: { left: '-18%', top: '50%', transform: 'translateY(-50%)' },
    right: { right: '-18%', top: '50%', transform: 'translateY(-50%)' }
  }

  return (
    <div
      className="absolute rounded-md"
      style={{
        ...estilos[posicion],
        width: '28%',
        height: '28%',
        backgroundColor: color,
        border: `1.5px solid ${border}`,
        boxShadow:
          '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
      }}
    />
  )
}

export function MesaConSillas({
  mesa,
  onClick,
  isSelected,
  colorMesero
}: MesaConSillasProps) {
  const cat = CONFIG.categorias[mesa.categoria] || CONFIG.categorias.social
  const est = CONFIG.estados[mesa.estado] || CONFIG.estados.disponible
  const IconEstado = est.icon

  const numSillas = Math.min(mesa.capacidad || 4, 6)
  const sillas: Array<'top' | 'bottom' | 'left' | 'right'> = []

  if (numSillas >= 2) sillas.push('top', 'bottom')
  if (numSillas >= 3) sillas.push('left')
  if (numSillas >= 4) sillas.push('right')

  const aroFinal = colorMesero || cat.metalRing

  return (
    <button
      onClick={() => onClick(mesa)}
      className={`
        absolute group transition-all duration-300 ease-out
        ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}
        focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        touch-none
      `}
      style={{
        left: `${mesa.mapa_x}%`,
        top: `${mesa.mapa_y}%`,
        width: `${mesa.mapa_ancho}%`,
        height: `${mesa.mapa_alto}%`,
        transform: `rotate(${mesa.mapa_rotacion}deg)`
      }}
      title={`Mesa ${mesa.numero} - ${est.label}`}
    >
      {sillas.map((pos) => (
        <Silla
          key={pos}
          posicion={pos}
          color={cat.chairColor}
          border={cat.chairBorder}
        />
      ))}

      <div
        className={`
          absolute -inset-2 rounded-full blur-lg opacity-40
          bg-gradient-to-b ${cat.gradient}
          transition-opacity duration-300
          ${isSelected ? 'opacity-70' : 'group-hover:opacity-60'}
        `}
      />

      <div className="absolute inset-x-2 -bottom-1 h-3 rounded-full bg-black/40 blur-sm" />

      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 0 1.5px ${aroFinal}, 0 2px 6px rgba(0,0,0,0.3)`
        }}
      />

      <div
        className={`
          relative w-full h-full rounded-full
          bg-gradient-to-br ${cat.gradient}
          border-2 ${cat.border}
          shadow-xl
          flex flex-col items-center justify-center
          transition-all duration-300
          overflow-hidden
          ${isSelected ? 'ring-4 ' + cat.ring + ' ring-offset-2' : ''}
        `}
      >
        <div
          className={`absolute top-0 left-1 right-1 h-1/2 bg-gradient-to-b ${cat.innerGlow} rounded-t-full`}
        />

        <div className="absolute top-1 left-1.5 w-1/3 h-1/4 bg-white/30 rounded-full blur-md" />

        <span
          className={`
            font-bold ${cat.text} drop-shadow-sm z-10
            text-[9px] xs:text-[10px] sm:text-xs md:text-sm
          `}
        >
          {mesa.numero}
        </span>

        <div
          className={`
            absolute -top-1 -right-1
            w-3 h-3 sm:w-4 sm:h-4
            rounded-full ${est.color} border-2 border-white shadow-md
            flex items-center justify-center
          `}
        >
          <IconEstado className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
        </div>

        {mesa.mesero && (
          <div
            className="
            absolute -bottom-1 -right-1
            w-4 h-4 sm:w-5 sm:h-5
            rounded-full bg-white border-2 shadow-md
            flex items-center justify-center
            text-[6px] sm:text-[8px] font-bold text-gray-700
          "
            style={{
              borderColor: colorMesero || '#e5e7eb'
            }}
          >
            {mesa.mesero.nombre?.charAt(0)}
            {mesa.mesero.apellido?.charAt(0)}
          </div>
        )}
      </div>

      <div
        className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        px-2 py-1 bg-gray-900/90 backdrop-blur-sm text-white
        text-[10px] rounded-lg
        opacity-0 group-hover:opacity-100 transition-opacity
        pointer-events-none whitespace-nowrap z-30
      "
      >
        <div className="font-semibold">{mesa.numero}</div>
        <div className="text-gray-300 text-[8px]">{est.label}</div>
        {mesa.mesero && (
          <div className="text-gray-300 text-[8px] flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colorMesero || '#9ca3af' }}
            />
            {mesa.mesero.nombre} {mesa.mesero.apellido}
          </div>
        )}
      </div>
    </button>
  )
}
