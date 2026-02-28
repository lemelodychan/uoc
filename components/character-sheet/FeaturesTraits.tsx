"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { calculateProficiencyBonus } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface FeaturesTraitsProps {
  character: CharacterData
  onEdit: () => void
  onToggleFeatureUse: (featureIndex: number, slotIndex: number) => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
  canEdit?: boolean
  isLoading?: boolean
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
  onOpenFeatureModal,
  canEdit = true,
  isLoading = false
}: FeaturesTraitsProps) {
  const [featureOverflowMap, setFeatureOverflowMap] = useState<Record<number, boolean>>({})
  const [bgFeatureOverflow, setBgFeatureOverflow] = useState(false)
  if (isLoading) return <SectionCardSkeleton contentLines={5} />

  const bgFeature = character.backgroundData?.background_feature

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:user-star" className="w-5 h-5" /> 
            Features & Traits
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {bgFeature?.name && (
            <div className="p-2 pr-3 border rounded flex flex-col gap-0.5 bg-background">
              <div className="font-medium flex items-start justify-between">
                <span className="text-sm flex items-center gap-1.5">
                  {bgFeature.name}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">Background</Badge>
                </span>
              </div>
              {bgFeature.description && (
                <div className="text-xs text-muted-foreground relative">
                  <div
                    className="line-clamp-2 max-h-20 overflow-hidden"
                    ref={(el) => {
                      if (!el) return
                      const isOverflowing = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
                      setBgFeatureOverflow((prev) => (prev === isOverflowing ? prev : isOverflowing))
                    }}
                  >
                    <RichTextDisplay content={bgFeature.description} className="text-xs text-muted-foreground" />
                  </div>
                  {bgFeatureOverflow && (
                    <div className="mt-2 flex justify-start">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 h-7 shadow-sm text-foreground"
                        onClick={() => {
                          onOpenFeatureModal({
                            title: bgFeature.name!,
                            description: bgFeature.description!,
                          })
                        }}
                      >
                        Read more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {(character.features || []).map((feature, index) => (
            <div key={index} className="p-2 pr-3 border rounded flex flex-col gap-0.5 bg-background">
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
                          onClick={() => {
                            if (!canEdit) return
                            onToggleFeatureUse(index, i)
                          }}
                          disabled={!canEdit}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('featureSlotAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                              : `${getCombatColor('featureSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-1 w-5 text-right font-mono">
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
          {character.features.length === 0 && !bgFeature?.name && (
            <div className="text-sm text-muted-foreground text-center py-4">No features or traits</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
