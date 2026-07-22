'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Table, Users, Coffee, Sun, Home, 
  Store, Sofa, Circle, LayoutGrid, MapPin,
  Martini, Wine, Beer
} from 'lucide-react'

interface Mesa {
  id: string
  numero: string
  capacidad: number
  ubicacion: string
  activa: boolean
  estado: 'libre' | 'ocupada' | 'reservada'
  pedido_activo?: any
}

interface MesaMapProps {
  onSelectMesa: (mesa: Mesa) => void
  onNewOrder: (mesa: Mesa) => void
  meseroId: string
}

export function MesaMap({ onSelectMesa, onNewOrder, meseroId }: MesaMapProps) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZona, setSelectedZona] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const zonas = [
    { id: 'terraza', label: '🌴 Terraza', icon: Sun },
    { id: 'barra', label: '🍸 Barra', icon: Martini },
    { id: 'centro', label: '🏠 Centro', icon: Home },
    { id: 'terraza_barra', label: '🌅 Terraza Barra', icon: Sofa },
    { id: 'mercado', label: '🏪 Mercado', icon: Store },
  ]

  useEffect(() => {
    fetchMesas()
    
    const subscription = supabase
      .channel('mesas_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mesas' 
      }, () => {
        fetchMesas()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchMesas = async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('activa', true)
        .order('ubicacion')
        .order('numero')

      if (error) throw error

      const mesasConEstado = await Promise.all(
        (data || []).map(async (mesa) => {
          const { data: pedido } = await supabase
            .from('pedidos_activos')
            .select('*')
            .eq('mesa_id', mesa.id)
            .eq('estado', 'activo')
            .maybeSingle()

          return {
            ...mesa,
            estado: pedido ? 'ocupada' : 'libre',
            pedido_activo: pedido || null
          }
        })
      )

      setMesas(mesasConEstado)
    } catch (error) {
      console.error('Error fetching mesas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las mesas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getZonaColor = (zona: string) => {
    const colors: Record<string, string> = {
      terraza: 'bg-green-50 border-green-200 hover:border-green-400',
      barra: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      centro: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
      terraza_barra: 'bg-orange-50 border-orange-200 hover:border-orange-400',
      mercado: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    }
    return colors[zona] || 'bg-gray-50 border-gray-200'
  }

  const getZonaEmoji = (zona: string) => {
    const emojis: Record<string, string> = {
      terraza: '🌴',
      barra: '🍸',
      centro: '🏠',
      terraza_barra: '🌅',
      mercado: '🏪',
    }
    return emojis[zona] || '📍'
  }

  const getMesaStatus = (mesa: Mesa) => {
    if (mesa.estado === 'ocupada') {
      return { 
        label: 'Ocupada', 
        className: 'bg-red-500 text-white',
        icon: <Users className="h-3 w-3" />
      }
    }
    return { 
      label: 'Libre', 
      className: 'bg-green-500 text-white',
      icon: <Circle className="h-3 w-3" />
    }
  }

  const filteredMesas = selectedZona 
    ? mesas.filter(m => m.ubicacion === selectedZona)
    : mesas

  const groupedMesas = filteredMesas.reduce((acc, mesa) => {
    if (!acc[mesa.ubicacion]) acc[mesa.ubicacion] = []
    acc[mesa.ubicacion].push(mesa)
    return acc
  }, {} as Record<string, Mesa[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedZona === null ? 'default' : 'outline'}
          className={selectedZona === null ? 'bg-orange-600 hover:bg-orange-700' : ''}
          onClick={() => setSelectedZona(null)}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Todas
        </Button>
        {zonas.map((zona) => {
          const Icon = zona.icon
          return (
            <Button
              key={zona.id}
              variant={selectedZona === zona.id ? 'default' : 'outline'}
              className={selectedZona === zona.id ? 'bg-orange-600 hover:bg-orange-700' : ''}
              onClick={() => setSelectedZona(zona.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {zona.label}
            </Button>
          )
        })}
      </div>

      <div className="space-y-8">
        {Object.entries(groupedMesas).map(([zona, mesasZona]) => {
          const zonaInfo = zonas.find(z => z.id === zona)
          const Icon = zonaInfo?.icon || MapPin
          
          return (
            <div key={zona} className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <Icon className="h-5 w-5 text-orange-600" />
                {zonaInfo?.label || zona}
                <Badge variant="secondary" className="ml-2">
                  {mesasZona.length} mesas
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {mesasZona.map((mesa) => {
                  const status = getMesaStatus(mesa)
                  const isOcupada = mesa.estado === 'ocupada'
                  
                  return (
                    <Card 
                      key={mesa.id}
                      className={`
                        cursor-pointer transition-all duration-300 
                        ${getZonaColor(mesa.ubicacion)}
                        ${isOcupada ? 'ring-2 ring-red-400 ring-offset-2 shadow-lg' : 'hover:scale-105 hover:shadow-md'}
                        border-2
                      `}
                      onClick={() => {
                        if (isOcupada) {
                          onSelectMesa(mesa)
                        } else {
                          onNewOrder(mesa)
                        }
                      }}
                    >
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{getZonaEmoji(mesa.ubicacion)}</span>
                          <Badge className={`text-xs ${status.className}`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        
                        <div className="text-2xl font-bold text-gray-800">
                          {mesa.numero}
                        </div>
                        
                        <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                          <Users className="h-3 w-3" />
                          {mesa.capacidad} personas
                        </div>

                        {isOcupada && mesa.pedido_activo && (
                          <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded p-1">
                            <span className="font-medium">{mesa.pedido_activo.items?.length || 0}</span> items
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {filteredMesas.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Table className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No hay mesas disponibles en esta zona</p>
        </div>
      )}
    </div>
  )
}
