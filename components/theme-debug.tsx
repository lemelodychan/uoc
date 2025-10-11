'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeDebug() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading theme...</div>
  }

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="font-display font-bold mb-2">Theme Debug</h3>
      <div className="space-y-2 text-sm font-mono">
        <div>Current theme: <span className="text-primary">{theme}</span></div>
        <div>Resolved theme: <span className="text-primary">{resolvedTheme}</span></div>
        <div>HTML class: <span className="text-primary">{document.documentElement.className}</span></div>
        <div>Body class: <span className="text-primary">{document.body.className}</span></div>
      </div>
      <div className="mt-4 space-x-2">
        <button 
          onClick={() => setTheme('light')}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Set Light
        </button>
        <button 
          onClick={() => setTheme('dark')}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Set Dark
        </button>
        <button 
          onClick={() => setTheme('system')}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Set System
        </button>
      </div>
    </div>
  )
}
