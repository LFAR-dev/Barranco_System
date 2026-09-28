'use client'

import { useState, useEffect } from 'react'
import { Key, Clock, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { userService } from '@/lib/services/userService'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface UserNIPCardProps {
  usuarioId: string
  usuarioNombre: string
  onNIPChange?: () => void
}

export function UserNIPCard({ usuarioId, usuarioNombre, onNIPChange }: UserNIPCardProps) {
  const [loading, setLoading] = useState(false)
  const [nipData, setNipData] = useState<{
    codigo_acceso: string | null
    codigo_expiracion: string | null
  } | null>(null)
  const [showNip, setShowNip] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchNIPData()
  }, [usuarioId])

  const fetchNIPData = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('codigo_acceso, codigo_expiracion')
        .eq('id', usuarioId)
        .single()

      if (error) throw error
      setNipData(data)
    } catch (error) {
      console.error('Error al cargar NIP:', error)
    }
  }

  const generarNIP = async () => {
    if (!user || user.rol !== 'admin') {
      toast({
        title: '❌ Error',
        description: 'Solo los administradores pueden generar NIPs',
        variant: 'destructive'
      })
      return
    }

    setGenerating(true)
    try {
      const codigo = await userService.generarNIP(usuarioId, user.id)
      await fetchNIPData()
      setShowNip(true)
      
      toast({
        title: '✅ NIP Generado',
        description: `Nuevo NIP para ${usuarioNombre}: ${codigo}`,
        variant: 'success',
        duration: 10000
      })

      if (onNIPChange) onNIPChange()

      setTimeout(() => setShowNip(false), 60000)
    } catch (error: any) {
      console.error('Error al generar NIP:', error)
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo generar el NIP. Intenta de nuevo.',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const nip = nipData?.codigo_acceso
  const expiracion = nipData?.codigo_expiracion
  const isExpirado = expiracion ? new Date(expiracion) < new Date() : true
  const tieneNIP = nip && !isExpirado

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">NIP de acceso</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={generarNIP}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Generar nuevo
            </>
          )}
        </Button>
      </div>

      {tieneNIP ? (
        <div className="mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Activo
            </Badge>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expira: {new Date(expiracion!).toLocaleString('es-MX')}
            </span>
          </div>
          {showNip ? (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-700">🎯 NIP actual:</p>
              <p className="text-xl font-bold text-green-600 tracking-widest font-mono">
                {nip}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">Expira en 24 horas</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNip(false)}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              onClick={() => setShowNip(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Mostrar NIP
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <Badge className="bg-gray-100 text-gray-500 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sin NIP activo
          </Badge>
          <p className="text-xs text-gray-400 mt-1">
            Genera un nuevo NIP para que el usuario pueda acceder
          </p>
        </div>
      )}
    </div>
  )
}
