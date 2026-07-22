import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/lib/utils/silenceErrors'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Barranco - Sistema de Gestión',
  description: 'Sistema de gestión para bares',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <div id="toast-container" className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
          {/* Los toasts se renderizan aquí */}
        </div>
      </body>
    </html>
  )
}
