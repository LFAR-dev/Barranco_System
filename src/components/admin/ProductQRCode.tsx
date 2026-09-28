'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, Download, X } from 'lucide-react'

interface ProductQRCodeProps {
  producto: {
    id: string
    nombre: string
    qr_token?: string
    categoria_nombre?: string
    unidad_medida?: string
    marca?: string
  }
  onClose?: () => void
}

export function ProductQRCode({ producto, onClose }: ProductQRCodeProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!producto.qr_token) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 font-medium">
            Este producto no tiene un código QR asignado
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Contacta al administrador para generar el QR
          </p>
          {onClose && (
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const originalContent = document.body.innerHTML
    const printWindow = window.open('', '', 'height=600,width=800')
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR - ${producto.nombre}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .qr-container { text-align: center; page-break-after: always; }
                .qr-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .qr-subtitle { font-size: 14px; color: #666; margin-bottom: 15px; }
                .qr-code { margin: 20px auto; }
                .qr-code-text { font-family: monospace; font-size: 12px; margin-top: 10px; color: #333; }
                .qr-footer { font-size: 10px; color: #999; margin-top: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="qr-title">BARRANCO</div>
              <div class="qr-subtitle">Sistema de Inventario</div>
              ${printContent.innerHTML}
              <div class="qr-footer">Generado por Barranco Intelligence System</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 400
    canvas.height = 400

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR-${producto.nombre.replace(/\s+/g, '-')}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="space-y-4">
      {/* Tarjeta imprimible */}
      <div ref={printRef}>
        <Card className="print:shadow-none print:border-0 border-2 border-gray-200">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                BARRANCO
              </h3>
              <p className="text-xs text-gray-500">Sistema de Inventario</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCodeSVG
                id="qr-svg"
                value={producto.qr_token}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="mt-4">
              <p className="font-bold text-gray-900 text-lg">
                {producto.nombre}
              </p>
              {producto.marca && (
                <p className="text-sm text-gray-600">{producto.marca}</p>
              )}
              {producto.categoria_nombre && (
                <p className="text-xs text-gray-500 mt-1">
                  {producto.categoria_nombre}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2 font-mono tracking-wider">
                {producto.qr_token.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir QR
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="icon">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
