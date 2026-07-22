'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { userService } from '@/lib/services/userService'

export default function MeseroLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .maybeSingle()
        if (perfil?.rol === 'mesero') {
          router.push('/mesero')
        } else {
          await supabase.auth.signOut()
        }
      }
    }
    checkSession()
  }, [supabase.auth, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!codigo || codigo.length < 6) {
        throw new Error('Ingresa el NIP de 6 dígitos')
      }

      const result = await userService.verificarSoloCodigo(codigo.trim())
      
      if (!result || !result.valido) {
        throw new Error(result?.mensaje || 'NIP inválido o expirado')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (session.user.email !== result.email) {
          await supabase.auth.signOut()
        } else {
          router.push('/mesero')
          return
        }
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: codigo.trim()
      })

      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: result.email,
          password: codigo.trim(),
          options: {
            data: {
              nombre: result.nombre,
              apellido: result.apellido,
              rol: result.rol
            }
          }
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: result.email,
              password: codigo.trim()
            })
            if (retryError) throw retryError
            if (retryData?.user) {
              await supabase
                .from('usuarios')
                .update({
                  codigo_acceso: null,
                  codigo_expiracion: null,
                  ultimo_acceso: new Date().toISOString()
                })
                .eq('id', retryData.user.id)
              router.push('/mesero')
              return
            }
          }
          throw new Error('Error al iniciar sesión: ' + signUpError.message)
        }

        if (signUpData.user) {
          await supabase
            .from('usuarios')
            .update({
              codigo_acceso: null,
              codigo_expiracion: null,
              ultimo_acceso: new Date().toISOString()
            })
            .eq('id', signUpData.user.id)
          
          router.push('/mesero')
          return
        }
      }

      if (data?.user) {
        await supabase
          .from('usuarios')
          .update({
            codigo_acceso: null,
            codigo_expiracion: null,
            ultimo_acceso: new Date().toISOString()
          })
          .eq('id', data.user.id)
        
        router.push('/mesero')
      } else {
        throw new Error('No se pudo iniciar sesión correctamente')
      }

    } catch (err: any) {
      setError(err.message || 'Error al verificar el NIP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/80 rounded-2xl backdrop-blur-sm shadow-lg mb-4">
            <span className="text-3xl font-black text-gray-900 tracking-tight">BARRANCO</span>
            <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">MESERO</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Acceso con NIP</h2>
          <p className="text-gray-500 text-sm">Ingresa el NIP de 6 dígitos proporcionado por el administrador</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Ingresa tu NIP</CardTitle>
            <CardDescription className="text-center">El NIP fue asignado por el administrador y expira en 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">NIP de 6 dígitos</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="codigo"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    className="pl-12 text-center text-3xl tracking-[0.5em] font-bold h-16"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-gray-400">El NIP es de 6 dígitos y expira en 24 horas</p>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-lg"
                disabled={loading || codigo.length < 6}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  'Ingresar'
                )}
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
