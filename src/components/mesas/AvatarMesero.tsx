'use client'

import { MapPin, Circle, WifiOff } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MeseroActivo } from '@/hooks/useMeserosActivos'

interface AvatarMeseroProps {
  mesero: MeseroActivo
  posicionX: number
  posicionY: number
}

export function AvatarMesero({ mesero, posicionX, posicionY }: AvatarMeseroProps) {
  const initials = `${mesero.nombre?.charAt(0) || ''}${mesero.apellido?.charAt(0) || ''}`.toUpperCase()

  const getEstadoColor = () => {
    if (!mesero.conectado) return 'bg-gray-400'
    if (mesero.mesa_atendiendo_id) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getEstadoLabel = () => {
    if (!mesero.conectado) return 'Desconectado'
    if (mesero.mesa_atendiendo_id) return `Atendiendo ${mesero.mesa_numero ? `Mesa ${mesero.mesa_numero}` : ''}`
    return 'Disponible'
  }

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${posicionX}%`,
        top: `${posicionY}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Contenedor con animación suave */}
      <div className="relative animate-in fade-in slide-in-from-top-2 duration-500">
        {/* Sombra */}
        <div className="absolute inset-0 bg-black/40 rounded-full blur-md translate-y-1" />

        {/* Avatar con anillo de estado */}
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
            {mesero.avatar_url ? (
              <AvatarImage src={mesero.avatar_url} alt={mesero.nombre} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Indicador de estado (punto) */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${getEstadoColor()}`} />

          {/* Icono GPS si activo */}
          {mesero.gps_activo && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
              <MapPin className="h-2 w-2 text-white" />
            </div>
          )}

          {/* Icono desconectado */}
          {!mesero.conectado && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 rounded-full border-2 border-white flex items-center justify-center">
              <WifiOff className="h-2 w-2 text-white" />
            </div>
          )}
        </div>

        {/* Nombre flotante */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded text-white text-[9px] font-semibold whitespace-nowrap shadow-lg">
          {mesero.nombre}
        </div>
      </div>
    </div>
  )
}
