"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"
import { calculateToolBonus } from "@/lib/character-data"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface ToolsProficienciesProps {
  character: CharacterData
  onEdit: () => void
  onUpdateEquipmentProficiencies: (equipmentProficiencies: any) => void
  onUpdateToolProficiency: (toolName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => void
  onToggleMagicItemUse: (itemIndex: number, slotIndex: number) => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
  onTriggerAutoSave: () => void
  canEdit?: boolean
  isLoading?: boolean
}

export function ToolsProficiencies({ 
  character, 
  onEdit, 
  onUpdateEquipmentProficiencies,
  onUpdateToolProficiency,
  onToggleMagicItemUse,
  onOpenFeatureModal,
  onTriggerAutoSave,
  canEdit = true,
  isLoading = false
}: ToolsProficienciesProps) {
  const [showAllWeapons, setShowAllWeapons] = useState(false)
  if (isLoading) return <SectionCardSkeleton contentLines={6} />
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:shield" className="w-5 h-5" />
            Equipment
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-2">Equipment Proficiencies</div>
          {(() => {
            const profs = character.equipmentProficiencies
            const toggle = (key: string, value: boolean) => {
              if (!canEdit) return
              onUpdateEquipmentProficiencies({ ...profs, [key]: value })
              onTriggerAutoSave()
            }
            const row = (key: string, label: string) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(profs?.[key as keyof typeof profs])}
                  onChange={(e) => toggle(key, e.target.checked)}
                  disabled={!canEdit}
                  className="w-3 h-3 rounded border-border"
                />
                {label}
              </label>
            )
            const armorRows = [
              row("lightArmor", "Light armour"),
              row("mediumArmor", "Medium armour"),
              row("heavyArmor", "Heavy armour"),
              row("shields", "Shields"),
            ]
            const weaponCategoryRows = [
              row("simpleWeapons", "Simple weapons"),
              row("martialWeapons", "Martial weapons"),
              row("firearms", "Firearms"),
            ]
            const specificWeaponRows = [
              row("handCrossbows", "Hand crossbows"),
              row("lightCrossbows", "Light crossbows"),
              row("longbows", "Longbows"),
              row("shortbows", "Shortbows"),
              row("darts", "Darts"),
              row("slings", "Slings"),
              row("quarterstaffs", "Quarterstaffs"),
              row("longswords", "Longswords"),
              row("rapiers", "Rapiers"),
              row("shortswords", "Shortswords"),
              row("scimitars", "Scimitars"),
              row("warhammers", "Warhammers"),
              row("battleaxes", "Battleaxes"),
              row("handaxes", "Handaxes"),
              row("lightHammers", "Light hammers"),
            ]
            const hasSpecific = specificWeaponRows.some((_, i) => {
              const keys = ["handCrossbows","lightCrossbows","longbows","shortbows","darts","slings","quarterstaffs","longswords","rapiers","shortswords","scimitars","warhammers","battleaxes","handaxes","lightHammers"]
              return Boolean(profs?.[keys[i] as keyof typeof profs])
            })
            return (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2">{armorRows}</div>
                  <div className="flex flex-col gap-2">{weaponCategoryRows}</div>
                </div>
                {(hasSpecific || canEdit) && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Specific weapons</div>
                    {(() => {
                      const VISIBLE = 6
                      const visible = showAllWeapons ? specificWeaponRows : specificWeaponRows.slice(0, VISIBLE)
                      const half = Math.ceil(visible.length / 2)
                      const hidden = specificWeaponRows.length - VISIBLE
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-2">{visible.slice(0, half)}</div>
                            <div className="flex flex-col gap-2">{visible.slice(half)}</div>
                          </div>
                          {specificWeaponRows.length > VISIBLE && (
                            <button
                              onClick={() => setShowAllWeapons(v => !v)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-2 block w-fit"
                            >
                              {showAllWeapons ? 'Show less' : `Show ${hidden} more`}
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </>
            )
          })()}
          
          {/* Tools Proficiencies */}
          {character.toolsProficiencies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Tools Proficiencies</div>
            <div className="flex flex-col gap-1.5">
              {character.toolsProficiencies.map((tool, index) => {
                const toolBonus = calculateToolBonus(character, tool)
                const isProficient = tool.proficiency === "proficient" || tool.proficiency === "expertise"
                const hasExpertise = tool.proficiency === "expertise"

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            id={`${tool.name}-prof`}
                            checked={isProficient}
                            onChange={(e) => {
                              if (!canEdit) return
                              onUpdateToolProficiency(tool.name, "proficient", e.target.checked)
                            }}
                            disabled={!canEdit}
                            className="w-3 h-3 rounded border-border"
                          />
                          <Label htmlFor={`${tool.name}-prof`} className="sr-only">
                            Proficient
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            id={`${tool.name}-exp`}
                            checked={hasExpertise}
                            onChange={(e) => {
                              if (!canEdit) return
                              onUpdateToolProficiency(tool.name, "expertise", e.target.checked)
                            }}
                            disabled={!canEdit}
                            className="w-3 h-3 rounded border-border"
                          />
                          <Label htmlFor={`${tool.name}-exp`} className="sr-only">
                            Expertise
                          </Label>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span>{tool.name}</span>
                      </div>
                    </div>
                    {toolBonus !== 0 && (
                      <Badge variant="secondary" className="text-xs font-mono">+{toolBonus}</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )}
        </div>
        
        {/* Magic Items */}
        {character.magicItems && character.magicItems.length > 0 && (
          <>
          <div className="flex flex-col gap-3 border-t pt-4 mt-4">
            <div className="text-sm font-medium">Magic Items</div>
            <div className="flex flex-col gap-2">
              {(character.magicItems || []).map((item, index) => (
                <div key={index} className="p-2 pr-3 border rounded bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{item.name || "Unnamed Magic Item"}</h4>
                    {(item.maxUses ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.maxUses! }, (_, i) => {
                          const maxUses = Math.max(0, item.maxUses ?? 0)
                          const currentUses = Math.min(maxUses, Math.max(0, item.currentUses ?? maxUses))
                          const usedCount = maxUses - currentUses
                          const isAvailable = i < currentUses
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (!canEdit) return
                                onToggleMagicItemUse(index, i)
                              }}
                              disabled={!canEdit}
                              className={`w-4 h-4 rounded border-2 transition-colors ${
                                isAvailable
                                  ? `${getCombatColor('magicItemSlotAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                                  : `${getCombatColor('magicItemSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                              }`}
                              title={isAvailable ? "Available" : "Used"}
                            />
                          )
                        })}
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {Math.min(item.maxUses ?? 0, Math.max(0, item.currentUses ?? (item.maxUses ?? 0)))}/{item.maxUses}
                        </span>
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground relative">
                      <div className="line-clamp-3 max-h-0 overflow-hidden">
                        <RichTextDisplay content={item.description} className="text-xs text-muted-foreground" />
                      </div>
                      <div className="flex justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2 h-7 shadow-sm text-foreground"
                          onClick={() => {
                            onOpenFeatureModal({ 
                              title: item.name || "Unnamed Magic Item", 
                              description: item.description,
                              maxUses: item.maxUses,
                              dailyRecharge: item.dailyRecharge
                            })
                          }}
                        >
                          Read more
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        {/* Equipment Notes */}
        {character.equipment && character.equipment.trim() !== "" && (
        <div className="flex flex-col gap-1 border-t pt-4 mt-4">
          <div className="text-sm font-medium">Equipment Inventory</div>
          <RichTextDisplay
            content={character.equipment || "No equipment listed"}
            className={!character.equipment ? "text-muted-foreground text-center py-2" : "text-muted-foreground"}
            maxLines={5}
          />
        </div>
        )}
      </CardContent>
    </Card>
  )
}
