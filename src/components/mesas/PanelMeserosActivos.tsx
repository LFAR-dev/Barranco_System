'use client'

import { useState } from 'react'
import {
  Users, MapPin, WifiOff, ChevronDown, ChevronUp,
  Circle, Clock
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MeseroActivo } from '@/hooks/useMeserosActivos'

interface PanelMeserosActivosProps {
  meseros: MeseroActivo[]
  onMeseroClick?: (mesero: MeseroActivo) => void
}

export function PanelMeserosActivos({ meseros, onMeseroClick }: PanelMeserosActivosProps) {
  const [expandido, setExpandido] = useState(true)

  const conectados = meseros.filter(m => m.conectado)
  const desconectados = meseros.filter(m => !m.conectado)

  const getEstado = (mesero: MeseroActivo) => {
    if (!mesero.conectado) return { color: 'bg-gray-400', label: 'Desconectado' }
    if (mesero.mesa_atendiendo_id) return { color: 'bg-orange-500', label: 'Atendiendo' }
    return { color: 'bg-green-500', label: 'Disponible' }
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase() || '?'
  }

  const formatTiempo = (fecha: string) => {
    const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
    if (minutos < 1) return 'Ahora'
    if (minutos < 60) return `${minutos}m`
    const horas = Math.floor(minutos / 60)
    return `${horas}h`
  }

  if (meseros.length === 0) return null

  return (
    <div className="absolute top-24 left-4 z-20 w-64">
      <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-between px-3 py-2 border-b border-amber-500/20 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-white text-sm font-semibold">
              Meseros activos
            </span>
            <Badge className="bg-amber-500 text-black text-[10px] px-1.5 py-0">
              {conectados.length}
            </Badge>
          </div>
          {expandido ? (
            <ChevronUp className="h-3.5 w-3.5 text-amber-300" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-amber-300" />
          )}
        </button>

        {/* Lista */}
        {expandido && (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Conectados */}
            {conectados.map((mesero) => {
              const estado = getEstado(mesero)
              return (
                <button
                  key={mesero.usuario_id}
                  onClick={() => onMeseroClick?.(mesero)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 border border-amber-500/30">
                      {mesero.avatar_url && (
                        <AvatarImage src={mesero.avatar_url} alt={mesero.nombre} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-[10px] font-bold">
                        {getInitials(mesero.nombre, mesero.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${estado.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {mesero.nombre} {mesero.apellido}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] ${estado.color.replace('bg-', 'text-')}`}>
                        {estado.label}
                      </span>
                      {mesero.mesa_numero && (
                        <>
                          <span className="text-[9px] text-gray-500">·</span>
                          <span className="text-[9px] text-amber-300 font-medium">
                            {mesero.mesa_numero}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {mesero.gps_activo && (
                      <MapPin className="h-2.5 w-2.5 text-blue-400" />
                    )}
                    <span className="text-[8px] text-gray-500 flex items-center gap-0.5">
                      <Clock className="h-2 w-2" />
                      {formatTiempo(mesero.ultima_actualizacion)}
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Desconectados (si hay) */}
            {desconectados.length > 0 && (
              <>
                <div className="px-3 py-1.5 bg-white/5 border-y border-white/10">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
                    Desconectados
                  </span>
                </div>
                {desconectados.map((mesero) => (
                  <div
                    key={mesero.usuario_id}
                    className="flex items-center gap-2 px-3 py-1.5 opacity-50"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-gray-600 text-white text-[9px]">
                        {getInitials(mesero.nombre, mesero.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-[10px] text-gray-400 truncate flex-1">
                      {mesero.nombre} {mesero.apellido}
                    </p>
                    <WifiOff className="h-2.5 w-2.5 text-gray-500" />
                  </div>
                ))}
              </>
            )}

            {/* Estado vacío */}
            {conectados.length === 0 && (
              <div className="px-3 py-4 text-center">
                <Users className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                <p className="text-[10px] text-gray-500">
                  Sin meseros conectados
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
