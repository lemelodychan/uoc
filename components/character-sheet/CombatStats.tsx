"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getClassLevel } from "@/lib/character-data"
import { getFeatureUsage, getFeatureCustomDescription } from "@/lib/feature-usage-tracker"
import { getCombatColor, getClassFeatureColors } from "@/lib/color-mapping"
import { loadClassFeatureSkills } from "@/lib/database"
import { calculateUsesFromFormula, resolveDescriptionSegments } from "@/lib/class-feature-templates"
import type { DescriptionSegment } from "@/lib/class-feature-templates"
import { getFeatureMaxUses } from "@/lib/feature-usage-tracker"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"
import { useState, useEffect } from "react"
import { CombatStatsSkeleton } from "./character-sheet-skeletons"

interface CombatStatsProps {
  character: CharacterData
  onEdit: () => void
  onToggleHitDie: (classIndex: number, dieIndex: number) => void
  onToggleDeathSave?: (type: 'successes' | 'failures', index: number) => void
  onUpdateFeatureUsage?: (featureId: string, updates: any) => void
  canEdit?: boolean
  isLoading?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CombatStats({ character, onEdit, onToggleHitDie, onToggleDeathSave, onUpdateFeatureUsage, canEdit = true, isLoading = false }: CombatStatsProps) {
  const [classFeatureSkills, setClassFeatureSkills] = useState<ClassFeatureSkill[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)

  // Load class feature skills
  useEffect(() => {
    const loadFeatures = async () => {
      setIsLoadingFeatures(true)
      try {
        const { featureSkills } = await loadClassFeatureSkills(character)
        setClassFeatureSkills(featureSkills || [])
      } catch (error) {
        setClassFeatureSkills([])
      } finally {
        setIsLoadingFeatures(false)
      }
    }

    loadFeatures()
  }, [character.id, character.level, character.classes])

  if (isLoading) return <CombatStatsSkeleton />

  // Filter features for combat display
  const combatFeatures = classFeatureSkills.filter(skill => {
    // Only show features that have 'combat' in their displayLocation
    if (skill.displayLocation !== undefined && skill.displayLocation !== null) {
      return skill.displayLocation.includes('combat')
    }
    // If displayLocation is not set, don't show in combat (backward compatibility)
    return false
  })

  // Group combat features by class
  const featuresByClass = new Map<string, ClassFeatureSkill[]>()
  combatFeatures.forEach(skill => {
    const className = skill.className || character.class
    if (!featuresByClass.has(className)) {
      featuresByClass.set(className, [])
    }
    featuresByClass.get(className)!.push(skill)
  })

  // Render individual feature skill (similar to Spellcasting component)
  const renderFeatureSkill = (skill: ClassFeatureSkill, className?: string) => {
    if (!skill.id) return null
    
    const usage = getFeatureUsage(character, skill.id)
    const customDescription = getFeatureCustomDescription(character, skill.id) || ''

    switch (skill.featureType) {
      case 'slots':
        return renderSlotsFeature(skill, usage, customDescription, className)
      case 'points_pool':
        return renderPointsPoolFeature(skill, usage, customDescription)
      case 'availability_toggle':
        return renderAvailabilityToggleFeature(skill, usage, customDescription)
      default:
        return null
    }
  }

  // Render a description with resolved variables styled as badges
  const renderDescription = (segments: DescriptionSegment[]) => {
    if (segments.length === 0) return null
    if (segments.every(s => s.type === 'text')) {
      const text = segments.map(s => s.value).join('')
      return text || null
    }
    return (
      <>
        {segments.map((seg, i) =>
          seg.type === 'variable' ? (
            <Badge key={i} variant="secondary" className="text-[11px] leading-none h-[18px] px-1.5 py-0 font-mono font-semibold align-middle">
              {seg.value}
            </Badge>
          ) : (
            <span key={i}>{seg.value}</span>
          )
        )}
      </>
    )
  }

  // Render slots-based features
  const renderSlotsFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string, className?: string) => {
    if (!skill.id) return null
    
    // Get effective config with level-based scaling applied
    const slotConfig = skill.config as any
    const classLevel = className ? getClassLevel(character.classes || [], className) || character.level : character.level
    
    // Apply level-based scaling if override.levelScaling exists
    let effectiveConfig = { ...slotConfig }
    if (slotConfig.override && slotConfig.override.levelScaling) {
      const levelScaling = slotConfig.override.levelScaling
      const levels = Object.keys(levelScaling)
        .map(Number)
        .sort((a, b) => b - a) // Sort descending to find highest applicable level
      
      // Find the highest level that applies
      for (const level of levels) {
        if (classLevel >= level) {
          const scalingConfig = levelScaling[level.toString()]
          // Merge scaling config into effective config
          effectiveConfig = { ...effectiveConfig, ...scalingConfig }
          break
        }
      }
    }
    
    // Calculate maxUses: ALWAYS use formula if available (formulas are dynamic based on stats)
    let maxUses = 0
    if (effectiveConfig?.usesFormula) {
      maxUses = calculateUsesFromFormula(effectiveConfig.usesFormula, character, skill.className)
    } else if (usage?.maxUses !== undefined) {
      maxUses = usage.maxUses
    } else {
      maxUses = getFeatureMaxUses(character, skill.id) || 0
    }
    const currentUses = usage?.currentUses !== undefined ? Math.min(usage.currentUses, maxUses) : maxUses

    if (maxUses === 0) return null

    const classColors = className ? getClassFeatureColors(className) : {
      available: getCombatColor('spellSlotAvailable'),
      used: getCombatColor('spellSlotUsed')
    }

    return (
      <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
        <div className="flex gap-1 flex-col">
          <span className="text-sm font-medium">{skill.title}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
            {renderDescription(resolveDescriptionSegments(
              customDescription || skill.subtitle || skill.customDescription || '',
              character,
              effectiveConfig,
              skill.className,
              { maxUses }
            ))}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxUses }, (_, i) => {
            const isAvailable = i < currentUses
            return (
              <button
                key={i}
                onClick={() => {
                  if (!canEdit || !onUpdateFeatureUsage) return
                  onUpdateFeatureUsage(skill.id, { 
                    type: isAvailable ? 'use_slot' : 'restore_slot', 
                    amount: 1 
                  })
                }}
                disabled={!canEdit}
                className={`w-4 h-4 rounded border-2 transition-colors ${
                  isAvailable
                    ? `${classColors.available} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                    : `${classColors.used} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                }`}
                title={isAvailable ? "Available" : "Used"}
              />
            )
          })}
          <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
            {currentUses}/{maxUses}
          </span>
        </div>
      </div>
    )
  }

  // Render points pool features
  const renderPointsPoolFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    // Get effective config with level-based scaling applied
    const pointsConfig = skill.config as any
    const classLevel = skill.className ? getClassLevel(character.classes || [], skill.className) || character.level : character.level
    
    // Apply level-based scaling if override.levelScaling exists
    let effectiveConfig = { ...pointsConfig }
    if (pointsConfig.override && pointsConfig.override.levelScaling) {
      const levelScaling = pointsConfig.override.levelScaling
      const levels = Object.keys(levelScaling)
        .map(Number)
        .sort((a, b) => b - a) // Sort descending to find highest applicable level
      
      // Find the highest level that applies
      for (const level of levels) {
        if (classLevel >= level) {
          const scalingConfig = levelScaling[level.toString()]
          // Merge scaling config into effective config
          effectiveConfig = { ...effectiveConfig, ...scalingConfig }
          break
        }
      }
    }
    
    // Calculate maxPoints: ALWAYS use formula if available (formulas are dynamic based on stats)
    let maxPoints = 0
    if (effectiveConfig?.totalFormula) {
      maxPoints = calculateUsesFromFormula(effectiveConfig.totalFormula, character, skill.className)
    } else if (usage?.maxPoints !== undefined) {
      maxPoints = usage.maxPoints
    }
    const currentPoints = usage?.currentPoints !== undefined ? Math.min(usage.currentPoints, maxPoints) : maxPoints

    if (maxPoints === 0) return null

    return (
      <div className="flex items-center justify-between p-2 border rounded bg-background">
        <div className="flex gap-1 flex-col">
          <span className="text-sm font-medium">{skill.title}</span>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
            {renderDescription(resolveDescriptionSegments(
              customDescription || skill.subtitle || skill.customDescription || '',
              character,
              effectiveConfig,
              skill.className,
              { maxPoints }
            ))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max={maxPoints}
            value={currentPoints}
            onChange={(e) => {
              if (!canEdit || !onUpdateFeatureUsage) return
              const newValue = Math.max(0, Math.min(maxPoints, parseInt(e.target.value) || 0))
              onUpdateFeatureUsage(skill.id, { 
                type: 'direct_update',
                updates: {
                  currentPoints: newValue,
                  maxPoints: maxPoints
                }
              })
            }}
            disabled={!canEdit}
            className="w-16 px-2 py-1 text-sm border rounded text-center bg-card"
            title={`Remaining ${skill.title} points`}
          />
          <span className="text-sm text-muted-foreground">
            / {maxPoints}
          </span>
        </div>
      </div>
    )
  }

  // Render availability toggle features
  const renderAvailabilityToggleFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    const available = (usage?.isAvailable ?? (usage?.customState?.available as boolean | undefined)) ?? true

    return (
      <div 
        className={`p-2 border rounded transition-colors bg-background ${canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => {
          if (!canEdit || !onUpdateFeatureUsage) return
          onUpdateFeatureUsage(skill.id, { 
            type: 'toggle_availability'
          })
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm flex flex-col gap-1">
            <span className="font-medium">{skill.title}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              {renderDescription(resolveDescriptionSegments(
                customDescription || skill.subtitle || skill.customDescription || '',
                character,
                skill.config,
                skill.className
              ))}
            </span>
          </span>
          <Badge variant={available ? "default" : "secondary"}>
            {available ? "Available" : "Used"}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:biceps-flexed" className="w-5 h-5" />
            Combat Stats
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 grid grid-cols-2 gap-4 items-start">
        <div className="flex items-center gap-3 col-span-1 mb-0">
          <Icon icon="lucide:shield" className={`w-5 h-5 ${getCombatColor('armorClass')}`} />
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Armor Class</div>
            <div className="text-xl font-bold font-mono">{character.armorClass}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 col-span-1 mb-0">
          <Icon icon="lucide:zap" className={`w-5 h-5 ${getCombatColor('initiative')}`} />
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Initiative</div>
            <div className="text-xl font-bold font-mono">{formatModifier(character.initiative)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 col-span-1 mb-0">
          <Icon icon="lucide:footprints" className={`w-5 h-5 ${getCombatColor('speed')}`} />
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              Speed
              {(() => {
                const exhaustion = character.exhaustion || 0
                if (exhaustion >= 2) {
                  return <Badge variant="outline" className="bg-[#ce6565] text-white text-xs border-0 px-1 py-1 rounded-full"><Icon icon="lucide:skull" className="w-4 h-4" /></Badge>
                }
                return null
              })()}
            </div>
            <div className={`text-xl font-bold font-mono ${(() => {
              const exhaustion = character.exhaustion || 0
              return exhaustion >= 2 ? "text-[#ce6565]" : ""
            })()}`}>
              {(() => {
                const exhaustion = character.exhaustion || 0
                if (exhaustion >= 5) return "0 ft"
                if (exhaustion >= 2) return `${Math.floor(character.speed / 2)} ft`
                return `${character.speed} ft`
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 col-span-1 mb-0">
          <Icon icon="lucide:heart" className={`w-5 h-5 ${getCombatColor('hitPoints')}`} />
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              Hit Points
              {(() => {
                const exhaustion = character.exhaustion || 0
                if (exhaustion >= 4) {
                  return <Badge variant="outline" className="bg-[#ce6565] text-white text-xs px-1 py-1 border-0 rounded-full"><Icon icon="lucide:skull" className="w-4 h-4" /></Badge>
                }
                return null
              })()}
            </div>
            <div className={`text-xl font-bold font-mono flex items-center gap-2 ${(() => {
              const exhaustion = character.exhaustion || 0
              return exhaustion >= 4 ? "text-[#ce6565]" : ""
            })()}`}>
              {(() => {
                const exhaustion = character.exhaustion || 0
                const tempMaxHP = character.tempMaxHP ?? 0
                const baseMax = character.maxHitPoints + tempMaxHP
                const effectiveMaxHP = exhaustion >= 4 ? Math.floor(baseMax / 2) : baseMax
                const tempHP = (character.temporaryHitPoints ?? 0) > 0 ? character.temporaryHitPoints as number : 0
                return (
                  <>
                    {character.currentHitPoints}/
                    {effectiveMaxHP + tempHP}
                    {tempMaxHP !== 0 && (
                      <span className={`${tempMaxHP > 0 ? getCombatColor('tempHP') : 'text-[#ce6565]'} text-xs font-medium`}>({tempMaxHP > 0 ? '+' : ''}{tempMaxHP})</span>
                    )}
                    {tempHP > 0 && (
                      <span className={`${getCombatColor('tempHP')} text-xs font-medium`}>(+{tempHP} temp)</span>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
        {/* Death Saves - show when HP is 0 */}
        {character.currentHitPoints === 0 && (
          <div className="flex items-start gap-3 col-span-2 mb-0">
            <Icon icon="lucide:skull" className="w-5 h-10 py-2.5 text-[#ce6565]" />
            <div className="flex w-full flex-col gap-2">
              <div className="text-sm text-muted-foreground">Death Saves</div>
              <div className="flex flex-row flex-wrap justify-start gap-x-2 gap-y-1.5">
                <div className="w-fit flex items-center justify-start gap-4 border-[#6ab08b] border rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium w-12 text-[#6ab08b]">Success</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }, (_, i) => {
                      const isChecked = i < (character.deathSaves?.successes ?? 0)
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!canEdit || !onToggleDeathSave) return
                            onToggleDeathSave('successes', i)
                          }}
                          disabled={!canEdit}
                          className={`w-3 h-3 rounded-md border-2 transition-colors ${
                            isChecked
                              ? `bg-[#6ab08b] border-[#6ab08b] ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`
                              : `bg-card border-border ${canEdit ? 'cursor-pointer hover:border-[#6ab08b]' : 'cursor-not-allowed opacity-50'}`
                          }`}
                          title={isChecked ? "Success" : "Not yet"}
                        />
                      )
                    })}
                  </div>
                </div>
                <div className="w-fit flex items-center justify-start gap-4 border-[#ce6565] border rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium w-12 text-[#ce6565]">Fails</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }, (_, i) => {
                      const isChecked = i < (character.deathSaves?.failures ?? 0)
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!canEdit || !onToggleDeathSave) return
                            onToggleDeathSave('failures', i)
                          }}
                          disabled={!canEdit}
                          className={`w-3 h-3 rounded-md border-2 transition-colors ${
                            isChecked
                              ? `bg-[#ce6565] border-[#ce6565] ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`
                              : `bg-card border-border ${canEdit ? 'cursor-pointer hover:border-[#ce6565]' : 'cursor-not-allowed opacity-50'}`
                          }`}
                          title={isChecked ? "Failure" : "Not yet"}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exhaustion - only show if > 0 */}
        {(character.exhaustion ?? 0) > 0 && (
          <div className="flex items-center gap-3 col-span-2 mb-0">
            <Icon icon="lucide:skull" className="w-[20px] min-w-[20px] h-[20px] min-h-[20px] text-[#ce6565]" />
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Exhaustion</div>
              <div className="text-xl font-bold font-mono text-[#ce6565]">
                Level {character.exhaustion}
              </div>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const exhaustion = character.exhaustion || 0
                  const effects = []
                  if (exhaustion >= 1) effects.push("Disadvantage on ability checks")
                  if (exhaustion >= 2) effects.push("Speed halved")
                  if (exhaustion >= 3) effects.push("Disadvantage on attack rolls & saves")
                  if (exhaustion >= 4) effects.push("Hit point maximum halved")
                  if (exhaustion >= 5) effects.push("Speed reduced to 0")
                  if (exhaustion >= 6) effects.push("Death")
                  return effects.join(", ")
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Hit Dice */}
        {character.hitDiceByClass && character.hitDiceByClass.length > 0 ? (
          <div className="flex items-start gap-3 col-span-2 mb-0">
            <Icon icon="lucide:dice-5" className={`w-5 h-10 py-2.5 ${getCombatColor('hitDice')}`} />
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Hit Dice</div>
              <div className="flex flex-row gap-5">
                {character.hitDiceByClass.map((hitDie, classIndex) => (
                  <div key={classIndex} className="flex flex-col gap-1">
                    <span className="text-md font-bold font-mono">
                      {hitDie.total - hitDie.used}/{hitDie.total}{hitDie.dieType}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: hitDie.total }, (_, dieIndex) => {
                        const isAvailable = dieIndex < (hitDie.total - hitDie.used)
                        return (
                          <button
                            key={dieIndex}
                            onClick={() => {
                              if (!canEdit) return
                              onToggleHitDie(classIndex, dieIndex)
                            }}
                            disabled={!canEdit}
                            className={`w-3 h-3 rounded border transition-colors ${
                              isAvailable
                                ? `${getCombatColor('hitDieAvailable')} ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`
                                : `${getCombatColor('hitDieUsed')} ${canEdit ? 'cursor-pointer hover:border-border/80' : 'cursor-not-allowed opacity-50'}`
                            }`}
                            title={isAvailable ? "Available" : "Used"}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : character.hitDice && (
          <div className="flex items-center gap-3 col-span-1 mb-0">
            <Icon icon="lucide:dice-5" className={`w-5 h-5 ${getCombatColor('hitDice')}`} />
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Hit Dice</div>
              <div className="text-xl font-bold font-mono">
                {character.hitDice.total - character.hitDice.used}/{character.hitDice.total}{character.hitDice.dieType}
              </div>
            </div>
          </div>
        )}

        {/* Rogue Sneak Attack dice (slot-based display) */}
        {(() => {
          // Determine whether to show: either has Rogue levels or explicit usage exists
          const usage = getFeatureUsage(character, 'sneak-attack')
          const rogueLevel = getClassLevel(character.classes || [], 'Rogue') || (character.class?.toLowerCase() === 'rogue' ? character.level : 0)
          const hasSneakAttack = (usage?.featureType === 'slots') || rogueLevel > 0
          if (!hasSneakAttack) return null

          // Dice scaling anchored to Rogue level for multiclassing
          // Base 1d6 at 1st, +1d6 at 3,5,7,...,19 → floor((rogueLevel+1)/2)
          const rulesDice = Math.floor((rogueLevel + 1) / 2)

          // If unified usage exists for sneak-attack as slots, prefer it
          const maxDice = usage?.featureType === 'slots' && typeof usage.maxUses === 'number' ? usage.maxUses : rulesDice
          const currentDice = usage?.featureType === 'slots' && typeof usage.currentUses === 'number' ? usage.currentUses : maxDice
          const show = maxDice > 0
          if (!show) return null

          return (
            <div className="flex items-start gap-3 col-span-2 mb-0">
              <Icon icon="lucide:crosshair" className={`w-5 h-10 py-2.5 ${getCombatColor('featureAvailable')}`} />
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">Sneak Attack</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono">{maxDice}d6</span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Class Features for Combat */}
        {combatFeatures.length > 0 && (
          <div className="col-span-2 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Class Features</div>
            <div className="flex flex-col gap-2">
              {Array.from(featuresByClass.entries()).map(([className, features]) => (
                <div key={className} className="flex flex-col gap-2">
                  {featuresByClass.size > 1 && (
                    <div className="text-sm font-medium text-muted-foreground">{className} Features</div>
                  )}
                  {features.map((skill, index) => (
                    <div key={skill.id || `${className}-${index}`}>
                      {renderFeatureSkill(skill, className)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Combat Notes - Only show if notes exist */}
        {character.otherTools && character.otherTools.trim() !== "" && (
          <div className="col-span-2 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Combat Notes</div>
            <RichTextDisplay
              content={character.otherTools}
              className="text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
