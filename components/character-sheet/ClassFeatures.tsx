"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"

interface ClassFeaturesProps {
  character: CharacterData
  onRefreshFeatures: () => Promise<void>
  onOpenFeatureModal: (content: { title: string; description: string }) => void
}

export function ClassFeatures({ character, onRefreshFeatures, onOpenFeatureModal }: ClassFeaturesProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:star" className="w-5 h-5" />
            Class Features
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefreshFeatures}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {character.classFeatures?.length > 0 ? (() => {
            // Group features by class
            const featuresByClass = new Map<string, Array<{name: string, description: string, source: string, level: number, className?: string}>>()
            
            character.classFeatures.forEach(feature => {
              // Use the className from the feature, or fallback to the character's primary class
              const className = feature.className || character.class
              
              if (!featuresByClass.has(className)) {
                featuresByClass.set(className, [])
              }
              featuresByClass.get(className)!.push(feature)
            })
            
            // Sort features within each class by level
            featuresByClass.forEach(features => {
              features.sort((a, b) => a.level - b.level)
            })
            
            // Render grouped features
            return Array.from(featuresByClass.entries()).map(([className, features]) => (
              <div key={className} className="space-y-3">
                {/* Class Header */}
                {character.classes && character.classes.length > 1 && (
                  <div className="flex items-center gap-2 mt-2">
                    <h4 className="font-semibold text-sm text-foreground">{className} Features</h4>
                    <Badge variant="outline" className="text-xs">
                      {features.length}
                    </Badge>
                  </div>
                )}
                
                {/* Features for this class */}
                {features.map((feature, index) => (
                  <div key={`${className}-${index}`} className="p-3 border rounded-lg flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium flex-1 min-w-0 truncate">{feature.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {feature.level}
                        </Badge>
                        {feature.source?.toLowerCase() === "subclass" && (
                          <Badge variant="secondary" className="text-xs">
                            {feature.source}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground relative flex flex-col gap-2">
                      <div className="line-clamp-2 max-h-12 overflow-hidden">
                        <RichTextDisplay content={feature.description} className="text-sm text-muted-foreground" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit px-2 h-7 shadow-sm text-foreground"
                        onClick={() => {
                          onOpenFeatureModal({ title: feature.name, description: feature.description })
                        }}
                      >
                        Read more
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          })() : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No class features available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
