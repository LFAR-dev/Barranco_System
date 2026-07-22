import { createClient } from '@/lib/supabase/client'

export interface Shift {
  id: string
  bartender_id: string
  fecha_inicio: string
  fecha_fin?: string
  estado: 'abierto' | 'cerrado'
  ventas_totales: number
  mermas_totales: number
  bebidas_preparadas: number
  eficiencia: number
}

export const shiftService = {
  async createShift(bartenderId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cierres_caja')
      .insert([{
        bartender_id: bartenderId,
        fecha_inicio: new Date().toISOString(),
        estado: 'abierto'
      }])
      .select()
      .single()
    if (error) throw error
    return data as Shift
  },

  async getActiveShift(bartenderId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('bartender_id', bartenderId)
      .eq('estado', 'abierto')
      .single()
    if (error) return null
    return data as Shift
  },

  async closeShift(shiftId: string, ventas_totales: number, mermas_totales: number, bebidas_preparadas: number) {
    const supabase = createClient()
    const eficiencia = bebidas_preparadas > 0 ? (ventas_totales / bebidas_preparadas) : 0
    const { data, error } = await supabase
      .from('cierres_caja')
      .update({
        fecha_fin: new Date().toISOString(),
        estado: 'cerrado',
        ventas_totales,
        mermas_totales,
        bebidas_preparadas,
        diferencia_caja: ventas_totales - mermas_totales,
        eficiencia: Math.round(eficiencia * 100) / 100
      })
      .eq('id', shiftId)
      .select()
      .single()
    if (error) throw error
    return data as Shift
  },

  async getShiftHistory(bartenderId: string, days = 7) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('bartender_id', bartenderId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('fecha_inicio', { ascending: false })
    if (error) throw error
    return data as Shift[]
  }
}
