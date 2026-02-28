"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import type { CharacterData, ArmorItem, ArmorType } from "@/lib/character-data"

interface ArmorModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

const ARMOR_TYPES: { value: ArmorType; label: string }[] = [
  { value: "light", label: "Light Armor" },
  { value: "medium", label: "Medium Armor" },
  { value: "heavy", label: "Heavy Armor" },
  { value: "shield", label: "Shield" },
  { value: "natural", label: "Natural Armor" },
  { value: "mage_armor", label: "Mage Armor" },
  { value: "custom", label: "Custom" },
]

function defaultArmorItem(): ArmorItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    armorType: "light",
    baseAC: 11,
    addDexModifier: true,
    dexCap: null,
    magicBonus: 0,
    stealthDisadvantage: false,
    strengthRequirement: 0,
    equipped: true,
    notes: "",
  }
}

function getDefaultsForType(type: ArmorType): Partial<ArmorItem> {
  switch (type) {
    case "light":
      return { baseAC: 11, addDexModifier: true, dexCap: null, stealthDisadvantage: false, strengthRequirement: 0 }
    case "medium":
      return { baseAC: 13, addDexModifier: true, dexCap: 2, stealthDisadvantage: false, strengthRequirement: 0 }
    case "heavy":
      return { baseAC: 16, addDexModifier: false, dexCap: 0, stealthDisadvantage: true, strengthRequirement: 15 }
    case "shield":
      return { baseAC: 2, addDexModifier: false, dexCap: null, stealthDisadvantage: false, strengthRequirement: 0 }
    case "natural":
      return { baseAC: 13, addDexModifier: true, dexCap: null, stealthDisadvantage: false, strengthRequirement: 0 }
    case "mage_armor":
      return { baseAC: 13, addDexModifier: true, dexCap: null, stealthDisadvantage: false, strengthRequirement: 0 }
    case "custom":
      return { baseAC: 10, addDexModifier: true, dexCap: null, stealthDisadvantage: false, strengthRequirement: 0 }
    default:
      return {}
  }
}

export function ArmorModal({ isOpen, onClose, character, onSave }: ArmorModalProps) {
  const [armorItems, setArmorItems] = useState<ArmorItem[]>(character.armor || [])

  useEffect(() => {
    setArmorItems(character.armor || [])
  }, [character.armor])

  const handleSave = () => {
    onSave({ armor: armorItems })
    onClose()
  }

  const addArmor = () => {
    setArmorItems([...armorItems, defaultArmorItem()])
  }

  const removeArmor = (index: number) => {
    setArmorItems(armorItems.filter((_, i) => i !== index))
  }

  const updateArmor = (index: number, field: keyof ArmorItem, value: any) => {
    setArmorItems(armorItems.map((item, i) => {
      if (i !== index) return item
      if (field === "armorType") {
        const defaults = getDefaultsForType(value as ArmorType)
        return { ...item, ...defaults, armorType: value as ArmorType }
      }
      return { ...item, [field]: value }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Armor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4 max-h-[50vh] overflow-y-auto">
          <h3 className="text-sm font-medium">Armor &amp; Shields</h3>
          <div className="flex flex-col gap-3 w-full">
            {armorItems.map((item, index) => (
              <div key={item.id ?? index} className="p-3 border rounded-lg flex flex-col gap-3 bg-card">
                {/* Row 1: Name + Type + Remove */}
                <div className="flex flex-row gap-2 w-full items-end">
                  <div className="flex-1 flex flex-col gap-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateArmor(index, "name", e.target.value)}
                      placeholder="e.g. Chain Mail, +1 Plate"
                    />
                  </div>
                  <div className="w-40 flex flex-col gap-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={item.armorType}
                      onValueChange={(v) => updateArmor(index, "armorType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARMOR_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArmor(index)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                </div>

                {/* Row 2: AC values */}
                {item.armorType !== "shield" && (
                  <div className="flex flex-row gap-2 flex-wrap">
                    <div className="w-20 flex flex-col gap-1">
                      <Label className="text-xs">Base AC</Label>
                      <Input
                        type="number"
                        value={item.baseAC}
                        onChange={(e) => updateArmor(index, "baseAC", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-20 flex flex-col gap-1">
                      <Label className="text-xs">Magic Bonus</Label>
                      <Input
                        type="number"
                        value={item.magicBonus ?? 0}
                        min={0}
                        max={3}
                        onChange={(e) => updateArmor(index, "magicBonus", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex flex-col gap-1 justify-end">
                      <Label className="text-xs">&nbsp;</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Checkbox
                          id={`dex-${index}`}
                          checked={item.addDexModifier}
                          onCheckedChange={(v) => updateArmor(index, "addDexModifier", !!v)}
                        />
                        <Label htmlFor={`dex-${index}`} className="text-xs">Add DEX mod</Label>
                      </div>
                    </div>
                    {item.addDexModifier && (
                      <div className="w-28 flex flex-col gap-1">
                        <Label className="text-xs">DEX cap (blank = none)</Label>
                        <Input
                          type="number"
                          value={item.dexCap ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value)
                            updateArmor(index, "dexCap", isNaN(val as number) ? null : val)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Shield magic bonus */}
                {item.armorType === "shield" && (
                  <div className="flex flex-row gap-2">
                    <div className="w-20 flex flex-col gap-1">
                      <Label className="text-xs">Magic Bonus</Label>
                      <Input
                        type="number"
                        value={item.magicBonus ?? 0}
                        min={0}
                        max={3}
                        onChange={(e) => updateArmor(index, "magicBonus", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                {/* Row 3: Checkboxes + Str requirement + Equipped */}
                <div className="flex flex-row gap-4 flex-wrap items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`equipped-${index}`}
                      checked={item.equipped}
                      onCheckedChange={(v) => updateArmor(index, "equipped", !!v)}
                    />
                    <Label htmlFor={`equipped-${index}`} className="text-xs">Equipped</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`stealth-${index}`}
                      checked={item.stealthDisadvantage ?? false}
                      onCheckedChange={(v) => updateArmor(index, "stealthDisadvantage", !!v)}
                    />
                    <Label htmlFor={`stealth-${index}`} className="text-xs">Stealth disadvantage</Label>
                  </div>
                  <div className="w-28 flex flex-col gap-1">
                    <Label className="text-xs">Min. STR (0 = none)</Label>
                    <Input
                      type="number"
                      value={item.strengthRequirement ?? 0}
                      min={0}
                      onChange={(e) => updateArmor(index, "strengthRequirement", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addArmor} className="w-full">
            <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
            Add Armor / Shield
          </Button>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
