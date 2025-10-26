"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { loadAllClasses } from "@/lib/database"

interface ClassOption {
  id: string
  name: string
  subclass: string
}

interface CharacterCreationData {
  name: string
  class: string
  subclass: string
  classId: string
  level: number
  background: string
  race: string
  alignment: string
}

interface CharacterCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCharacter: (characterData: CharacterCreationData) => void
}

export function CharacterCreationModal({ isOpen, onClose, onCreateCharacter }: CharacterCreationModalProps) {
  const [formData, setFormData] = useState<CharacterCreationData>({
    name: "",
    class: "",
    subclass: "",
    classId: "",
    level: 1,
    background: "",
    race: "",
    alignment: "True Neutral",
  })

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesData, setClassesData] = useState<Array<{id: string, name: string, subclass: string | null, subclass_selection_level?: number}>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load classes from database when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClasses()
    }
  }, [isOpen])

  const loadClasses = async () => {
    setLoading(true)
    setError(null)
    try {
      const { classes: loadedClasses, error: loadError } = await loadAllClasses()
      if (loadError) {
        setError(loadError)
      } else {
        setClasses(loadedClasses || [])
        setClassesData(loadedClasses || [])
      }
    } catch (err) {
      setError("Failed to load classes")
    } finally {
      setLoading(false)
    }
  }

  const handleClassChange = (className: string) => {
    const selectedClass = classes.find(c => c.name === className)
    setFormData({
      ...formData,
      class: className,
      subclass: "",
      classId: selectedClass?.id || "",
    })
  }

  const handleSubclassChange = (subclass: string) => {
    const selectedClass = classes.find(c => c.name === formData.class && c.subclass === subclass)
    setFormData({
      ...formData,
      subclass,
      classId: selectedClass?.id || "",
    })
  }

  // Helper function to get subclass selection level for a class
  const getSubclassSelectionLevel = (className: string): number => {
    const baseClass = classesData.find(cls => cls.name === className && cls.subclass === null)
    return baseClass?.subclass_selection_level || 3 // Default to 3 if not found
  }

  const handleCreate = () => {
    if (!formData.name.trim()) {
      setError("Character name is required")
      return
    }
    if (!formData.class) {
      setError("Class is required")
      return
    }
    
    // Check if subclass is required based on class level
    const requiredLevel = getSubclassSelectionLevel(formData.class)
    const hasSubclasses = availableSubclasses.length > 0
    if (hasSubclasses && formData.level >= requiredLevel && !formData.subclass) {
      setError(`Subclass is required for ${formData.class} at level ${requiredLevel} and above`)
      return
    }
    
    if (!formData.race.trim()) {
      setError("Race is required")
      return
    }
    if (!formData.background.trim()) {
      setError("Background is required")
      return
    }

    onCreateCharacter(formData)
    onClose()
  }

  const handleClose = () => {
    setFormData({
      name: "",
      class: "",
      subclass: "",
      classId: "",
      level: 1,
      background: "",
      race: "",
      alignment: "True Neutral",
    })
    setError(null)
    onClose()
  }

  // Get available subclasses for the selected class
  const availableSubclasses = formData.class 
    ? classes.filter(c => c.name === formData.class).map(c => c.subclass)
    : []

  // Get unique class names
  const uniqueClasses = [...new Set(classes.map(c => c.name))]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Create New Character</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 max-h-[50vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
              placeholder="Enter character name"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">
              Class *
            </Label>
            <Select 
              value={formData.class} 
              onValueChange={handleClassChange}
              disabled={loading}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={loading ? "Loading classes..." : "Select a class"} />
              </SelectTrigger>
              <SelectContent>
                {uniqueClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subclass" className="text-right">
              Subclass {formData.class && formData.level >= getSubclassSelectionLevel(formData.class) && availableSubclasses.length > 0 ? "*" : ""}
            </Label>
            <Select
              value={formData.subclass}
              onValueChange={handleSubclassChange}
              disabled={!formData.class || loading}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={
                  !formData.class 
                    ? "Select class first" 
                    : availableSubclasses.length === 0 
                      ? "No subclasses available" 
                      : "Select a subclass"
                } />
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
            <Label htmlFor="race" className="text-right">
              Race *
            </Label>
            <Input
              id="race"
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              className="col-span-3"
              placeholder="e.g., Human, Elf, Dwarf"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="background" className="text-right">
              Background *
            </Label>
            <Input
              id="background"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              className="col-span-3"
              placeholder="e.g., Folk Hero, Noble, Criminal"
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
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={loading || !formData.name.trim() || !formData.class || !formData.subclass || !formData.race.trim() || !formData.background.trim()}
          >
            Create Character
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
