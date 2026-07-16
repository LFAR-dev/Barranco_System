'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, Users, ArrowLeft, RefreshCw, Star, User, 
  CheckCircle, XCircle, Key, Clock
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/lib/services/userService'

export default function MeserosPage() {
  const { user } = useAuth()
  const [meseros, setMeseros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchMeseros()
  }, [])

  const fetchMeseros = async () => {
    setLoading(true)
    try {
      const data = await userService.getMeseros()
      setMeseros(data || [])
    } catch (error) {
      console.error('Error fetching meseros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutorizar = async (usuarioId: string) => {
    if (!user) return
    setActionLoading(usuarioId)
    try {
      const codigo = await userService.autorizarUsuario(usuarioId, user.id)
      alert(`✅ Código generado: ${codigo}\nCompártelo con el mesero para que inicie sesión.`)
      await fetchMeseros()
    } catch (error) {
      alert('Error al autorizar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDesactivar = async (usuarioId: string) => {
    if (!confirm('¿Desactivar este usuario?')) return
    setActionLoading(usuarioId)
    try {
      await userService.desactivarUsuario(usuarioId)
      await fetchMeseros()
    } catch (error) {
      alert('Error al desactivar el usuario')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getColor = (index: number) => {
    const colors = ['bg-orange-600', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600', 'bg-rose-600']
    return colors[index % colors.length]
  }

  const filteredMeseros = meseros.filter(m =>
    m.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.usuarios?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meseros</h1>
              <p className="text-sm text-gray-500">Gestiona el equipo y autoriza accesos</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchMeseros}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar meseros..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMeseros.map((mesero, index) => {
            const usuario = mesero.usuarios || {}
            const isActivo = usuario.activo
            const tieneCodigo = usuario.codigo_acceso
            const codigoExpiracion = usuario.codigo_expiracion
              ? new Date(usuario.codigo_expiracion)
              : null
            const isExpirado = codigoExpiracion && codigoExpiracion < new Date()

            return (
              <Card key={mesero.id} className={`hover:shadow-lg transition-shadow border-t-4 ${
                isActivo ? 'border-t-green-500' : 'border-t-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className={`h-14 w-14 ${getColor(index)}`}>
                      {usuario.avatar_url ? (
                        <AvatarImage src={usuario.avatar_url} alt={mesero.nombre_completo} />
                      ) : null}
                      <AvatarFallback className="text-white text-lg font-semibold">
                        {getInitials(mesero.nombre_completo)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{mesero.nombre_completo}</h3>
                        <Badge className={isActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Código: {mesero.codigo || 'N/A'}</p>
                      <p className="text-xs text-gray-400">{usuario.email}</p>
                      {tieneCodigo && (
                        <div className="flex items-center gap-1 mt-1">
                          <Key className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600 font-mono">{tieneCodigo}</span>
                          <span className="text-xs text-gray-400">
                            {isExpirado ? '(Expirado)' : `Expira: ${codigoExpiracion?.toLocaleTimeString()}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-500">Pedidos</p>
                      <p className="text-sm font-bold text-gray-900">{mesero.pedidos_atendidos || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-500">Ventas</p>
                      <p className="text-sm font-bold text-gray-900">${mesero.ventas_totales?.toFixed(0) || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-500">Calificación</p>
                      <p className="text-sm font-bold text-gray-900">{mesero.calificacion || 0}⭐</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Mesero</span>
                    </div>
                    <div className="flex gap-1">
                      {isActivo ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleAutorizar(usuario.id)}
                            disabled={actionLoading === usuario.id}
                          >
                            {actionLoading === usuario.id ? (
                              <div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <Key className="h-3 w-3 mr-1" />
                                Autorizar
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDesactivar(usuario.id)}
                            disabled={actionLoading === usuario.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Desactivar
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleAutorizar(usuario.id)}
                          disabled={actionLoading === usuario.id}
                        >
                          {actionLoading === usuario.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Reactivar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredMeseros.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron meseros</p>
          </div>
        )}
      </div>
    </div>
  )
}
