'use client'

import { useState } from 'react'
import {
  XCircle, PlayCircle, Lock, UserCheck, Package,
  AlertTriangle, RefreshCw, Eye, Loader2, Search,
  Filter, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  EventoAuditoria,
  getTipoLabel,
} from '@/lib/services/auditoriaService'

interface BitacoraListProps {
  eventos: EventoAuditoria[]
  loading: boolean
  onRecargar?: () => void
}

// ============================================================
// Configuración visual por tipo de evento
// ============================================================
const TIPO_CONFIG: Record<string, {
  icon: React.ReactNode
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  cancelacion_pedido: {
    icon: <XCircle className="h-4 w-4" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  cancelacion_venta: {
    icon: <XCircle className="h-4 w-4" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  apertura_turno: {
    icon: <PlayCircle className="h-4 w-4" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  cierre_turno: {
    icon: <Lock className="h-4 w-4" />,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  },
  cierre_definitivo_turno: {
    icon: <Lock className="h-4 w-4" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  activacion_trabajadores: {
    icon: <UserCheck className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  cambio_inventario: {
    icon: <Package className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  stock_agotado: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  stock_bajo: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  }
}

const DEFAULT_CONFIG = {
  icon: <RefreshCw className="h-4 w-4" />,
  bgColor: 'bg-gray-50',
  textColor: 'text-gray-700',
  borderColor: 'border-gray-200'
}

export function BitacoraList({ eventos, loading, onRecargar }: BitacoraListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(null)

  const eventosFiltrados = eventos.filter(e => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      e.descripcion.toLowerCase().includes(term) ||
      e.motivo?.toLowerCase().includes(term) ||
      e.usuario?.nombre.toLowerCase().includes(term) ||
      e.usuario?.apellido.toLowerCase().includes(term) ||
      getTipoLabel(e.tipo_evento).toLowerCase().includes(term)
    )
  })

  const getNombreUsuario = (evento: EventoAuditoria) => {
    if (evento.usuario) {
      return `${evento.usuario.nombre} ${evento.usuario.apellido}`.trim()
    }
    return evento.usuario_rol === 'sistema' ? 'Sistema' : 'Usuario desconocido'
  }

  const getRolBadge = (evento: EventoAuditoria) => {
    if (!evento.usuario_rol) return null
    const colors: Record<string, string> = {
      admin: 'bg-blue-100 text-blue-700',
      bartender: 'bg-green-100 text-green-700',
      mesero: 'bg-orange-100 text-orange-700',
      caja: 'bg-emerald-100 text-emerald-700',
      sistema: 'bg-gray-100 text-gray-700'
    }
    return (
      <Badge className={`${colors[evento.usuario_rol] || 'bg-gray-100 text-gray-700'} text-[10px] px-1.5 py-0`}>
        {evento.usuario_rol}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por descripción, motivo o usuario..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {onRecargar && (
          <Button variant="outline" size="sm" onClick={onRecargar}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        )}
      </div>

      {/* Lista de eventos */}
      {eventosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay eventos en la bitácora</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Intenta con otra búsqueda' : 'Los eventos aparecerán aquí cuando se realicen acciones'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {eventosFiltrados.map((evento) => {
            const config = TIPO_CONFIG[evento.tipo_evento] || DEFAULT_CONFIG
            
            return (
              <div
                key={evento.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor} hover:shadow-sm transition-shadow cursor-pointer`}
                onClick={() => setEventoSeleccionado(evento)}
              >
                <div className={`p-2 rounded-lg ${config.bgColor} ${config.textColor} shrink-0`}>
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className={`text-xs font-semibold ${config.textColor}`}>
                      {getTipoLabel(evento.tipo_evento)}
                    </p>
                    {getRolBadge(evento)}
                  </div>

                  <p className="text-sm text-gray-900 break-words">
                    {evento.descripcion}
                  </p>

                  {evento.motivo && (
                    <p className="text-xs text-gray-600 mt-1 break-words">
                      <span className="font-medium">Motivo:</span> {evento.motivo}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {getNombreUsuario(evento)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(evento.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {evento.jornada?.nombre && (
                      <span className="flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        {evento.jornada.nombre}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEventoSeleccionado(evento)
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Contador */}
      {eventosFiltrados.length > 0 && (
        <p className="text-center text-xs text-gray-500">
          Mostrando {eventosFiltrados.length} de {eventos.length} eventos
        </p>
      )}

      {/* Modal de detalle */}
      <Dialog open={!!eventoSeleccionado} onOpenChange={(open) => !open && setEventoSeleccionado(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          {eventoSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {(() => {
                    const cfg = TIPO_CONFIG[eventoSeleccionado.tipo_evento] || DEFAULT_CONFIG
                    return (
                      <>
                        <div className={`p-1.5 rounded ${cfg.bgColor} ${cfg.textColor}`}>
                          {cfg.icon}
                        </div>
                        <span>{getTipoLabel(eventoSeleccionado.tipo_evento)}</span>
                      </>
                    )
                  })()}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Descripción */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm text-gray-900">{eventoSeleccionado.descripcion}</p>
                </div>

                {/* Motivo */}
                {eventoSeleccionado.motivo && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Motivo</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{eventoSeleccionado.motivo}</p>
                  </div>
                )}

                {/* Usuario y fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Usuario</p>
                    <p className="text-sm text-gray-900">{getNombreUsuario(eventoSeleccionado)}</p>
                    {eventoSeleccionado.usuario_rol && (
                      <p className="text-xs text-gray-500 mt-0.5">{eventoSeleccionado.usuario_rol}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Fecha</p>
                    <p className="text-sm text-gray-900">
                      {new Date(eventoSeleccionado.created_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>

                {/* Jornada */}
                {eventoSeleccionado.jornada?.nombre && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Jornada</p>
                    <p className="text-sm text-gray-900">{eventoSeleccionado.jornada.nombre}</p>
                  </div>
                )}

                {/* Datos anteriores */}
                {eventoSeleccionado.datos_anteriores && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Datos anteriores</p>
                    <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-x-auto text-gray-700">
                      {JSON.stringify(eventoSeleccionado.datos_anteriores, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Datos nuevos */}
                {eventoSeleccionado.datos_nuevos && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Datos nuevos</p>
                    <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-x-auto text-gray-700">
                      {JSON.stringify(eventoSeleccionado.datos_nuevos, null, 2)}
                    </pre>
                  </div>
                )}

                {/* ID */}
                <div className="pt-3 border-t">
                  <p className="text-[10px] text-gray-400 font-mono">
                    ID: {eventoSeleccionado.id}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
