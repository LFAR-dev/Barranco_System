'use client'

import { useState, useEffect } from 'react'

export function useGreeting() {
  const [greeting, setGreeting] = useState('')
  const [timeIcon, setTimeIcon] = useState('🌅')

  useEffect(() => {
    const hour = new Date().getHours()
    let message = ''
    let icon = ''

    if (hour >= 5 && hour < 12) {
      message = 'Buenos días'
      icon = '🌅'
    } else if (hour >= 12 && hour < 18) {
      message = 'Buenas tardes'
      icon = '☀️'
    } else if (hour >= 18 && hour < 22) {
      message = 'Buenas noches'
      icon = '🌆'
    } else {
      message = 'Buenas noches'
      icon = '🌙'
    }

    setGreeting(message)
    setTimeIcon(icon)
  }, [])

  return { greeting, timeIcon }
}
