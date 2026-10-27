'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Palette, Loader2, RefreshCw, Users, Coffee, Wine
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { ColorPickerPopover } from './ColorPickerPopover'

interface UsuarioConColor {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  color_mapa: string | null
  avatar_url: string | null
  activo: boolean
}

export function GestionColoresUsuarios() {
  const { toast } = useToast()
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<UsuarioConColor[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol, color_mapa, avatar_url, activo')
        .in('rol', ['mesero', 'bartender', 'caja'])
        .eq('activo', true)
        .order('rol')
        .order('nombre')

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleColorChange = (usuarioId: string, nuevoColor: string) => {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioId ? { ...u, color_mapa: nuevoColor } : u
      )
    )
  }

  const agrupados = {
    mesero: usuarios.filter((u) => u.rol === 'mesero'),
    bartender: usuarios.filter((u) => u.rol === 'bartender'),
    caja: usuarios.filter((u) => u.rol === 'caja'),
  }

  const grupos = [
    {
      rol: 'mesero',
      label: 'Meseros',
      icon: <Coffee className="h-4 w-4" />,
      color: 'text-orange-600',
      items: agrupados.mesero,
    },
    {
      rol: 'bartender',
      label: 'Bartenders',
      icon: <Wine className="h-4 w-4" />,
      color: 'text-green-600',
      items: agrupados.bartender,
    },
    {
      rol: 'caja',
      label: 'Cajeros',
      icon: <Users className="h-4 w-4" />,
      color: 'text-emerald-600',
      items: agrupados.caja,
    },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
          <p className="text-xs text-gray-500 mt-2">Cargando usuarios...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-600" />
            Colores del mapa
          </h2>
          <p className="text-sm text-gray-500">
            Asigna un color a cada trabajador para identificarlo en el mapa de mesas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar
        </Button>
      </div>

      {grupos.map((grupo) => (
        <Card key={grupo.rol}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={grupo.color}>{grupo.icon}</div>
              <span className="text-sm font-semibold">{grupo.label}</span>
              <Badge variant="secondary" className="text-[10px]">
                {grupo.items.length}
              </Badge>
            </div>

            {grupo.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                Sin {grupo.label.toLowerCase()} activos
              </p>
            ) : (
              <div className="space-y-1">
                {grupo.items.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: u.color_mapa || '#6b7280',
                        }}
                      >
                        {u.nombre?.charAt(0)}
                        {u.apellido?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {u.nombre} {u.apellido}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <ColorPickerPopover
                      usuarioId={u.id}
                      colorActual={u.color_mapa}
                      onSuccess={(nuevoColor) =>
                        handleColorChange(u.id, nuevoColor)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
