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
  TrendingDown, CheckCircle, Eye, Clock,
  Package, DollarSign, Calendar, AlertTriangle
} from 'lucide-react'
import { MermaAudit, auditService } from '@/lib/services/auditService'
import { useToast } from '@/hooks/use-toast'

interface MermasListProps {
  mermas: MermaAudit[]
  onRefresh: () => void
}

export function MermasList({ mermas, onRefresh }: MermasListProps) {
  const { toast } = useToast()
  const [selectedMerma, setSelectedMerma] = useState<MermaAudit | null>(null)
  const [marking, setMarking] = useState<string | null>(null)

  const handleMarcarAuditada = async (id: string) => {
    setMarking(id)
    try {
      await auditService.marcarMermaAuditada(id)
      toast({
        title: '✅ Merma auditada',
        description: 'La merma ha sido marcada como auditada',
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

  const getMotivoBadge = (motivo: string) => {
    const motivos: Record<string, string> = {
      'rotura': 'bg-red-100 text-red-700',
      'derrame': 'bg-orange-100 text-orange-700',
      'caducado': 'bg-purple-100 text-purple-700',
      'error_preparacion': 'bg-yellow-100 text-yellow-700',
      'robo': 'bg-gray-800 text-white',
      'otro': 'bg-gray-100 text-gray-700',
    }
    return motivos[motivo] || 'bg-gray-100 text-gray-700'
  }

  if (mermas.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay mermas
          </h3>
          <p className="text-sm text-gray-500">
            No se encontraron mermas con los filtros seleccionados
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
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Mermas Registradas
            </span>
            <Badge variant="secondary">{mermas.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mermas.map((merma) => (
              <div
                key={merma.id}
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  !merma.auditada ? 'bg-amber-50/50 border-amber-200' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 bg-amber-500">
                    {merma.bartender_avatar ? (
                      <AvatarImage src={merma.bartender_avatar} />
                    ) : null}
                    <AvatarFallback className="text-white font-semibold">
                      {merma.bartender_nombre ? getInitials(merma.bartender_nombre) : '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {merma.producto_nombre}
                      </h4>
                      {!merma.auditada && (
                        <Badge className="bg-amber-500 text-white text-xs">Sin auditar</Badge>
                      )}
                    </div>

                    {merma.producto_marca && (
                      <p className="text-xs text-gray-500">{merma.producto_marca}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {merma.cantidad} {merma.unidad || 'unidades'}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${merma.valor_perdido.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(merma.fecha).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getMotivoBadge(merma.motivo)}>
                        {merma.motivo}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Por: {merma.bartender_nombre}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMerma(merma)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    {!merma.auditada && (
                      <Button
                        size="sm"
                        onClick={() => handleMarcarAuditada(merma.id)}
                        disabled={marking === merma.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        {marking === merma.id ? (
                          <Clock className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Auditar
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
      <Dialog open={!!selectedMerma} onOpenChange={() => setSelectedMerma(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <TrendingDown className="h-5 w-5" />
              Detalle de Merma
            </DialogTitle>
          </DialogHeader>
          
          {selectedMerma && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {selectedMerma.producto_nombre}
                </h3>
                {selectedMerma.producto_marca && (
                  <p className="text-sm text-gray-600">{selectedMerma.producto_marca}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Cantidad
                  </label>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedMerma.cantidad} {selectedMerma.unidad || 'unidades'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Valor Perdido
                  </label>
                  <p className="mt-1 font-semibold text-red-600">
                    ${selectedMerma.valor_perdido.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Motivo
                </label>
                <div className="mt-2">
                  <Badge className={getMotivoBadge(selectedMerma.motivo)}>
                    {selectedMerma.motivo}
                  </Badge>
                </div>
              </div>

              {selectedMerma.descripcion && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Descripción
                  </label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {selectedMerma.descripcion}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10 bg-amber-500">
                  {selectedMerma.bartender_avatar ? (
                    <AvatarImage src={selectedMerma.bartender_avatar} />
                  ) : null}
                  <AvatarFallback className="text-white font-semibold">
                    {selectedMerma.bartender_nombre ? getInitials(selectedMerma.bartender_nombre) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Reportado por
                  </p>
                  <p className="font-medium text-gray-900">
                    {selectedMerma.bartender_nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedMerma.fecha).toLocaleString('es-MX')}
                  </p>
                </div>
              </div>

              {!selectedMerma.auditada && (
                <Button
                  onClick={async () => {
                    await handleMarcarAuditada(selectedMerma.id)
                    setSelectedMerma(null)
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como auditada
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
