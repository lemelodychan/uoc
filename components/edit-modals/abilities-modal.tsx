"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateModifier } from "@/lib/character-data"
import type { CharacterData } from "@/lib/character-data"

interface AbilitiesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function AbilitiesModal({ isOpen, onClose, character, onSave }: AbilitiesModalProps) {
  const [formData, setFormData] = useState({
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  })

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  const abilities = [
    { key: "strength", label: "Strength" },
    { key: "dexterity", label: "Dexterity" },
    { key: "constitution", label: "Constitution" },
    { key: "intelligence", label: "Intelligence" },
    { key: "wisdom", label: "Wisdom" },
    { key: "charisma", label: "Charisma" },
  ] as const

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Ability Scores</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {abilities.map((ability) => {
            const score = formData[ability.key]
            const modifier = calculateModifier(score)
            return (
              <div key={ability.key} className="grid grid-cols-5 items-center gap-4">
                <Label htmlFor={ability.key} className="text-right col-span-2">
                  {ability.label}
                </Label>
                <Input
                  id={ability.key}
                  type="number"
                  min="1"
                  max="30"
                  value={score}
                  onChange={(e) => setFormData({ ...formData, [ability.key]: Number.parseInt(e.target.value) || 1 })}
                  className="col-span-2"
                />
                <div className="text-sm text-muted-foreground">
                  ({modifier >= 0 ? "+" : ""}
                  {modifier})
                </div>
              </div>
            )
          })}
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
