'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Loader2, Download, Lock,
  DollarSign, Users, ShoppingCart,
  FileText, X, CheckCircle, ShieldAlert,
  ArrowRight, ExternalLink
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  jornadaService,
  Jornada,
  cerrarTurnoDefinitivo,
  CierreDefinitivoResult
} from '@/lib/services/jornadaService'
import { jornadaStatsService, JornadaStats } from '@/lib/services/jornadaStatsService'
import { generarReporteJornadaPDF } from './ReporteJornadaPDF'
import { emitirEventoJornada } from '@/lib/events/jornadaEvents'

interface CerrarTurnoModalProps {
  isOpen: boolean
  onClose: () => void
  jornada: Jornada
  onSuccess?: () => void
}

interface CuentaPendiente {
  id: string
  mesa: string
  total: number
  mesero: string
  estado: string
  abierta_en: string
}

export function CerrarTurnoModal({ isOpen, onClose, jornada, onSuccess }: CerrarTurnoModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingCuentas, setLoadingCuentas] = useState(true)
  const [descargandoPDF, setDescargandoPDF] = useState(false)
  
  const [notas, setNotas] = useState('')
  const [stats, setStats] = useState<JornadaStats | null>(null)
  const [cuentasPendientes, setCuentasPendientes] = useState<CuentaPendiente[]>([])
  const [confirmarTexto, setConfirmarTexto] = useState('')
  const [resultado, setResultado] = useState<CierreDefinitivoResult | null>(null)

  useEffect(() => {
    if (isOpen) {
      cargarDatos()
      setConfirmarTexto('')
      setResultado(null)
      setNotas('')
    }
  }, [isOpen, jornada.id])

  const cargarDatos = async () => {
    setLoadingStats(true)
    setLoadingCuentas(true)
    
    try {
      const [statsData, cuentasData] = await Promise.all([
        jornadaStatsService.getStatsCompletas(jornada.id),
        jornadaService.getCuentasPendientesCierre(jornada.id)
      ])
      setStats(statsData)
      setCuentasPendientes(cuentasData)
    } catch (error) {
      console.error('Error al cargar datos del cierre:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del cierre',
        variant: 'destructive'
      })
    } finally {
      setLoadingStats(false)
      setLoadingCuentas(false)
    }
  }

  const handleDescargarPDF = async () => {
    if (!stats) return
    setDescargandoPDF(true)
    try {
      const nombre = user?.nombre 
        ? `${user.nombre} ${user.apellido || ''}`.trim() 
        : 'Administrador'
      generarReporteJornadaPDF(stats, nombre)
      toast({
        title: 'PDF generado',
        description: 'El reporte se descargó correctamente',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive'
      })
    } finally {
      setDescargandoPDF(false)
    }
  }

  const handleCerrarDefinitivo = async () => {
    if (confirmarTexto.trim().toUpperCase() !== 'CERRAR') {
      toast({
        title: 'Confirmación requerida',
        description: 'Escribe "CERRAR" en el campo para confirmar',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const res = await cerrarTurnoDefinitivo(jornada.id, notas.trim() || undefined)
      
      emitirEventoJornada('JORNADA_CERRADA')
      setResultado(res)

      let mensaje = `Turno cerrado. ${res.trabajadores_notificados} trabajadores notificados.`
      if (res.sesiones_cerradas > 0) {
        mensaje += ` ${res.sesiones_cerradas} sesiones de caja cerradas.`
      }

      toast({
        title: 'Turno cerrado definitivamente',
        description: mensaje,
        variant: 'success',
        duration: 8000
      })

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 3000)
    } catch (error: any) {
      console.error('Error al cerrar turno:', error)
      toast({
        title: 'Error al cerrar',
        description: error.message || 'No se pudo cerrar el turno',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const hayCuentasPendientes = cuentasPendientes.length > 0
  const totalPendiente = cuentasPendientes.reduce((s, c) => s + c.total, 0)
  const puedeCerrar = !hayCuentasPendientes && !loading && confirmarTexto.trim().toUpperCase() === 'CERRAR'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <DialogTitle className="flex items-center gap-2 text-red-800 text-base sm:text-xl">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <span className="truncate">Cerrar turno definitivamente</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Esta acción <strong className="text-red-700">bloqueará todas las operaciones</strong> del turno.
            {hayCuentasPendientes ? (
              <span className="text-red-700 font-semibold"> Hay cuentas pendientes de cobro que deben liquidarse antes de cerrar.</span>
            ) : (
              ' Los trabajadores serán notificados y desconectados.'
            )}
          </DialogDescription>
        </DialogHeader>

        {loadingStats || loadingCuentas ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-3" />
            <p className="text-gray-500 text-sm">Cargando resumen del turno...</p>
          </div>
        ) : resultado ? (
          <div className="p-6 space-y-4">
            <div className="text-center py-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Turno cerrado exitosamente
              </h3>
              <p className="text-sm text-gray-600">
                Todos los trabajadores han sido notificados
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Sesiones cerradas</p>
                <p className="text-xl font-bold text-gray-900">{resultado.sesiones_cerradas}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Notificados</p>
                <p className="text-xl font-bold text-emerald-600">{resultado.trabajadores_notificados}</p>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* ALERTA DE CUENTAS PENDIENTES */}
            {hayCuentasPendientes && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      No se puede cerrar el turno
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Hay {cuentasPendientes.length} cuenta{cuentasPendientes.length === 1 ? '' : 's'} sin cobrar por un total de <strong>${totalPendiente.toFixed(2)}</strong>.
                      Debes cobrarlas en Caja antes de cerrar la jornada.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded border border-red-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="text-left p-2">Mesa</th>
                        <th className="text-left p-2">Mesero</th>
                        <th className="text-left p-2">Estado</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasPendientes.map((c) => (
                        <tr key={c.id} className="border-t border-red-100">
                          <td className="p-2 font-semibold">{c.mesa}</td>
                          <td className="p-2">{c.mesero}</td>
                          <td className="p-2">
                            <Badge className="bg-amber-100 text-amber-700 text-[9px]">
                              {c.estado === 'cuenta_solicitada' ? 'Cuenta pedida' : 
                               c.estado === 'cobrando' ? 'Cobrando' : 'Abierta'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-bold text-red-700">
                            ${c.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  onClick={() => {
                    onClose()
                    router.push('/caja')
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir a cobrar cuentas en Caja
                </Button>
              </div>
            )}

            {/* RESUMEN DE VENTAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-emerald-700 font-medium">VENTAS</p>
                </div>
                <p className="text-sm font-bold text-emerald-700 truncate">
                  ${stats.resumen.total_ventas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <p className="text-[10px] text-blue-700 font-medium">PROPINAS</p>
                </div>
                <p className="text-sm font-bold text-blue-700 truncate">
                  ${stats.resumen.total_propinas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingCart className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <p className="text-[10px] text-purple-700 font-medium">PEDIDOS</p>
                </div>
                <p className="text-sm font-bold text-purple-700">
                  {stats.resumen.total_pedidos}
                </p>
              </div>

              <div className={`rounded-lg p-2 border ${
                stats.resumen.pedidos_pendientes > 0 
                  ? 'bg-amber-50 border-amber-300' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                    stats.resumen.pedidos_pendientes > 0 ? 'text-amber-600' : 'text-gray-500'
                  }`} />
                  <p className={`text-[10px] font-medium ${
                    stats.resumen.pedidos_pendientes > 0 ? 'text-amber-700' : 'text-gray-600'
                  }`}>PENDIENTES</p>
                </div>
                <p className={`text-sm font-bold ${
                  stats.resumen.pedidos_pendientes > 0 ? 'text-amber-700' : 'text-gray-700'
                }`}>
                  {stats.resumen.pedidos_pendientes}
                </p>
              </div>
            </div>

            {/* LO QUE VA A PASAR */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                Al confirmar el cierre:
              </p>
              <ul className="text-xs text-gray-700 space-y-1 ml-5 list-disc">
                <li>Se <strong>bloqueará</strong> la creación de nuevos pedidos y ventas</li>
                <li>Se <strong>cerrarán</strong> las sesiones de caja abiertas</li>
                <li>Todas las mesas pasarán a <strong>disponible</strong> y se liberarán</li>
                <li>Todos los trabajadores activos serán <strong>notificados</strong></li>
                <li>El historial completo queda disponible en <code className="bg-white px-1 rounded">/admin/sales</code></li>
              </ul>
            </div>

            {/* NOTAS */}
            <div>
              <label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                Notas de cierre (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Cierre normal, evento finalizado, incidencias..."
                disabled={loading || hayCuentasPendientes}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>

            {/* CONFIRMACION */}
            {!hayCuentasPendientes && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                <label className="text-xs font-semibold text-red-800 mb-2 block">
                  Para confirmar, escribe <code className="bg-white px-1.5 py-0.5 rounded text-red-700">CERRAR</code> en el campo:
                </label>
                <input
                  type="text"
                  value={confirmarTexto}
                  onChange={(e) => setConfirmarTexto(e.target.value)}
                  placeholder="Escribe CERRAR"
                  disabled={loading}
                  className="w-full rounded-md border-2 border-red-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                />
              </div>
            )}

            {/* BOTONES */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleDescargarPDF}
                disabled={descargandoPDF || loading || hayCuentasPendientes}
                className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {descargandoPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleCerrarDefinitivo}
                disabled={!puedeCerrar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Cerrar definitivamente
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No se pudieron cargar las estadísticas</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
