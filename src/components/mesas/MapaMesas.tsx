'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mesaService, Mesa } from '@/lib/services/mesaService'
import { createClient } from '@/lib/supabase/client'
import { MesaCard3D } from './MesaCard3D'
import { ElementoMapa } from './ElementoMapa'

interface MapaMesasProps {
  onMesaClick?: (mesa: Mesa) => void
  editable?: boolean
  mesaSeleccionadaId?: string
}

export function MapaMesas({ onMesaClick, editable = false, mesaSeleccionadaId }: MapaMesasProps) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [elementos, setElementos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [mesasData, elementosData] = await Promise.all([
        mesaService.getAll(true),
        mesaService.getElementosMapa()
      ])
      setMesas(mesasData)
      setElementos(elementosData)
    } catch (error) {
      console.error('Error cargando mapa:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()

    // Suscripción Realtime para actualizar el mapa automáticamente
    const channel = supabase
      .channel('mapa_mesas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        cargarDatos()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mapa_elementos' }, () => {
        cargarDatos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cargarDatos, supabase])

  if (loading && mesas.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-[#1a1410] rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-gray-400 text-sm">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full bg-[#1a1410] rounded-2xl overflow-hidden shadow-2xl">
      {/* Textura de madera de fondo */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px),
            repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.15) 40px, rgba(0,0,0,0.15) 42px),
            linear-gradient(135deg, #3d2817 0%, #2a1f1a 50%, #1a1410 100%)
          `
        }}
      />

      {/* Header del mapa (estilo Apple) */}
      <div className="relative z-30 px-6 py-4 bg-black/40 backdrop-blur-md border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-wider">BARRANCO</h2>
            <p className="text-amber-200/70 text-xs tracking-widest">MAPA DE MESAS</p>
          </div>
        </div>

        {/* Leyenda de categorías */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-3 h-3 rounded-full bg-white border border-amber-400" />
            <span className="text-white">Especial</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-white">Social</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span className="text-white">Privada</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-3 h-3 rounded-full bg-orange-600" />
            <span className="text-white">Terraza</span>
          </div>
        </div>

        {/* Botón actualizar */}
        <Button
          variant="ghost"
          size="sm"
          onClick={cargarDatos}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Área del mapa (16:9 isométrico) */}
      <div 
        className="relative w-full"
        style={{ 
          aspectRatio: '16/9',
          minHeight: '500px'
        }}
      >
        {/* Elementos decorativos del mapa (barras, accesos, baños) */}
        {elementos.map((el) => (
          <ElementoMapa key={el.id} elemento={el} />
        ))}

        {/* Mesas */}
        {mesas.map((mesa) => (
          <MesaCard3D
            key={mesa.id}
            mesa={mesa}
            onClick={(m) => onMesaClick?.(m)}
            isSelected={mesaSeleccionadaId === mesa.id}
          />
        ))}
      </div>

      {/* Footer informativo */}
      <div className="relative z-30 px-6 py-2 bg-black/40 backdrop-blur-md border-t border-amber-500/20 flex items-center justify-between text-xs text-white/60">
        <span>{mesas.length} mesas · {elementos.length} elementos</span>
        <span>Actualizado: {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
