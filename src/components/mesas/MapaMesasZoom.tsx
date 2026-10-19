'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Grid3x3, Map
} from 'lucide-react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { mesaService, Mesa } from '@/lib/services/mesaService'
import { createClient } from '@/lib/supabase/client'
import { MesaConSillas } from './MesaConSillas'
import { MesaCardEditable } from './MesaCardEditable'
import { ElementoMapa } from './ElementoMapa'
import { GridOverlay } from './GridOverlay'
import { Minimapa } from './Minimapa'
import { useToast } from '@/hooks/use-toast'

interface MapaMesasZoomProps {
  onMesaClick?: (mesa: Mesa) => void
  editable?: boolean
  isEditing?: boolean
  mesaSeleccionadaId?: string
  showGrid?: boolean
}

export function MapaMesasZoom({
  onMesaClick,
  editable = false,
  isEditing = false,
  mesaSeleccionadaId,
  showGrid = false
}: MapaMesasZoomProps) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [elementos, setElementos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [viewport, setViewport] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100
  })
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const supabase = createClient()
  const { toast } = useToast()

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

    const channel = supabase
      .channel('mapa_mesas_zoom_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        if (!isEditing) cargarDatos()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mapa_elementos' }, () => {
        if (!isEditing) cargarDatos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cargarDatos, supabase, isEditing])

  const handleDragEnd = async (id: string, x: number, y: number) => {
    setMesas(prev => prev.map(m => m.id === id ? { ...m, mapa_x: x, mapa_y: y } : m))
    
    try {
      await mesaService.actualizarPosicion(id, x, y)
      toast({
        title: 'Posición guardada',
        description: 'La nueva ubicación ha sido guardada',
        variant: 'success',
        duration: 2000
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la posición',
        variant: 'destructive'
      })
      cargarDatos()
    }
  }

  const handleSelectFromEdit = (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
    onMesaClick?.(mesa)
  }

  // Actualizar viewport según el zoom/posición actual
  const handleTransform = (ref: ReactZoomPanPinchRef) => {
    const { scale, positionX, positionY } = ref.state
    const containerWidth = ref.instance.wrapperComponent?.offsetWidth || 1
    const containerHeight = ref.instance.wrapperComponent?.offsetHeight || 1
    
    // Convertir a porcentaje del mapa total
    const contentWidth = (containerWidth * scale)
    const contentHeight = (containerHeight * scale)
    
    const viewportWidth = (100 * containerWidth) / contentWidth
    const viewportHeight = (100 * containerHeight) / contentHeight
    
    const viewportX = (-positionX / contentWidth) * 100
    const viewportY = (-positionY / contentHeight) * 100
    
    setViewport({
      x: Math.max(0, Math.min(100 - viewportWidth, viewportX)),
      y: Math.max(0, Math.min(100 - viewportHeight, viewportY)),
      width: Math.min(100, viewportWidth),
      height: Math.min(100, viewportHeight)
    })
  }

  const handleMinimapaClick = (x: number, y: number) => {
    if (!transformRef.current) return
    const { instance } = transformRef.current
    if (!instance.wrapperComponent) return
    
    const containerWidth = instance.wrapperComponent.offsetWidth
    const containerHeight = instance.wrapperComponent.offsetHeight
    
    // Centrar en el punto clickeado
    const newPositionX = -(x / 100) * containerWidth + containerWidth / 2
    const newPositionY = -(y / 100) * containerHeight + containerHeight / 2
    
    transformRef.current.setTransform(newPositionX, newPositionY, transformRef.current.state.scale)
  }

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
      {/* Header */}
      <div className="relative z-30 px-6 py-4 bg-black/40 backdrop-blur-md border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-wider">BARRANCO</h2>
            <p className="text-amber-200/70 text-xs tracking-widest">
              {isEditing ? 'MODO EDICIÓN' : 'MAPA DE MESAS'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 border border-white/20">
            <div className="w-2.5 h-2.5 rounded-full bg-white border border-amber-400" />
            <span className="text-white">Especial</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 border border-white/20">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-white">Social</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 border border-white/20">
            <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
            <span className="text-white">Privada</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 border border-white/20">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-600" />
            <span className="text-white">Terraza</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={cargarDatos}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* ÁREA ZOOMABLE */}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: true }}
        panning={{ disabled: isEditing }} // Deshabilitar pan si está editando mesas
        onTransform={handleTransform}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controles de zoom (flotantes) */}
            <div className="absolute top-24 right-4 z-20 flex flex-col gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoomIn()}
                className="bg-black/60 backdrop-blur-md border-amber-500/30 text-white hover:bg-black/80 hover:text-amber-300"
                title="Acercar"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoomOut()}
                className="bg-black/60 backdrop-blur-md border-amber-500/30 text-white hover:bg-black/80 hover:text-amber-300"
                title="Alejar"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => resetTransform()}
                className="bg-black/60 backdrop-blur-md border-amber-500/30 text-white hover:bg-black/80 hover:text-amber-300"
                title="Centrar"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Área del mapa */}
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div
                className="relative w-full touch-none"
                style={{
                  aspectRatio: '16/9',
                  minHeight: '500px',
                  width: '100%',
                  backgroundImage: `
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px),
                    repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.15) 40px, rgba(0,0,0,0.15) 42px),
                    linear-gradient(135deg, #3d2817 0%, #2a1f1a 50%, #1a1410 100%)
                  `
                }}
              >
                {/* Grid en modo edición */}
                {showGrid && <GridOverlay size={5} />}

                {/* Elementos estáticos */}
                {elementos.map((el) => (
                  <ElementoMapa key={el.id} elemento={el} />
                ))}

                {/* Mesas */}
                {mesas.map((mesa) => {
                  if (isEditing) {
                    return (
                      <MesaCardEditable
                        key={mesa.id}
                        mesa={mesa}
                        isSelected={mesaSeleccionada?.id === mesa.id || mesaSeleccionadaId === mesa.id}
                        onSelect={handleSelectFromEdit}
                        onDragEnd={handleDragEnd}
                      />
                    )
                  }

                  return (
                    <MesaConSillas
                      key={mesa.id}
                      mesa={mesa}
                      onClick={(m) => onMesaClick?.(m)}
                      isSelected={mesaSeleccionadaId === mesa.id}
                    />
                  )
                })}
              </div>
            </TransformComponent>

            {/* Minimapa */}
            <div className="absolute bottom-4 right-4 z-20">
              <Minimapa
                mesas={mesas}
                viewport={viewport}
                onClick={handleMinimapaClick}
              />
            </div>
          </>
        )}
      </TransformWrapper>

      {/* Footer */}
      <div className="relative z-30 px-6 py-2 bg-black/40 backdrop-blur-md border-t border-amber-500/20 flex items-center justify-between text-xs text-white/60">
        <span>{mesas.length} mesas · {elementos.length} elementos</span>
        <span className="flex items-center gap-2">
          <Map className="h-3 w-3" />
          Arrastra para mover · Rueda para zoom
        </span>
      </div>
    </div>
  )
}
