"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CharacterData, CharacterClass } from "@/lib/character-data"

const DND_CLASSES = {
  Artificer: ["Artillerist"],
  Bard: [
    "College of Lore",
    "College of Swords",
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

interface MulticlassModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function MulticlassModal({ isOpen, onClose, character, onSave }: MulticlassModalProps) {
  const { toast } = useToast()
  
  // Initialize with existing classes or create from legacy single class
  const [classes, setClasses] = useState<CharacterClass[]>(() => {
    if (character.classes && character.classes.length > 0) {
      return character.classes
    }
    // Convert legacy single class to multiclass format
    return [{
      name: character.class,
      subclass: character.subclass,
      class_id: character.class_id,
      level: character.level
    }]
  })

  const totalLevel = classes.reduce((sum, charClass) => sum + charClass.level, 0)

  const addClass = () => {
    setClasses([...classes, { name: "", level: 1 }])
  }

  const removeClass = (index: number) => {
    if (classes.length > 1) {
      setClasses(classes.filter((_, i) => i !== index))
    }
  }

  const updateClass = async (index: number, field: keyof CharacterClass, value: string | number) => {
    const updatedClasses = [...classes]
    updatedClasses[index] = { ...updatedClasses[index], [field]: value }
    
    // Reset subclass when class changes and get class_id
    if (field === 'name') {
      updatedClasses[index].subclass = undefined
      updatedClasses[index].class_id = undefined
      
      // Get class_id for the selected class
      if (value && typeof value === 'string') {
        try {
          const { loadClassData } = await import('../../lib/database')
          const { classData } = await loadClassData(value)
          if (classData && classData.id) {
            updatedClasses[index].class_id = classData.id
          }
        } catch (error) {
          console.error(`Error loading class data for ${value}:`, error)
        }
      }
    }
    
    // Update class_id when subclass changes
    if (field === 'subclass') {
      const className = updatedClasses[index].name
      if (className && value && typeof value === 'string') {
        try {
          const { loadClassData } = await import('../../lib/database')
          const { classData } = await loadClassData(className, value)
          if (classData && classData.id) {
            updatedClasses[index].class_id = classData.id
          }
        } catch (error) {
          console.error(`Error loading subclass data for ${className} ${value}:`, error)
        }
      } else if (!value) {
        // If subclass is cleared, get the base class class_id
        const className = updatedClasses[index].name
        if (className) {
          try {
            const { loadClassData } = await import('../../lib/database')
            const { classData } = await loadClassData(className)
            if (classData && classData.id) {
              updatedClasses[index].class_id = classData.id
            }
          } catch (error) {
            console.error(`Error loading base class data for ${className}:`, error)
          }
        }
      }
    }
    
    setClasses(updatedClasses)
  }

  const handleSave = () => {
    // Validate that all classes have names and levels
    const validClasses = classes.filter(charClass => charClass.name && charClass.level > 0)
    
    if (validClasses.length === 0) {
      return
    }

    // Validate that classes at level 3+ have subclasses (if the class has subclasses available)
    const invalidClasses = validClasses.filter(charClass => {
      const hasSubclasses = availableSubclasses(charClass.name).length > 0
      const needsSubclass = charClass.level >= 3
      return hasSubclasses && needsSubclass && !charClass.subclass
    })

    if (invalidClasses.length > 0) {
      toast({
        title: "Subclass Required",
        description: "Classes at level 3 and above must have a subclass selected.",
        variant: "destructive",
      })
      return
    }

    // Generate hit dice for each class
    const hitDiceByClass = validClasses.map(charClass => ({
      className: charClass.name,
      dieType: getHitDieType(charClass.name),
      total: charClass.level,
      used: 0
    }))

    // Update character with multiclass data
    const updates: Partial<CharacterData> = {
      classes: validClasses,
      level: totalLevel,
      hitDiceByClass: hitDiceByClass,
      // Update legacy fields for backward compatibility
      class: validClasses[0].name,
      subclass: validClasses[0].subclass,
      class_id: validClasses[0].class_id,
    }

    onSave(updates)
    onClose()
  }

  const availableSubclasses = (className: string) => {
    return DND_CLASSES[className as keyof typeof DND_CLASSES] || []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multiclassing Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total Character Level: <Badge variant="secondary">{totalLevel}</Badge>
            </div>
            <Button onClick={addClass} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>

          {classes.map((charClass, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Class {index + 1}</CardTitle>
                  {classes.length > 1 && (
                    <Button
                      onClick={() => removeClass(index)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`class-${index}`}>Class</Label>
                    <Select
                      value={charClass.name}
                      onValueChange={(value) => {
                        updateClass(index, 'name', value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
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

                  <div className="space-y-2">
                    <Label htmlFor={`level-${index}`}>Level</Label>
                    <Input
                      id={`level-${index}`}
                      type="number"
                      min="1"
                      max="20"
                      value={charClass.level}
                      onChange={(e) => updateClass(index, 'level', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {charClass.name && availableSubclasses(charClass.name).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`subclass-${index}`}>Subclass</Label>
                        {charClass.level >= 3 && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {charClass.level < 3 && (
                          <Badge variant="secondary" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                      {charClass.subclass && charClass.level < 3 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateClass(index, 'subclass', undefined)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Select
                      value={charClass.subclass || ""}
                      onValueChange={(value) => updateClass(index, 'subclass', value)}
                    >
                      <SelectTrigger className={charClass.level >= 3 && !charClass.subclass ? "border-destructive" : ""}>
                        <SelectValue 
                          placeholder={
                            charClass.level >= 3 
                              ? "Select subclass (required)" 
                              : "Select subclass (optional)"
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubclasses(charClass.name).map((subclassName) => (
                          <SelectItem key={subclassName} value={subclassName}>
                            {subclassName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {charClass.level >= 3 && !charClass.subclass && (
                      <p className="text-xs text-destructive">
                        A subclass is required for this class at level 3 and above.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Hit Die:</span>
                  <Badge variant="outline">
                    {charClass.name ? getHitDieType(charClass.name) : "d8"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Multiclass Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getHitDieType(className: string): string {
  const hitDieTypes: Record<string, string> = {
    'barbarian': 'd12',
    'fighter': 'd10',
    'paladin': 'd10',
    'ranger': 'd10',
    'artificer': 'd8',
    'bard': 'd8',
    'cleric': 'd8',
    'druid': 'd8',
    'monk': 'd8',
    'rogue': 'd8',
    'warlock': 'd8',
    'wizard': 'd6',
    'sorcerer': 'd6'
  }
  return hitDieTypes[className.toLowerCase()] || 'd8'
}
