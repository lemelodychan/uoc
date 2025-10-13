"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"
import { calculateToolBonus } from "@/lib/character-data"

interface ToolsProficienciesProps {
  character: CharacterData
  onEdit: () => void
  onUpdateEquipmentProficiencies: (equipmentProficiencies: any) => void
  onUpdateToolProficiency: (toolName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => void
  onToggleMagicItemUse: (itemIndex: number, slotIndex: number) => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
  onTriggerAutoSave: () => void
}

export function ToolsProficiencies({ 
  character, 
  onEdit, 
  onUpdateEquipmentProficiencies,
  onUpdateToolProficiency,
  onToggleMagicItemUse,
  onOpenFeatureModal,
  onTriggerAutoSave
}: ToolsProficienciesProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:shield" className="w-5 h-5" />
            Equipment
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-2">Equipment Proficiencies</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Column 1 */}
            <div className="flex flex-col gap-2">
              {[
                { key: "lightArmor", label: "Light armour" },
                { key: "mediumArmor", label: "Medium armour" },
                { key: "heavyArmor", label: "Heavy armour" },
                { key: "shields", label: "Shields" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(character.equipmentProficiencies?.[item.key as keyof typeof character.equipmentProficiencies])}
                    onChange={(e) => {
                      const value = e.target.checked
                      onUpdateEquipmentProficiencies({
                        lightArmor: character.equipmentProficiencies?.lightArmor ?? false,
                        mediumArmor: character.equipmentProficiencies?.mediumArmor ?? false,
                        heavyArmor: character.equipmentProficiencies?.heavyArmor ?? false,
                        shields: character.equipmentProficiencies?.shields ?? false,
                        simpleWeapons: character.equipmentProficiencies?.simpleWeapons ?? false,
                        martialWeapons: character.equipmentProficiencies?.martialWeapons ?? false,
                        firearms: character.equipmentProficiencies?.firearms ?? false,
                        [item.key]: value,
                      })
                      onTriggerAutoSave()
                    }}
                    className="w-3 h-3 rounded border-border"
                  />
                  {item.label}
                </label>
              ))}
            </div>
            {/* Column 2 */}
            <div className="flex flex-col gap-2">
              {[
                { key: "simpleWeapons", label: "Simple weapons" },
                { key: "martialWeapons", label: "Martial weapons" },
                { key: "firearms", label: "Firearms" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(character.equipmentProficiencies?.[item.key as keyof typeof character.equipmentProficiencies])}
                    onChange={(e) => {
                      const value = e.target.checked
                      onUpdateEquipmentProficiencies({
                        lightArmor: character.equipmentProficiencies?.lightArmor ?? false,
                        mediumArmor: character.equipmentProficiencies?.mediumArmor ?? false,
                        heavyArmor: character.equipmentProficiencies?.heavyArmor ?? false,
                        shields: character.equipmentProficiencies?.shields ?? false,
                        simpleWeapons: character.equipmentProficiencies?.simpleWeapons ?? false,
                        martialWeapons: character.equipmentProficiencies?.martialWeapons ?? false,
                        firearms: character.equipmentProficiencies?.firearms ?? false,
                        [item.key]: value,
                      })
                      onTriggerAutoSave()
                    }}
                    className="w-3 h-3 rounded border-border"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
          
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
                            onChange={(e) => onUpdateToolProficiency(tool.name, "proficient", e.target.checked)}
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
                            onChange={(e) => onUpdateToolProficiency(tool.name, "expertise", e.target.checked)}
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
              {character.magicItems.map((item, index) => (
                <div key={index} className="p-2 border rounded bg-background">
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
                              onClick={() => onToggleMagicItemUse(index, i)}
                              className={`w-4 h-4 rounded border-2 transition-colors ${
                                isAvailable
                                  ? `${getCombatColor('magicItemSlotAvailable')} cursor-pointer`
                                  : `${getCombatColor('magicItemSlotUsed')} hover:border-border/80 cursor-pointer`
                              }`}
                              title={isAvailable ? "Available" : "Used"}
                            />
                          )
                        })}
                        <span className="text-xs text-muted-foreground ml-2">
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
            className={!character.equipment ? "text-muted-foreground text-center py-2" : ""}
          />
        </div>
        )}
      </CardContent>
    </Card>
  )
}
