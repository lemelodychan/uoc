"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { useToast } from "@/hooks/use-toast"
import type { CharacterData, CharacterClass } from "@/lib/character-data"
import { loadAllClasses } from "@/lib/database"

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
  
  // Database classes state
  const [availableClasses, setAvailableClasses] = useState<Array<{id: string, name: string, subclass: string | null, subclass_selection_level?: number}>>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Sync classes state when character changes
  useEffect(() => {
    if (isOpen) {
      if (character.classes && character.classes.length > 0) {
        setClasses(character.classes)
      } else {
        // Convert legacy single class to multiclass format
        setClasses([{
          name: character.class,
          subclass: character.subclass,
          class_id: character.class_id,
          level: character.level
        }])
      }
    }
  }, [isOpen, character.id, character.classes, character.class, character.subclass, character.class_id, character.level])

  // Load available classes from database when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingClasses(true)
      loadAllClasses().then(({ classes, error }) => {
        if (error) {
          console.error("Failed to load classes:", error)
          toast({
            title: "Error",
            description: "Failed to load available classes",
            variant: "destructive"
          })
        } else {
          setAvailableClasses(classes || [])
        }
        setLoadingClasses(false)
      })
    }
  }, [isOpen, toast])

  // Helper function to get unique base class names from database
  const getAvailableBaseClasses = (): string[] => {
    const baseClasses = availableClasses
      .filter(cls => cls.subclass === null)
      .map(cls => cls.name)
    return [...new Set(baseClasses)].sort()
  }

  // Helper function to get subclasses for a given base class
  const getAvailableSubclasses = (baseClassName: string): string[] => {
    return availableClasses
      .filter(cls => cls.name === baseClassName && cls.subclass !== null)
      .map(cls => cls.subclass!)
      .sort()
  }

  // Helper function to get subclass selection level for a class
  const getSubclassSelectionLevel = (baseClassName: string): number => {
    const baseClass = availableClasses.find(cls => cls.name === baseClassName && cls.subclass === null)
    return baseClass?.subclass_selection_level || 3 // Default to 3 if not found
  }

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

    // Validate that classes at their required level have subclasses (if the class has subclasses available)
    const invalidClasses = validClasses.filter(charClass => {
      const hasSubclasses = availableSubclasses(charClass.name).length > 0
      const requiredLevel = getSubclassSelectionLevel(charClass.name)
      const needsSubclass = charClass.level >= requiredLevel
      return hasSubclasses && needsSubclass && !charClass.subclass
    })

    if (invalidClasses.length > 0) {
      const firstInvalidClass = invalidClasses[0]
      const requiredLevel = getSubclassSelectionLevel(firstInvalidClass.name)
      toast({
        title: "Subclass Required",
        description: `${firstInvalidClass.name} requires a subclass at level ${requiredLevel} and above.`,
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
      classFeatureSkillsUsage: {}, // Clear old class feature usage data
      // Update legacy fields for backward compatibility
      class: validClasses[0].name,
      subclass: validClasses[0].subclass,
      class_id: validClasses[0].class_id,
    }

    onSave(updates)
    onClose()
  }

  const availableSubclasses = (className: string) => {
    return getAvailableSubclasses(className)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Multiclassing Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 p-4 max-h-[50vh] overflow-y-auto">
          {classes.map((charClass, index) => (
            <Card key={index} className="gap-2 p-3">
              <CardHeader className="p-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-md">Class {index + 1}</CardTitle>
                  {classes.length > 1 && (
                    <Button
                      onClick={() => removeClass(index)}
                      size="sm"
                      variant="outline"
                      className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex flex-row gap-4 align-start items-start justify-start w-full">
                  <div className="flex flex-col gap-2 w-[124px] max-w-[124px] min-w-[124px]">
                    <Label htmlFor={`class-${index}`} className="h-4">Class</Label>
                    <Select
                      value={charClass.name}
                      onValueChange={(value) => {
                        updateClass(index, 'name', value)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableBaseClasses().map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {charClass.name && availableSubclasses(charClass.name).length > 0 && (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 h-4">
                          <Label htmlFor={`subclass-${index}`}>Subclass</Label>
                          {charClass.name && charClass.level >= getSubclassSelectionLevel(charClass.name) && (
                            <Badge variant="destructive" className="text-xs p-0 px-1">
                              Req
                            </Badge>
                          )}
                        </div>
                        {charClass.name && charClass.subclass && charClass.level < getSubclassSelectionLevel(charClass.name) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateClass(index, 'subclass', '')}
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
                        <SelectTrigger className={
                          charClass.name && charClass.level >= getSubclassSelectionLevel(charClass.name) && !charClass.subclass 
                            ? "border-destructive w-full" 
                            : "w-full"
                        }>
                          <SelectValue 
                            placeholder={
                              charClass.name && charClass.level >= getSubclassSelectionLevel(charClass.name)
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
                      {charClass.name && charClass.level >= getSubclassSelectionLevel(charClass.name) && !charClass.subclass && (
                        <p className="text-xs text-[#ce6565]">
                          A subclass is required for this class at level {getSubclassSelectionLevel(charClass.name)} and above.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 w-56">
                    <Label htmlFor={`level-${index}`} className="h-4">Level</Label>
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

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Hit Die:</span>
                  <Badge variant="secondary">
                    {charClass.name ? getHitDieType(charClass.name) : "d8"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter className="p-4 border-t flex flex-row !justify-between items-center">
          <Button onClick={addClass} variant="outline">
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Add Class
          </Button>
          <Button onClick={handleSave}>
            Save Multiclass Configuration
          </Button>
        </DialogFooter>
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
