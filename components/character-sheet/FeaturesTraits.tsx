"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { calculateProficiencyBonus } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"

interface FeaturesTraitsProps {
  character: CharacterData
  onEdit: () => void
  onToggleFeatureUse: (featureIndex: number, slotIndex: number) => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
}

const getFeatureUsesPerLongRest = (feature: any, character: CharacterData): number => {
  if (typeof feature.usesPerLongRest === 'number') {
    return Math.max(0, feature.usesPerLongRest)
  }
  if (typeof feature.usesPerLongRest === 'string') {
    if (feature.usesPerLongRest.toLowerCase() === 'prof') {
      return Math.max(0, character.proficiencyBonus ?? calculateProficiencyBonus(character.level))
    }
    const abilityMap: { [key: string]: number } = {
      'str': character.strength,
      'dex': character.dexterity,
      'con': character.constitution,
      'int': character.intelligence,
      'wis': character.wisdom,
      'cha': character.charisma
    }
    const abilityScore = abilityMap[feature.usesPerLongRest.toLowerCase()]
    if (abilityScore !== undefined) {
      const modifier = Math.floor((abilityScore - 10) / 2)
      return Math.max(0, modifier) // Ensure 0 or negative modifiers return 0
    }
  }
  return 0
}

export function FeaturesTraits({ 
  character, 
  onEdit, 
  onToggleFeatureUse, 
  onOpenFeatureModal 
}: FeaturesTraitsProps) {
  const [featureOverflowMap, setFeatureOverflowMap] = useState<Record<number, boolean>>({})

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:user-star" className="w-5 h-5" /> 
            Features & Traits
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {character.features.map((feature, index) => (
            <div key={index} className="p-2 border rounded flex flex-col gap-0.5 bg-background">
              <div className="font-medium flex items-start justify-between">
                <span className="text-sm">{feature.name}</span>
                {getFeatureUsesPerLongRest(feature, character) > 0 && (
                  <div className="flex items-center gap-1 py-1">
                      {Array.from({ length: getFeatureUsesPerLongRest(feature, character) }, (_, i) => {
                        const usesPer = getFeatureUsesPerLongRest(feature, character)
                        const current = Math.min(usesPer, Math.max(0, feature.currentUses ?? usesPer))
                        const usedCount = usesPer - current
                        const isAvailable = i < current
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleFeatureUse(index, i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('featureSlotAvailable')} cursor-pointer`
                              : `${getCombatColor('featureSlotUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-1 w-5 text-right">
                      {Math.min(getFeatureUsesPerLongRest(feature, character), Math.max(0, feature.currentUses ?? getFeatureUsesPerLongRest(feature, character)))}/{getFeatureUsesPerLongRest(feature, character)}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground relative">
                <div
                  className="line-clamp-2 max-h-20 overflow-hidden"
                  ref={(el) => {
                    if (!el) return
                    const isOverflowing = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
                    setFeatureOverflowMap((prev) => (prev[index] === isOverflowing ? prev : { ...prev, [index]: isOverflowing }))
                  }}
                >
                  <RichTextDisplay content={feature.description} className="text-xs text-muted-foreground" />
                </div>
                {featureOverflowMap[index] && (
                  <div className="mt-2 flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 h-7 shadow-sm text-foreground"
                      onClick={() => {
                        onOpenFeatureModal({ 
                          title: feature.name, 
                          description: feature.description,
                          usesPerLongRest: feature.usesPerLongRest,
                          refuelingDie: feature.refuelingDie
                        })
                      }}
                    >
                      Read more
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {character.features.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No features or traits</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
