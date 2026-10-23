import { createClient } from '@/lib/supabase/client'
import { jornadaService } from './jornadaService'

export const wasteService = {
  async create(data: any): Promise<boolean> {
    const supabase = createClient()

    // Obtener jornada activa si no viene en data
    let jornadaId = data.jornada_id
    if (!jornadaId) {
      jornadaId = await jornadaService.getJornadaActualId()
    }

    const { error } = await supabase
      .from('mermas')
      .insert([{
        producto_id: data.producto_id,
        bartender_id: data.bartender_id,
        sucursal_id: data.sucursal_id,
        cantidad: data.cantidad,
        motivo: data.motivo,
        descripcion: data.descripcion,
        tipo: data.tipo || 'no_esperada',
        jornada_id: jornadaId || null
      }])
    if (error) throw error
    return true
  },

  async getByBartender(bartenderId: string, jornadaId?: string): Promise<any[]> {
    const supabase = createClient()
    let query = supabase
      .from('mermas')
      .select(`
        *,
        productos (nombre, marca)
      `)
      .eq('bartender_id', bartenderId)
      .order('fecha', { ascending: false })

    if (jornadaId) query = query.eq('jornada_id', jornadaId)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}
