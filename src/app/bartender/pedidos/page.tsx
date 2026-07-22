'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { pedidoService } from '@/lib/services/pedidoService'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, Coffee, User, Table, Package } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function BartenderPedidosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bartenderId, setBartenderId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadBartenderId()
    }
  }, [user])

  const loadBartenderId = async () => {
    const { data } = await supabase
      .from('bartenders')
      .select('id')
      .eq('usuario_id', user?.id)
      .maybeSingle()
    
    if (data) {
      setBartenderId(data.id)
      loadPedidos(data.id)
    }
  }

  const loadPedidos = async (id: string) => {
    setLoading(true)
    try {
      const pendientes = await pedidoService.getPedidosPendientes()
      const misPedidos = await pedidoService.getPedidosByBartender(id)
      const todos = [...pendientes, ...misPedidos]
      setPedidos(todos)
    } catch (error) {
      console.error('Error loading pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTomarPedido = async (pedidoId: string) => {
    if (!bartenderId) return
    try {
      await pedidoService.tomarPedido(pedidoId, bartenderId)
      loadPedidos(bartenderId)
    } catch (error) {
      alert('Error al tomar el pedido')
      console.error(error)
    }
  }

  const handleMarcarListo = async (pedidoId: string) => {
    if (!bartenderId) return
    try {
      await pedidoService.marcarListo(pedidoId)
      loadPedidos(bartenderId)
    } catch (error) {
      alert('Error al marcar como listo')
      console.error(error)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'preparando': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'listo': return 'bg-green-100 text-green-700 border-green-300'
      case 'entregado': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Clock className="h-4 w-4" />
      case 'preparando': return <Coffee className="h-4 w-4" />
      case 'listo': return <CheckCircle className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const preparando = pedidos.filter(p => p.estado === 'preparando' && p.bartender_id === bartenderId)
  const listos = pedidos.filter(p => p.estado === 'listo' && p.bartender_id === bartenderId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bartender">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500">Gestiona los pedidos de los meseros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendientes.length}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Preparando</p>
                <p className="text-2xl font-bold text-blue-600">{preparando.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Coffee className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Listos</p>
                <p className="text-2xl font-bold text-green-600">{listos.length}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pedidos.map((pedido) => {
          const esPendiente = pedido.estado === 'pendiente'
          const esPreparando = pedido.estado === 'preparando' && pedido.bartender_id === bartenderId
          const esListo = pedido.estado === 'listo' && pedido.bartender_id === bartenderId
          const meseroNombre = pedido.mesero?.nombre || 'Mesero'
          const meseroApellido = pedido.mesero?.apellido || ''

          return (
            <Card key={pedido.id} className={`border-l-4 ${getEstadoColor(pedido.estado)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">Mesa {pedido.mesa || 'N/A'}</span>
                      <Badge className={getEstadoColor(pedido.estado)}>
                        {getEstadoIcon(pedido.estado)}
                        <span className="ml-1">{pedido.estado.toUpperCase()}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{meseroNombre} {meseroApellido}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Items:</span>
                      <ul className="list-disc list-inside ml-2">
                        {pedido.items?.map((item: any, index: number) => (
                          <li key={index}>
                            {item.nombre} x{item.cantidad} - ${item.precio}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      Total: ${pedido.total?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {esPendiente && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleTomarPedido(pedido.id)}
                      >
                        <Coffee className="h-4 w-4 mr-1" />
                        Tomar Pedido
                      </Button>
                    )}
                    {esPreparando && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarcarListo(pedido.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Marcar Listo
                      </Button>
                    )}
                    {esListo && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Listo para entregar
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {pedidos.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay pedidos</p>
          </div>
        )}
      </div>
    </div>
  )
}
