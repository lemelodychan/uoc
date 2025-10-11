"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { MulticlassModal } from "./multiclass-modal"

const DND_CLASSES = {
  Artificer: ["Artillerist"],
  Bard: [
    "College of Lore",
  ],
  Paladin: [
    "Oath of Redemption",
  ],
  Rogue: [
    "Thief",
    "Assassin",
    "Arcane Trickster",
    "Inquisitive",
    "Mastermind",
    "Scout",
    "Swashbuckler",
    "Phantom",
    "Soulknife",
  ],
  Warlock: [
    "The Genie",
    "The Raven Queen",
  ],
} as const

interface BasicInfoModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  onPartyStatusChange?: (status: 'active' | 'away' | 'deceased') => void
}

export function BasicInfoModal({ isOpen, onClose, character, onSave, onPartyStatusChange }: BasicInfoModalProps) {
  const [formData, setFormData] = useState({
    name: character.name,
    class: character.class,
    subclass: character.subclass || "", // Added subclass to form data
    level: character.level,
    background: character.background,
    race: character.race,
    alignment: character.alignment,
    partyStatus: character.partyStatus || 'active',
    imageUrl: character.imageUrl || "",
  })
  const [multiclassModalOpen, setMulticlassModalOpen] = useState(false)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      name: character.name,
      class: character.class,
      subclass: character.subclass || "",
      level: character.level,
      background: character.background,
      race: character.race,
      alignment: character.alignment,
      partyStatus: character.partyStatus || 'active',
      imageUrl: character.imageUrl || "",
    })
  }, [character.name, character.class, character.subclass, character.level, character.background, character.race, character.alignment, character.partyStatus, character.imageUrl])

  const handleClassChange = (newClass: string) => {
    setFormData({
      ...formData,
      class: newClass,
      subclass: "", // Reset subclass when class changes
    })
  }

  const handleSave = () => {
    onSave(formData)
    // Also update party status if it changed
    if (onPartyStatusChange && formData.partyStatus !== character.partyStatus) {
      onPartyStatusChange(formData.partyStatus)
    }
    onClose()
  }

  const availableSubclasses = formData.class ? DND_CLASSES[formData.class as keyof typeof DND_CLASSES] || [] : []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Basic Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="imageUrl" className="text-right">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full"
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="class" className="text-right">
              Classes
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 min-h-[40px] p-2 border rounded-md bg-background">
                {character.classes && character.classes.length > 1 ? (
                  <div className="flex flex-wrap gap-1">
                    {character.classes.map((charClass, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm">
                        <span>{charClass.name} {charClass.level}</span>
                        {charClass.subclass && <span className="text-muted-foreground">・{charClass.subclass}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm">
                    <span>{formData.class} {formData.level}</span>
                    {formData.subclass && <span className="text-muted-foreground">・{formData.subclass}</span>}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMulticlassModalOpen(true)}
                title="Configure multiclassing"
              >
                <Icon icon="lucide:settings" className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="level" className="text-right">
              Level
            </Label>
            <Input
              id="level"
              type="number"
              min="1"
              max="20"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: Number.parseInt(e.target.value) || 1 })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="background" className="text-right">
              Background
            </Label>
            <Input
              id="background"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="race" className="text-right">
              Race
            </Label>
            <Input
              id="race"
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="alignment" className="text-right">
              Alignment
            </Label>
            <Select
              value={formData.alignment}
              onValueChange={(value) => setFormData({ ...formData, alignment: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lawful Good">Lawful Good</SelectItem>
                <SelectItem value="Neutral Good">Neutral Good</SelectItem>
                <SelectItem value="Chaotic Good">Chaotic Good</SelectItem>
                <SelectItem value="Lawful Neutral">Lawful Neutral</SelectItem>
                <SelectItem value="True Neutral">True Neutral</SelectItem>
                <SelectItem value="Chaotic Neutral">Chaotic Neutral</SelectItem>
                <SelectItem value="Lawful Evil">Lawful Evil</SelectItem>
                <SelectItem value="Neutral Evil">Neutral Evil</SelectItem>
                <SelectItem value="Chaotic Evil">Chaotic Evil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="partyStatus" className="text-right">
              Party Status
            </Label>
            <Select
              value={formData.partyStatus}
              onValueChange={(value) => setFormData({ ...formData, partyStatus: value as 'active' | 'away' | 'deceased' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:users" className="w-4 h-4" />
                    Active Party
                  </div>
                </SelectItem>
                <SelectItem value="away">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:user-x" className="w-4 h-4" />
                    Away
                  </div>
                </SelectItem>
                <SelectItem value="deceased">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:skull" className="w-4 h-4" />
                    Deceased
                  </div>
                </SelectItem>
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
      
      <MulticlassModal
        isOpen={multiclassModalOpen}
        onClose={() => setMulticlassModalOpen(false)}
        character={character}
        onSave={(updates) => {
          // Update the form data with multiclass changes
          if (updates.classes) {
            setFormData({
              ...formData,
              class: updates.class || formData.class,
              subclass: updates.subclass || formData.subclass,
              level: updates.level || formData.level,
            })
          }
          onSave(updates)
        }}
      />
    </Dialog>
  )
}
