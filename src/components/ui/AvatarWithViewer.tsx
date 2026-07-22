'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { X, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AvatarWithViewerProps {
  src?: string | null
  alt?: string
  fallback: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
}

export function AvatarWithViewer({ 
  src, 
  alt, 
  fallback, 
  className = '',
  size = 'md'
}: AvatarWithViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const sizeClass = sizeMap[size] || sizeMap.md

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="relative group cursor-pointer">
            <Avatar className={`${sizeClass} ${className} transition-all duration-300 group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2`}>
              {src && !imageError ? (
                <AvatarImage 
                  src={src} 
                  alt={alt || fallback} 
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : null}
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {fallback}
              </AvatarFallback>
            </Avatar>
            {src && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                <Maximize2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-0">
          <div className="relative flex items-center justify-center min-h-[200px]">
            {src && !imageError ? (
              <img 
                src={src} 
                alt={alt || fallback} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-white/50">
                <div className="text-6xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-transparent bg-clip-text">
                  {fallback}
                </div>
                <p className="mt-2 text-sm">Sin imagen de perfil</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
