'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="h-9 w-9 border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Icon 
            icon="lucide:sun" 
            className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" 
          />
          <Icon 
            icon="lucide:moon" 
            className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" 
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className="cursor-pointer"
        >
          <Icon icon="lucide:sun" className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className="cursor-pointer"
        >
          <Icon icon="lucide:moon" className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className="cursor-pointer"
        >
          <div className="mr-2 h-4 w-4 rounded-sm border border-border bg-gradient-to-br from-background to-muted" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple toggle button variant (alternative)
export function ThemeToggleSimple() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <Button 
      variant="outline" 
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 border-border hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Icon 
        icon="lucide:sun" 
        className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" 
      />
      <Icon 
        icon="lucide:moon" 
        className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" 
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
