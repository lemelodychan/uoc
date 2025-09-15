"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CharacterData } from "@/lib/character-data"

interface CombatModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function CombatModal({ isOpen, onClose, character, onSave }: CombatModalProps) {
  const [formData, setFormData] = useState({
    armorClass: character.armorClass,
    initiative: character.initiative,
    speed: character.speed,
    currentHitPoints: character.currentHitPoints,
    maxHitPoints: character.maxHitPoints,
  })

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Combat Stats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="armorClass" className="text-right">
              Armor Class
            </Label>
            <Input
              id="armorClass"
              type="number"
              min="1"
              value={formData.armorClass}
              onChange={(e) => setFormData({ ...formData, armorClass: Number.parseInt(e.target.value) || 1 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="initiative" className="text-right">
              Initiative
            </Label>
            <Input
              id="initiative"
              type="number"
              value={formData.initiative}
              onChange={(e) => setFormData({ ...formData, initiative: Number.parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speed" className="text-right">
              Speed
            </Label>
            <Input
              id="speed"
              type="number"
              min="0"
              value={formData.speed}
              onChange={(e) => setFormData({ ...formData, speed: Number.parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentHitPoints" className="text-right">
              Current HP
            </Label>
            <Input
              id="currentHitPoints"
              type="number"
              min="0"
              value={formData.currentHitPoints}
              onChange={(e) => setFormData({ ...formData, currentHitPoints: Number.parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="maxHitPoints" className="text-right">
              Max HP
            </Label>
            <Input
              id="maxHitPoints"
              type="number"
              min="1"
              value={formData.maxHitPoints}
              onChange={(e) => setFormData({ ...formData, maxHitPoints: Number.parseInt(e.target.value) || 1 })}
              className="col-span-3"
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
