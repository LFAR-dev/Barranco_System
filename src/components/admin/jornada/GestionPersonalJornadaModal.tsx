'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, X, Loader2, UserPlus, UserMinus,
  Coffee, ShoppingCart, Wine, RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  turnoService,
  TrabajadorTurno,
  TrabajadorDisponible,
  RolTurno,
} from '@/lib/services/turnoService'

interface GestionPersonalJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  jornadaId: string
  onSuccess?: () => void
}

const ROLES: Array<{
  valor: RolTurno
  label: string
  icon: React.ReactNode
  color: string
}> = [
  {
    valor: 'mesero',
    label: 'Meseros',
    icon: <Coffee className="h-4 w-4" />,
    color: 'text-orange-600',
  },
  {
    valor: 'bartender',
    label: 'Bartenders',
    icon: <Wine className="h-4 w-4" />,
    color: 'text-green-600',
  },
  {
    valor: 'caja',
    label: 'Cajeros',
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'text-emerald-600',
  },
]

export function GestionPersonalJornadaModal({
  isOpen,
  onClose,
  jornadaId,
  onSuccess,
}: GestionPersonalJornadaModalProps) {
  const { toast } = useToast()
  const [activos, setActivos] = useState<TrabajadorTurno[]>([])
  const [disponibles, setDisponibles] = useState<
    Record<RolTurno, TrabajadorDisponible[]>
  >({
    mesero: [],
    bartender: [],
    caja: [],
  })
  const [loading, setLoading] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [rolSeleccionado, setRolSeleccionado] = useState<RolTurno>('mesero')
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [activosData, meseros, bartenders, cajeros] = await Promise.all([
        turnoService.getTrabajadoresActivosTurno(jornadaId),
        turnoService.getTrabajadoresDisponiblesPorRol('mesero'),
        turnoService.getTrabajadoresDisponiblesPorRol('bartender'),
        turnoService.getTrabajadoresDisponiblesPorRol('caja'),
      ])

      setActivos(activosData)
      setDisponibles({
        mesero: meseros,
        bartender: bartenders,
        caja: cajeros,
      })
    } catch (error) {
      console.error('Error al cargar personal:', error)
    } finally {
      setLoading(false)
    }
  }, [jornadaId])

  useEffect(() => {
    if (isOpen) cargar()
  }, [isOpen, cargar])

  const handleAgregar = async () => {
    if (!usuarioSeleccionado) return

    setAgregando(true)
    try {
      await turnoService.agregarTrabajador(
        jornadaId,
        usuarioSeleccionado,
        rolSeleccionado,
        true // rebalancear siempre al agregar mesero
      )

      const esMesero = rolSeleccionado === 'mesero'
      toast({
        title: 'Trabajador agregado',
        description: esMesero
          ? 'Mesero agregado y mesas re-balanceadas'
          : `${rolSeleccionado} agregado al turno`,
        variant: 'success',
      })

      setUsuarioSeleccionado('')
      await cargar()
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar',
        variant: 'destructive',
      })
    } finally {
      setAgregando(false)
    }
  }

  const handleQuitar = async (trabajador: TrabajadorTurno) => {
    if (
      !confirm(
        `Quitar a ${trabajador.nombre} ${trabajador.apellido} del turno?` +
          (trabajador.rol === 'mesero'
            ? ' Sus mesas quedaran sin asignar.'
            : '')
      )
    ) {
      return
    }

    try {
      await turnoService.quitarTrabajador(
        jornadaId,
        trabajador.usuario_id,
        trabajador.rol
      )

      toast({
        title: 'Trabajador removido',
        description: `${trabajador.nombre} ya no esta en el turno`,
        variant: 'success',
      })

      await cargar()
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo quitar',
        variant: 'destructive',
      })
    }
  }

  const getRolInfo = (rol: RolTurno) =>
    ROLES.find((r) => r.valor === rol) || ROLES[0]

  const agrupados = ROLES.map((r) => ({
    ...r,
    trabajadores: activos.filter((t) => t.rol === r.valor),
  }))

  const idsActivos = new Set(activos.map((a) => a.usuario_id))
  const disponiblesFiltrados = disponibles[rolSeleccionado].filter(
    (d) => !idsActivos.has(d.usuario_id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Gestion de personal
          </DialogTitle>
          <DialogDescription>
            Agrega o quita trabajadores sin cerrar la jornada. Al agregar un
            mesero, las mesas se re-balancean automaticamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Agregar trabajador */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                Agregar trabajador al turno
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2">
                <Select
                  value={rolSeleccionado}
                  onValueChange={(v) => {
                    setRolSeleccionado(v as RolTurno)
                    setUsuarioSeleccionado('')
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.valor} value={r.valor}>
                        <div className="flex items-center gap-2">
                          {r.icon}
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={usuarioSeleccionado}
                  onValueChange={setUsuarioSeleccionado}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disponiblesFiltrados.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Sin trabajadores disponibles
                      </SelectItem>
                    ) : (
                      disponiblesFiltrados.map((d) => (
                        <SelectItem
                          key={d.usuario_id}
                          value={d.usuario_id}
                        >
                          {d.nombre} {d.apellido}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleAgregar}
                  disabled={!usuarioSeleccionado || agregando}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {agregando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Agregar
                </Button>
              </div>
            </div>

            {/* Lista por rol */}
            <div className="space-y-3">
              {agrupados.map((grupo) => (
                <div
                  key={grupo.valor}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${grupo.color}`}>
                      {grupo.icon}
                      <span className="text-xs font-semibold">
                        {grupo.label}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {grupo.trabajadores.length}
                    </Badge>
                  </div>

                  {grupo.trabajadores.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">
                      Sin {grupo.label.toLowerCase()} en el turno
                    </p>
                  ) : (
                    <div className="divide-y">
                      {grupo.trabajadores.map((t) => (
                        <div
                          key={t.usuario_id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700 shrink-0">
                              {t.nombre?.charAt(0)}
                              {t.apellido?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {t.nombre} {t.apellido}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {t.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuitar(t)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0 h-7"
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Quitar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={cargar}
                disabled={loading}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Recargar
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
