import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Función para manejar errores de autenticación
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Error desconocido'
  
  const message = error.message || ''
  
  if (message.includes('Invalid login credentials')) {
    return '❌ Credenciales incorrectas. Verifica tu email y contraseña.'
  }
  if (message.includes('Email not confirmed')) {
    return '📧 Por favor, confirma tu email antes de iniciar sesión.'
  }
  if (message.includes('User not found')) {
    return '👤 Usuario no encontrado. Contacta al administrador.'
  }
  if (message.includes('Network error')) {
    return '🌐 Error de red. Verifica tu conexión a internet.'
  }
  if (message.includes('Too many requests')) {
    return '⏳ Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  }
  if (message.includes('Password')) {
    return '🔑 Contraseña incorrecta. Inténtalo de nuevo.'
  }
  
  return message
}
