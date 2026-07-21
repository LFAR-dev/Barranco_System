'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Key, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { userService } from '@/lib/services/userService'
import { useAuth } from '@/hooks/useAuth'

interface UserNIPCardProps {
  usuarioId: string
  usuarioNombre: string
  onNIPChange?: () => void
}

export function UserNIPCard({ usuarioId, usuarioNombre, onNIPChange }: UserNIPCardProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [nip, setNip] = useState<string | null>(null)
  const [expiracion, setExpiracion] = useState<string | null>(null)
  const [expirado, setExpirado] = useState(false)
  const [generando, setGenerando] = useState(false)

  const cargarNIP = async () => {
    try {
      const data = await userService.getNIP(usuarioId)
      setNip(data.codigo)
      setExpiracion(data.expiracion)
      
      if (data.expiracion) {
        const exp = new Date(data.expiracion)
        setExpirado(exp < new Date())
      }
    } catch (error) {
      console.error('Error al cargar NIP:', error)
    }
  }

  const generarNuevoNIP = async () => {
    if (!user) return
    setGenerando(true)
    try {
      const nuevoNIP = await userService.generarNIP(usuarioId, user.id)
      setNip(nuevoNIP)
      setExpirado(false)
      
      const data = await userService.getNIP(usuarioId)
      setExpiracion(data.expiracion)
      
      if (onNIPChange) onNIPChange()
      
      // Mostrar notificación
      alert(`✅ Nuevo NIP generado para ${usuarioNombre}: ${nuevoNIP}`)
    } catch (error: any) {
      alert('Error al generar el NIP: ' + error.message)
      console.error(error)
    } finally {
      setGenerando(false)
    }
  }

  useEffect(() => {
    cargarNIP()
  }, [usuarioId])

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha'
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = () => {
    if (!nip) return 'bg-gray-100 text-gray-500'
    if (expirado) return 'bg-red-100 text-red-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusText = () => {
    if (!nip) return 'Sin NIP'
    if (expirado) return 'Expirado'
    return 'Activo'
  }

  const getStatusIcon = () => {
    if (!nip) return <AlertCircle className="h-3 w-3" />
    if (expirado) return <AlertCircle className="h-3 w-3" />
    return <CheckCircle className="h-3 w-3" />
  }

  return (
    <Card className="border-2 border-blue-100/50 bg-gradient-to-br from-blue-50/50 to-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">NIP de Acceso</span>
              <Badge className={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusText()}</span>
              </Badge>
            </div>

            {nip ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-widest text-gray-900 font-mono">
                    {nip}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatFecha(expiracion)}
                  </Badge>
                </div>
                {expirado && (
                  <p className="text-xs text-red-600">
                    ⚠️ El NIP ha expirado. Genera uno nuevo.
                  </p>
                )}
                {!expirado && nip && (
                  <p className="text-xs text-green-600">
                    ✅ Válido hasta {formatFecha(expiracion)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Este usuario no tiene un NIP asignado
              </p>
            )}
          </div>

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={generarNuevoNIP}
            disabled={generando}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${generando ? 'animate-spin' : ''}`} />
            {generando ? 'Generando...' : 'Nuevo NIP'}
          </Button>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            💡 El NIP se actualiza automáticamente cada 24 horas o cuando el administrador lo genera manualmente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
