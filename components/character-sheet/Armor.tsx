"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData, ArmorItem } from "@/lib/character-data"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface ArmorProps {
  character: CharacterData
  onEdit: () => void
  onToggleEquipped?: (armorIndex: number) => void
  canEdit?: boolean
  isLoading?: boolean
}

const armorTypeLabel: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  shield: "Shield",
  natural: "Natural",
  mage_armor: "Mage Armor",
  custom: "Custom",
}

function getArmorACSummary(item: ArmorItem): string {
  if (item.armorType === "shield") return `+2 AC`
  let desc = `${item.baseAC}`
  if ((item.magicBonus ?? 0) > 0) desc += ` +${item.magicBonus}`
  if (item.addDexModifier) {
    if (item.dexCap !== null && item.dexCap !== undefined) {
      desc += ` + DEX (max ${item.dexCap})`
    } else {
      desc += ` + DEX`
    }
  }
  return desc
}

export function Armor({ character, onEdit, onToggleEquipped, canEdit = true, isLoading = false }: ArmorProps) {
  if (isLoading) return <SectionCardSkeleton contentLines={3} />

  const armorItems = character.armor || []

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:shield" className="w-5 h-5" />
            Armor
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
          {armorItems.map((item, index) => (
            <div
              key={index}
              className={`p-2 border text-sm font-medium rounded flex flex-col gap-1 bg-background transition-opacity ${!item.equipped ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate">{item.name}</span>
                <button
                  onClick={() => onToggleEquipped?.(index)}
                  disabled={!canEdit || !onToggleEquipped}
                  title={item.equipped ? "Equipped — click to unequip" : "Unequipped — click to equip"}
                  className={`shrink-0 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                    item.equipped
                      ? 'border-primary/50 text-primary bg-primary/10 hover:bg-primary/20'
                      : 'border-muted text-muted-foreground bg-muted/40 hover:bg-muted/60'
                  } ${(!canEdit || !onToggleEquipped) ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {item.equipped ? 'Equipped' : 'Stowed'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs h-fit">{armorTypeLabel[item.armorType] ?? item.armorType}</Badge>
                <Badge variant="secondary" className="text-xs h-fit font-mono">{getArmorACSummary(item)}</Badge>
                {item.stealthDisadvantage && (
                  <Badge variant="destructive" className="text-xs h-fit">Stealth disadv.</Badge>
                )}
                {(item.magicBonus ?? 0) > 0 && item.armorType !== "shield" && (
                  <Badge variant="default" className="text-xs h-fit">+{item.magicBonus} magic</Badge>
                )}
              </div>
            </div>
          ))}
          {armorItems.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No armor</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
