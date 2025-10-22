"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { calculateModifier } from "@/lib/character-data"
import type { CharacterData } from "@/lib/character-data"
import { Badge } from "@/components/ui/badge"

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

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    })
  }, [character.strength, character.dexterity, character.constitution, character.intelligence, character.wisdom, character.charisma])

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
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Ability Scores</DialogTitle>
        </DialogHeader>
        <div className="flex flex-row flex-wrap gap-2 p-4 max-h-[50vh] overflow-y-auto">
          {abilities.map((ability) => {
            const score = formData[ability.key]
            const modifier = calculateModifier(score)
            return (
              <div key={ability.key} className="flex flex-row w-[calc(50%-8px)] items-center gap-2 py-2 px-3 border rounded-lg bg-card">
                <Label htmlFor={ability.key} className="w-[144px]">
                  {ability.label}
                </Label>
                <Input
                  id={ability.key}
                  type="number"
                  min="1"
                  max="30"
                  value={score}
                  onChange={(e) => setFormData({ ...formData, [ability.key]: Number.parseInt(e.target.value) || 1 })}
                  className="w-[80px] h-8"
                />
                <Badge variant="secondary">
                  {modifier >= 0 ? "+" : ""}
                  {modifier}
                </Badge>
              </div>
            )
          })}
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
