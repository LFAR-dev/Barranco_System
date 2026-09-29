// ============================================================
// SISTEMA DE EVENTOS DE JORNADA
// Comunica cambios de jornada entre componentes sin contexto
// ============================================================

export const JORNADA_EVENTS = {
  JORNADA_ABIERTA: 'jornada:abierta',
  JORNADA_CERRADA: 'jornada:cerrada',
  JORNADA_CAMBIADA: 'jornada:cambiada',
} as const

/**
 * Emite un evento de jornada para que todos los componentes escuchen
 */
export function emitirEventoJornada(tipo: keyof typeof JORNADA_EVENTS) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(JORNADA_EVENTS[tipo]))
}

/**
 * Hook para escuchar eventos de jornada
 */
export function escucharEventosJornada(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => callback()

  window.addEventListener(JORNADA_EVENTS.JORNADA_ABIERTA, handler)
  window.addEventListener(JORNADA_EVENTS.JORNADA_CERRADA, handler)
  window.addEventListener(JORNADA_EVENTS.JORNADA_CAMBIADA, handler)

  return () => {
    window.removeEventListener(JORNADA_EVENTS.JORNADA_ABIERTA, handler)
    window.removeEventListener(JORNADA_EVENTS.JORNADA_CERRADA, handler)
    window.removeEventListener(JORNADA_EVENTS.JORNADA_CAMBIADA, handler)
  }
}
