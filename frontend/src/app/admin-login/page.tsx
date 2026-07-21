'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('luisfelipe@barranco.com')
  const [password, setPassword] = useState('123456789')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .maybeSingle()
        if (perfil?.rol === 'admin') {
          router.push('/admin')
        }
      }
    }
    checkSession()
  }, [supabase.auth, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password 
      })
      
      if (error) {
        // Si el usuario no existe en Auth, intentar crearlo con los datos
        if (error.message.includes('Invalid login credentials')) {
          // Intentar crear el usuario
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              data: {
                nombre: 'Luis Felipe',
                apellido: 'Arellano',
                rol: 'admin'
              }
            }
          })
          
          if (signUpError) throw new Error(signUpError.message)
          
          if (signUpData.user) {
            // Crear el usuario en la tabla usuarios
            const { error: userError } = await supabase
              .from('usuarios')
              .upsert({
                id: signUpData.user.id,
                email: email.trim(),
                password_hash: 'auth_managed',
                nombre: 'Luis Felipe',
                apellido: 'Arellano',
                pin: '123456',
                rol: 'admin',
                activo: true,
                email_verificado: true,
                telefono: '+523521674162'
              }, { onConflict: 'id' })
            
            if (userError) throw new Error(userError.message)
            
            // Iniciar sesión nuevamente
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: password
            })
            
            if (loginError) throw new Error(loginError.message)
            if (!loginData.user) throw new Error('No se pudo obtener el usuario')
            
            router.push('/admin')
            return
          }
        }
        throw new Error(error.message)
      }
      
      if (!data.user) throw new Error('No se pudo obtener el usuario')

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', data.user.id)
        .maybeSingle()
      
      if (perfilError) throw new Error('Error al verificar el rol')
      
      if (perfil?.rol !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Acceso no autorizado: no eres administrador')
      }
      
      router.push('/admin')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/80 rounded-2xl backdrop-blur-sm shadow-lg mb-4">
            <span className="text-3xl font-black text-gray-900 tracking-tight">BARRANCO</span>
            <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">ADMIN</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Administrador</h2>
          <p className="text-gray-500 text-sm">Inicia sesión para acceder al panel de administración</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@barranco.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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
