"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CharacterData } from "@/lib/character-data"

const DND_CLASSES = {
  Artificer: ["Alchemist", "Armorer", "Battle Smith", "Artillerist"],
  Barbarian: [
    "Path of the Berserker",
    "Path of the Totem Warrior",
    "Path of the Ancestral Guardian",
    "Path of the Storm Herald",
    "Path of the Zealot",
    "Path of Wild Magic",
    "Path of the Beast",
  ],
  Bard: [
    "College of Lore",
    "College of Valor",
    "College of Glamour",
    "College of Swords",
    "College of Whispers",
    "College of Creation",
    "College of Eloquence",
  ],
  Cleric: [
    "Knowledge Domain",
    "Life Domain",
    "Light Domain",
    "Nature Domain",
    "Tempest Domain",
    "Trickery Domain",
    "War Domain",
    "Death Domain",
    "Forge Domain",
    "Grave Domain",
    "Order Domain",
    "Peace Domain",
    "Twilight Domain",
  ],
  Druid: [
    "Circle of the Land",
    "Circle of the Moon",
    "Circle of Dreams",
    "Circle of the Shepherd",
    "Circle of Spores",
    "Circle of Stars",
    "Circle of Wildfire",
  ],
  Fighter: [
    "Champion",
    "Battle Master",
    "Eldritch Knight",
    "Arcane Archer",
    "Cavalier",
    "Samurai",
    "Echo Knight",
    "Psi Warrior",
    "Rune Knight",
  ],
  Monk: [
    "Way of the Open Hand",
    "Way of Shadow",
    "Way of the Four Elements",
    "Way of the Drunken Master",
    "Way of the Kensei",
    "Way of the Sun Soul",
    "Way of Mercy",
    "Way of the Astral Self",
    "Way of the Long Death",
  ],
  Paladin: [
    "Oath of Devotion",
    "Oath of the Ancients",
    "Oath of Vengeance",
    "Oath of Conquest",
    "Oath of Redemption",
    "Oath of Glory",
    "Oath of the Watchers",
    "Oathbreaker",
  ],
  Ranger: [
    "Hunter",
    "Beast Master",
    "Gloom Stalker",
    "Horizon Walker",
    "Monster Slayer",
    "Fey Wanderer",
    "Swarmkeeper",
    "Drakewarden",
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
  Sorcerer: [
    "Draconic Bloodline",
    "Wild Magic",
    "Divine Soul",
    "Shadow Magic",
    "Storm Sorcery",
    "Aberrant Mind",
    "Clockwork Soul",
  ],
  Warlock: [
    "The Archfey",
    "The Fiend",
    "The Great Old One",
    "The Celestial",
    "The Hexblade",
    "The Fathomless",
    "The Genie",
    "The Undead",
    "The Undying",
  ],
  Wizard: [
    "School of Abjuration",
    "School of Conjuration",
    "School of Divination",
    "School of Enchantment",
    "School of Evocation",
    "School of Illusion",
    "School of Necromancy",
    "School of Transmutation",
    "War Magic",
    "Order of Scribes",
    "Bladesinging",
  ],
} as const

interface BasicInfoModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function BasicInfoModal({ isOpen, onClose, character, onSave }: BasicInfoModalProps) {
  const [formData, setFormData] = useState({
    name: character.name,
    class: character.class,
    subclass: character.subclass || "", // Added subclass to form data
    level: character.level,
    background: character.background,
    race: character.race,
    alignment: character.alignment,
  })

  const handleClassChange = (newClass: string) => {
    setFormData({
      ...formData,
      class: newClass,
      subclass: "", // Reset subclass when class changes
    })
  }

  const handleSave = () => {
    onSave(formData)
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">
              Class
            </Label>
            <Select value={formData.class} onValueChange={handleClassChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(DND_CLASSES).map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subclass" className="text-right">
              Subclass
            </Label>
            <Select
              value={formData.subclass}
              onValueChange={(value) => setFormData({ ...formData, subclass: value })}
              disabled={!formData.class}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={formData.class ? "Select a subclass" : "Select class first"} />
              </SelectTrigger>
              <SelectContent>
                {availableSubclasses.map((subclass) => (
                  <SelectItem key={subclass} value={subclass}>
                    {subclass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
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
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="background" className="text-right">
              Background
            </Label>
            <Input
              id="background"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="race" className="text-right">
              Race
            </Label>
            <Input
              id="race"
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="alignment" className="text-right">
              Alignment
            </Label>
            <Select
              value={formData.alignment}
              onValueChange={(value) => setFormData({ ...formData, alignment: value })}
            >
              <SelectTrigger className="col-span-3">
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
