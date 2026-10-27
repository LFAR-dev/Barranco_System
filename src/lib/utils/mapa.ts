import { Mesa } from '@/lib/services/mesaService'
import { MeseroActivo } from '@/hooks/useMeserosActivos'

/**
 * Calcula la posición X, Y en porcentaje del centro de la mesa
 * donde esta atendiendo el mesero.
 * Retorna null si el mesero no atiende ninguna mesa o la mesa no existe.
 */
export function calcularPosicionMesero(
  mesero: MeseroActivo,
  mesas: Mesa[]
): { x: number; y: number; mesa: Mesa } | null {
  if (!mesero?.mesa_atendiendo_id) return null

  const mesa = mesas.find((m) => m?.id === mesero.mesa_atendiendo_id)
  if (!mesa) return null

  const x = (Number(mesa.mapa_x) || 0) + (Number(mesa.mapa_ancho) || 0) / 2
  const y = (Number(mesa.mapa_y) || 0) + (Number(mesa.mapa_alto) || 0) / 2

  return { x, y, mesa }
}
