'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Table, Search, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

export default function MesasPage() {
  const supabase = createClient()
  const [mesas, setMesas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMesas()
  }, [])

  const fetchMesas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .order('numero')
      if (error) throw error
      setMesas(data || [])
    } catch (error) {
      console.error('Error fetching mesas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMesas = mesas.filter(m => 
    m.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
              <p className="text-sm text-gray-500">Gestiona las mesas del bar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="bg-rose-600 hover:bg-rose-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Mesa
            </Button>
            <Button variant="outline" onClick={fetchMesas}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar mesas..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMesas.map((mesa) => (
            <Card key={mesa.id} className="hover:shadow-lg transition-all border-t-4 border-t-rose-500">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-gray-700">{mesa.numero}</div>
                <div className="text-sm text-gray-500">{mesa.ubicacion || 'Sin ubicación'}</div>
                <Badge className={`mt-2 ${mesa.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {mesa.activa ? 'Activa' : 'Inactiva'}
                </Badge>
                <div className="mt-2 text-xs text-gray-400">Capacidad: {mesa.capacidad || 4} personas</div>
                <div className="flex justify-center gap-2 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMesas.length === 0 && (
          <div className="text-center py-12">
            <Table className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron mesas</p>
          </div>
        )}
      </div>
    </div>
  )
}
