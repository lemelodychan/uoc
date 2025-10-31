"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"

interface CombatStatsProps {
  character: CharacterData
  onEdit: () => void
  onToggleHitDie: (classIndex: number, dieIndex: number) => void
  canEdit?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CombatStats({ character, onEdit, onToggleHitDie, canEdit = true }: CombatStatsProps) {
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
                const effectiveMaxHP = exhaustion >= 4 ? Math.floor(character.maxHitPoints / 2) : character.maxHitPoints
                const tempHP = (character.temporaryHitPoints ?? 0) > 0 ? character.temporaryHitPoints as number : 0
                return (
                  <>
                    {character.currentHitPoints}/
                    {effectiveMaxHP + tempHP}
                    {tempHP > 0 && (
                      <span className={`${getCombatColor('tempHP')} text-xs font-medium`}>(+{tempHP})</span>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
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
