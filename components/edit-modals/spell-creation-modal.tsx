"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import type { CharacterData, Spell } from "@/lib/character-data"

interface SpellCreationModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (spell: Spell, classes: string[]) => void
  onSaveToLibraryOnly?: (spell: Spell, classes: string[]) => void
  onUpdateLibrarySpell?: (spellId: string, spell: Spell, classes: string[]) => void
  initialSpellData?: Partial<Spell>
  initialClasses?: string[]
  editingSpellId?: string
}

const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration", 
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation"
]

const SPELL_CLASSES = [
  "Artificer",
  "Bard", 
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Rogue",
  "Fighter",
  "Monk",
  "Barbarian"
]

const CASTING_TIME_OPTIONS = [
  "1 Action",
  "1 Bonus Action", 
  "1 Reaction",
  "1 Minute",
  "10 Minutes",
  "1 Hour",
  "8 Hours",
  "12 Hours",
  "24 Hours"
]

const DURATION_OPTIONS = [
  "Instantaneous",
  "1 round",
  "1 minute",
  "10 minutes",
  "1 hour",
  "8 hours",
  "24 hours",
  "Concentration, up to 1 minute",
  "Concentration, up to 10 minutes",
  "Concentration, up to 1 hour",
  "Concentration, up to 8 hours",
  "Concentration, up to 24 hours",
  "Until dispelled",
  "Special"
]

