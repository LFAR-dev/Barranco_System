'use client'

import { Mesa } from '@/lib/services/mesaService'
import { AlertCircle, CheckCircle, Clock, Lock, Users } from 'lucide-react'

interface MesaConSillasProps {
  mesa: Mesa
  onClick: (mesa: Mesa) => void
  isSelected?: boolean
  colorMesero?: string | null
  esMiMesa?: boolean
}

const ESTADOS = {
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
  colorMesero,
  esMiMesa = false
}: MesaConSillasProps) {
  const est = ESTADOS[mesa.estado] || ESTADOS.disponible
  const IconEstado = est.icon

  const numSillas = Math.min(mesa.capacidad || 4, 6)
  const sillas: Array<'top' | 'bottom' | 'left' | 'right'> = []

  if (numSillas >= 2) sillas.push('top', 'bottom')
  if (numSillas >= 3) sillas.push('left')
  if (numSillas >= 4) sillas.push('right')

  // Determinar si la mesa tiene mesero asignado
  const tieneMesero = !!mesa.mesero_id
  const colorEfectivo = tieneMesero && colorMesero ? colorMesero : null

  // Colores condicionales
  const fondoMesa = colorEfectivo
    ? `${colorEfectivo}55` // 33% de opacidad del color del mesero
    : '#fafafa' // blanco roto si disponible

  const aroFinal = colorEfectivo || '#d4d4d8' // gris claro si disponible

  const bordeMesa = colorEfectivo || '#e4e4e7' // borde sutil

  const colorSilla = colorEfectivo
    ? `${colorEfectivo}99` // 60% opacidad
    : '#e4e4e7' // gris claro

  const bordeSilla = colorEfectivo || '#d4d4d8'

  const textColor = colorEfectivo ? '#1f2937' : '#374151'

  return (
    <button
      onClick={() => onClick(mesa)}
      className={`
        absolute group transition-all duration-300 ease-out
        ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}
        focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        touch-none
        ${!esMiMesa && mesa.mesero_id ? 'opacity-70 hover:opacity-100' : ''}
      `}
      style={{
        left: `${mesa.mapa_x}%`,
        top: `${mesa.mapa_y}%`,
        width: `${mesa.mapa_ancho}%`,
        height: `${mesa.mapa_alto}%`,
        transform: `rotate(${mesa.mapa_rotacion}deg)`
      }}
      title={`Mesa ${mesa.numero} - ${est.label}${mesa.mesero ? ` (${mesa.mesero.nombre})` : ''}`}
    >
      {sillas.map((pos) => (
        <Silla
          key={pos}
          posicion={pos}
          color={colorSilla}
          border={bordeSilla}
        />
      ))}

      {/* Sombra ambiental */}
      <div
        className={`
          absolute -inset-2 rounded-full blur-lg transition-opacity duration-300
          ${isSelected ? 'opacity-50' : 'opacity-30 group-hover:opacity-40'}
        `}
        style={{
          backgroundColor: colorEfectivo || '#00000040'
        }}
      />

      {/* Sombra de contacto */}
      <div className="absolute inset-x-2 -bottom-1 h-3 rounded-full bg-black/30 blur-sm" />

      {/* Aro metálico */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          boxShadow: `0 0 0 2px ${aroFinal}, 0 2px 6px rgba(0,0,0,0.25)`
        }}
      />

      {/* Superficie de la mesa */}
      <div
        className={`
          relative w-full h-full rounded-full
          shadow-xl
          flex flex-col items-center justify-center
          transition-all duration-300
          overflow-hidden
          ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
        `}
        style={{
          backgroundColor: fondoMesa,
          border: `2px solid ${bordeMesa}`
        }}
      >
        {/* Reflejo interior superior */}
        <div className="absolute top-0 left-1 right-1 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-full" />

        {/* Reflejo lateral */}
        <div className="absolute top-1 left-1.5 w-1/3 h-1/4 bg-white/40 rounded-full blur-md" />

        {/* Número de mesa */}
        <span
          className={`
            font-bold drop-shadow-sm z-10
            text-[9px] xs:text-[10px] sm:text-xs md:text-sm
          `}
          style={{ color: textColor }}
        >
          {mesa.numero}
        </span>

        {/* Indicador de estado */}
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

        {/* Avatar del mesero */}
        {mesa.mesero && (
          <div
            className="
            absolute -bottom-1 -right-1
            w-4 h-4 sm:w-5 sm:h-5
            rounded-full bg-white border-2 shadow-md
            flex items-center justify-center
            text-[6px] sm:text-[8px] font-bold
          "
            style={{
              borderColor: colorEfectivo || '#e5e7eb',
              color: textColor
            }}
          >
            {mesa.mesero.nombre?.charAt(0)}
            {mesa.mesero.apellido?.charAt(0)}
          </div>
        )}
      </div>

      {/* Tooltip */}
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
        {esMiMesa && (
          <div className="text-amber-300 text-[8px] font-semibold">Tu mesa</div>
        )}
        {mesa.mesero && (
          <div className="text-gray-300 text-[8px] flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colorEfectivo || '#9ca3af' }}
            />
            {mesa.mesero.nombre} {mesa.mesero.apellido}
          </div>
        )}
      </div>
    </button>
  )
}
