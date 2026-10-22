'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { useToast } from '@/hooks/use-toast'

interface NotificationSoundToggleProps {
  usuarioId: string
}

export function NotificationSoundToggle({ usuarioId }: NotificationSoundToggleProps) {
  const { muted, toggleMute, listo, play } = useNotificationSound({ usuarioId })
  const { toast } = useToast()

  if (!listo) return null

  const handleToggle = () => {
    const estabaMuted = muted
    toggleMute()

    toast({
      title: estabaMuted ? 'Sonido activado' : 'Sonido silenciado',
      description: estabaMuted
        ? 'Recibiras alertas sonoras nuevamente'
        : 'Ya no recibiras alertas sonoras',
      variant: 'default',
      duration: 2500
    })

    // Si activamos, reproducir el sonido de pedido nuevo como prueba
    if (estabaMuted) {
      setTimeout(() => {
        play('pedido_nuevo')
      }, 100)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="relative text-gray-500 hover:text-gray-700 h-7 w-7"
      title={muted ? 'Activar sonido' : 'Silenciar notificaciones'}
    >
      {muted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  )
}
