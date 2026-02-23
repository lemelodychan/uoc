"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getClassLevel } from "@/lib/character-data"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"
import { getCombatColor } from "@/lib/color-mapping"

interface CombatStatsProps {
  character: CharacterData
  onEdit: () => void
  onToggleHitDie: (classIndex: number, dieIndex: number) => void
  onToggleDeathSave?: (type: 'successes' | 'failures', index: number) => void
  canEdit?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CombatStats({ character, onEdit, onToggleHitDie, onToggleDeathSave, canEdit = true }: CombatStatsProps) {
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
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground">Death Saves</div>
              <div className="flex flex-row flex-wrap justify-between gap-x-6 gap-y-1.5">
                <div className="flex flex-grow items-center gap-4">
                  <span className="text-xs font-medium w-14 text-[#6ab08b]">Successes</span>
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
                <div className="flex flex-grow items-center gap-4">
                  <span className="text-xs font-medium w-14 text-[#ce6565]">Failures</span>
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
