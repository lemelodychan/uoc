"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
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

  const handleSave = () => {
    onSave({ weapons, weaponNotes })
    onClose()
  }

  const addWeapon = () => {
    setWeapons([...weapons, { name: "", attackBonus: "", damageType: "" }])
  }

  const removeWeapon = (index: number) => {
    setWeapons(weapons.filter((_, i) => i !== index))
  }

  const updateWeapon = (index: number, field: string, value: string) => {
    const updated = weapons.map((weapon, i) => (i === index ? { ...weapon, [field]: value } : weapon))
    setWeapons(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Weapons</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[500px] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium mb-3">Weapons List</h3>
            <div className="space-y-3">
              {weapons.map((weapon, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2 p-2 border rounded">
                  <div className="col-span-4">
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
                  <div className="col-span-3">
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
                  <div className="col-span-4">
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
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWeapon(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addWeapon} className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Weapon
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Weapon Notes</h3>
            <RichTextEditor
              value={weaponNotes}
              onChange={setWeaponNotes}
              placeholder="Add any additional weapon notes, special abilities, or combat tactics..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
