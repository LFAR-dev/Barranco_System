'use client'

import { Mesa } from '@/lib/services/mesaService'
import { AlertCircle, CheckCircle, Clock, Lock, Users } from 'lucide-react'

interface MesaCard3DProps {
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
      glow: 'shadow-amber-200/50',
    },
    social: {
      gradient: 'from-blue-500 via-blue-600 to-blue-800',
      border: 'border-blue-400',
      ring: 'ring-blue-500',
      text: 'text-white',
      glow: 'shadow-blue-500/50',
    },
    privada: {
      gradient: 'from-emerald-500 via-green-600 to-emerald-800',
      border: 'border-emerald-400',
      ring: 'ring-emerald-500',
      text: 'text-white',
      glow: 'shadow-emerald-500/50',
    },
    terraza: {
      gradient: 'from-orange-400 via-orange-600 to-red-700',
      border: 'border-orange-400',
      ring: 'ring-orange-500',
      text: 'text-white',
      glow: 'shadow-orange-500/50',
    },
    temporal: {
      gradient: 'from-gray-300 via-gray-400 to-gray-600',
      border: 'border-gray-400',
      ring: 'ring-gray-500',
      text: 'text-white',
      glow: 'shadow-gray-400/50',
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

export function MesaCard3D({ mesa, onClick, isSelected }: MesaCard3DProps) {
  const cat = CONFIG.categorias[mesa.categoria] || CONFIG.categorias.social
  const est = CONFIG.estados[mesa.estado] || CONFIG.estados.disponible
  const IconEstado = est.icon

  return (
    <button
      onClick={() => onClick(mesa)}
      className={`
        relative group transition-all duration-300 ease-out
        ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}
        focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-blue-500
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
      {/* Sombra proyectada */}
      <div className={`
        absolute -inset-1 rounded-full blur-md opacity-60
        bg-gradient-to-b ${cat.gradient} transition-opacity duration-300
        ${isSelected ? 'opacity-100' : 'group-hover:opacity-80'}
      `} />

      {/* Base de la mesa (profundidad) */}
      <div className={`
        absolute inset-0 rounded-full translate-y-1
        bg-gradient-to-b ${cat.gradient} opacity-40 blur-sm
      `} />

      {/* Superficie de la mesa */}
      <div className={`
        relative w-full h-full rounded-full
        bg-gradient-to-br ${cat.gradient}
        border-2 ${cat.border}
        shadow-xl ${cat.glow}
        flex flex-col items-center justify-center
        transition-all duration-300
        ${isSelected ? 'ring-4 ' + cat.ring + ' ring-offset-2' : ''}
      `}>
        {/* Brillo superior */}
        <div className="absolute top-1 left-2 right-2 h-1/3 bg-white/20 rounded-full blur-sm" />

        {/* Número de mesa (escalado responsive) */}
        <span className={`
          font-bold ${cat.text} drop-shadow-sm z-10
          text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg
        `}>
          {mesa.numero}
        </span>

        {/* Indicador de estado */}
        <div className={`
          absolute -top-1 -right-1 
          w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5
          rounded-full ${est.color} border-2 border-white shadow-md
          flex items-center justify-center
        `}>
          <IconEstado className="h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-2.5 md:w-2.5 text-white" />
        </div>

        {/* Avatar de mesero */}
        {mesa.mesero && (
          <div className="
            absolute -bottom-1 -right-1 
            w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 
            rounded-full bg-white border-2 border-gray-200 shadow-md 
            flex items-center justify-center 
            text-[6px] sm:text-[8px] md:text-[10px] font-bold text-gray-700
          ">
            {mesa.mesero.nombre?.charAt(0)}{mesa.mesero.apellido?.charAt(0)}
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
        px-2 sm:px-3 py-1 sm:py-1.5 
        bg-gray-900/90 backdrop-blur-sm text-white 
        text-[10px] sm:text-xs rounded-lg 
        opacity-0 group-hover:opacity-100 transition-opacity 
        pointer-events-none whitespace-nowrap z-30
      ">
        <div className="font-semibold">{mesa.numero}</div>
        <div className="text-gray-300 text-[8px] sm:text-[10px]">{est.label}</div>
        {mesa.mesero && (
          <div className="text-gray-300 text-[8px] sm:text-[10px]">
            {mesa.mesero.nombre} {mesa.mesero.apellido}
          </div>
        )}
      </div>
    </button>
  )
}
