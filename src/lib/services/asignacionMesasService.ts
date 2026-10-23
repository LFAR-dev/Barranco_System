import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE ASIGNACION DE MESAS POR MESERO
// Agrupa mesas geograficamente y las reparte en bloques
// consecutivos (1111.2222.3333) entre los meseros activos.
// ============================================================

export interface MeseroActivo {
  usuario_id: string
  nombre: string
  apellido: string
  color_mapa: string | null
}

export interface AsignacionResult {
  asignadas: number
  meseros_count: number
  mesas_por_mesero: Record<string, number>
}

interface MesaRaw {
  id: string
  numero: string
  mapa_x: number
  mapa_y: number
  categoria: string
}

// ============================================================
// HELPERS GEOMETRICOS
// ============================================================

/**
 * Distancia euclidiana entre dos puntos en el mapa (porcentajes)
 */
function distancia(a: MesaRaw, b: MesaRaw): number {
  const dx = a.mapa_x - b.mapa_x
  const dy = a.mapa_y - b.mapa_y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Ordena mesas usando un "barrido en S" (snake scan):
 * agrupa las mesas cercanas en orden secuencial recorriendo el mapa
 * de izquierda a derecha y de arriba a abajo alternando el sentido.
 *
 * Complejidad: O(n log n) en el sort inicial + O(n) para el recorrido.
 * Resultado: mesas vecinas quedan consecutivas en el array.
 */
function ordenarPorCercania(mesas: MesaRaw[]): MesaRaw[] {
  if (mesas.length === 0) return []

  // Agrupar por bandas verticales (rows) y ordenar cada banda
  const BANDAS = Math.max(3, Math.ceil(Math.sqrt(mesas.length)))
  const alturaBanda = 100 / BANDAS

  const bandas: MesaRaw[][] = Array.from({ length: BANDAS }, () => [])

  for (const mesa of mesas) {
    const idx = Math.min(BANDAS - 1, Math.floor(mesa.mapa_y / alturaBanda))
    bandas[idx].push(mesa)
  }

  const ordenadas: MesaRaw[] = []
  let izquierdaDerecha = true

  for (let i = 0; i < bandas.length; i++) {
    const banda = bandas[i].sort((a, b) => a.mapa_x - b.mapa_x)
    if (izquierdaDerecha) {
      ordenadas.push(...banda)
    } else {
      ordenadas.push(...banda.reverse())
    }
    izquierdaDerecha = !izquierdaDerecha
  }

  return ordenadas
}

// ============================================================
// SERVICIO
// ============================================================

export const asignacionMesasService = {
  /**
   * Obtiene los meseros activos en el turno de la jornada
   */
  async getMeserosActivos(jornadaId: string): Promise<MeseroActivo[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('turno_trabajadores')
      .select(`
        usuario_id,
        usuario:usuarios!usuario_id(id, nombre, apellido, color_mapa, rol)
      `)
      .eq('jornada_id', jornadaId)
      .eq('rol', 'mesero')
      .eq('activo_en_turno', true)

    if (error) {
      console.error('Error al obtener meseros activos:', error)
      return []
    }

    return (data || [])
      .filter((t: any) => t.usuario?.rol === 'mesero')
      .map((t: any) => ({
        usuario_id: t.usuario_id,
        nombre: t.usuario.nombre || '',
        apellido: t.usuario.apellido || '',
        color_mapa: t.usuario.color_mapa
      }))
  },

  /**
   * Reparte las mesas activas de una jornada entre los meseros dados.
   * Estrategia: agrupa por cercania geografica (snake scan) y reparte
   * en bloques consecutivos del tamano mas equitativo posible.
   *
   * Ejemplo con 26 mesas y 5 meseros:
   *   - 26 / 5 = 5.2 -> bloques de [6, 5, 5, 5, 5]
   *
   * Resultado: mesero 1 atiende las primeras 6 mesas geograficamente
   * cercanas, mesero 2 las siguientes 5, etc.
   */
  async repartirMesas(
    jornadaId: string,
    meseroIds: string[]
  ): Promise<AsignacionResult> {
    const supabase = createClient()

    if (meseroIds.length === 0) {
      return { asignadas: 0, meseros_count: 0, mesas_por_mesero: {} }
    }

    // 1. Traer todas las mesas activas
    const { data: mesas, error: mesasError } = await supabase
      .from('mesas')
      .select('id, numero, mapa_x, mapa_y, categoria')
      .eq('activa', true)

    if (mesasError || !mesas) {
      throw new Error('No se pudieron cargar las mesas')
    }

    const mesasRaw: MesaRaw[] = mesas.map((m: any) => ({
      id: m.id,
      numero: m.numero,
      mapa_x: Number(m.mapa_x),
      mapa_y: Number(m.mapa_y),
      categoria: m.categoria
    }))

    // 2. Ordenar por cercania geografica
    const ordenadas = ordenarPorCercania(mesasRaw)

    // 3. Calcular bloques equitativos
    const total = ordenadas.length
    const n = meseroIds.length
    const base = Math.floor(total / n)
    const sobrante = total % n

    const bloques: number[] = []
    for (let i = 0; i < n; i++) {
      bloques.push(base + (i < sobrante ? 1 : 0))
    }

    // 4. Asignar mesas en bloques consecutivos
    let cursor = 0
    const asignaciones: Array<{ mesaId: string; meseroId: string }> = []
    const conteoPorMesero: Record<string, number> = {}

    for (let i = 0; i < n; i++) {
      const meseroId = meseroIds[i]
      const cantidad = bloques[i]

      for (let j = 0; j < cantidad && cursor < total; j++, cursor++) {
        asignaciones.push({
          mesaId: ordenadas[cursor].id,
          meseroId
        })
      }

      conteoPorMesero[meseroId] = cantidad
    }

    // 5. Persistir en un solo batch (UPDATE masivo)
    // Nota: Supabase no soporta UPDATE con CASE en una sola query
    // de forma nativa desde el cliente. Hacemos 1 update por bloque.
    const asignacionesPorMesero: Record<string, string[]> = {}
    for (const a of asignaciones) {
      if (!asignacionesPorMesero[a.meseroId]) {
        asignacionesPorMesero[a.meseroId] = []
      }
      asignacionesPorMesero[a.meseroId].push(a.mesaId)
    }

    for (const [meseroId, mesaIds] of Object.entries(asignacionesPorMesero)) {
      const { error } = await supabase
        .from('mesas')
        .update({
          mesero_id: meseroId,
          jornada_id: jornadaId,
          asignada_en: new Date().toISOString()
        })
        .in('id', mesaIds)
        .eq('activa', true)

      if (error) {
        console.error(`Error asignando mesas al mesero ${meseroId}:`, error)
        throw new Error('No se pudieron asignar las mesas')
      }
    }

    // 6. Limpiar mesas que hayan quedado sin asignar (si habia mas mesas que bloques)
    // En este caso todos los bloques cubren el total, pero por seguridad:
    const mesasAsignadas = new Set(asignaciones.map((a) => a.mesaId))
    const mesasSinAsignar = mesasRaw.filter((m) => !mesasAsignadas.has(m.id))

    if (mesasSinAsignar.length > 0) {
      await supabase
        .from('mesas')
        .update({
          mesero_id: null,
          asignada_en: null
        })
        .in(
          'id',
          mesasSinAsignar.map((m) => m.id)
        )
    }

    return {
      asignadas: asignaciones.length,
      meseros_count: n,
      mesas_por_mesero: conteoPorMesero
    }
  },

  /**
   * Asigna manualmente una mesa a un mesero
   */
  async asignarMesaAMesero(
    mesaId: string,
    meseroId: string | null,
    jornadaId: string
  ): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('mesas')
      .update({
        mesero_id: meseroId,
        jornada_id: meseroId ? jornadaId : null,
        asignada_en: meseroId ? new Date().toISOString() : null
      })
      .eq('id', mesaId)

    if (error) {
      console.error('Error al asignar mesa:', error)
      throw new Error('No se pudo asignar la mesa')
    }
  },

  /**
   * Quita todas las asignaciones de un mesero en una jornada
   */
  async liberarMesasDeMesero(meseroId: string, jornadaId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('mesas')
      .update({
        mesero_id: null,
        asignada_en: null
      })
      .eq('mesero_id', meseroId)
      .eq('jornada_id', jornadaId)

    if (error) {
      console.error('Error al liberar mesas:', error)
      throw new Error('No se pudieron liberar las mesas')
    }
  },

  /**
   * Devuelve las mesas agrupadas por mesero en una jornada
   */
  async getMesasPorMesero(jornadaId: string): Promise<Record<string, MesaRaw[]>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('mesas')
      .select('id, numero, mapa_x, mapa_y, categoria, mesero_id')
      .eq('activa', true)

    if (error || !data) {
      return {}
    }

    const agrupadas: Record<string, MesaRaw[]> = {}
    for (const m of data) {
      const key = m.mesero_id || '_sin_asignar'
      if (!agrupadas[key]) agrupadas[key] = []
      agrupadas[key].push({
        id: m.id,
        numero: m.numero,
        mapa_x: Number(m.mapa_x),
        mapa_y: Number(m.mapa_y),
        categoria: m.categoria
      })
    }

    return agrupadas
  }
}
