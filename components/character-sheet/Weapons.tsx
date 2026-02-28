"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface WeaponsProps {
  character: CharacterData
  onEdit: () => void
  onToggleAmmunition?: (weaponIndex: number, ammoIndex: number) => void
  onToggleEquipped?: (weaponIndex: number) => void
  canEdit?: boolean
  isLoading?: boolean
}

export function Weapons({ character, onEdit, onToggleAmmunition, onToggleEquipped, canEdit = true, isLoading = false }: WeaponsProps) {
  if (isLoading) return <SectionCardSkeleton contentLines={4} />
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:sword" className="w-5 h-5" />
            Weapons
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
          {(character.weapons || []).map((weapon, index) => {
            const maxAmmo = weapon.maxAmmunition ?? 0
            const usedAmmo = weapon.usedAmmunition ?? 0
            const hasAmmunition = maxAmmo > 0
            const isEquipped = weapon.equipped !== false // default true when undefined

            return (
              <div key={index} className={`p-2 border text-sm font-medium rounded flex flex-col gap-2 bg-background transition-opacity ${!isEquipped ? 'opacity-50' : ''}`}>
                <div className="flex flex-row gap-2">
                  <div className="w-full flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span>{weapon.name}</span>
                      <button
                        onClick={() => onToggleEquipped?.(index)}
                        disabled={!canEdit}
                        title={isEquipped ? "Equipped — click to unequip" : "Unequipped — click to equip"}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                          isEquipped
                            ? 'border-primary/50 text-primary bg-primary/10 hover:bg-primary/20'
                            : 'border-muted text-muted-foreground bg-muted/40 hover:bg-muted/60'
                        } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {isEquipped ? 'Equipped' : 'Stowed'}
                      </button>
                    </div>
                    {weapon.weaponProperties && weapon.weaponProperties.length > 0 && (
                      <div className="flex flex-wrap gap-0 mb-1">
                        <span className="text-xs font-normal text-muted-foreground">
                          {weapon.weaponProperties
                            .map((prop, i) => (i === 0 ? prop.charAt(0).toUpperCase() + prop.slice(1) : prop))
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs h-fit">{weapon.damageType}</Badge>
                  </div>
                  <div className="flex flex-col gap-1 w-fit items-end">
                    <Badge variant="secondary" className="text-xs h-fit">{weapon.attackBonus} ATK</Badge>
                  </div>
                </div>
                
                {/* Ammunition Slots */}
                {hasAmmunition && (
                  <div className="flex flex-wrap gap-2 pt-1 pb-1 justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ammunition:
                    </span>
                    <div className="flex items-center gap-1 pr-1">
                      <div className="flex items-center flex-wrap gap-1">
                        {Array.from({ length: maxAmmo }, (_, i) => {
                          const isAvailable = i < (maxAmmo - usedAmmo)
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (!canEdit || !onToggleAmmunition) return
                                onToggleAmmunition(index, i)
                              }}
                              disabled={!canEdit}
                              className={`w-3 h-3 rounded border-2 transition-colors ${
                                isAvailable
                                  ? `${getCombatColor('spellSlotAvailable')} ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`
                                  : `${getCombatColor('spellSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                              }`}
                              title={isAvailable ? "Available" : "Used"}
                            />
                          )
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {maxAmmo - usedAmmo}/{maxAmmo}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {character.weapons.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No weapons equipped</div>
          )}
        </div>
        
        {character.weaponNotes && character.weaponNotes.trim() !== "" && (
          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Weapon Notes</h4>
            </div>
            <RichTextDisplay
              content={character.weaponNotes}
              className="text-sm text-muted-foreground"
              maxLines={5}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
