'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Loader2, Download, Lock,
  TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart,
  FileText, X, CheckCircle, ShieldAlert
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

export function CerrarTurnoModal({ isOpen, onClose, jornada, onSuccess }: CerrarTurnoModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [descargandoPDF, setDescargandoPDF] = useState(false)
  const [notas, setNotas] = useState('')
  const [stats, setStats] = useState<JornadaStats | null>(null)
  const [confirmarTexto, setConfirmarTexto] = useState('')
  const [resultado, setResultado] = useState<CierreDefinitivoResult | null>(null)

  useEffect(() => {
    if (isOpen) {
      cargarStats()
      setConfirmarTexto('')
      setResultado(null)
    }
  }, [isOpen, jornada.id])

  const cargarStats = async () => {
    setLoadingStats(true)
    try {
      const data = await jornadaStatsService.getStatsCompletas(jornada.id)
      setStats(data)
    } catch (error) {
      console.error('Error al cargar stats:', error)
    } finally {
      setLoadingStats(false)
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
        title: '✅ PDF generado',
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
      
      // Emitir evento para que TODOS los componentes de operativos detecten el cierre
      emitirEventoJornada('JORNADA_CERRADA')

      setResultado(res)

      // Toast de éxito con resumen
      let mensaje = `Turno cerrado. ${res.trabajadores_notificados} trabajadores notificados.`
      if (res.pedidos_pendientes > 0) {
        mensaje += ` ⚠️ ${res.pedidos_pendientes} pedidos pendientes se quedaron abiertos.`
      }
      if (res.sesiones_cerradas > 0) {
        mensaje += ` ${res.sesiones_cerradas} sesiones de caja cerradas.`
      }

      toast({
        title: '🔒 Turno cerrado definitivamente',
        description: mensaje,
        variant: res.pedidos_pendientes > 0 ? 'destructive' : 'success',
        duration: 10000
      })

      // Después de 3 segundos, cerrar modal y llamar onSuccess
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 3000)
    } catch (error: any) {
      console.error('Error al cerrar turno:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar el turno',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const pedidosPendientes = stats?.resumen?.pedidos_pendientes || 0
  const hayPendientes = pedidosPendientes > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <DialogTitle className="flex items-center gap-2 text-red-800 text-base sm:text-xl">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <span className="truncate">Cerrar turno definitivamente</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Esta acción <strong className="text-red-700">bloqueará todas las operaciones</strong> del turno:
            no se podrán crear pedidos, cobrar ventas ni registrar movimientos.
            Los trabajadores serán notificados y desconectados.
          </DialogDescription>
        </DialogHeader>

        {loadingStats ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-3" />
            <p className="text-gray-500 text-sm">Cargando resumen del turno...</p>
          </div>
        ) : resultado ? (
          /* Vista de resultado después del cierre */
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

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Pedidos pendientes</p>
                <p className="text-xl font-bold text-gray-900">{resultado.pedidos_pendientes}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Sesiones cerradas</p>
                <p className="text-xl font-bold text-gray-900">{resultado.sesiones_cerradas}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Notificados</p>
                <p className="text-xl font-bold text-emerald-600">{resultado.trabajadores_notificados}</p>
              </div>
            </div>

            {resultado.pedidos_pendientes > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Quedaron {resultado.pedidos_pendientes} pedidos abiertos
                    </p>
                    <p className="text-[10px] text-amber-700 mt-1">
                      Permanecen en el historial y se pueden consultar en /admin/sales
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : stats ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Resumen de ventas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-emerald-700 font-medium">VENTAS</p>
                </div>
                <p className="text-sm sm:text-lg font-bold text-emerald-700 truncate">
                  ${stats.resumen.total_ventas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-blue-700 font-medium">PROPINAS</p>
                </div>
                <p className="text-sm sm:text-lg font-bold text-blue-700 truncate">
                  ${stats.resumen.total_propinas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingCart className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-purple-700 font-medium">PEDIDOS</p>
                </div>
                <p className="text-sm sm:text-lg font-bold text-purple-700">
                  {stats.resumen.total_pedidos}
                </p>
              </div>

              <div className={`rounded-lg p-2 sm:p-3 border ${
                hayPendientes 
                  ? 'bg-amber-50 border-amber-300' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                    hayPendientes ? 'text-amber-600' : 'text-gray-500'
                  }`} />
                  <p className={`text-[10px] sm:text-xs font-medium ${
                    hayPendientes ? 'text-amber-700' : 'text-gray-600'
                  }`}>PENDIENTES</p>
                </div>
                <p className={`text-sm sm:text-lg font-bold ${
                  hayPendientes ? 'text-amber-700' : 'text-gray-700'
                }`}>
                  {pedidosPendientes}
                </p>
              </div>
            </div>

            {/* Advertencia de pedidos pendientes */}
            {hayPendientes && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      ⚠️ Hay {pedidosPendientes} pedido{pedidosPendientes === 1 ? '' : 's'} pendiente{pedidosPendientes === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Los pedidos pendientes <strong>NO se cancelarán</strong>. Permanecerán en el historial 
                      y podrás consultarlos en <code className="bg-red-100 px-1 rounded">/admin/sales</code>.
                      Los clientes deberán ser notificados por otro medio.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lo que va a pasar */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                Al confirmar el cierre:
              </p>
              <ul className="text-xs text-gray-700 space-y-1 ml-5 list-disc">
                <li>Se <strong>bloqueará</strong> la creación de nuevos pedidos y ventas</li>
                <li>Se <strong>cerrarán</strong> las sesiones de caja abiertas</li>
                <li>Todos los trabajadores activos serán <strong>notificados</strong> y desconectados</li>
                <li>Los operativos verán un aviso de "Turno cerrado" al hacer cualquier acción</li>
                <li>El historial completo queda disponible en <code className="bg-white px-1 rounded">/admin/sales</code></li>
              </ul>
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                Notas de cierre (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Cierre normal, evento finalizado, incidencias..."
                disabled={loading}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Confirmación con texto */}
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

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleDescargarPDF}
                disabled={descargandoPDF || loading}
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
                disabled={loading || confirmarTexto.trim().toUpperCase() !== 'CERRAR'}
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
