"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    temporaryHitPoints: character.temporaryHitPoints || 0,
    exhaustion: character.exhaustion || 0,
    hitDiceTotal: character.hitDice?.total || 0,
    hitDiceRemaining: character.hitDice ? (character.hitDice.total - character.hitDice.used) : 0,
    hitDiceType: character.hitDice?.dieType || "d8",
  })

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      armorClass: character.armorClass,
      initiative: character.initiative,
      speed: character.speed,
      currentHitPoints: character.currentHitPoints,
      maxHitPoints: character.maxHitPoints,
      temporaryHitPoints: character.temporaryHitPoints || 0,
      exhaustion: character.exhaustion || 0,
      hitDiceTotal: character.hitDice?.total || 0,
      hitDiceRemaining: character.hitDice ? (character.hitDice.total - character.hitDice.used) : 0,
      hitDiceType: character.hitDice?.dieType || "d8",
    })
  }, [character.armorClass, character.initiative, character.speed, character.currentHitPoints, character.maxHitPoints, character.temporaryHitPoints, character.exhaustion, character.hitDice])

  const handleSave = () => {
    onSave({
      armorClass: formData.armorClass,
      initiative: formData.initiative,
      speed: formData.speed,
      currentHitPoints: formData.currentHitPoints,
      maxHitPoints: formData.maxHitPoints,
      temporaryHitPoints: formData.temporaryHitPoints,
      exhaustion: formData.exhaustion,
      hitDice: {
        total: formData.hitDiceTotal,
        used: formData.hitDiceTotal - formData.hitDiceRemaining,
        dieType: formData.hitDiceType,
      },
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Combat Stats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="armorClass" className="text-right">
              Armor Class
            </Label>
            <Input
              id="armorClass"
              type="number"
              min="1"
              value={formData.armorClass}
              onChange={(e) => setFormData({ ...formData, armorClass: Number.parseInt(e.target.value) || 1 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="initiative" className="text-right">
              Initiative
            </Label>
            <Input
              id="initiative"
              type="number"
              value={formData.initiative}
              onChange={(e) => setFormData({ ...formData, initiative: Number.parseInt(e.target.value) || 0 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="speed" className="text-right">
              Speed
            </Label>
            <Input
              id="speed"
              type="number"
              min="0"
              value={formData.speed}
              onChange={(e) => setFormData({ ...formData, speed: Number.parseInt(e.target.value) || 0 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="currentHitPoints" className="text-right">
              Current HP
            </Label>
            <Input
              id="currentHitPoints"
              type="number"
              min="0"
              value={formData.currentHitPoints}
              onChange={(e) => setFormData({ ...formData, currentHitPoints: Number.parseInt(e.target.value) || 0 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="maxHitPoints" className="text-right">
              Max HP
            </Label>
            <Input
              id="maxHitPoints"
              type="number"
              min="1"
              value={formData.maxHitPoints}
              onChange={(e) => setFormData({ ...formData, maxHitPoints: Number.parseInt(e.target.value) || 1 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="temporaryHitPoints" className="text-right">
              Temp HP
            </Label>
            <Input
              id="temporaryHitPoints"
              type="number"
              min="0"
              value={formData.temporaryHitPoints}
              onChange={(e) => setFormData({ ...formData, temporaryHitPoints: Math.max(0, Number.parseInt(e.target.value) || 0) })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="exhaustion" className="text-right">
              Exhaustion
            </Label>
            <Input
              id="exhaustion"
              type="number"
              min="0"
              max="6"
              value={formData.exhaustion}
              onChange={(e) => setFormData({ ...formData, exhaustion: Math.max(0, Math.min(6, Number.parseInt(e.target.value) || 0)) })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="hitDiceRemaining" className="text-right">
              Hit Dice Available
            </Label>
            <Input
              id="hitDiceRemaining"
              type="number"
              min="0"
              max={formData.hitDiceTotal}
              value={formData.hitDiceRemaining}
              onChange={(e) => setFormData({ ...formData, hitDiceRemaining: Math.max(0, Math.min(formData.hitDiceTotal, Number.parseInt(e.target.value) || 0)) })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="hitDiceTotal" className="text-right">
              Hit Dice Total
            </Label>
            <Input
              id="hitDiceTotal"
              type="number"
              min="0"
              value={formData.hitDiceTotal}
              onChange={(e) => setFormData({ ...formData, hitDiceTotal: Math.max(0, Number.parseInt(e.target.value) || 0) })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[144px_auto] items-center gap-3">
            <Label htmlFor="hitDiceType" className="text-right">
              Hit Dice Type
            </Label>
            <Select
              value={formData.hitDiceType}
              onValueChange={(value) => setFormData({ ...formData, hitDiceType: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select dice type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="d4">d4</SelectItem>
                <SelectItem value="d6">d6</SelectItem>
                <SelectItem value="d8">d8</SelectItem>
                <SelectItem value="d10">d10</SelectItem>
                <SelectItem value="d12">d12</SelectItem>
                <SelectItem value="d20">d20</SelectItem>
              </SelectContent>
            </Select>
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