export function SpellCreationModal({ isOpen, onClose, character, onSave, onSaveToLibraryOnly, onUpdateLibrarySpell, initialSpellData, initialClasses, editingSpellId }: SpellCreationModalProps) {
  const [spellData, setSpellData] = useState({
    name: initialSpellData?.name || "",
    school: initialSpellData?.school || "Evocation",
    level: initialSpellData?.level || 0,
    castingTime: initialSpellData?.castingTime || "1 Action",
    range: initialSpellData?.range || "",
    duration: initialSpellData?.duration || "Instantaneous",
    components: initialSpellData?.components || {
      v: false,
      s: false,
      m: false,
      material: ""
    },
    damage: initialSpellData?.damage || "",
    saveThrow: initialSpellData?.saveThrow || "",
    description: initialSpellData?.description || "",
    higherLevel: initialSpellData?.higherLevel || ""
  })
  const [selectedClasses, setSelectedClasses] = useState<string[]>(initialClasses || [])

  // Update state when initialSpellData or initialClasses changes
  useEffect(() => {
    if (initialSpellData) {
      setSpellData({
        name: initialSpellData.name || "",
        school: initialSpellData.school || "Evocation",
        level: initialSpellData.level || 0,
        castingTime: initialSpellData.castingTime || "1 Action",
        range: initialSpellData.range || "",
        duration: initialSpellData.duration || "Instantaneous",
        components: initialSpellData.components || {
          v: false,
          s: false,
          m: false,
          material: ""
        },
        damage: initialSpellData.damage || "",
        saveThrow: initialSpellData.saveThrow || "",
        description: initialSpellData.description || "",
        higherLevel: initialSpellData.higherLevel || ""
      })
    } else if (!editingSpellId) {
      // If no initial data and not editing, reset to default values
      resetForm()
    }
    
    if (initialClasses) {
      setSelectedClasses(initialClasses)
    } else if (!editingSpellId) {
      // If no initial classes and not editing, clear classes
      setSelectedClasses([])
    }
  }, [initialSpellData, initialClasses, editingSpellId])

  const validateForm = () => {
    if (!spellData.name.trim()) {
      alert("Please enter a spell name")
      return false
    }

    if (selectedClasses.length === 0) {
      alert("Please select at least one class for this spell")
      return false
    }

    return true
  }

  const createSpellObject = (): Spell => {
    return {
      name: spellData.name,
      level: spellData.level,
      school: spellData.school,
      isPrepared: false,
      castingTime: spellData.castingTime,
      range: spellData.range,
      duration: spellData.duration,
      components: spellData.components,
      saveThrow: spellData.saveThrow,
      damage: spellData.damage,
      tag: "",
      description: spellData.description,
      higherLevel: spellData.higherLevel
    }
  }

  const resetForm = () => {
    setSpellData({
      name: "",
      school: "Evocation",
      level: 0,
      castingTime: "1 Action",
      range: "",
      duration: "Instantaneous",
      components: {
        v: false,
        s: false,
        m: false,
        material: ""
      },
      damage: "",
      saveThrow: "",
      description: "",
      higherLevel: ""
    })
    setSelectedClasses([])
  }

  const handleSave = () => {
    if (!validateForm()) return

    const spell = createSpellObject()
    
    // If we're editing a library spell, update it instead of creating new
    if (editingSpellId && onUpdateLibrarySpell) {
      onUpdateLibrarySpell(editingSpellId, spell, selectedClasses)
    } else {
      onSave(spell, selectedClasses)
    }
    
    resetForm()
    onClose()
  }

  const handleSaveToLibraryOnly = () => {
    if (!validateForm()) return

    const spell = createSpellObject()
    
    // If we're editing a library spell, update it instead of creating new
    if (editingSpellId && onUpdateLibrarySpell) {
      onUpdateLibrarySpell(editingSpellId, spell, selectedClasses)
    } else if (onSaveToLibraryOnly) {
      onSaveToLibraryOnly(spell, selectedClasses)
    }
    
    resetForm()
    onClose()
  }


  const toggleClass = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    )
  }

  const removeClass = (className: string) => {
    setSelectedClasses(prev => prev.filter(c => c !== className))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[50vw] max-h-[90vh] flex flex-col" style={{ width: '50vw', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Create New Spell</DialogTitle>
          <DialogDescription>
            Create a new spell and add it to both the library and your character's spell list
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col gap-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">

                <div className="flex flex-row gap-4">
                  <div className="flex flex-col gap-2 w-full">
                    <Label htmlFor="spell-name">Spell Name</Label>
                    <Input
                      id="spell-name"
                      value={spellData.name}
                      onChange={(e) => setSpellData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter spell name"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="spell-school">School</Label>
                    <Select value={spellData.school} onValueChange={(value) => setSpellData(prev => ({ ...prev, school: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPELL_SCHOOLS.map(school => (
                          <SelectItem key={school} value={school}>{school}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="spell-level">Level</Label>
                    <Select value={spellData.level.toString()} onValueChange={(value) => setSpellData(prev => ({ ...prev, level: parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Cantrip</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                          <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-row gap-4 w-full">
                  <div className="flex flex-col gap-2 w-1/3">
                    <Label htmlFor="casting-time">Casting Time</Label>
                    <Select value={spellData.castingTime} onValueChange={(value) => setSpellData(prev => ({ ...prev, castingTime: value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CASTING_TIME_OPTIONS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 w-1/3">
                    <Label htmlFor="range">Range/Area</Label>
                    <Input
                      id="range"
                      value={spellData.range}
                      onChange={(e) => setSpellData(prev => ({ ...prev, range: e.target.value }))}
                      placeholder="e.g., 60 feet, Self, Touch"
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-1/3">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={spellData.duration} onValueChange={(value) => setSpellData(prev => ({ ...prev, duration: value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(duration => (
                          <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Components */}
          <Card>
            <CardHeader>
              <CardTitle>Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verbal"
                    checked={spellData.components.v}
                    onCheckedChange={(checked) => setSpellData(prev => ({ 
                      ...prev, 
                      components: { ...prev.components, v: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="verbal">Verbal (V)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="somatic"
                    checked={spellData.components.s}
                    onCheckedChange={(checked) => setSpellData(prev => ({ 
                      ...prev, 
                      components: { ...prev.components, s: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="somatic">Somatic (S)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="material"
                    checked={spellData.components.m}
                    onCheckedChange={(checked) => setSpellData(prev => ({ 
                      ...prev, 
                      components: { ...prev.components, m: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="material">Material (M)</Label>
                </div>
              </div>

              {spellData.components.m && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="material-desc">Material Component</Label>
                  <Input
                    id="material-desc"
                    value={spellData.components.material}
                    onChange={(e) => setSpellData(prev => ({ 
                      ...prev, 
                      components: { ...prev.components, material: e.target.value }
                    }))}
                    placeholder="e.g., a pinch of soot and salt"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Effects */}
          <Card>
            <CardHeader>
              <CardTitle>Effects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="damage">Damage</Label>
                  <Input
                    id="damage"
                    value={spellData.damage}
                    onChange={(e) => setSpellData(prev => ({ ...prev, damage: e.target.value }))}
                    placeholder="e.g., 1d8 fire damage"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="save-throw">Saving Throw</Label>
                  <div className="flex gap-2">
                    <Select value={spellData.saveThrow || undefined} onValueChange={(value) => setSpellData(prev => ({ ...prev, saveThrow: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select saving throw" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Strength">Strength</SelectItem>
                        <SelectItem value="Dexterity">Dexterity</SelectItem>
                        <SelectItem value="Constitution">Constitution</SelectItem>
                        <SelectItem value="Intelligence">Intelligence</SelectItem>
                        <SelectItem value="Wisdom">Wisdom</SelectItem>
                        <SelectItem value="Charisma">Charisma</SelectItem>
                      </SelectContent>
                    </Select>
                    {spellData.saveThrow && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSpellData(prev => ({ ...prev, saveThrow: "" }))}
                        className="px-3"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={spellData.description}
                  onChange={(e) => setSpellData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter the full spell description..."
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="higher-level">At Higher Levels</Label>
                <Textarea
                  id="higher-level"
                  value={spellData.higherLevel}
                  onChange={(e) => setSpellData(prev => ({ ...prev, higherLevel: e.target.value }))}
                  placeholder="Describe what happens when cast at higher levels..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Available Classes *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {SPELL_CLASSES.map(className => (
                  <div key={className} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${className}`}
                      checked={selectedClasses.includes(className)}
                      onCheckedChange={() => toggleClass(className)}
                    />
                    <Label htmlFor={`class-${className}`} className="text-sm">
                      {className}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedClasses.length > 0 && (
                <div>
                  <Label>Selected Classes:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedClasses.map(className => (
                      <Badge key={className} variant="secondary" className="flex items-center gap-1">
                        {className}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeClass(className)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-between items-center pt-4 border-t bg-background">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {onSaveToLibraryOnly && !editingSpellId && (
              <Button variant="outline" onClick={handleSaveToLibraryOnly}>
                Save
              </Button>
            )}
            <Button onClick={handleSave}>
              {editingSpellId ? 'Update' : 'Save and Add to Character'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
