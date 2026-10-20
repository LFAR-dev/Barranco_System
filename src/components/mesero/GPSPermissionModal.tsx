'use client'

import { MapPin, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface GPSPermissionModalProps {
  isOpen: boolean
  onAccept: () => void
  onReject: () => void
}

export function GPSPermissionModal({ isOpen, onAccept, onReject }: GPSPermissionModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="max-w-md w-[95vw] sm:w-full"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-blue-600" />
            Compartir ubicación
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 pt-2">
            Barranco desea conocer tu ubicación aproximada mientras estás en turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">¿Para qué se usará?</p>
              <p className="text-xs text-blue-700 mt-1">
                El administrador podrá verte en el mapa del bar para coordinar mejor el servicio.
                No se comparte con otros meseros.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Puedes rechazar</p>
              <p className="text-xs text-amber-700 mt-1">
                Si no quieres compartir tu ubicación, puedes rechazar. Seguirás pudiendo
                trabajar normalmente sin ninguna limitación.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <MapPin className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Precisión limitada</p>
              <p className="text-xs text-gray-600 mt-1">
                En interiores el GPS es aproximado. Esta función es opcional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            No, gracias
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Permitir ubicación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
