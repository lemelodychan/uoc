"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { calculateTotalLevel, isSingleClass, getPrimaryClass } from "@/lib/character-data"
import { MulticlassModal } from "./multiclass-modal"
import { getCurrentUser, getAllUsers, loadAllClasses } from "@/lib/database"
import type { UserProfile } from "@/lib/user-profiles"

interface BasicInfoModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  onPartyStatusChange?: (status: 'active' | 'away' | 'deceased') => void
}

export function BasicInfoModal({ isOpen, onClose, character, onSave, onPartyStatusChange }: BasicInfoModalProps) {
  const primaryClass = getPrimaryClass(character.classes)
  const [formData, setFormData] = useState({
    name: character.name,
    class: primaryClass?.name || character.class,
    subclass: primaryClass?.subclass || character.subclass || "",
    level: calculateTotalLevel(character.classes),
    background: character.background,
    race: character.race,
    alignment: character.alignment,
    partyStatus: character.partyStatus || 'active',
    imageUrl: character.imageUrl || "",
    visibility: character.visibility || 'public',
  })
  const [multiclassModalOpen, setMulticlassModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [availableClasses, setAvailableClasses] = useState<Array<{id: string, name: string, subclass: string | null}>>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Get current user and check ownership
  useEffect(() => {
    const getUser = async () => {
      const { user } = await getCurrentUser()
      setCurrentUser(user)
      setIsOwner(user?.id === character.userId)
    }
    getUser()
  }, [character.userId])

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      getAllUsers().then(({ users, error }) => {
        if (error) {
          console.error("Failed to load users:", error)
        } else {
          setUsers(users || [])
        }
      })
    }
  }, [isOpen])

  // Load available classes from database when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingClasses(true)
      loadAllClasses().then(({ classes, error }) => {
        if (error) {
          console.error("Failed to load classes:", error)
        } else {
          setAvailableClasses(classes || [])
        }
        setLoadingClasses(false)
      })
    }
  }, [isOpen])

  const getOwnerDisplayName = (): string => {
    if (!character.userId) return 'No Owner'
    const owner = users.find(user => user.userId === character.userId)
    return owner ? owner.displayName || `User ${owner.userId.slice(0, 8)}...` : 'Unknown User'
  }

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

  // Sync local state with character prop when it changes
  useEffect(() => {
    if (isOpen) {
      const primaryClass = getPrimaryClass(character.classes)
      setFormData({
        name: character.name,
        class: primaryClass?.name || character.class,
        subclass: primaryClass?.subclass || character.subclass || "",
        level: calculateTotalLevel(character.classes),
        background: character.background,
        race: character.race,
        alignment: character.alignment,
        partyStatus: character.partyStatus || 'active',
        imageUrl: character.imageUrl || "",
        visibility: character.visibility || 'public',
      })
    }
  }, [isOpen, character.id, character.name, character.class, character.subclass, character.classes, character.background, character.race, character.alignment, character.partyStatus, character.imageUrl, character.visibility])

  const handleClassChange = (newClass: string) => {
    setFormData({
      ...formData,
      class: newClass,
      subclass: "", // Reset subclass when class changes
    })
  }

  const handleSave = () => {
    // Don't include level in updates since it should be calculated from classes
    const { level, ...formDataWithoutLevel } = formData
    
    // If this is a single class character and the class changed, update the classes array
    let updates = { ...formDataWithoutLevel, visibility: formData.visibility }
    
    if (isSingleClass(character.classes) && (formData.class !== character.class || formData.subclass !== character.subclass)) {
      // Update the classes array for single class characters
      (updates as any).classes = [{
        name: formData.class,
        subclass: formData.subclass || undefined,
        class_id: undefined, // Will be loaded by the updateBasicInfo function
        level: character.level
      }]
    }
    
    onSave(updates)
    // Also update party status if it changed
    if (onPartyStatusChange && formData.partyStatus !== character.partyStatus) {
      onPartyStatusChange(formData.partyStatus)
    }
    onClose()
  }

  const availableSubclasses = formData.class ? getAvailableSubclasses(formData.class) : []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Basic Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
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
              <div className="flex-1 p-1 h-[38px] border rounded-md">
                {character.classes && character.classes.length > 1 ? (
                  <div className="flex flex-wrap gap-1">
                    {character.classes.map((charClass, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-sm text-sm">
                        <span>{charClass.name} {charClass.level}</span>
                        {charClass.subclass && <span className="text-muted-foreground">・{charClass.subclass}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
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
                className="h-[38px]"
              >
                <Icon icon="lucide:edit" className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Single class editing - only show if not multiclassed */}
          {(!character.classes || character.classes.length <= 1) && (
            <>
              <div className="grid grid-cols-[112px_auto] items-center gap-3">
                <Label htmlFor="baseClass" className="text-right">
                  Base Class
                </Label>
                <Select
                  value={formData.class}
                  onValueChange={handleClassChange}
                  disabled={loadingClasses}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select a class"} />
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
              
              {formData.class && availableSubclasses.length > 0 && (
                <div className="grid grid-cols-[112px_auto] items-center gap-3">
                  <Label htmlFor="subclass" className="text-right">
                    Subclass
                  </Label>
                  <Select
                    value={formData.subclass}
                    onValueChange={(value) => setFormData({ ...formData, subclass: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subclass (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="text-muted-foreground">No subclass</span>
                      </SelectItem>
                      {availableSubclasses.map((subclassName) => (
                        <SelectItem key={subclassName} value={subclassName}>
                          {subclassName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="level" className="text-right">
              Level
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="level"
                type="number"
                min="1"
                max="20"
                value={formData.level}
                readOnly
                className="w-full bg-muted"
              />
              <span className="text-xs text-muted-foreground">
                (calculated from classes)
              </span>
            </div>
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
          
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="owner" className="text-right">
              Owner
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
              <Icon icon="lucide:user" className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">
                {getOwnerDisplayName()}
              </span>
            </div>
          </div>
          
          {isOwner && (
            <div className="grid grid-cols-[112px_auto] items-center gap-3">
              <Label htmlFor="visibility" className="text-right">
                Visibility
              </Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value as 'public' | 'private' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:globe" className="w-4 h-4" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:lock" className="w-4 h-4" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
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
            const primaryClass = getPrimaryClass(updates.classes)
            setFormData({
              ...formData,
              class: primaryClass?.name || formData.class,
              subclass: primaryClass?.subclass || formData.subclass,
              level: calculateTotalLevel(updates.classes),
            })
          }
          onSave(updates)
        }}
      />
    </Dialog>
  )
}
