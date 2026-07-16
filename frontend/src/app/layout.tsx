import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// TypeScript may complain about side-effect CSS imports in some setups.
// @ts-ignore: Allow importing global CSS without type declarations
import './globals.css'
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

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
    <html lang="es" className={cn("font-sans", inter.variable)}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}