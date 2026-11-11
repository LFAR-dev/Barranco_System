import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware de auditoria: registra accesos a rutas protegidas SIN bloquear.
// Nota: la app usa localStorage para la sesion (no cookies), por lo que
// un middleware de redirect romperia el login. Este solo audita.
// Para proteccion real, migrar a @supabase/ssr con cookies.

const RUTAS_PROTEGIDAS = ['/admin', '/caja', '/mesero', '/bartender']
const RUTAS_PUBLICAS = ['/admin-login', '/caja-login', '/mesero-login', '/bartender-login', '/']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Ignorar rutas publicas y assets
  const esPublica = RUTAS_PUBLICAS.some(p => path === p || path.startsWith(p + '/'))
  const esAsset = path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')

  if (esAsset || esPublica) {
    return NextResponse.next()
  }

  // Es una ruta protegida: solo log
  const esProtegida = RUTAS_PROTEGIDAS.some(p => path.startsWith(p))
  if (esProtegida) {
    console.log(`[middleware] Acceso a ruta protegida: ${path} - IP: ${request.headers.get('x-forwarded-for') || 'desconocida'}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
