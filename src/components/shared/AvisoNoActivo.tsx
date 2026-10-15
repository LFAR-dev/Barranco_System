'use client'

import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AvisoNoActivoProps {
  onRecargar?: () => void
  onSalir?: () => void
  rolLabel?: string
}

export function AvisoNoActivo({ onRecargar, onSalir, rolLabel = 'trabajador' }: AvisoNoActivoProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-50/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl border-2 border-amber-200">
        <CardContent className="p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No estás activo en el turno
            </h2>
            <p className="text-sm text-gray-600">
              El administrador aún no te ha activado para el turno actual.
              Puedes seguir navegando, pero no podrás realizar operaciones de {rolLabel} 
              hasta que te activen.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2 text-left">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>¿Qué hacer?</strong> Contacta al administrador para que te active 
                en el turno. Una vez activado, podrás operar normalmente.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {onRecargar && (
              <Button
                variant="outline"
                onClick={onRecargar}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar de nuevo
              </Button>
            )}
            {onSalir && (
              <Button
                variant="outline"
                onClick={onSalir}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir del turno
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
