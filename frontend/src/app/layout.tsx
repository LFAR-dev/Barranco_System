import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CleanAttributesProvider } from '@/components/providers/CleanAttributesProvider'

// Importar para silenciar errores de extensiones de Chrome
import '@/lib/utils/silenceErrors'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Barranco Intelligence System',
  description: 'Sistema de control operativo para bares',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <CleanAttributesProvider>
          {children}
        </CleanAttributesProvider>
      </body>
    </html>
  )
}
