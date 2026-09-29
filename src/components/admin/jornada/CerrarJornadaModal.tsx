'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Loader2, Download, TrendingUp, TrendingDown,
  DollarSign, Users, ShoppingCart, FileText, X, Clock
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { jornadaStatsService, JornadaStats } from '@/lib/services/jornadaStatsService'
import { generarReporteJornadaPDF } from './ReporteJornadaPDF'
import { useAuth } from '@/hooks/useAuth'

interface CerrarJornadaModalProps {
  isOpen: boolean
  onClose: () => void
  jornada: Jornada
  onSuccess?: () => void
}

export function CerrarJornadaModal({ isOpen, onClose, jornada, onSuccess }: CerrarJornadaModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [descargandoPDF, setDescargandoPDF] = useState(false)
  const [notas, setNotas] = useState('')
  const [stats, setStats] = useState<JornadaStats | null>(null)

  useEffect(() => {
    if (isOpen) {
      cargarStats()
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

  const handleCerrar = async () => {
    if (!stats) return
    
    if (stats.resumen.pedidos_pendientes > 0) {
      const confirmar = window.confirm(
        `Hay ${stats.resumen.pedidos_pendientes} pedidos pendientes. ¿Confirmas el cierre?`
      )
      if (!confirmar) return
    }

    setLoading(true)
    try {
      const result = await jornadaService.cerrarJornada(jornada.id, notas.trim() || undefined)

      let mensaje = 'Jornada cerrada correctamente'
      if (result.pedidos_pendientes > 0) {
        mensaje += `. Quedaron ${result.pedidos_pendientes} pedidos pendientes.`
      }
      if (result.sesiones_cerradas > 0) {
        mensaje += ` Se cerraron ${result.sesiones_cerradas} sesiones de caja.`
      }

      toast({
        title: '✅ Jornada cerrada',
        description: mensaje,
        variant: 'success'
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar la jornada',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-3 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-red-700 text-xl">
            <AlertTriangle className="h-6 w-6" />
            Cerrar jornada: {jornada.nombre}
          </DialogTitle>
          <DialogDescription>
            Revisa el resumen antes de cerrar. Los usuarios de bartender, mesero y caja tendrán que cerrar sesión.
          </DialogDescription>
        </DialogHeader>

        {loadingStats ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
            <p className="text-gray-500">Cargando estadísticas de la jornada...</p>
          </div>
        ) : stats ? (
          <div className="p-6 space-y-5">
            {/* Tarjetas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">VENTAS</p>
                </div>
                <p className="text-lg font-bold text-emerald-700">
                  ${stats.resumen.total_ventas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-700 font-medium">PROPINAS</p>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  ${stats.resumen.total_propinas.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <p className="text-xs text-purple-700 font-medium">PEDIDOS</p>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  {stats.resumen.total_pedidos}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <p className="text-xs text-gray-700 font-medium">TICKET</p>
                </div>
                <p className="text-lg font-bold text-gray-700">
                  ${stats.resumen.ticket_promedio.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Alertas */}
            {(stats.resumen.pedidos_pendientes > 0 || stats.resumen.pedidos_cancelados > 0) && (
              <div className="space-y-2">
                {stats.resumen.pedidos_pendientes > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        {stats.resumen.pedidos_pendientes} pedidos pendientes
                      </p>
                      <p className="text-xs text-amber-700">
                        Permanecerán activos para la siguiente jornada hasta resolverse
                      </p>
                    </div>
                  </div>
                )}
                {stats.resumen.pedidos_cancelados > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {stats.resumen.pedidos_cancelados} pedidos cancelados
                      </p>
                      <p className="text-xs text-red-700">
                        Consulta el detalle en el PDF
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Métodos de pago */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Métodos de pago
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Efectivo</p>
                  <p className="text-sm font-bold text-gray-900">
                    ${stats.metodos_pago.efectivo.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Tarjeta</p>
                  <p className="text-sm font-bold text-gray-900">
                    ${stats.metodos_pago.tarjeta.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Transferencia</p>
                  <p className="text-sm font-bold text-gray-900">
                    ${stats.metodos_pago.transferencia.toLocaleString('es-MX')}
                  </p>
                </div>
              </div>
            </div>

            {/* Rendimiento resumido */}
            {stats.ventas_por_mesero.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gray-600" />
                  Meseros ({stats.ventas_por_mesero.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {stats.ventas_por_mesero.slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                      <span className="text-gray-700 truncate">{m.nombre}</span>
                      <span className="font-semibold text-emerald-600">
                        ${m.ventas.toLocaleString('es-MX')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sesiones de caja */}
            {stats.sesiones_caja.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Sesiones de Caja ({stats.sesiones_caja.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {stats.sesiones_caja.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                      <span className="text-gray-700">
                        {s.cajero} - {s.caja_fisica}
                      </span>
                      <span className={`font-semibold ${
                        s.diferencia !== null && Math.abs(s.diferencia) > 0
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}>
                        {s.diferencia !== null 
                          ? (s.diferencia >= 0 ? '+' : '') + '$' + s.diferencia.toFixed(2)
                          : '$' + s.total_cobrado.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas de cierre */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                Notas de cierre (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Cierre normal, evento finalizado, incidencias..."
                disabled={loading}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    Generando PDF...
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
                onClick={handleCerrar}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Confirmar cierre
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-500">No se pudieron cargar las estadísticas</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
