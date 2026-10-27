'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, FileText, Loader2, Users, CheckCircle,
  Copy, Check, KeyRound, Coffee, Wine, ShoppingCart
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { jornadaService } from '@/lib/services/jornadaService'
import { turnoService, TrabajadorDisponible, RolTurno } from '@/lib/services/turnoService'
import { emitirEventoJornada } from '@/lib/events/jornadaEvents'

interface AbrirJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface NipGenerado {
  usuario_id: string
  nombre: string
  apellido: string
  rol: string
  nip: string
}

type Vista = 'formulario' | 'resultado'

const ROLES_CONFIG: Array<{
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

export function AbrirJornadaModal({ isOpen, onClose, onSuccess }: AbrirJornadaModalProps) {
  const { toast } = useToast()
  const [vista, setVista] = useState<Vista>('formulario')
  const [loading, setLoading] = useState(false)
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false)
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [trabajadores, setTrabajadores] = useState<TrabajadorDisponible[]>([])
  const [seleccion, setSeleccion] = useState<Record<RolTurno, Set<string>>>({
    mesero: new Set(),
    bartender: new Set(),
    caja: new Set(),
  })
  const [nipsGenerados, setNipsGenerados] = useState<NipGenerado[]>([])
  const [copiado, setCopiado] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setVista('formulario')
      setLoading(false)
      setNipsGenerados([])
      setCopiado(false)
      setSeleccion({
        mesero: new Set(),
        bartender: new Set(),
        caja: new Set(),
      })
      
      if (!nombre) {
        const hoy = new Date()
        const dia = hoy.toLocaleDateString('es-MX', { weekday: 'long' })
        const fecha = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
        const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1)
        setNombre(`${diaCapitalizado} ${fecha}`)
      }

      cargarTrabajadores()
    } else {
      setNombre('')
      setNotas('')
      setVista('formulario')
    }
  }, [isOpen])

  const cargarTrabajadores = async () => {
    setLoadingTrabajadores(true)
    try {
      const [meseros, bartenders, cajeros] = await Promise.all([
        turnoService.getTrabajadoresDisponiblesPorRol('mesero'),
        turnoService.getTrabajadoresDisponiblesPorRol('bartender'),
        turnoService.getTrabajadoresDisponiblesPorRol('caja'),
      ])
      setTrabajadores([...meseros, ...bartenders, ...cajeros])
    } catch (error) {
      console.error('Error al cargar trabajadores:', error)
    } finally {
      setLoadingTrabajadores(false)
    }
  }

  const toggleSeleccion = (rol: RolTurno, usuarioId: string) => {
    setSeleccion((prev) => {
      const nuevoSet = new Set(prev[rol])
      if (nuevoSet.has(usuarioId)) {
        nuevoSet.delete(usuarioId)
      } else {
        nuevoSet.add(usuarioId)
      }
      return { ...prev, [rol]: nuevoSet }
    })
  }

  const toggleTodos = (rol: RolTurno) => {
    const delRol = trabajadores.filter((t) => t.rol === rol).map((t) => t.usuario_id)
    const todosSeleccionados = delRol.every((id) => seleccion[rol].has(id))
    
    setSeleccion((prev) => {
      const nuevoSet = todosSeleccionados ? new Set<string>() : new Set(delRol)
      return { ...prev, [rol]: nuevoSet }
    })
  }

  const getTotalSeleccionados = () => {
    return seleccion.mesero.size + seleccion.bartender.size + seleccion.caja.size
  }

  const handleAbrirJornada = async () => {
    if (!nombre.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'La jornada debe tener un nombre',
        variant: 'destructive'
      })
      return
    }

    const total = getTotalSeleccionados()
    if (total === 0) {
      toast({
        title: 'Sin trabajadores',
        description: 'Selecciona al menos un trabajador para abrir la jornada',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const result = await jornadaService.abrirJornadaCompleta(
        nombre.trim(),
        notas.trim() || undefined,
        Array.from(seleccion.mesero),
        Array.from(seleccion.bartender),
        Array.from(seleccion.caja)
      )

      // Rebalancear mesas si hay meseros
      if (seleccion.mesero.size > 0) {
        try {
          const { asignacionMesasService } = await import('@/lib/services/asignacionMesasService')
          await asignacionMesasService.repartirMesas(
            result.jornada_id,
            Array.from(seleccion.mesero)
          )
        } catch (e) {
          console.warn('No se pudieron rebalancear mesas:', e)
        }
      }

      emitirEventoJornada('JORNADA_ABIERTA')
      setNipsGenerados(result.trabajadores)
      setVista('resultado')

      toast({
        title: 'Jornada abierta',
        description: `${result.trabajadores.length} NIPs generados`,
        variant: 'success'
      })
    } catch (error: any) {
      console.error('Error al abrir jornada:', error)
      toast({
        title: 'Error al abrir',
        description: error.message || 'No se pudo abrir la jornada',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopiarTodos = async () => {
    const texto = nipsGenerados
      .map((n) => `${n.nombre} ${n.apellido} (${n.rol}): ${n.nip}`)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
      toast({
        title: 'NIPs copiados',
        description: 'Todos los NIPs estan en el portapapeles',
        variant: 'success'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive'
      })
    }
  }

  const handleCopiarUno = async (nip: NipGenerado) => {
    try {
      await navigator.clipboard.writeText(nip.nip)
      toast({
        title: 'NIP copiado',
        description: `NIP de ${nip.nombre} copiado`,
        variant: 'success'
      })
    } catch {
      // Silencioso
    }
  }

  const handleCerrarDespues = () => {
    onSuccess?.()
    onClose()
  }

  // Agrupar trabajadores por rol
  const trabajadoresPorRol = ROLES_CONFIG.map((config) => ({
    ...config,
    trabajadores: trabajadores.filter((t) => t.rol === config.valor),
  }))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="flex items-center gap-2 text-emerald-800 text-base sm:text-lg">
            <Calendar className="h-5 w-5 shrink-0" />
            {vista === 'formulario' ? 'Abrir jornada del dia' : 'NIPs generados'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {vista === 'formulario'
              ? 'Configura la jornada y selecciona a los trabajadores. Se generaran NIPs automaticamente.'
              : 'Entrega estos NIP a cada trabajador. No se volveran a mostrar.'}
          </DialogDescription>
        </DialogHeader>

        {vista === 'formulario' ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Nombre y notas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  Nombre de la jornada
                </Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Viernes 12 diciembre"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notas" className="flex items-center gap-1.5 text-sm">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  Notas (opcional)
                </Label>
                <Input
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Evento especial..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Trabajadores por rol */}
            {loadingTrabajadores ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Cargando trabajadores...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trabajadoresPorRol.map((grupo) => {
                  const seleccionados = seleccion[grupo.valor].size
                  const total = grupo.trabajadores.length
                  const todosSeleccionados = total > 0 && seleccionados === total

                  return (
                    <div
                      key={grupo.valor}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className={`px-3 py-2 border-b bg-gray-50 flex items-center justify-between`}>
                        <div className={`flex items-center gap-1.5 ${grupo.color}`}>
                          {grupo.icon}
                          <span className="text-xs font-semibold">{grupo.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {seleccionados}/{total}
                        </Badge>
                      </div>

                      {total > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleTodos(grupo.valor)}
                          className="w-full px-3 py-1.5 text-[10px] text-blue-600 hover:bg-blue-50 border-b font-medium text-left"
                        >
                          {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                      )}

                      <div className="max-h-48 overflow-y-auto">
                        {grupo.trabajadores.length === 0 ? (
                          <p className="text-xs text-gray-400 p-3 text-center">
                            Sin {grupo.label.toLowerCase()} registrados
                          </p>
                        ) : (
                          grupo.trabajadores.map((t) => {
                            const sel = seleccion[grupo.valor].has(t.usuario_id)
                            return (
                              <label
                                key={t.usuario_id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => toggleSeleccion(grupo.valor, t.usuario_id)}
                                  disabled={loading}
                                  className="h-3.5 w-3.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {t.nombre} {t.apellido}
                                  </p>
                                </div>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAbrirJornada}
                disabled={loading || getTotalSeleccionados() === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Abriendo...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Abrir jornada y generar NIPs
                    {getTotalSeleccionados() > 0 && (
                      <Badge className="ml-2 bg-white/20 text-white border-0 text-[10px]">
                        {getTotalSeleccionados()}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* VISTA DE RESULTADO */
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-700" />
                <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                  Jornada abierta: {nombre}
                </p>
              </div>
              <p className="text-xs text-emerald-700">
                {nipsGenerados.length} NIPs generados. Copialos y entregalos.
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Nombre</th>
                    <th className="text-left p-2">Rol</th>
                    <th className="text-left p-2">NIP</th>
                    <th className="text-center p-2">Copiar</th>
                  </tr>
                </thead>
                <tbody>
                  {nipsGenerados.map((nip) => (
                    <tr key={nip.usuario_id} className="border-t">
                      <td className="p-2 font-medium">
                        {nip.nombre} {nip.apellido}
                      </td>
                      <td className="p-2">
                        <Badge className="bg-gray-100 text-gray-700 text-[9px] capitalize">
                          {nip.rol}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <code className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-sm tracking-wider">
                          {nip.nip}
                        </code>
                      </td>
                      <td className="text-center p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopiarUno(nip)}
                          className="h-6 px-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Importante:</strong> Estos NIPs no se volveran a mostrar.
                Copialos ahora y entregalos a cada trabajador. Expiran al cierre de la jornada.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopiarTodos}
                className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {copiado ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiados
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar todos
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={handleCerrarDespues}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Listo, cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
