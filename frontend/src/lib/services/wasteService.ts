import { createClient } from '@/lib/supabase/client'

export const wasteService = {
  async create(data: any) {
    const supabase = createClient()
    const { error } = await supabase
      .from('mermas')
      .insert([{
        producto_id: data.producto_id,
        bartender_id: data.bartender_id,
        sucursal_id: data.sucursal_id,
        cantidad: data.cantidad,
        motivo: data.motivo,
        descripcion: data.descripcion,
        tipo: data.tipo || 'no_esperada'
      }])
    if (error) throw error
    return true
  },

  async getByBartender(bartenderId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('mermas')
      .select(`
        *,
        productos (nombre, marca)
      `)
      .eq('bartender_id', bartenderId)
      .order('fecha', { ascending: false })
    if (error) throw error
    return data
  }
}
