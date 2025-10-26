"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import type { CharacterData, Spell, Campaign } from "@/lib/character-data"

interface SpellCreationModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  characters?: CharacterData[]
  campaigns?: Campaign[]
  selectedCampaignId?: string
  currentUserId?: string
  isSuperadmin?: boolean
  onSave: (spell: Spell, classes: string[], characterId: string) => void
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

export function SpellCreationModal({ 
  isOpen, 
  onClose, 
  character, 
  characters = [], 
  campaigns = [],
  selectedCampaignId = "all",
  currentUserId,
  isSuperadmin = false,
  onSave, 
  onSaveToLibraryOnly, 
  onUpdateLibrarySpell, 
  initialSpellData, 
  initialClasses, 
  editingSpellId 
}: SpellCreationModalProps) {
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
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false)
  const characterDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (characterDropdownRef.current && !characterDropdownRef.current.contains(event.target as Node)) {
        setShowCharacterDropdown(false)
      }
    }

    if (showCharacterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCharacterDropdown])

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

  // Get characters available to add spells to based on user permissions
  const getAvailableCharacters = (): CharacterData[] => {
    // If no characters array provided, just return the current character
    if (!characters || characters.length === 0) {
      return [character]
    }

    // Superadmins can see all characters
    if (isSuperadmin) {
      return characters
    }

    // Get the current campaign if one is selected
    const currentCampaign = campaigns.find(c => c.id === selectedCampaignId)
    
    // If user is DM of the selected campaign, they can see all characters in that campaign
    if (currentCampaign && currentCampaign.dungeonMasterId === currentUserId) {
      return characters.filter(char => 
        currentCampaign.characters.includes(char.id)
      )
    }

    // Regular users can only see their own characters
    return characters.filter(char => char.userId === currentUserId)
  }

  const availableCharacters = getAvailableCharacters()

  const handleSave = (characterId: string) => {
    if (!validateForm()) return

    const spell = createSpellObject()
    
    // If we're editing a library spell, update it instead of creating new
    if (editingSpellId && onUpdateLibrarySpell) {
      onUpdateLibrarySpell(editingSpellId, spell, selectedClasses)
    } else {
      onSave(spell, selectedClasses, characterId)
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
      <DialogContent className="p-0 gap-0" style={{ width: '80vw', maxWidth: '720px' }}>
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Create New Spell</DialogTitle>
          <DialogDescription>
            Create a new spell and add it to both the library and your character's spell list
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 max-h-[70vh] bg-background">
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
                <RichTextEditor
                  value={spellData.description}
                  onChange={(value) => setSpellData(prev => ({ ...prev, description: value }))}
                  placeholder="Enter the full spell description..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="higher-level">At Higher Levels</Label>
                <RichTextEditor
                  value={spellData.higherLevel}
                  onChange={(value) => setSpellData(prev => ({ ...prev, higherLevel: value }))}
                  placeholder="Describe what happens when cast at higher levels..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Available Classes <Badge variant="secondary">Required</Badge></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {SPELL_CLASSES.map(className => (
                  <div key={className} className="flex items-center gap-2">
                    <Checkbox
                      id={`class-${className}`}
                      checked={selectedClasses.includes(className)}
                      onCheckedChange={() => toggleClass(className)}
                    />
                    <Label htmlFor={`class-${className}`} className="text-sm font-normal">
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
                        <Icon icon="lucide:x" 
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

        <DialogFooter className="p-4 border-t justify-between items-center">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {onSaveToLibraryOnly && !editingSpellId && (
              <Button variant="outline" onClick={handleSaveToLibraryOnly}>
                Save to Library Only
              </Button>
            )}
            {!editingSpellId ? (
              availableCharacters.length === 1 ? (
                <Button onClick={() => handleSave(availableCharacters[0].id)}>
                  Save and Add to Character
                </Button>
              ) : (
                <div className="relative">
                  <Button onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}>
                    Save and Add to Character
                    <Icon icon="lucide:chevron-down" className="w-3 h-3 ml-1" />
                  </Button>
                  {showCharacterDropdown && (
                    <div 
                      ref={characterDropdownRef}
                      className="absolute bottom-full right-0 mb-1 z-50 bg-popover border rounded-md shadow-md p-1 min-w-[224px]"
                    >
                      {availableCharacters.map((char) => (
                        <button
                          key={char.id}
                          onClick={() => {
                            handleSave(char.id)
                            setShowCharacterDropdown(false)
                          }}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-muted/50 hover:text-accent"
                        >
                          <span>{char.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <Button onClick={() => handleSave(character.id)}>
                Update
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
