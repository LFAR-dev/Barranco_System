'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Limpia cuentas abandonadas (total_actual = 0 y > 30 min abiertas)
 * al cargar una pagina. Se ejecuta una sola vez por montaje.
 */
export function useLimpiarCuentas(minutosMaximos = 30) {
  useEffect(() => {
    const supabase = createClient()
    supabase
      .rpc('limpiar_cuentas_abandonadas', { p_minutos_maximos: minutosMaximos })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[useLimpiarCuentas] Error:', error)
        } else if (data && (data.cuentas_borradas > 0 || data.mesas_liberadas > 0)) {
          console.log('[useLimpiarCuentas] Limpieza ejecutada:', data)
        }
      })
  }, [minutosMaximos])
}
