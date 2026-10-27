'use client'

import { useState } from 'react'
import { Palette, Check, Loader2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

const PALETA = [
  { nombre: 'Morado', hex: '#8b5cf6' },
  { nombre: 'Verde', hex: '#10b981' },
  { nombre: 'Azul', hex: '#3b82f6' },
  { nombre: 'Naranja', hex: '#f97316' },
  { nombre: 'Rosa', hex: '#ec4899' },
  { nombre: 'Cyan', hex: '#06b6d4' },
  { nombre: 'Amarillo', hex: '#eab308' },
  { nombre: 'Rojo', hex: '#ef4444' },
]

interface ColorPickerPopoverProps {
  usuarioId: string
  colorActual: string | null
  onSuccess?: (nuevoColor: string) => void
}

export function ColorPickerPopover({
  usuarioId,
  colorActual,
  onSuccess,
}: ColorPickerPopoverProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const handleSeleccionar = async (color: string) => {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ color_mapa: color })
        .eq('id', usuarioId)

      if (error) throw error

      toast({
        title: 'Color actualizado',
        description: 'El nuevo color se aplicara en el mapa de mesas',
        variant: 'success',
        duration: 2500,
      })

      onSuccess?.(color)
      setOpen(false)
    } catch (error: any) {
      console.error('Error al actualizar color:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el color',
        variant: 'destructive',
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border hover:bg-gray-50 transition-colors"
          title="Cambiar color del mapa"
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: colorActual || '#e5e7eb' }}
          />
          <Palette className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-gray-900">Color del mapa</p>
            <p className="text-[10px] text-gray-500">
              Se usara para identificar las mesas que atiende
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PALETA.map((c) => {
              const isActive = colorActual === c.hex
              return (
                <button
                  key={c.hex}
                  onClick={() => handleSeleccionar(c.hex)}
                  disabled={guardando}
                  className={`
                    relative w-10 h-10 rounded-lg border-2 transition-all
                    ${isActive ? 'border-gray-900 scale-105' : 'border-gray-200 hover:scale-105 hover:border-gray-400'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  style={{ backgroundColor: c.hex }}
                  title={c.nombre}
                >
                  {isActive && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                  {guardando && (
                    <Loader2 className="h-4 w-4 text-white animate-spin absolute inset-0 m-auto" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="text-[10px] text-gray-500 pt-1 border-t">
            Actual: {PALETA.find((c) => c.hex === colorActual)?.nombre || 'Sin color'}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
