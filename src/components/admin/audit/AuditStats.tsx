'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertCircle, TrendingDown, DollarSign, Clock,
  CheckCircle, XCircle, Users
} from 'lucide-react'

interface AuditStatsProps {
  stats: {
    cancelaciones: {
      total: number
      noLeidas: number
      valorTotal: number
    }
    mermas: {
      total: number
      noAuditadas: number
      valorTotal: number
    }
  }
}

export function AuditStats({ stats }: AuditStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Cancelaciones */}
      <Card className="border-t-4 border-t-red-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Cancelaciones</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.cancelaciones.total}
              </p>
              {stats.cancelaciones.noLeidas > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {stats.cancelaciones.noLeidas} sin revisar
                </p>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valor cancelado */}
      <Card className="border-t-4 border-t-orange-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Valor Cancelado</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ${stats.cancelaciones.valorTotal.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Últimos 30 días</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mermas */}
      <Card className="border-t-4 border-t-amber-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Mermas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.mermas.total}
              </p>
              {stats.mermas.noAuditadas > 0 && (
                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.mermas.noAuditadas} sin auditar
                </p>
              )}
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <TrendingDown className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valor mermas */}
      <Card className="border-t-4 border-t-purple-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Valor Mermas</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${stats.mermas.valorTotal.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Últimos 30 días</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
