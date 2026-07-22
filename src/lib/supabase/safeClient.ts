import { createClient } from './client'
import { formatSupabaseError, ErrorResponse } from '@/lib/utils/errorHandler'

export interface SafeResult<T> {
  data: T | null
  error: ErrorResponse | null
  success: boolean
}

// Wrapper seguro para todas las operaciones de Supabase
export class SafeSupabaseClient {
  private client = createClient()

  // Select seguro
  async safeSelect<T = any>(
    table: string,
    query: (q: any) => any
  ): Promise<SafeResult<T[]>> {
    try {
      const q = query(this.client.from(table))
      const { data, error } = await q
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data: data as T[],
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }

  // Insert seguro
  async safeInsert<T = any>(
    table: string,
    data: any
  ): Promise<SafeResult<T>> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .maybeSingle()
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data: result as T,
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }

  // Update seguro
  async safeUpdate<T = any>(
    table: string,
    data: any,
    match: Record<string, any>
  ): Promise<SafeResult<T>> {
    try {
      let query = this.client.from(table).update(data)
      
      // Aplicar filtros de match
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      const { data: result, error } = await query.select().maybeSingle()
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data: result as T,
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }

  // Delete seguro
  async safeDelete(
    table: string,
    match: Record<string, any>
  ): Promise<SafeResult<null>> {
    try {
      let query = this.client.from(table).delete()
      
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      const { error } = await query
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data: null,
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }

  // Auth - Sign In seguro
  async safeSignIn(email: string, password: string): Promise<SafeResult<any>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data,
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }

  // Auth - Sign Up seguro
  async safeSignUp(email: string, password: string, metadata: any): Promise<SafeResult<any>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })
      
      if (error) {
        return {
          data: null,
          error: formatSupabaseError(error),
          success: false,
        }
      }
      
      return {
        data,
        error: null,
        success: true,
      }
    } catch (error: any) {
      return {
        data: null,
        error: formatSupabaseError(error),
        success: false,
      }
    }
  }
}

// Exportar una instancia única
export const safeSupabase = new SafeSupabaseClient()

// Función helper para ejecutar con reintentos
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      // Si es error 429 (Too Many Requests), esperar más tiempo
      if (error?.status === 429 || error?.message?.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, delay * 3))
      } else if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
