"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
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
    // Legacy single hit dice support
    hitDiceTotal: character.hitDice?.total || 0,
    hitDiceRemaining: character.hitDice ? (character.hitDice.total - character.hitDice.used) : 0,
    hitDiceType: character.hitDice?.dieType || "d8",
    // Multiclass hit dice support
    hitDiceByClass: character.hitDiceByClass || [],
    // Combat notes (using otherTools field)
    combatNotes: character.otherTools || "",
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
      hitDiceByClass: character.hitDiceByClass || [],
      combatNotes: character.otherTools || "",
    })
  }, [character.armorClass, character.initiative, character.speed, character.currentHitPoints, character.maxHitPoints, character.temporaryHitPoints, character.exhaustion, character.hitDice, character.hitDiceByClass, character.otherTools])

  const addHitDieClass = () => {
    setFormData({
      ...formData,
      hitDiceByClass: [
        ...formData.hitDiceByClass,
        { className: "New Class", dieType: "d8", total: 1, used: 0 }
      ]
    })
  }

  const removeHitDieClass = (index: number) => {
    setFormData({
      ...formData,
      hitDiceByClass: formData.hitDiceByClass.filter((_, i) => i !== index)
    })
  }

  const updateHitDieClass = (index: number, field: string, value: any) => {
    const updated = [...formData.hitDiceByClass]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, hitDiceByClass: updated })
  }

  const handleSave = () => {
    const updates: Partial<CharacterData> = {
      armorClass: formData.armorClass,
      initiative: formData.initiative,
      speed: formData.speed,
      currentHitPoints: formData.currentHitPoints,
      maxHitPoints: formData.maxHitPoints,
      temporaryHitPoints: formData.temporaryHitPoints,
      exhaustion: formData.exhaustion,
      otherTools: formData.combatNotes,
    }

    // If multiclass hit dice exist, use them; otherwise use legacy single hit dice
    if (formData.hitDiceByClass.length > 0) {
      updates.hitDiceByClass = formData.hitDiceByClass
    } else {
      updates.hitDice = {
        total: formData.hitDiceTotal,
        used: formData.hitDiceTotal - formData.hitDiceRemaining,
        dieType: formData.hitDiceType,
      }
    }

    onSave(updates)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
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

          {/* Hit Dice Section */}
          <div className="col-span-2 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Hit Dice</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHitDieClass}
                className="flex items-center gap-1"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Dice
              </Button>
            </div>

            {formData.hitDiceByClass.length > 0 ? (
              <div className="space-y-3">
                {formData.hitDiceByClass.map((hitDie, index) => (
                  <div key={index} className="flex flex-row items-end gap-3 p-3 border rounded-lg">
                    <div className="flex flex-row gap-2 items-end w-full">
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-medium">Class</label>
                        <Input
                          placeholder="Class Name"
                          value={hitDie.className}
                          onChange={(e) => updateHitDieClass(index, "className", e.target.value)}
                          className="text-sm w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Type</label>
                        <Select
                          value={hitDie.dieType}
                          onValueChange={(value) => updateHitDieClass(index, "dieType", value)}
                        >
                          <SelectTrigger className="w-18">
                            <SelectValue />
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
                    <div className="flex flex-row gap-1 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Current</label>
                        <Input
                          type="number"
                          min="0"
                          max={hitDie.total}
                          value={hitDie.total - hitDie.used}
                          onChange={(e) => {
                            const remaining = parseInt(e.target.value) || 0
                            const used = Math.max(0, hitDie.total - remaining)
                            updateHitDieClass(index, "used", used)
                          }}
                          className="w-16 text-center text-sm"
                        />
                      </div>
                      <span className="text-xs font-medium h-6.5 px-1">/</span>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Max</label>
                        <Input
                          type="number"
                          min="0"
                          value={hitDie.total}
                          onChange={(e) => updateHitDieClass(index, "total", parseInt(e.target.value) || 0)}
                          className="w-16 text-center text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHitDieClass(index)}
                      className="text-red-600 hover:text-red-700 h-9 w-9"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              // Legacy single hit dice support
              <div className="space-y-3">
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
            )}
          </div>

          {/* Combat Notes Section */}
          <div className="col-span-2 border-t pt-4">
            <Label htmlFor="combatNotes" className="text-base font-medium mb-3 block">
              Combat Notes
            </Label>
            <RichTextEditor
              value={formData.combatNotes}
              onChange={(value) => setFormData({ ...formData, combatNotes: value })}
              placeholder="Add any combat-related notes, tactics, or special abilities..."
              rows={4}
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