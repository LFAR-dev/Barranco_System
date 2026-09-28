'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Keyboard, RefreshCw, AlertCircle } from 'lucide-react'

// Importación dinámica del scanner para evitar SSR
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    )
  }
)

interface QRScannerProps {
  onScan: (token: string) => void
  onError?: (error: string) => void
  title?: string
}

export function QRScanner({ onScan, onError, title = 'Escanear Código QR' }: QRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [lastScan, setLastScan] = useState<string>('')

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const value = result[0].rawValue
      
      // Evitar escaneos duplicados en un corto periodo
      if (value === lastScan) return
      
      setLastScan(value)
      onScan(value)
      
      // Resetear después de 3 segundos
      setTimeout(() => setLastScan(''), 3000)
    }
  }

  const handleError = (err: any) => {
    const message = err?.message || 'Error al acceder a la cámara. Verifica los permisos.'
    setError(message)
    onError?.(message)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
      setManualCode('')
    }
  }

  return (
    <div className="space-y-4">
      {scanning ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" />
                {title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScanning(false)}
              >
                <Keyboard className="h-4 w-4 mr-1" />
                Manual
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden bg-black">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment',
                  aspectRatio: 1
                }}
                styles={{
                  container: { width: '100%', height: '300px' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Apunta la cámara hacia el código QR del producto
            </p>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-emerald-600" />
              Código Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                placeholder="Ingresa el código QR del producto"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                className="text-center font-mono text-lg"
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Buscar Producto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanning(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
