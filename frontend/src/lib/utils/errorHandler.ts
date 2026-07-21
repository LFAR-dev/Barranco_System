// ============================================================
// SISTEMA DE MANEJO DE ERRORES - INROMIBLE
// ============================================================

export class AppError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly userMessage: string
  public readonly technicalMessage?: string
  public readonly isOperational: boolean

  constructor({
    code,
    status,
    message,
    userMessage,
    technicalMessage,
    isOperational = true,
  }: {
    code: string
    status: number
    message: string
    userMessage: string
    technicalMessage?: string
    isOperational?: boolean
  }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.userMessage = userMessage
    this.technicalMessage = technicalMessage
    this.isOperational = isOperational
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export interface ErrorResponse {
  code: string
  status: number
  message: string
  userMessage: string
  technicalMessage?: string
  timestamp: string
}

// Mapeo de errores de Supabase a mensajes amigables
export const supabaseErrorMap: Record<string, { status: number; userMessage: string }> = {
  '23505': { status: 409, userMessage: 'Este email ya está registrado. Por favor, usa otro.' },
  '23503': { status: 409, userMessage: 'Este usuario tiene registros asociados y no se puede eliminar.' },
  '23502': { status: 400, userMessage: 'Faltan campos obligatorios. Verifica la información.' },
  '23514': { status: 400, userMessage: 'El valor ingresado no es válido.' },
  '42P01': { status: 404, userMessage: 'No se encontró la información solicitada.' },
  '42501': { status: 403, userMessage: 'No tienes permisos para realizar esta acción.' },
  'invalid_credentials': { status: 401, userMessage: 'Credenciales incorrectas. Verifica tu NIP o contraseña.' },
  'email_not_confirmed': { status: 401, userMessage: 'Por favor, confirma tu correo electrónico antes de iniciar sesión.' },
  'user_not_found': { status: 404, userMessage: 'Usuario no encontrado. Contacta al administrador.' },
  'too_many_requests': { status: 429, userMessage: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
  'network_error': { status: 0, userMessage: 'Error de conexión. Verifica tu internet.' },
  'already_registered': { status: 409, userMessage: 'Este email ya está registrado. Por favor, usa otro.' },
}

// Función para formatear errores de Supabase
export function formatSupabaseError(error: any): ErrorResponse {
  // Error de red
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return {
      code: 'network_error',
      status: 0,
      message: error.message || 'Error de conexión',
      userMessage: '🌐 Error de conexión. Verifica tu internet e intenta de nuevo.',
      timestamp: new Date().toISOString(),
    }
  }

  // Error de Supabase con código
  if (error?.code && supabaseErrorMap[error.code]) {
    const mapped = supabaseErrorMap[error.code]
    return {
      code: error.code,
      status: mapped.status,
      message: error.message || '',
      userMessage: mapped.userMessage,
      technicalMessage: error.details || error.hint,
      timestamp: new Date().toISOString(),
    }
  }

  // Error de autenticación
  if (error?.message?.includes('Invalid login credentials')) {
    return {
      code: 'invalid_credentials',
      status: 401,
      message: error.message,
      userMessage: '🔑 Credenciales incorrectas. Verifica tu NIP o contraseña.',
      timestamp: new Date().toISOString(),
    }
  }

  // Error de registro duplicado
  if (error?.message?.includes('already registered')) {
    return {
      code: 'already_registered',
      status: 409,
      message: error.message,
      userMessage: '📧 Este email ya está registrado. Por favor, usa otro.',
      timestamp: new Date().toISOString(),
    }
  }

  // Error 429 Too Many Requests
  if (error?.status === 429 || error?.message?.includes('429')) {
    return {
      code: 'too_many_requests',
      status: 429,
      message: error.message || 'Too many requests',
      userMessage: '⏳ Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
      timestamp: new Date().toISOString(),
    }
  }

  // Error por defecto
  return {
    code: error?.code || 'unknown_error',
    status: error?.status || 500,
    message: error?.message || 'Error desconocido',
    userMessage: '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.',
    technicalMessage: error?.details || error?.hint,
    timestamp: new Date().toISOString(),
  }
}

// Función para manejar errores en componentes
export function useErrorHandler() {
  // Importar useState dentro de la función para evitar problemas
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleError = (err: any) => {
    const formatted = formatSupabaseError(err)
    setError(formatted)
    return formatted
  }

  const clearError = () => setError(null)

  const execute = async <T>(
    fn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void
      onError?: (error: ErrorResponse) => void
      showUserMessage?: boolean
    }
  ): Promise<T | null> => {
    setLoading(true)
    clearError()
    
    try {
      const result = await fn()
      if (options?.onSuccess) options.onSuccess(result)
      return result
    } catch (err: any) {
      const formatted = handleError(err)
      if (options?.onError) options.onError(formatted)
      if (options?.showUserMessage !== false) {
        console.error('[Error]', formatted.userMessage, formatted.technicalMessage || '')
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  return { error, loading, handleError, clearError, execute }
}

// Importar useState para el hook
import { useState } from 'react'
