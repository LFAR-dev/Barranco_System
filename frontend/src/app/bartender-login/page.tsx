'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Key, User, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { userService } from '@/lib/services/userService'

export default function BartenderLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('luisfelipearellano2004@gmail.com')
  const [codigo, setCodigo] = useState('')
  const [step, setStep] = useState<'email' | 'codigo'>('email')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/bartender')
      }
    }
    checkSession()
  }, [supabase.auth, router])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Verificar que el usuario existe y es bartender
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('id, rol, activo, nombre, apellido, codigo_acceso')
        .eq('email', email.trim())
        .maybeSingle()

      if (userError || !user) {
        throw new Error('Usuario no encontrado')
      }

      if (user.rol !== 'bartender') {
        throw new Error('No tienes permisos de bartender')
      }

      if (!user.activo) {
        throw new Error('Tu cuenta está desactivada. Contacta al administrador.')
      }

      if (!user.codigo_acceso) {
        throw new Error('No tienes un código de acceso asignado. Contacta al administrador.')
      }

      setUserId(user.id)
      setStep('codigo')
      setSuccess(`✅ Código enviado a ${email}`)
    } catch (err: any) {
      setError(err.message || 'Error al verificar el usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleCodigoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!email || !codigo) {
        throw new Error('Ingresa el código de 6 dígitos')
      }

      // Verificar el código
      const result = await userService.verificarCodigo(email.trim(), codigo.trim())
      
      if (!result || !result.valido) {
        throw new Error('Código inválido o expirado')
      }

      // Iniciar sesión con Supabase Auth (usar el código como contraseña temporal)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: codigo.trim()
      })

      if (signInError) {
        // Si el usuario no existe en auth, crearlo
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
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
          throw new Error('Error al crear la sesión: ' + signUpError.message)
        }

        if (signUpData.user) {
          // Actualizar el ID en la tabla usuarios
          await supabase
            .from('usuarios')
            .update({ id: signUpData.user.id })
            .eq('email', email.trim())
          
          router.push('/bartender')
        }
      } else if (data.user) {
        router.push('/bartender')
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/80 rounded-2xl backdrop-blur-sm shadow-lg mb-4">
            <span className="text-3xl font-black text-gray-900 tracking-tight">BARRANCO</span>
            <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">BARTENDER</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Acceso con Código</h2>
          <p className="text-gray-500 text-sm">
            {step === 'email' 
              ? 'Ingresa tu correo para recibir el código de acceso' 
              : 'Ingresa el código de 6 dígitos proporcionado por el administrador'}
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {step === 'email' ? 'Verificar Identidad' : 'Código de Acceso'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' 
                ? 'Ingresa tu correo electrónico registrado' 
                : 'El código fue asignado por el administrador'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="bartender@barranco.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                  {loading ? 'Verificando...' : 'Continuar'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCodigoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de 6 dígitos</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="codigo"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pl-10 text-center text-2xl tracking-widest font-bold"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400">El código es de 6 dígitos y expira en 24 horas</p>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading || codigo.length < 6}>
                  {loading ? 'Verificando...' : 'Ingresar'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-sm text-gray-500"
                  onClick={() => {
                    setStep('email')
                    setError('')
                    setSuccess('')
                  }}
                >
                  ← Volver a ingresar correo
                </Button>
              </form>
            )}
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
