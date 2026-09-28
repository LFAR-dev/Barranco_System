import { createBrowserClient } from '@supabase/ssr'

// ============================================================
// CLIENTE DE SUPABASE POR ROL
// Cada rol tiene su propia sesión aislada en localStorage
// ============================================================

function detectarRol(): string {
  if (typeof window === 'undefined') return 'default'
  
  const path = window.location.pathname
  
  if (path.startsWith('/admin') || path.includes('admin-login')) return 'admin'
  if (path.startsWith('/bartender') || path.includes('bartender-login')) return 'bartender'
  if (path.startsWith('/mesero') || path.includes('mesero-login')) return 'mesero'
  if (path.startsWith('/caja') || path.includes('caja-login')) return 'caja'
  
  return 'default'
}

export function createClient(rolForzado?: string) {
  const rol = rolForzado || detectarRol()
  const storageKey = `barranco-session-${rol}`
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: storageKey,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // IMPORTANTE: evita conflictos entre pestañas
      },
      cookieOptions: {
        name: storageKey,
      },
    }
  )
}

// Cliente específico por rol (para usar en cada login)
export const createAdminClient = () => createClient('admin')
export const createBartenderClient = () => createClient('bartender')
export const createMeseroClient = () => createClient('mesero')
export const createCajaClient = () => createClient('caja')
