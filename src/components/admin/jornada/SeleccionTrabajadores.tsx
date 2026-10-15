'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, Circle, Users, Wallet, Coffee, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { turnoService, RolTurno, TrabajadorDisponible } from '@/lib/services/turnoService'

interface SeleccionTrabajadoresProps {
  onSelectionChange: (seleccion: {
    cajeros: string[]
    bartenders: string[]
    meseros: string[]
  }) => void
}

const ROLES_CONFIG: Array<{
  rol: RolTurno
  label: string
  plural: string
  icon: typeof Wallet
  color: {
    text: string
    bg: string
    border: string
    avatarBg: string
  }
}> = [
  {
    rol: 'caja',
    label: 'Cajero',
    plural: 'Caja',
    icon: Wallet,
    color: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      avatarBg: 'bg-emerald-600'
    }
  },
  {
    rol: 'bartender',
    label: 'Bartender',
    plural: 'Bartenders',
    icon: Coffee,
    color: {
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      avatarBg: 'bg-green-600'
    }
  },
  {
    rol: 'mesero',
    label: 'Mesero',
    plural: 'Meseros',
    icon: UserPlus,
    color: {
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      avatarBg: 'bg-orange-600'
    }
  }
]

export function SeleccionTrabajadores({ onSelectionChange }: SeleccionTrabajadoresProps) {
  const [trabajadores, setTrabajadores] = useState<Record<RolTurno, TrabajadorDisponible[]>>({
    caja: [],
    bartender: [],
    mesero: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarTrabajadores()
  }, [])

  // Emitir cambios al padre
  useEffect(() => {
    onSelectionChange({
      cajeros: trabajadores.caja.filter(t => t.seleccionado).map(t => t.usuario_id),
      bartenders: trabajadores.bartender.filter(t => t.seleccionado).map(t => t.usuario_id),
      meseros: trabajadores.mesero.filter(t => t.seleccionado).map(t => t.usuario_id)
    })
  }, [trabajadores])

  const cargarTrabajadores = async () => {
    setLoading(true)
    try {
      const [cajas, bartenders, meseros] = await Promise.all([
        turnoService.getTrabajadoresDisponiblesPorRol('caja'),
        turnoService.getTrabajadoresDisponiblesPorRol('bartender'),
        turnoService.getTrabajadoresDisponiblesPorRol('mesero')
      ])

      setTrabajadores({
        caja: cajas,
        bartender: bartenders,
        mesero: meseros
      })
    } catch (error) {
      console.error('Error al cargar trabajadores:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTrabajador = (rol: RolTurno, usuarioId: string) => {
    setTrabajadores(prev => ({
      ...prev,
      [rol]: prev[rol].map(t =>
        t.usuario_id === usuarioId ? { ...t, seleccionado: !t.seleccionado } : t
      )
    }))
  }

  const toggleTodos = (rol: RolTurno, valor: boolean) => {
    setTrabajadores(prev => ({
      ...prev,
      [rol]: prev[rol].map(t => ({ ...t, seleccionado: valor }))
    }))
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase() || '?'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Cargando trabajadores...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {ROLES_CONFIG.map(({ rol, plural, icon: Icon, color }) => {
        const lista = trabajadores[rol]
        const seleccionados = lista.filter(t => t.seleccionado).length

        return (
          <div key={rol} className="space-y-2">
            {/* Header del grupo */}
            <div className={`flex items-center justify-between p-2 rounded-lg ${color.bg} border ${color.border}`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color.text}`} />
                <span className={`font-semibold text-sm ${color.text}`}>
                  {plural}
                </span>
                <Badge className={`${color.bg} ${color.text} border ${color.border} text-xs`}>
                  {seleccionados} / {lista.length}
                </Badge>
              </div>
              {lista.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => toggleTodos(rol, true)}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => toggleTodos(rol, false)}
                  >
                    Ninguno
                  </Button>
                </div>
              )}
            </div>

            {/* Lista de trabajadores */}
            {lista.length === 0 ? (
              <div className="text-center py-3 text-xs text-gray-400 bg-gray-50 rounded-lg">
                No hay {plural.toLowerCase()} activos
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lista.map((trabajador) => (
                  <button
                    key={trabajador.usuario_id}
                    type="button"
                    onClick={() => toggleTrabajador(rol, trabajador.usuario_id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors text-left ${
                      trabajador.seleccionado
                        ? `${color.bg} ${color.border}`
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="shrink-0">
                      {trabajador.seleccionado ? (
                        <CheckCircle className={`h-5 w-5 ${color.text}`} />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <Avatar className="h-8 w-8 shrink-0">
                      {trabajador.avatar_url && (
                        <AvatarImage src={trabajador.avatar_url} alt={trabajador.nombre} />
                      )}
                      <AvatarFallback className={`${color.avatarBg} text-white text-xs`}>
                        {getInitials(trabajador.nombre, trabajador.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {trabajador.nombre} {trabajador.apellido}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {trabajador.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Resumen total */}
      <div className="pt-3 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Total seleccionados:</span>
          <Badge className="bg-blue-100 text-blue-700 font-bold">
            {trabajadores.caja.filter(t => t.seleccionado).length +
             trabajadores.bartender.filter(t => t.seleccionado).length +
             trabajadores.mesero.filter(t => t.seleccionado).length}
          </Badge>
        </div>
      </div>
    </div>
  )
}
