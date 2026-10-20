'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, RefreshCw, ZoomIn, ZoomOut, Maximize2, Map
} from 'lucide-react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mesaService, Mesa, CategoriaMesa } from '@/lib/services/mesaService'
import { createClient } from '@/lib/supabase/client'
import { MesaConSillas } from './MesaConSillas'
import { MesaCardEditable } from './MesaCardEditable'
import { ElementoMapa } from './ElementoMapa'
import { GridOverlay } from './GridOverlay'
import { Minimapa } from './Minimapa'
import { EditorToolbar, HerramientaEditor } from './EditorToolbar'
import { SnappingGuides } from './SnappingGuides'
import { AvatarMesero } from './AvatarMesero'
import { useMeserosActivos } from '@/hooks/useMeserosActivos'
import { useEditorHistory } from '@/hooks/useEditorHistory'
import { useEditorKeyboard } from '@/hooks/useEditorKeyboard'
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
  showGrid: showGridProp = false
}: MapaMesasZoomProps) {
  const [mesasDB, setMesasDB] = useState<Mesa[]>([])
  const [elementos, setElementos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [herramienta, setHerramienta] = useState<HerramientaEditor>('seleccionar')
  const [showGrid, setShowGrid] = useState(showGridProp)
  const [guardando, setGuardando] = useState(false)
  const [nuevaMesaCoords, setNuevaMesaCoords] = useState<{ x: number; y: number } | null>(null)
  const [guides, setGuides] = useState<Array<{ orientation: 'horizontal' | 'vertical'; position: number }>>([])
  const [viewport, setViewport] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0, y: 0, width: 100, height: 100
  })
  
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const { meseros: meserosActivos } = useMeserosActivos()

  const {
    state: mesas,
    setState: setMesas,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    hasChanges
  } = useEditorHistory<Mesa[]>([])

  const cambiosPendientes = mesas.filter(m => {
    const original = mesasDB.find(o => o.id === m.id)
    if (!original) return true
    return (
      original.mapa_x !== m.mapa_x ||
      original.mapa_y !== m.mapa_y ||
      original.mapa_ancho !== m.mapa_ancho ||
      original.mapa_alto !== m.mapa_alto ||
      original.mapa_rotacion !== m.mapa_rotacion ||
      original.numero !== m.numero ||
      original.estado !== m.estado ||
      original.capacidad !== m.capacidad ||
      original.categoria !== m.categoria
    )
  }).length + mesasDB.filter(o => !mesas.find(m => m.id === o.id)).length

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [mesasData, elementosData] = await Promise.all([
        mesaService.getAll(true),
        mesaService.getElementosMapa()
      ])
      setMesasDB(mesasData)
      setMesas(mesasData, { addToHistory: false })
      setElementos(elementosData)
    } catch (error) {
      console.error('Error cargando mapa:', error)
    } finally {
      setLoading(false)
    }
  }, [setMesas])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    if (isEditing) return
    const channel = supabase
      .channel('mapa_zoom_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        cargarDatos()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mapa_elementos' }, () => {
        cargarDatos()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargarDatos, supabase, isEditing])

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleDragEnd = (
    id: string,
    x: number,
    y: number,
    ancho?: number,
    alto?: number,
    rotacion?: number
  ) => {
    const nuevasMesas = mesas.map(m => 
      m.id === id 
        ? { 
            ...m, 
            mapa_x: x, 
            mapa_y: y,
            ...(ancho !== undefined && { mapa_ancho: ancho }),
            ...(alto !== undefined && { mapa_alto: alto }),
            ...(rotacion !== undefined && { mapa_rotacion: rotacion })
          } 
        : m
    )
    setMesas(nuevasMesas)
  }

  const handleGuardarCambios = async () => {
    setGuardando(true)
    try {
      for (const mesa of mesas) {
        const original = mesasDB.find(o => o.id === mesa.id)
        if (!original) continue
        if (JSON.stringify(original) !== JSON.stringify(mesa)) {
          await mesaService.actualizar(mesa.id, {
            numero: mesa.numero,
            categoria: mesa.categoria,
            capacidad: mesa.capacidad,
            estado: mesa.estado,
            mapa_x: mesa.mapa_x,
            mapa_y: mesa.mapa_y,
            mapa_ancho: mesa.mapa_ancho,
            mapa_alto: mesa.mapa_alto,
            mapa_rotacion: mesa.mapa_rotacion
          })
        }
      }

      for (const original of mesasDB) {
        if (!mesas.find(m => m.id === original.id)) {
          await mesaService.eliminar(original.id)
        }
      }

      toast({
        title: 'Cambios guardados',
        description: 'El mapa se ha actualizado correctamente',
        variant: 'success'
      })

      await cargarDatos()
      resetHistory()
    } catch (error: any) {
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudieron guardar los cambios',
        variant: 'destructive'
      })
    } finally {
      setGuardando(false)
    }
  }

  const handleDescartarCambios = () => {
    if (!confirm('¿Descartar todos los cambios no guardados?')) return
    setMesas(mesasDB, { addToHistory: false })
    resetHistory()
    toast({
      title: 'Cambios descartados',
      description: 'El mapa volvió al último estado guardado',
      variant: 'default'
    })
  }

  const handleDuplicarMesa = async () => {
    if (!mesaSeleccionada) return
    try {
      const nuevaMesa = await mesaService.crear({
        numero: `${mesaSeleccionada.numero}-COPIA`,
        categoria: mesaSeleccionada.categoria,
        capacidad: mesaSeleccionada.capacidad,
        mapa_x: Math.min(mesaSeleccionada.mapa_x + 3, 95),
        mapa_y: Math.min(mesaSeleccionada.mapa_y + 3, 95)
      })
      toast({
        title: 'Mesa duplicada',
        description: `Se creó ${nuevaMesa.numero}`,
        variant: 'success'
      })
      await cargarDatos()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo duplicar la mesa',
        variant: 'destructive'
      })
    }
  }

  const handleEliminarMesa = async () => {
    if (!mesaSeleccionada) return
    if (!confirm(`¿Eliminar la mesa ${mesaSeleccionada.numero}? Se desactivará.`)) return
    try {
      await mesaService.eliminar(mesaSeleccionada.id)
      toast({
        title: 'Mesa eliminada',
        description: `Mesa ${mesaSeleccionada.numero} desactivada`,
        variant: 'success'
      })
      setMesaSeleccionada(null)
      await cargarDatos()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la mesa',
        variant: 'destructive'
      })
    }
  }

  const handleClickEnMapa = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || herramienta !== 'agregar_mesa') return
    const rect = mapContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setNuevaMesaCoords({ x, y })
  }

  const handleCrearMesaConfirm = async (data: {
    numero: string
    categoria: CategoriaMesa
    capacidad: number
  }) => {
    if (!nuevaMesaCoords) return
    try {
      await mesaService.crear({
        numero: data.numero,
        categoria: data.categoria,
        capacidad: data.capacidad,
        mapa_x: nuevaMesaCoords.x,
        mapa_y: nuevaMesaCoords.y
      })
      toast({
        title: 'Mesa creada',
        description: `Mesa ${data.numero} agregada al mapa`,
        variant: 'success'
      })
      setNuevaMesaCoords(null)
      await cargarDatos()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la mesa',
        variant: 'destructive'
      })
    }
  }

  const handleSelectFromEdit = (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
  }

  useEditorKeyboard({
    enabled: isEditing,
    onHerramientaChange: setHerramienta,
    onUndo: undo,
    onRedo: redo,
    onSave: handleGuardarCambios,
    onToggleGrid: () => setShowGrid(g => !g),
    onDelete: mesaSeleccionada ? handleEliminarMesa : undefined,
    onEscape: () => {
      setHerramienta('seleccionar')
      setMesaSeleccionada(null)
    }
  })

  const handleTransform = (ref: ReactZoomPanPinchRef) => {
    const { scale, positionX, positionY } = ref.state
    const containerWidth = ref.instance.wrapperComponent?.offsetWidth || 1
    const containerHeight = ref.instance.wrapperComponent?.offsetHeight || 1
    const contentWidth = containerWidth * scale
    const contentHeight = containerHeight * scale
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

      {isEditing && (
        <EditorToolbar
          herramienta={herramienta}
          onHerramientaChange={setHerramienta}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          hasChanges={hasChanges}
          cambiosPendientes={cambiosPendientes}
          onGuardar={handleGuardarCambios}
          onDescartar={handleDescartarCambios}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(g => !g)}
          mesaSeleccionada={!!mesaSeleccionada}
          onDuplicar={mesaSeleccionada ? handleDuplicarMesa : undefined}
          onEliminar={mesaSeleccionada ? handleEliminarMesa : undefined}
          guardando={guardando}
        />
      )}

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: true }}
        panning={{ 
          disabled: isEditing || herramienta === 'agregar_mesa'
        }}
        onTransform={handleTransform}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
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

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div
                ref={mapContainerRef}
                className={`relative w-full touch-none mapa-container ${
                  isEditing && herramienta === 'agregar_mesa' ? 'cursor-crosshair' : ''
                }`}
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
                onClick={handleClickEnMapa}
              >
                {showGrid && <GridOverlay size={5} />}

                {/* Guías de alineación (overlay) */}
                <SnappingGuides guides={guides} />

                {elementos.map((el) => (
                  <ElementoMapa key={el.id} elemento={el} />
                ))}

                {mesas.map((mesa) => {
                  if (isEditing) {
                    return (
                      <MesaCardEditable
                        key={mesa.id}
                        mesa={mesa}
                        isSelected={mesaSeleccionada?.id === mesa.id || mesaSeleccionadaId === mesa.id}
                        onSelect={handleSelectFromEdit}
                        onDragEnd={handleDragEnd}
                        onSnappingChange={setGuides}
                        otrasMesas={mesas}
                        gridSize={5}
                        snapEnabled={showGrid}
                      />
                    )
                  }{/* Avatares de meseros activos */}
                  {
                    !isEditing && meserosActivos.map((mesero) => {
                      // Posición: sobre la mesa que atiende
                      const mesaAtendiendo = mesas.find(m => m.id === mesero.mesa_atendiendo_id)
                      if (!mesaAtendiendo) return null

                      return (
                        <AvatarMesero
                          key={mesero.usuario_id}
                          mesero={mesero}
                          posicionX={mesaAtendiendo.mapa_x + mesaAtendiendo.mapa_ancho / 2}
                          posicionY={mesaAtendiendo.mapa_y + mesaAtendiendo.mapa_alto / 2}
                        />
                      )
                    })
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

      <div className="relative z-30 px-6 py-2 bg-black/40 backdrop-blur-md border-t border-amber-500/20 flex items-center justify-between text-xs text-white/60">
        <span>{mesas.length} mesas · {elementos.length} elementos</span>
        <span className="flex items-center gap-2">
          <Map className="h-3 w-3" />
          {isEditing ? 'V seleccionar · M agregar · G grid · Ctrl+Z/Y · Ctrl+S guardar' : 'Arrastra para mover · Rueda para zoom'}
        </span>
      </div>

      <Dialog open={!!nuevaMesaCoords} onOpenChange={(open) => !open && setNuevaMesaCoords(null)}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Nueva Mesa</DialogTitle>
          </DialogHeader>
          <FormularioNuevaMesa
            onConfirm={handleCrearMesaConfirm}
            onCancel={() => setNuevaMesaCoords(null)}
            sugerenciaNumero={`N${mesas.length + 1}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormularioNuevaMesa({
  onConfirm,
  onCancel,
  sugerenciaNumero
}: {
  onConfirm: (data: { numero: string; categoria: CategoriaMesa; capacidad: number }) => void
  onCancel: () => void
  sugerenciaNumero: string
}) {
  const [numero, setNumero] = useState(sugerenciaNumero)
  const [categoria, setCategoria] = useState<CategoriaMesa>('social')
  const [capacidad, setCapacidad] = useState(4)

  return (
    <div className="space-y-4 mt-2">
      <div>
        <Label htmlFor="numero-nueva">Número / Identificador</Label>
        <Input
          id="numero-nueva"
          value={numero}
          onChange={(e) => setNumero(e.target.value.toUpperCase())}
          placeholder="Ej: T12, E6, X1..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="categoria-nueva">Categoría</Label>
          <select
            id="categoria-nueva"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaMesa)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="especial">Especial</option>
            <option value="social">Social</option>
            <option value="privada">Privada</option>
            <option value="terraza">Terraza</option>
            <option value="temporal">Temporal</option>
          </select>
        </div>
        <div>
          <Label htmlFor="capacidad-nueva">Capacidad</Label>
          <Input
            id="capacidad-nueva"
            type="number"
            min="1"
            value={capacidad}
            onChange={(e) => setCapacidad(parseInt(e.target.value) || 4)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirm({ numero, categoria, capacidad })}
          disabled={!numero.trim()}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Crear Mesa
        </Button>
      </div>
    </div>
  )
}
