"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { calculateTotalLevel, isSingleClass, getClassLevel, getClassSubclass } from "@/lib/character-data"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"
import { loadClassFeatures } from "@/lib/database"
import { createClient } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { useClassFeatures } from "@/hooks/use-class-features"
import { ClassFeaturesSkeleton, ClassFeatureItemSkeleton, ClassFeaturesEmptySkeleton } from "@/components/class-features-skeleton"

interface FeatureSlotUsageProps {
  feature: any
  character: CharacterData
  onUpdateUsage: (featureId: string, updates: any) => void
  canEdit?: boolean
}

function FeatureSlotUsage({ feature, character, onUpdateUsage, canEdit = true }: FeatureSlotUsageProps) {
  const featureUsage = getFeatureUsage(character, feature.id)
  const currentUses = featureUsage?.currentUses || 0
  const maxUses = featureUsage?.maxUses || 0
  
  if (maxUses === 0) return null
  
  const handleUseSlot = () => {
    if (currentUses < maxUses) {
      onUpdateUsage(feature.id, { type: 'use_slot', amount: 1 })
    }
  }
  
  const handleRestoreSlot = () => {
    if (currentUses > 0) {
      onUpdateUsage(feature.id, { type: 'restore_slot', amount: 1 })
    }
  }
  
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <span className="text-xs text-muted-foreground">Uses:</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleRestoreSlot}
          disabled={!canEdit || currentUses <= 0}
        >
          <Icon icon="lucide:minus" className="w-3 h-3" />
        </Button>
        <span className="text-sm font-mono min-w-[2rem] text-center">
          {currentUses}/{maxUses}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleUseSlot}
          disabled={!canEdit || currentUses >= maxUses}
        >
          <Icon icon="lucide:plus" className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

interface ClassFeaturesProps {
  character: CharacterData
  onRefreshFeatures: () => Promise<void>
  onOpenFeatureModal: (content: { title: string; description: string }) => void
  onCleanupFeatures?: () => Promise<void>
  onUpdateFeatureUsage?: (featureId: string, updates: any) => void
  canEdit?: boolean
}


export function ClassFeatures({ character, onRefreshFeatures, onOpenFeatureModal, onCleanupFeatures, onUpdateFeatureUsage, canEdit = true }: ClassFeaturesProps) {
  // Use the new class features hook with caching
  const { 
    features: allFeatures, 
    loading: isLoadingFeatures, 
    error: featuresError, 
    fromCache, 
    refresh: refreshFeatures 
  } = useClassFeatures(character)

  // Map of class name -> selected subclass class_id (to filter subclass features)
  const [subclassIdByClass, setSubclassIdByClass] = useState<Record<string, string | null>>({})

  useEffect(() => {
    let isCancelled = false

    const loadSubclassIds = async () => {
      const nextMap: Record<string, string | null> = {}

      // Handle multiclass first
      if (character.classes && character.classes.length > 0) {
        for (const charClass of character.classes) {
          const className = charClass.name
          const subclassName = charClass.subclass
          if (!subclassName) {
            nextMap[className] = null
            continue
          }
          try {
            const { loadClassData } = await import("@/lib/database")
            const { classData } = await loadClassData(className, subclassName)
            nextMap[className] = classData?.id || null
          } catch {
            nextMap[className] = null
          }
        }
      } else {
        // Legacy single-class path
        const className = character.class
        const subclassName = (character as any).subclass
        if (subclassName) {
          try {
            const { loadClassData } = await import("@/lib/database")
            const { classData } = await loadClassData(className, subclassName)
            nextMap[className] = classData?.id || null
          } catch {
            nextMap[className] = null
          }
        } else {
          nextMap[className] = null
        }
      }

      if (!isCancelled) {
        setSubclassIdByClass(nextMap)
      }
    }

    loadSubclassIds()
    return () => {
      isCancelled = true
    }
  }, [character.classes, character.class, (character as any).subclass])

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:star" className="w-5 h-5" />
            Class Features
          </CardTitle>
          {onCleanupFeatures && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCleanupFeatures}
              title="Remove features above current level"
            >
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Cleanup
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoadingFeatures ? (
            <ClassFeaturesSkeleton count={3} />
          ) : featuresError ? (
            <div className="text-center p-8 rounded-xl bg-card">
              <Icon icon="lucide:alert-circle" className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Class Features</h3>
              <p className="text-muted-foreground mb-4">{featuresError}</p>
              <Button onClick={refreshFeatures} variant="outline">
                <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : allFeatures?.length > 0 ? (() => {
            // Filter out hidden features before displaying
            const visibleFeatures = allFeatures.filter(feature => !feature.is_hidden)

            // Further filter subclass features to only the selected subclass (if any)
            const filteredFeatures = visibleFeatures.filter((feature: any) => {
              const className = feature.className || character.class
              const isSubclassFeature = (feature.source?.toLowerCase() === 'subclass') || feature.enabledBySubclass || feature.feature_type === 'subclass'

              if (!isSubclassFeature) return true

              // Require a selected subclass for this class to show subclass features
              const selectedSubclass = getClassSubclass(character.classes || [], className)
              if (!selectedSubclass) return false

              // If feature has a specific subclass_id, ensure it matches the selected subclass's class_id
              const selectedSubclassId = subclassIdByClass[className]
              if (feature.subclass_id && selectedSubclassId) {
                return feature.subclass_id === selectedSubclassId
              }
              // If no subclass_id on feature, allow it (legacy data)
              return true
            })

            // Group features by class
            const featuresByClass = new Map<string, any[]>()

            filteredFeatures.forEach(feature => {
              // Use the className from the feature, or fallback to the character's primary class
              const className = feature.className || character.class
              
              if (!featuresByClass.has(className)) {
                featuresByClass.set(className, [])
              }
              featuresByClass.get(className)!.push(feature)
            })
            
            // Sort features within each class by level
            featuresByClass.forEach(features => {
              features.sort((a, b) => (a.level || a.enabledAtLevel || 1) - (b.level || b.enabledAtLevel || 1))
            })
            
            
            // Render grouped features
            return Array.from(featuresByClass.entries()).map(([className, features]) => (
              <div key={className} className="flex flex-col gap-2">
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
                  <div key={`${className}-${index}`} className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium flex-1 min-w-0 truncate">{feature.name || feature.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {feature.level || feature.enabledAtLevel || 'Unknown'}
                        </Badge>
                        {(feature.source?.toLowerCase() === "subclass" || feature.enabledBySubclass || feature.feature_type === 'subclass') && (
                          <Badge variant="secondary" className="text-xs">
                            {feature.source || 'Subclass'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground relative flex flex-col gap-2">
                      <div className="line-clamp-2 max-h-12 overflow-hidden">
                        <RichTextDisplay content={feature.description || feature.subtitle || ''} className="text-sm text-muted-foreground" />
                      </div>
                      
                      {/* Feature Usage Tracking */}
                      {((feature as any).feature_skill_type === 'slots' || (feature as any).featureType === 'slots') && onUpdateFeatureUsage && (
                        <FeatureSlotUsage 
                          feature={feature}
                          character={character}
                          onUpdateUsage={onUpdateFeatureUsage}
                          canEdit={canEdit}
                        />
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit px-2 h-7 shadow-sm text-foreground"
                        onClick={() => {
                          onOpenFeatureModal({ 
                            title: feature.name || feature.title || 'Unknown Feature', 
                            description: feature.description || feature.subtitle || '' 
                          })
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
            <ClassFeaturesEmptySkeleton />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
