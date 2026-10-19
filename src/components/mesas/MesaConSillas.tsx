'use client'

import { Mesa } from '@/lib/services/mesaService'
import { AlertCircle, CheckCircle, Clock, Lock, Users } from 'lucide-react'

interface MesaConSillasProps {
  mesa: Mesa
  onClick: (mesa: Mesa) => void
  isSelected?: boolean
}

const CONFIG = {
  categorias: {
    especial: {
      gradient: 'from-amber-50 via-white to-amber-100',
      border: 'border-amber-300',
      ring: 'ring-amber-400',
      text: 'text-amber-900',
      chairColor: '#fef3c7',
      chairBorder: '#d97706'
    },
    social: {
      gradient: 'from-blue-500 via-blue-600 to-blue-800',
      border: 'border-blue-400',
      ring: 'ring-blue-500',
      text: 'text-white',
      chairColor: '#1e40af',
      chairBorder: '#3b82f6'
    },
    privada: {
      gradient: 'from-emerald-500 via-green-600 to-emerald-800',
      border: 'border-emerald-400',
      ring: 'ring-emerald-500',
      text: 'text-white',
      chairColor: '#065f46',
      chairBorder: '#10b981'
    },
    terraza: {
      gradient: 'from-orange-400 via-orange-600 to-red-700',
      border: 'border-orange-400',
      ring: 'ring-orange-500',
      text: 'text-white',
      chairColor: '#9a3412',
      chairBorder: '#f97316'
    },
    temporal: {
      gradient: 'from-gray-300 via-gray-400 to-gray-600',
      border: 'border-gray-400',
      ring: 'ring-gray-500',
      text: 'text-white',
      chairColor: '#4b5563',
      chairBorder: '#9ca3af'
    }
  },
  estados: {
    disponible: { icon: CheckCircle, label: 'Disponible', color: 'bg-green-500' },
    ocupada: { icon: Users, label: 'Ocupada', color: 'bg-red-500' },
    cuenta_solicitada: { icon: AlertCircle, label: 'Cuenta', color: 'bg-amber-500 animate-pulse' },
    cobrando: { icon: Clock, label: 'Cobrando', color: 'bg-blue-500' },
    reservada: { icon: Clock, label: 'Reservada', color: 'bg-purple-500' },
    fuera_servicio: { icon: Lock, label: 'Inactiva', color: 'bg-gray-500' }
  }
}

/**
 * Renderiza una silla con perspectiva 2.5D
 */
function Silla({ posicion, color, border }: {
  posicion: 'top' | 'bottom' | 'left' | 'right'
  color: string
  border: string
}) {
  const estilos: Record<string, React.CSSProperties> = {
    top: {
      top: '-18%',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      bottom: '-18%',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      left: '-18%',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      right: '-18%',
      top: '50%',
      transform: 'translateY(-50%)',
    }
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    />
  )
}

export function MesaConSillas({ mesa, onClick, isSelected }: MesaConSillasProps) {
  const cat = CONFIG.categorias[mesa.categoria] || CONFIG.categorias.social
  const est = CONFIG.estados[mesa.estado] || CONFIG.estados.disponible
  const IconEstado = est.icon

  // Determinar cuántas sillas mostrar (basado en capacidad, máx 6)
  const numSillas = Math.min(mesa.capacidad || 4, 6)
  const sillas: Array<'top' | 'bottom' | 'left' | 'right'> = []
  
  if (numSillas >= 2) { sillas.push('top', 'bottom') }
  if (numSillas >= 3) { sillas.push('left') }
  if (numSillas >= 4) { sillas.push('right') }
  // 5 y 6 no agregan más sillas (limitamos a 4 para claridad visual)

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
      {/* Sillas alrededor */}
      {sillas.map((pos) => (
        <Silla
          key={pos}
          posicion={pos}
          color={cat.chairColor}
          border={cat.chairBorder}
        />
      ))}

      {/* Sombra proyectada */}
      <div className={`
        absolute -inset-1 rounded-full blur-md opacity-60
        bg-gradient-to-b ${cat.gradient} transition-opacity duration-300
        ${isSelected ? 'opacity-100' : 'group-hover:opacity-80'}
      `} />

      {/* Base (profundidad) */}
      <div className={`
        absolute inset-0 rounded-full translate-y-1
        bg-gradient-to-b ${cat.gradient} opacity-40 blur-sm
      `} />

      {/* Superficie de la mesa */}
      <div className={`
        relative w-full h-full rounded-full
        bg-gradient-to-br ${cat.gradient}
        border-2 ${cat.border}
        shadow-xl
        flex flex-col items-center justify-center
        transition-all duration-300
        ${isSelected ? 'ring-4 ' + cat.ring + ' ring-offset-2' : ''}
      `}>
        {/* Brillo superior */}
        <div className="absolute top-1 left-2 right-2 h-1/3 bg-white/20 rounded-full blur-sm" />

        {/* Número */}
        <span className={`
          font-bold ${cat.text} drop-shadow-sm z-10
          text-[9px] xs:text-[10px] sm:text-xs md:text-sm
        `}>
          {mesa.numero}
        </span>

        {/* Indicador estado */}
        <div className={`
          absolute -top-1 -right-1 
          w-3 h-3 sm:w-4 sm:h-4 
          rounded-full ${est.color} border-2 border-white shadow-md
          flex items-center justify-center
        `}>
          <IconEstado className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
        </div>

        {/* Avatar mesero */}
        {mesa.mesero && (
          <div className="
            absolute -bottom-1 -right-1 
            w-4 h-4 sm:w-5 sm:h-5
            rounded-full bg-white border-2 border-gray-200 shadow-md 
            flex items-center justify-center 
            text-[6px] sm:text-[8px] font-bold text-gray-700
          ">
            {mesa.mesero.nombre?.charAt(0)}{mesa.mesero.apellido?.charAt(0)}
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
        px-2 py-1 bg-gray-900/90 backdrop-blur-sm text-white 
        text-[10px] rounded-lg 
        opacity-0 group-hover:opacity-100 transition-opacity 
        pointer-events-none whitespace-nowrap z-30
      ">
        <div className="font-semibold">{mesa.numero}</div>
        <div className="text-gray-300 text-[8px]">{est.label}</div>
      </div>
    </button>
  )
}
