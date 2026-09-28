import { createClient } from '@/lib/supabase/client'

let statsCache: any = null
let lastUpdate = 0

export async function getStats() {
  const now = Date.now()
  if (statsCache && now - lastUpdate < 5000) {
    return statsCache
  }

  const supabase = createClient()
  try {
    const { count: bartenders } = await supabase
      .from('bartenders')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    const { count: meseros } = await supabase
      .from('meseros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    const { count: productos } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    const { count: ventas } = await supabase
      .from('ventas')
      .select('*', { count: 'exact', head: true })

    const { count: admins } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'admin')
      .eq('activo', true)

    const { count: cajas } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'caja')
      .eq('activo', true)

    statsCache = {
      bartenders: bartenders || 0,
      meseros: meseros || 0,
      admins: admins || 0,
      productos: productos || 0,
      ventas: ventas || 0,
      cajas: cajas || 0
    }
    lastUpdate = now
    return statsCache
  } catch (error) {
    console.error('Error fetching stats:', error)
    return statsCache || { bartenders: 0, meseros: 0, admins: 0, productos: 0, ventas: 0, cajas: 0 }
  }
}

export async function updateStats() {
  lastUpdate = 0
  return getStats()
}
