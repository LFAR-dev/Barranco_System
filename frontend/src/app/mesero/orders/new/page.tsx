'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { recipeService, Recipe } from '@/lib/services/recipeService'
import { orderService, OrderItem } from '@/lib/services/orderService'

export default function NewOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [cart, setCart] = useState<OrderItem[]>([])
  const [mesa, setMesa] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await recipeService.getAll()
        setRecipes(data)
      } catch (error) {
        setError('No se pudieron cargar las recetas')
      }
    }
    fetchRecipes()
  }, [])

  const addToCart = (recipe: Recipe) => {
    const existing = cart.find(item => item.receta_id === recipe.id)
    if (existing) {
      setCart(cart.map(item =>
        item.receta_id === recipe.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        receta_id: recipe.id,
        cantidad: 1,
        nombre: recipe.nombre,
        precio: recipe.precio_venta
      }])
    }
    setError('')
  }

  const removeFromCart = (receta_id: string) => {
    setCart(cart.filter(item => item.receta_id !== receta_id))
  }

  const updateQuantity = (receta_id: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(receta_id)
      return
    }
    setCart(cart.map(item =>
      item.receta_id === receta_id ? { ...item, cantidad } : item
    ))
  }

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  const handleSubmit = async () => {
    if (!user) return
    if (cart.length === 0) {
      setError('Agrega al menos un producto')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await orderService.createOrder({
        mesero_id: user.id,
        mesa,
        items: cart,
        total
      })
      setSuccess('Pedido enviado al bartender')
      setTimeout(() => {
        router.push('/mesero')
      }, 1500)
    } catch (error) {
      setError('No se pudo crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/mesero">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de recetas */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-lg mb-3">Menú</h2>
                <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                  {recipes.map(recipe => (
                    <Button
                      key={recipe.id}
                      variant="outline"
                      className="justify-start h-auto py-2 px-3 text-left"
                      onClick={() => addToCart(recipe)}
                    >
                      <div>
                        <p className="font-medium text-sm">{recipe.nombre}</p>
                        <p className="text-xs text-gray-500">${recipe.precio_venta}</p>
                      </div>
                    </Button>
                  ))}
                </div>
                {recipes.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Cargando recetas...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carrito */}
          <div>
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-lg mb-4">Pedido</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.receta_id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium text-sm">{item.nombre}</p>
                        <p className="text-xs text-gray-500">${item.precio}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.receta_id, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.cantidad}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.receta_id, item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.receta_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No hay productos</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="mt-3">
                    <Label htmlFor="mesa">Mesa</Label>
                    <Input 
                      id="mesa" 
                      placeholder="Ej: 5" 
                      value={mesa} 
                      onChange={(e) => setMesa(e.target.value)} 
                    />
                  </div>
                  <Button 
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleSubmit} 
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? 'Enviando...' : 'Enviar Pedido'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
