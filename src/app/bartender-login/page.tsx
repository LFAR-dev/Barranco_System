'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBartenderClient } from '@/lib/supabase/client'
import { userService } from '@/lib/services/userService'

export default function BartenderLoginPage() {
  const router = useRouter()
  const supabase = createBartenderClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [retryAfter, setRetryAfter] = useState(0)

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: perfil } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', session.user.id)
            .maybeSingle()
          
          if (perfil?.rol === 'bartender' && isMounted) {
            router.push('/bartender')
            return
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        if (isMounted) setCheckingSession(false)
      }
    }

    checkSession()
    return () => { isMounted = false }
  }, [supabase, router])

  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setTimeout(() => setRetryAfter(retryAfter - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [retryAfter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (retryAfter > 0) return

    setLoading(true)
    setError('')

    try {
      if (codigo.length < 6) throw new Error('Ingresa el NIP de 6 dígitos')

      const result = await userService.verificarSoloCodigo(codigo.trim())
      
      if (!result?.valido) throw new Error(result?.mensaje || 'NIP inválido o expirado')
      if (result.rol !== 'bartender') throw new Error('Este NIP no corresponde a un bartender')

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: codigo.trim()
      })

      if (signInError) {
        if (signInError.message.includes('For security purposes')) {
          const match = signInError.message.match(/(\d+) seconds/)
          const seconds = match ? parseInt(match[1]) : 15
          setRetryAfter(seconds)
          throw new Error(`Por seguridad, espera ${seconds} segundos`)
        }
        throw new Error(signInError.message)
      }

      if (!data?.user) throw new Error('No se pudo iniciar sesión')

      await supabase
        .from('usuarios')
        .update({
          codigo_acceso: null,
          codigo_expiracion: null,
          ultimo_acceso: new Date().toISOString()
        })
        .eq('id', data.user.id)

      router.push('/bartender')
    } catch (err: any) {
      setError(err.message || 'Error al verificar el NIP')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
          <p className="text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">BARRANCO</span>
            <span className="ml-2 text-[10px] sm:text-xs font-semibold text-green-600 bg-green-100 px-2 sm:px-3 py-1 rounded-full">BARTENDER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">Acceso con NIP</h2>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl text-center flex items-center justify-center gap-2">
              <Key className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              Ingresa tu NIP
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo" className="text-sm font-medium">NIP de 6 dígitos</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="codigo"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    className="pl-10 text-center text-xl tracking-[0.5em] font-bold h-12 sm:h-14"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                    disabled={retryAfter > 0 || loading}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription className="flex items-center gap-2">
                    <span>❌</span> {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white h-11 sm:h-12"
                disabled={loading || codigo.length < 6 || retryAfter > 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : retryAfter > 0 ? `Espera ${retryAfter}s` : 'Ingresar'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver a selección de rol
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
