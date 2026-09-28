'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  AlertTriangle, CheckCircle, Eye, Clock,
  User, DollarSign, Package, Calendar
} from 'lucide-react'
import { CancelacionAudit, auditService } from '@/lib/services/auditService'
import { useToast } from '@/hooks/use-toast'

interface CancelacionesListProps {
  cancelaciones: CancelacionAudit[]
  onRefresh: () => void
}

export function CancelacionesList({ cancelaciones, onRefresh }: CancelacionesListProps) {
  const { toast } = useToast()
  const [selectedCancelacion, setSelectedCancelacion] = useState<CancelacionAudit | null>(null)
  const [marking, setMarking] = useState<string | null>(null)

  const handleMarcarLeida = async (id: string) => {
    setMarking(id)
    try {
      await auditService.marcarCancelacionLeida(id)
      toast({
        title: '✅ Marcada como revisada',
        description: 'La cancelación ha sido marcada como revisada',
        variant: 'success'
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setMarking(null)
    }
  }

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRolBadge = (rol: string) => {
    switch (rol) {
      case 'caja':
        return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Caja</Badge>
      case 'mesero':
        return <Badge className="bg-orange-100 text-orange-700 text-xs">Mesero</Badge>
      case 'bartender':
        return <Badge className="bg-green-100 text-green-700 text-xs">Bartender</Badge>
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-700 text-xs">Admin</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700 text-xs">{rol}</Badge>
    }
  }

  if (cancelaciones.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay cancelaciones
          </h3>
          <p className="text-sm text-gray-500">
            No se encontraron cancelaciones con los filtros seleccionados
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancelaciones
            </span>
            <Badge variant="secondary">{cancelaciones.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cancelaciones.map((cancelacion) => (
              <div
                key={cancelacion.id}
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  !cancelacion.leida ? 'bg-red-50/50 border-red-200' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 bg-red-500">
                    {cancelacion.usuario_avatar ? (
                      <AvatarImage src={cancelacion.usuario_avatar} />
                    ) : null}
                    <AvatarFallback className="text-white font-semibold">
                      {getInitials(cancelacion.usuario_nombre)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {cancelacion.usuario_nombre}
                      </h4>
                      {getRolBadge(cancelacion.usuario_rol)}
                      {!cancelacion.leida && (
                        <Badge className="bg-red-500 text-white text-xs">Nueva</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {cancelacion.mensaje}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {cancelacion.pedido_info?.mesa && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Mesa: {cancelacion.pedido_info.mesa}
                        </span>
                      )}
                      {cancelacion.pedido_info?.total !== undefined && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${cancelacion.pedido_info.total.toFixed(2)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(cancelacion.created_at).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCancelacion(cancelacion)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    {!cancelacion.leida && (
                      <Button
                        size="sm"
                        onClick={() => handleMarcarLeida(cancelacion.id)}
                        disabled={marking === cancelacion.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        {marking === cancelacion.id ? (
                          <Clock className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Revisar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      <Dialog open={!!selectedCancelacion} onOpenChange={() => setSelectedCancelacion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Detalle de Cancelación
            </DialogTitle>
          </DialogHeader>
          
          {selectedCancelacion && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12 bg-red-500">
                  {selectedCancelacion.usuario_avatar ? (
                    <AvatarImage src={selectedCancelacion.usuario_avatar} />
                  ) : null}
                  <AvatarFallback className="text-white font-semibold">
                    {getInitials(selectedCancelacion.usuario_nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {selectedCancelacion.usuario_nombre}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRolBadge(selectedCancelacion.usuario_rol)}
                    <span className="text-xs text-gray-500">
                      {new Date(selectedCancelacion.created_at).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Motivo
                  </label>
                  <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-gray-900">
                    {selectedCancelacion.motivo}
                  </p>
                </div>

                {selectedCancelacion.pedido_info && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Mesa
                        </label>
                        <p className="mt-1 font-semibold text-gray-900">
                          {selectedCancelacion.pedido_info.mesa || 'Caja'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Total
                        </label>
                        <p className="mt-1 font-semibold text-red-600">
                          ${(selectedCancelacion.pedido_info.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {selectedCancelacion.pedido_info.items && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Productos cancelados
                        </label>
                        <div className="mt-2 space-y-1">
                          {selectedCancelacion.pedido_info.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                              <span>{item.nombre}</span>
                              <span className="font-medium">×{item.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!selectedCancelacion.leida && (
                <Button
                  onClick={async () => {
                    await handleMarcarLeida(selectedCancelacion.id)
                    setSelectedCancelacion(null)
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como revisada
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
