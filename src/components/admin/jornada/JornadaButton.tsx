'use client'

import { useEffect, useState } from 'react'
import { Calendar, Plus, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { jornadaService, Jornada } from '@/lib/services/jornadaService'
import { AbrirJornadaModal } from './AbrirJornadaModal'
import { CerrarJornadaModal } from './CerrarJornadaModal'
import { escucharEventosJornada } from '@/lib/events/jornadaEvents'

interface JornadaButtonProps {
  onJornadaChange?: () => void
}

export function JornadaButton({ onJornadaChange }: JornadaButtonProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [loading, setLoading] = useState(true)
  const [abrirModal, setAbrirModal] = useState(false)
  const [cerrarModal, setCerrarModal] = useState(false)

  useEffect(() => {
    cargarJornada()
    const interval = setInterval(cargarJornada, 60000)
    const cleanup = escucharEventosJornada(cargarJornada)
    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [])

  const cargarJornada = async () => {
    try {
      const data = await jornadaService.getJornadaActual()
      setJornada(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    cargarJornada()
    onJornadaChange?.()
  }

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="shrink-0">
        <Calendar className="h-4 w-4 md:mr-1.5" />
        <span className="hidden md:inline">Jornada</span>
      </Button>
    )
  }

  if (!jornada) {
    return (
      <>
        <Button
          onClick={() => setAbrirModal(true)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-white animate-pulse shrink-0"
        >
          <Plus className="h-4 w-4 md:mr-1.5" />
          <span className="hidden sm:inline">Abrir jornada</span>
          <span className="sm:hidden">Abrir</span>
        </Button>
        <AbrirJornadaModal
          isOpen={abrirModal}
          onClose={() => setAbrirModal(false)}
          onSuccess={handleSuccess}
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setCerrarModal(true)}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs md:text-sm font-medium transition-colors shrink-0"
      >
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">Jornada activa</span>
        <span className="md:hidden">Activa</span>
      </button>
      <CerrarJornadaModal
        isOpen={cerrarModal}
        onClose={() => setCerrarModal(false)}
        jornada={jornada}
        onSuccess={handleSuccess}
      />
    </>
  )
}
