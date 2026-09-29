'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Power } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { roundRobinService } from '@/lib/services/roundRobinService'

type Rol = 'bartender' | 'mesero'

interface ToggleDisponibilidadProps {
  rol: Rol
  usuarioId: string
  onCambio?: (disponible: boolean) => void
}

export function ToggleDisponibilidad({ rol, usuarioId, onCambio }: ToggleDisponibilidadProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [disponible, setDisponible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [cambiando, setCambiando] = useState(false)
  const [registroId, setRegistroId] = useState<string | null>(null)

  useEffect(() => {
    cargarDisponibilidad()
    // Polling cada 20 segundos para mantener sincronizado
    const interval = setInterval(cargarDisponibilidad, 20000)
    return () => clearInterval(interval)
  }, [usuarioId, rol])

  const cargarDisponibilidad = async () => {
    try {
      const tabla = rol === 'bartender' ? 'bartenders' : 'meseros'
      const { data, error } = await supabase
        .from(tabla)
        .select('id, disponible')
        .eq('usuario_id', usuarioId)
        .maybeSingle()

      if (error) {
        console.error('Error al cargar disponibilidad:', error)
        return
      }

      if (data) {
        setDisponible(data.disponible || false)
        setRegistroId(data.id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (registroId === null || disponible === null) return

    setCambiando(true)
    const nuevoValor = !disponible

    try {
      if (rol === 'bartender') {
        await roundRobinService.toggleDisponibilidadBartender(registroId, nuevoValor)
      } else {
        await roundRobinService.toggleDisponibilidadMesero(registroId, nuevoValor)
      }

      setDisponible(nuevoValor)
      onCambio?.(nuevoValor)

      toast({
        title: nuevoValor ? '✅ Disponible' : '⏸️ No disponible',
        description: nuevoValor
          ? `Recibirás ${rol === 'bartender' ? 'pedidos' : 'mesas'} automáticamente`
          : `Ya no recibirás ${rol === 'bartender' ? 'pedidos nuevos' : 'mesas nuevas'}`,
        variant: nuevoValor ? 'success' : 'default'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar la disponibilidad',
        variant: 'destructive'
      })
    } finally {
      setCambiando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Cargando...</span>
      </div>
    )
  }

  if (registroId === null) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">
          No tienes registro de {rol}
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={cambiando}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
        disponible
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
      } ${cambiando ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      {cambiando ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : disponible ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      <span className="text-sm">
        {disponible 
          ? `Disponible para ${rol === 'bartender' ? 'pedidos' : 'mesas'}` 
          : `No disponible`}
      </span>
    </button>
  )
}
