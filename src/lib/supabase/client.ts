import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// CLIENTE DE SUPABASE
// Usamos @supabase/supabase-js (no @supabase/ssr) porque la app
// es 100% cliente. La sesion se guarda en localStorage con la key
// estandar de Supabase: sb-<project-ref>-auth-token.
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

// Cache de clientes por rol (singleton) para no recrear en cada render
const cache = new Map<string, SupabaseClient>()

export function createClient(_rolForzado?: string): SupabaseClient {
  if (typeof window === 'undefined') {
    // SSR fallback (no deberia usarse en esta app, pero por seguridad)
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )
  }

  // Todos los roles usan el MISMO cliente y la MISMA storageKey estandar.
  // Esto garantiza que la sesion se guarde en sb-<ref>-auth-token
  // y sea leible por todos los componentes.
  const key = 'default'

  if (cache.has(key)) {
    return cache.get(key)!
  }

  const cliente = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
        flowType: 'pkce'
      }
    }
  )

  cache.set(key, cliente)
  return cliente
}

// Aliases para compatibilidad con el codigo existente
export const createAdminClient = () => createClient('admin')
export const createBartenderClient = () => createClient('bartender')
export const createMeseroClient = () => createClient('mesero')
export const createCajaClient = () => createClient('caja')
