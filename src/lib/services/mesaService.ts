import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE MESAS
// ============================================================

export type EstadoMesa = 
  | 'disponible' 
  | 'ocupada' 
  | 'cuenta_solicitada' 
  | 'cobrando' 
  | 'reservada' 
  | 'fuera_servicio'

export type CategoriaMesa = 'especial' | 'social' | 'privada' | 'terraza' | 'temporal'

export interface Mesa {
  id: string
  numero: string
  ubicacion: string | null
  capacidad: number | null
  activa: boolean
  estado: EstadoMesa
  categoria: CategoriaMesa
  mapa_x: number
  mapa_y: number
  mapa_ancho: number
  mapa_alto: number
  mapa_rotacion: number
  mapa_z: number
  mesero_id: string | null
  abierta_en: string | null
  // Relaciones
  mesero?: { nombre: string; apellido: string } | null
}

export interface CrearMesaInput {
  numero: string
  ubicacion?: string
  capacidad?: number
  categoria: CategoriaMesa
  mapa_x: number
  mapa_y: number
  mapa_ancho?: number
  mapa_alto?: number
  mapa_rotacion?: number
}

export interface ActualizarMesaInput {
  numero?: string
  ubicacion?: string
  capacidad?: number
  categoria?: CategoriaMesa
  estado?: EstadoMesa
  mapa_x?: number
  mapa_y?: number
  mapa_ancho?: number
  mapa_alto?: number
  mapa_rotacion?: number
  mesero_id?: string | null
}

export const mesaService = {
  /**
   * Obtiene todas las mesas con su información completa
   */
  async getAll(soloActivas = false): Promise<Mesa[]> {
    const supabase = createClient()
    let query = supabase
      .from('mesas')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .order('numero')

    if (soloActivas) {
      query = query.eq('activa', true)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error al obtener mesas:', error)
      return []
    }
    return (data || []) as Mesa[]
  },

  /**
   * Obtiene una mesa por ID
   */
  async getById(id: string): Promise<Mesa | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        *,
        mesero:usuarios!mesero_id(nombre, apellido)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) return null
    return data as Mesa
  },

  /**
   * Crea una nueva mesa
   */
  async crear(input: CrearMesaInput): Promise<Mesa> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mesas')
      .insert([{
        numero: input.numero,
        ubicacion: input.ubicacion || null,
        capacidad: input.capacidad || 4,
        categoria: input.categoria,
        estado: 'disponible',
        mapa_x: input.mapa_x,
        mapa_y: input.mapa_y,
        mapa_ancho: input.mapa_ancho || 5,
        mapa_alto: input.mapa_alto || 5,
        mapa_rotacion: input.mapa_rotacion || 0,
        activa: true
      }])
      .select()
      .maybeSingle()

    if (error) throw new Error(error.message || 'No se pudo crear la mesa')
    return data as Mesa
  },

  /**
   * Actualiza una mesa (admin)
   */
  async actualizar(id: string, input: ActualizarMesaInput): Promise<Mesa> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mesas')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo actualizar la mesa')
    return data as Mesa
  },

  /**
   * Actualiza solo la posición de la mesa (para el editor drag-and-drop)
   */
  async actualizarPosicion(
    id: string,
    x: number,
    y: number,
    opciones?: { ancho?: number; alto?: number; rotacion?: number }
  ): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mesas')
      .update({
        mapa_x: x,
        mapa_y: y,
        ...(opciones?.ancho !== undefined && { mapa_ancho: opciones.ancho }),
        ...(opciones?.alto !== undefined && { mapa_alto: opciones.alto }),
        ...(opciones?.rotacion !== undefined && { mapa_rotacion: opciones.rotacion }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw new Error('No se pudo actualizar la posición')
  },

  /**
   * Actualiza solo el estado de la mesa
   */
  async actualizarEstado(id: string, estado: EstadoMesa, meseroId?: string | null): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mesas')
      .update({
        estado,
        mesero_id: meseroId !== undefined ? meseroId : undefined,
        abierta_en: estado === 'ocupada' ? new Date().toISOString() : 
                    estado === 'disponible' ? null : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw new Error('No se pudo actualizar el estado')
  },

  /**
   * Libera una mesa (la pone disponible)
   */
  async liberar(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mesas')
      .update({
        estado: 'disponible',
        mesero_id: null,
        abierta_en: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw new Error('No se pudo liberar la mesa')
  },

  /**
   * Elimina (desactiva) una mesa
   */
  async eliminar(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mesas')
      .update({ activa: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error('No se pudo eliminar la mesa')
  },

  /**
   * Reactiva una mesa
   */
  async reactivar(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mesas')
      .update({ activa: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error('No se pudo reactivar la mesa')
  },

  /**
   * Obtiene todos los elementos del mapa (barras, accesos, baños)
   */
  async getElementosMapa(): Promise<any[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mapa_elementos')
      .select('*')
      .eq('activo', true)
      .order('z_index')

    if (error) return []
    return data || []
  },

  /**
   * Crea un elemento del mapa
   */
  async crearElemento(input: {
    tipo: string
    nombre?: string
    x: number
    y: number
    ancho?: number
    alto?: number
    rotacion?: number
    z_index?: number
    metadata?: any
  }): Promise<any> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mapa_elementos')
      .insert([{
        tipo: input.tipo,
        nombre: input.nombre || null,
        x: input.x,
        y: input.y,
        ancho: input.ancho || 5,
        alto: input.alto || 5,
        rotacion: input.rotacion || 0,
        z_index: input.z_index || 1,
        metadata: input.metadata || {}
      }])
      .select()
      .maybeSingle()

    if (error) throw new Error('No se pudo crear el elemento')
    return data
  },

  /**
   * Actualiza un elemento del mapa
   */
  async actualizarElemento(id: string, input: any): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mapa_elementos')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error('No se pudo actualizar el elemento')
  },

  /**
   * Elimina un elemento del mapa
   */
  async eliminarElemento(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('mapa_elementos')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error('No se pudo eliminar el elemento')
  }
}
