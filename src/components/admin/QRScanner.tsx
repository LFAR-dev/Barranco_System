'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Camera, Keyboard, RefreshCw, AlertCircle,
  SwitchCamera, ScanLine
} from 'lucide-react'

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

export function QRScanner({ onScan, onError, title = 'Escanear Codigo QR' }: QRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [lastScan, setLastScan] = useState<string>('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const scannerKeyRef = useRef(0)

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const value = result[0].rawValue
      if (value === lastScan) return
      setLastScan(value)
      setError('')
      onScan(value)
      setTimeout(() => setLastScan(''), 3000)
    }
  }

  const handleError = (err: any) => {
    const message =
      err?.message ||
      'No se pudo acceder a la camara. Verifica los permisos del navegador.'
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

  const cambiarCamara = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
    scannerKeyRef.current += 1
    setError('')
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cambiarCamara}
                  title="Cambiar camara"
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScanning(false)}
                >
                  <Keyboard className="h-4 w-4 mr-1" />
                  Manual
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-black">
              <Scanner
                key={scannerKeyRef.current}
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode,
                  aspectRatio: 1
                }}
                styles={{
                  container: { width: '100%', height: '300px' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-lg shadow-lg" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
              <ScanLine className="h-4 w-4 text-emerald-600" />
              <span>Apunta la camara hacia el codigo QR del producto</span>
            </div>

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
              Codigo Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                placeholder="Ingresa el codigo QR del producto"
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
