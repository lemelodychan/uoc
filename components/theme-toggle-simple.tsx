'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'

export function ThemeToggleSimple() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="h-9 w-9">
        <Icon icon="lucide:sun" className="h-4 w-4" />
      </Button>
    )
  }

  const toggleTheme = () => {
    console.log('Current theme:', theme)
    const newTheme = theme === 'light' ? 'dark' : 'light'
    console.log('Setting theme to:', newTheme)
    setTheme(newTheme)
  }

  return (
    <Button 
      variant="outline" 
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8"
    >
      {theme === 'light' ? (
        <Icon icon="lucide:sun" className="h-4 w-4" />
      ) : (
        <Icon icon="lucide:moon" className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
