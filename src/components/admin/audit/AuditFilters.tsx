'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, X, Calendar, User, RefreshCw
} from 'lucide-react'

interface AuditFiltersProps {
  onFilterChange: (filtros: any) => void
  usuarios: any[]
  filtrosActuales: any
}

export function AuditFilters({ onFilterChange, usuarios, filtrosActuales }: AuditFiltersProps) {
  const [fechaInicio, setFechaInicio] = useState(filtrosActuales?.fecha_inicio || '')
  const [fechaFin, setFechaFin] = useState(filtrosActuales?.fecha_fin || '')
  const [usuarioId, setUsuarioId] = useState(filtrosActuales?.usuario_id || '')
  const [soloNoLeidas, setSoloNoLeidas] = useState(filtrosActuales?.solo_no_leidas || false)

  const aplicarFiltros = () => {
    onFilterChange({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
      usuario_id: usuarioId || undefined,
      solo_no_leidas: soloNoLeidas || undefined,
    })
  }

  const limpiarFiltros = () => {
    setFechaInicio('')
    setFechaFin('')
    setUsuarioId('')
    setSoloNoLeidas(false)
    onFilterChange({})
  }

  // Filtros rápidos de fecha
  const aplicarFiltroRapido = (dias: number) => {
    const fin = new Date()
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - dias)
    
    const fechaInicioStr = inicio.toISOString().split('T')[0]
    const fechaFinStr = fin.toISOString().split('T')[0]
    
    setFechaInicio(fechaInicioStr)
    setFechaFin(fechaFinStr)
    
    onFilterChange({
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFinStr,
      usuario_id: usuarioId || undefined,
      solo_no_leidas: soloNoLeidas || undefined,
    })
  }

  const tieneFiltrosActivos = fechaInicio || fechaFin || usuarioId || soloNoLeidas

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            {tieneFiltrosActivos && (
              <Badge className="bg-blue-100 text-blue-700">
                Filtros activos
              </Badge>
            )}
          </div>
          {tieneFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aplicarFiltroRapido(1)}
            className="text-xs"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => aplicarFiltroRapido(7)}
            className="text-xs"
          >
            Últimos 7 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => aplicarFiltroRapido(30)}
            className="text-xs"
          >
            Últimos 30 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => aplicarFiltroRapido(90)}
            className="text-xs"
          >
            Últimos 90 días
          </Button>
        </div>

        {/* Filtros avanzados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio" className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Fecha inicio
            </Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_fin" className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Fecha fin
            </Label>
            <Input
              id="fecha_fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usuario" className="text-xs font-medium flex items-center gap-1">
              <User className="h-3 w-3" />
              Usuario
            </Label>
            <select
              id="usuario"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} ({u.rol})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Estado</Label>
            <div className="flex items-center gap-2 h-10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloNoLeidas}
                  onChange={(e) => setSoloNoLeidas(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Solo sin revisar</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={aplicarFiltros} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aplicar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
