"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"

interface WeaponsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function WeaponsModal({ isOpen, onClose, character, onSave }: WeaponsModalProps) {
  const [weapons, setWeapons] = useState(character.weapons)
  const [weaponNotes, setWeaponNotes] = useState(character.weaponNotes || "")
  const weaponPropertyOptions = [
    "melee",
    "ranged",
    "finesse",
    "heavy",
    "light",
    "loading",
    "reach",
    "thrown",
    "two-handed",
    "versatile",
    "ammunition",
  ] as const

  // Sync local state with character prop when it changes
  useEffect(() => {
    setWeapons(character.weapons)
    setWeaponNotes(character.weaponNotes || "")
  }, [character.weapons, character.weaponNotes])

  const handleSave = () => {
    onSave({ weapons, weaponNotes })
    onClose()
  }

  const addWeapon = () => {
    setWeapons([...weapons, { name: "", attackBonus: "", damageType: "", weaponProperties: [], maxAmmunition: 0, usedAmmunition: 0 }])
  }

  const removeWeapon = (index: number) => {
    setWeapons(weapons.filter((_, i) => i !== index))
  }

  const updateWeapon = (index: number, field: string, value: any) => {
    const updated = weapons.map((weapon, i) => (i === index ? { ...weapon, [field]: value } : weapon))
    setWeapons(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Weapons</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 w-full items-start justify-start align-start p-4 max-h-[50vh] overflow-y-auto">
            <h3 className="text-sm font-medium">Weapons List</h3>
            <div className="flex flex-col gap-2 w-full">
              {weapons.map((weapon, index) => (
                <div key={index} className="gap-3 p-3 border rounded-lg flex flex-col gap-2 bg-card">
                  <div className="flex flex-row gap-2 w-full items-end">
                    <div className="col-span-3 flex flex-col gap-2">
                      <Label htmlFor={`weapon-name-${index}`} className="text-xs">
                        Name
                      </Label>
                      <Input
                        id={`weapon-name-${index}`}
                        value={weapon.name}
                        onChange={(e) => updateWeapon(index, "name", e.target.value)}
                        placeholder="Weapon name"
                      />
                    </div>
                    <div className="col-span-3 flex flex-col gap-2">
                      <Label htmlFor={`weapon-attack-${index}`} className="text-xs">
                        Attack Bonus
                      </Label>
                      <Input
                        id={`weapon-attack-${index}`}
                        value={weapon.attackBonus}
                        onChange={(e) => updateWeapon(index, "attackBonus", e.target.value)}
                        placeholder="+5"
                      />
                    </div>
                    <div className="col-span-4 flex flex-col gap-2">
                      <Label htmlFor={`weapon-damage-${index}`} className="text-xs">
                        Damage
                      </Label>
                      <Input
                        id={`weapon-damage-${index}`}
                        value={weapon.damageType}
                        onChange={(e) => updateWeapon(index, "damageType", e.target.value)}
                        placeholder="1d8+2 piercing"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeWeapon(index)}
                        className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-9 h-9"
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-2">
                    <Label htmlFor={`weapon-ammo-${index}`} className="text-xs">
                      Max Ammunition
                    </Label>
                    <Input
                      id={`weapon-ammo-${index}`}
                      type="number"
                      min="0"
                      value={weapon.maxAmmunition ?? 0}
                      onChange={(e) => {
                        const value = e.target.value
                        // Parse the value, defaulting to 0 if invalid or empty
                        const maxAmmo = value === "" ? 0 : (Number.parseInt(value, 10) || 0)
                        // Update both fields in a single operation to avoid state issues
                        const updated = weapons.map((w, i) => {
                          if (i === index) {
                            const usedAmmo = Math.min(w.usedAmmunition ?? 0, maxAmmo)
                            return { ...w, maxAmmunition: maxAmmo, usedAmmunition: usedAmmo }
                          }
                          return w
                        })
                        setWeapons(updated)
                      }}
                      placeholder="0 (no tracking)"
                    />
                    <span className="text-xs text-muted-foreground">Set to 0 to disable ammunition tracking</span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-2">
                    <Label className="text-xs">Properties</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {weaponPropertyOptions.map((prop) => {
                        const checked = (weapon.weaponProperties || []).includes(prop)
                        return (
                          <label key={prop} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(val) => {
                                const current = new Set(weapon.weaponProperties || [])
                                if (val) {
                                  current.add(prop)
                                } else {
                                  current.delete(prop)
                                }
                                updateWeapon(index, "weaponProperties", Array.from(current))
                              }}
                            />
                            <span className="capitalize">{prop}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addWeapon} className="w-full bg-card">
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Add Weapon
              </Button>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t mt-3 w-full">
              <h3 className="text-sm font-medium">Weapon Notes</h3>
              <RichTextEditor
                value={weaponNotes}
                onChange={setWeaponNotes}
                placeholder="Add any additional weapon notes, special abilities, or combat tactics..."
              />
            </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
