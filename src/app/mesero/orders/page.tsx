'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Plus, Coffee, Clock, CheckCircle, 
  XCircle, ShoppingBag, Users, MapPin, 
  Home, Store, Sun, Sofa, Martini, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { MesaMap } from '@/components/mesero/MesaMap'

export default function MeseroOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedMesa, setSelectedMesa] = useState<any>(null)
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPedidos()
    }
  }, [user])

  const fetchPedidos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pedidos_activos')
        .select(`
          *,
          mesas!inner(numero, ubicacion)
        `)
        .eq('mesero_id', user?.id)
        .order('ultima_actividad', { ascending: false })

      if (error) throw error
      setPedidos(data || [])
    } catch (error) {
      console.error('Error fetching pedidos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pedidos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMesa = (mesa: any) => {
    setSelectedMesa(mesa)
    router.push(`/mesero/orders/new?mesa=${mesa.id}`)
  }

  const handleNewOrder = (mesa: any) => {
    router.push(`/mesero/orders/new?mesa=${mesa.id}`)
  }

  const handleCancelOrder = async (pedidoId: string) => {
    if (!confirm('¿Cancelar este pedido?')) return
    
    try {
      await supabase
        .from('pedidos_activos')
        .update({ estado: 'cancelado' })
        .eq('id', pedidoId)

      toast({
        title: '✅ Pedido cancelado',
        description: 'El pedido ha sido cancelado',
        variant: 'success'
      })
      
      fetchPedidos()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar el pedido',
        variant: 'destructive'
      })
    }
  }

  const handleEditOrder = (pedidoId: string) => {
    router.push(`/mesero/orders/edit/${pedidoId}`)
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-700'
      case 'enviado': return 'bg-yellow-100 text-yellow-700'
      case 'preparando': return 'bg-blue-100 text-blue-700'
      case 'listo': return 'bg-purple-100 text-purple-700'
      case 'entregado': return 'bg-gray-100 text-gray-700'
      case 'cancelado': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/mesero">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📍 Mesas</h1>
              <p className="text-sm text-gray-500">Selecciona una mesa para tomar su pedido</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPedidos}
            className="text-gray-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <MesaMap 
          onSelectMesa={handleSelectMesa}
          onNewOrder={handleNewOrder}
          meseroId={user?.id || ''}
        />

        {pedidos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
              Mis Pedidos Activos
              <Badge variant="secondary" className="ml-2">
                {pedidos.filter(p => p.estado !== 'cancelado' && p.estado !== 'entregado').length}
              </Badge>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidos
                .filter(p => p.estado !== 'cancelado' && p.estado !== 'entregado')
                .map((pedido) => (
                  <Card key={pedido.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            Mesa {pedido.mesas?.numero || 'N/A'}
                          </span>
                          <Badge className="text-xs text-gray-500 bg-gray-100">
                            {pedido.mesas?.ubicacion || 'Sin ubicación'}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(pedido.estado)}>
                          {pedido.estado.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">Items:</p>
                        {pedido.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-1">
                            <span>{item.nombre}</span>
                            <span className="font-medium">x{item.cantidad}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="font-bold text-orange-600">
                          Total: ${pedido.total?.toFixed(2) || '0.00'}
                        </span>
                        <div className="flex gap-2">
                          {pedido.estado === 'activo' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleEditOrder(pedido.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleCancelOrder(pedido.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
