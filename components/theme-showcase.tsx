'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ThemeDebug } from '@/components/theme-debug'
import { FontTest } from '@/components/font-test'
import { 
  getClassColorStyle, 
  getStatColorStyle, 
  getClassBadgeStyle, 
  getStatBadgeStyle,
  formatClassName,
  formatStatName,
  getAllClasses,
  getAllStats,
  type DnDClass,
  type AbilityStat
} from '@/lib/theme-utils'

export function ThemeShowcase() {
  const classes = getAllClasses()
  const stats = getAllStats()

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">
          D&D Theme System Showcase
        </h1>
        <ThemeToggle />
      </div>

      {/* Theme Debug Component */}
      <ThemeDebug />

      {/* Font Test Component */}
      <FontTest />

      {/* Typography Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-2">
              Space Grotesk Display
            </h1>
            <p className="text-lg font-body text-muted-foreground">
              Public Sans body text with relaxed line height for comfortable reading.
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              JetBrains Mono for stats, numbers, and technical data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* D&D Class Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">D&D Class Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classes.map((className) => (
              <div key={className} className="space-y-2">
                <Badge 
                  style={getClassBadgeStyle(className)}
                  className="w-full justify-center"
                >
                  {formatClassName(className)}
                </Badge>
                <p 
                  className="text-sm font-mono text-center"
                  style={getClassColorStyle(className)}
                >
                  {getClassColorStyle(className).color}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ability Stat Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Ability Stat Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat} className="space-y-2">
                <Badge 
                  style={getStatBadgeStyle(stat)}
                  className="w-full justify-center"
                >
                  {formatStatName(stat)}
                </Badge>
                <p 
                  className="text-sm font-mono text-center"
                  style={getStatColorStyle(stat)}
                >
                  {getStatColorStyle(stat).color}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Button Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Button Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-16 bg-background border border-border rounded-lg"></div>
              <p className="text-sm font-mono text-center">Background</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-card border border-border rounded-lg"></div>
              <p className="text-sm font-mono text-center">Card</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-primary rounded-lg"></div>
              <p className="text-sm font-mono text-center text-primary-foreground">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-accent rounded-lg"></div>
              <p className="text-sm font-mono text-center text-accent-foreground">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded-lg"></div>
              <p className="text-sm font-mono text-center">Muted</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-destructive rounded-lg"></div>
              <p className="text-sm font-mono text-center text-destructive-foreground">Destructive</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 border-2 border-border rounded-lg"></div>
              <p className="text-sm font-mono text-center">Border</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-ring rounded-lg"></div>
              <p className="text-sm font-mono text-center">Ring</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Card Example */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Character Card Example</CardTitle>
        </CardHeader>
        <CardContent>
          <Card className="max-w-md">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-display font-bold text-foreground">
                    Thordak Ironheart
                  </h3>
                  <p className="text-muted-foreground">Dwarf Fighter · Level 5</p>
                </div>
                <Badge 
                  style={getClassBadgeStyle('fighter')}
                  variant="outline"
                >
                  Fighter
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 font-mono text-sm">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">45/45</div>
                  <div className="text-xs text-muted-foreground">HP</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">18</div>
                  <div className="text-xs text-muted-foreground">AC</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">+2</div>
                  <div className="text-xs text-muted-foreground">Init</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">STR</span>
                  <span style={getStatColorStyle('strength')}>18 (+4)</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">DEX</span>
                  <span style={getStatColorStyle('dexterity')}>14 (+2)</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">CON</span>
                  <span style={getStatColorStyle('constitution')}>16 (+3)</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">INT</span>
                  <span style={getStatColorStyle('intelligence')}>10 (+0)</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">WIS</span>
                  <span style={getStatColorStyle('wisdom')}>12 (+1)</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">CHA</span>
                  <span style={getStatColorStyle('charisma')}>8 (-1)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
