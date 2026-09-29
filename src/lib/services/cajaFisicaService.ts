import { createClient } from '@/lib/supabase/client'

// ============================================================
// SERVICIO DE CAJAS FÍSICAS
// CRUD de cajas físicas (editables por admin)
// ============================================================

export interface CajaFisica {
  id: string
  nombre: string
  sucursal_id: string | null
  tipo: 'caja' | 'evento' | 'movil' | 'temporal'
  activa: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export interface CajaFisicaConSucursal extends CajaFisica {
  sucursal_nombre?: string
}

export const cajaFisicaService = {
  /**
   * Lista todas las cajas físicas (activas e inactivas)
   */
  async getAll(soloActivas = false): Promise<CajaFisicaConSucursal[]> {
    const supabase = createClient()
    let query = supabase
      .from('cajas_fisicas')
      .select(`
        *,
        sucursales (nombre)
      `)
      .order('nombre')

    if (soloActivas) {
      query = query.eq('activa', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener cajas físicas:', error)
      return []
    }

    return (data || []).map((c: any) => ({
      ...c,
      sucursal_nombre: c.sucursales?.nombre || null
    }))
  },

  /**
   * Obtiene una caja física por ID
   */
  async getById(id: string): Promise<CajaFisica | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cajas_fisicas')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error al obtener caja física:', error)
      return null
    }
    return data
  },

  /**
   * Crea una nueva caja física (solo admin)
   */
  async create(data: {
    nombre: string
    sucursal_id?: string | null
    tipo?: 'caja' | 'evento' | 'movil' | 'temporal'
    notas?: string
  }): Promise<CajaFisica> {
    const supabase = createClient()
    const { data: nueva, error } = await supabase
      .from('cajas_fisicas')
      .insert([{
        nombre: data.nombre,
        sucursal_id: data.sucursal_id || null,
        tipo: data.tipo || 'caja',
        notas: data.notas || null,
        activa: true
      }])
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error al crear caja física:', error)
      throw new Error(error.message || 'No se pudo crear la caja física')
    }

    return nueva
  },

  /**
   * Actualiza una caja física (solo admin)
   */
  async update(id: string, data: Partial<CajaFisica>): Promise<CajaFisica> {
    const supabase = createClient()
    const { data: actualizada, error } = await supabase
      .from('cajas_fisicas')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error al actualizar caja física:', error)
      throw new Error('No se pudo actualizar la caja física')
    }

    return actualizada
  },

  /**
   * Desactiva una caja física (soft delete)
   */
  async desactivar(id: string): Promise<void> {
    await this.update(id, { activa: false })
  },

  /**
   * Reactiva una caja física
   */
  async reactivar(id: string): Promise<void> {
    await this.update(id, { activa: true })
  },

  /**
   * Elimina permanentemente (solo si nunca se usó)
   */
  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('cajas_fisicas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar caja física:', error)
      throw new Error('No se puede eliminar: la caja tiene sesiones asociadas')
    }
  }
}
