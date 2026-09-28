'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Wine, Droplets, Martini, AlertTriangle, 
  CheckCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RendimientoBotellaProps {
  productoId: string
  nombreProducto?: string
  marca?: string
  volumenMl?: number
  stockActual?: number
  stockMaximo?: number
  stockMinimo?: number
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface RendimientoData {
  volumen_total_ml: number
  volumen_restante_ml: number
  stock_actual: number
  porcentaje: number
  shots_disponibles: number
  bebidas_disponibles: number
}

export function RendimientoBotella({
  productoId,
  nombreProducto,
  marca,
  volumenMl = 750,
  stockActual = 0,
  stockMaximo = 10,
  stockMinimo = 2,
  showDetails = true,
  size = 'md'
}: RendimientoBotellaProps) {
  const [rendimiento, setRendimiento] = useState<RendimientoData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    cargarRendimiento()
  }, [productoId])

  const cargarRendimiento = async () => {
    try {
      const { data, error } = await supabase.rpc('calcular_rendimiento_producto', {
        p_producto_id: productoId
      })

      if (error) {
        // Fallback: calcular localmente
        calcularLocalmente()
        return
      }

      if (data) {
        setRendimiento(data)
      }
    } catch (error) {
      console.error('Error al cargar rendimiento:', error)
      calcularLocalmente()
    } finally {
      setLoading(false)
    }
  }

  const calcularLocalmente = () => {
    const volumenTotal = volumenMl * Math.max(stockActual, 1)
    const volumenRestante = volumenMl * stockActual
    const porcentaje = stockMaximo > 0 ? (stockActual / stockMaximo) * 100 : 0
    const shotsDisponibles = Math.floor(volumenRestante / 45)
    const bebidasDisponibles = Math.floor(volumenRestante / 60)

    setRendimiento({
      volumen_total_ml: volumenTotal,
      volumen_restante_ml: volumenRestante,
      stock_actual: stockActual,
      porcentaje: Math.round(porcentaje * 10) / 10,
      shots_disponibles: shotsDisponibles,
      bebidas_disponibles: bebidasDisponibles
    })
    setLoading(false)
  }

  // ============================================================
  // CÁLCULOS DE ESTADO
  // ============================================================
  const getEstado = () => {
    if (stockActual <= 0) {
      return {
        label: 'AGOTADO',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        fillColor: '#ef4444',
        icon: AlertTriangle,
        iconColor: 'text-red-600'
      }
    }
    if (stockActual <= stockMinimo) {
      return {
        label: 'STOCK BAJO',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        fillColor: '#f59e0b',
        icon: AlertTriangle,
        iconColor: 'text-amber-600'
      }
    }
    return {
      label: 'DISPONIBLE',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      borderColor: 'border-emerald-300',
      fillColor: '#10b981',
      icon: CheckCircle,
      iconColor: 'text-emerald-600'
    }
  }

  const estado = getEstado()
  const Icon = estado.icon
  const porcentaje = rendimiento?.porcentaje || 0
  const volumenRestante = rendimiento?.volumen_restante_ml || 0
  const shots = rendimiento?.shots_disponibles || 0
  const bebidas = rendimiento?.bebidas_disponibles || 0

  // ============================================================
  // ESTILOS SEGÚN TAMAÑO
  // ============================================================
  const tamanos = {
    sm: {
      contenedor: 'p-3',
      titulo: 'text-sm',
      subtitulo: 'text-xs',
      porcentaje: 'text-2xl',
      stat: 'text-lg',
      statLabel: 'text-[10px]',
      icono: 'h-8 w-8',
      progress: 'h-2',
      botella: 'w-8 h-16'
    },
    md: {
      contenedor: 'p-4',
      titulo: 'text-base',
      subtitulo: 'text-sm',
      porcentaje: 'text-3xl',
      stat: 'text-xl',
      statLabel: 'text-xs',
      icono: 'h-10 w-10',
      progress: 'h-3',
      botella: 'w-10 h-20'
    },
    lg: {
      contenedor: 'p-6',
      titulo: 'text-lg',
      subtitulo: 'text-base',
      porcentaje: 'text-4xl',
      stat: 'text-2xl',
      statLabel: 'text-sm',
      icono: 'h-12 w-12',
      progress: 'h-4',
      botella: 'w-12 h-24'
    }
  }

  const t = tamanos[size]

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border-2 ${estado.borderColor} ${t.contenedor}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 ${estado.borderColor} ${t.contenedor} transition-all hover:shadow-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icono de botella */}
          <div className={`relative flex-shrink-0 ${estado.bgColor} rounded-xl p-2`}>
            <Wine className={`${t.icono} ${estado.iconColor}`} />
            {porcentaje > 0 && porcentaje < 100 && (
              <div className="absolute -bottom-1 -right-1">
                <Droplets className="h-4 w-4 text-blue-500" />
              </div>
            )}
          </div>
          
          {/* Nombre del producto */}
          <div className="min-w-0 flex-1">
            <h3 className={`font-bold text-gray-900 ${t.titulo} truncate`}>
              {nombreProducto || 'Producto'}
            </h3>
            {marca && (
              <p className={`text-gray-500 ${t.subtitulo} truncate`}>{marca}</p>
            )}
          </div>
        </div>

        {/* Badge de estado */}
        <Badge className={`${estado.bgColor} ${estado.color} border ${estado.borderColor} font-semibold whitespace-nowrap`}>
          <Icon className="h-3 w-3 mr-1" />
          {estado.label}
        </Badge>
      </div>

      {/* Botella visual + porcentaje */}
      <div className="flex items-center gap-4 mb-4">
        {/* Botella con nivel de llenado */}
        <div className="relative flex-shrink-0">
          <div className={`${t.botella} relative rounded-lg border-2 border-gray-300 bg-gray-100 overflow-hidden`}>
            {/* Cuello de la botella */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-2 bg-gray-300 rounded-t-sm" />
            
            {/* Nivel de llenado */}
            <div 
              className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
              style={{
                height: `${Math.min(porcentaje, 100)}%`,
                backgroundColor: estado.fillColor,
                opacity: 0.85
              }}
            >
              {/* Brillo de la botella */}
              <div className="absolute top-0 left-1 w-1 h-full bg-white/30 rounded-full" />
            </div>
            
            {/* Etiqueta de volumen */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
              <span className="text-[8px] font-bold text-white drop-shadow-lg">
                {volumenMl}ml
              </span>
            </div>
          </div>
        </div>

        {/* Porcentaje y stats */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`font-black ${t.porcentaje} ${estado.color}`}>
              {porcentaje.toFixed(0)}%
            </span>
            <span className={`text-gray-400 ${t.subtitulo}`}>restante</span>
          </div>
          
          <Progress 
            value={Math.min(porcentaje, 100)} 
            className={`${t.progress} mb-2`}
          />
          
          {showDetails && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Droplets className="h-3 w-3" />
              <span className="font-medium">{volumenRestante.toLocaleString()} ml</span>
              <span className="text-gray-400">disponibles</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats de rendimiento */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
          {/* Botellas */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wine className="h-4 w-4 text-blue-600" />
            </div>
            <p className={`font-bold ${t.stat} text-gray-900`}>
              {stockActual}
            </p>
            <p className={`${t.statLabel} text-gray-500 uppercase tracking-wide`}>
              {stockActual === 1 ? 'Botella' : 'Botellas'}
            </p>
          </div>

          {/* Shots */}
          <div className="text-center border-x border-gray-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Martini className="h-4 w-4 text-purple-600" />
            </div>
            <p className={`font-bold ${t.stat} text-purple-600`}>
              {shots}
            </p>
            <p className={`${t.statLabel} text-gray-500 uppercase tracking-wide`}>
              Shots
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">≈45ml c/u</p>
          </div>

          {/* Bebidas */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Droplets className="h-4 w-4 text-emerald-600" />
            </div>
            <p className={`font-bold ${t.stat} text-emerald-600`}>
              {bebidas}
            </p>
            <p className={`${t.statLabel} text-gray-500 uppercase tracking-wide`}>
              Bebidas
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">≈60ml c/u</p>
          </div>
        </div>
      )}

      {/* Alerta de stock bajo */}
      {stockActual <= stockMinimo && stockActual > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Stock bajo. Considera reabastecer pronto.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de agotado */}
      {stockActual <= 0 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-800 font-semibold">
              PRODUCTO AGOTADO - Notificar a todos los usuarios
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
