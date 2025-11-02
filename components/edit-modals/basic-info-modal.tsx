"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { calculateTotalLevel, getPrimaryClass } from "@/lib/character-data"
import { MulticlassModal } from "./multiclass-modal"
import { getCurrentUser, getAllUsers } from "@/lib/database"
import type { UserProfile } from "@/lib/user-profiles"
import { useUser } from "@/lib/user-context"

interface BasicInfoModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  onPartyStatusChange?: (status: 'active' | 'away' | 'deceased') => void
}

export function BasicInfoModal({ isOpen, onClose, character, onSave, onPartyStatusChange }: BasicInfoModalProps) {
  const primaryClass = getPrimaryClass(character.classes)
  const [formData, setFormData] = useState(() => {
    // Ensure aestheticImages array always has exactly 6 elements for the form
    // Preserve order and empty slots - pad to 6 elements if shorter, preserve exact order if exists
    const existingImages = character.aestheticImages || []
    const paddedImages = Array.from({ length: 6 }, (_, index) => {
      // If we have an existing array, use it (preserving empty strings)
      // Otherwise, pad with empty strings
      return existingImages[index] !== undefined ? existingImages[index] : ""
    })
    
    return {
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
      isNPC: character.isNPC || false,
      aestheticImages: paddedImages,
    }
  })
  const [multiclassModalOpen, setMulticlassModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const { isSuperadmin } = useUser()
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAestheticIndex, setUploadingAestheticIndex] = useState<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const aestheticInputRefs = useRef<(HTMLInputElement | null)[]>([])

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


  const getOwnerDisplayName = (): string => {
    if (!character.userId) return 'No Owner'
    const owner = users.find(user => user.userId === character.userId)
    return owner ? owner.displayName || `User ${owner.userId.slice(0, 8)}...` : 'Unknown User'
  }


  // Sync local state with character prop when it changes
  useEffect(() => {
    if (isOpen) {
      const primaryClass = getPrimaryClass(character.classes)
      
      // Ensure aestheticImages array always has exactly 6 elements for the form
      // Preserve order and empty slots - pad to 6 elements if shorter, preserve exact order if exists
      const existingImages = character.aestheticImages || []
      const paddedImages = Array.from({ length: 6 }, (_, index) => {
        // If we have an existing array, use it (preserving empty strings)
        // Otherwise, pad with empty strings
        return existingImages[index] !== undefined ? existingImages[index] : ""
      })
      
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
        isNPC: character.isNPC || false,
        aestheticImages: paddedImages,
      })
    }
  }, [isOpen, character.id, character.name, character.class, character.subclass, character.classes, character.background, character.race, character.alignment, character.partyStatus, character.imageUrl, character.visibility, character.isNPC, character.aestheticImages])


  const handleImageUpload = async (file: File, isAesthetic: boolean = false, aestheticIndex?: number) => {
    try {
      if (isAesthetic && aestheticIndex !== undefined) {
        setUploadingAestheticIndex(aestheticIndex)
      } else {
        setUploadingImage(true)
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', isAesthetic ? 'aesthetic-images' : 'character-images')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to upload image'
        throw new Error(errorMessage)
      }

      if (isAesthetic && aestheticIndex !== undefined) {
        const newImages = [...formData.aestheticImages]
        newImages[aestheticIndex] = result.url
        setFormData({ ...formData, aestheticImages: newImages })
      } else {
        setFormData({ ...formData, imageUrl: result.url })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      setUploadingAestheticIndex(null)
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, false)
    }
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleAestheticFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, true, index)
    }
    // Reset input so same file can be selected again
    if (aestheticInputRefs.current[index]) {
      aestheticInputRefs.current[index]!.value = ''
    }
  }

  const handleSave = () => {
    // Don't include level in updates since it should be calculated from classes
    const { level, ...formDataWithoutLevel } = formData
    
    // Preserve aesthetic images array with empty strings to maintain order
    // This allows users to fill slots 1 and 3 without slot 2 being lost
    // Empty strings will be filtered out when displaying, but order is preserved
    const preservedAestheticImages = formData.aestheticImages.map(url => url?.trim() || '')
    
    // Only save basic info fields, not class-related fields
    const updates = { 
      ...formDataWithoutLevel, 
      visibility: formData.visibility,
      aestheticImages: preservedAestheticImages
    }
    
    onSave(updates)
    // Also update party status if it changed
    if (onPartyStatusChange && formData.partyStatus !== character.partyStatus) {
      onPartyStatusChange(formData.partyStatus)
    }
    onClose()
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-4">
          <DialogTitle>Edit Basic Information</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="character" className="w-full gap-0">
          <div className="p-4 pt-0 border-b bg-card">
            <TabsList className="grid w-full grid-cols-2 p-1 h-fit">
              <TabsTrigger value="character">Character Info</TabsTrigger>
              <TabsTrigger value="aesthetic">Aesthetic</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="character" className="grid gap-4 p-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="imageUrl" className="text-right">
              Profile Image
            </Label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="flex-1"
                  placeholder="https://... or upload an image"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="imageFileInput"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="h-[38px] whitespace-nowrap"
                >
                  {uploadingImage ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="relative w-full h-32 border rounded-md overflow-hidden bg-muted">
                  <img
                    src={formData.imageUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
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
          <div className="grid grid-cols-[112px_auto] items-start gap-3">
            <Label htmlFor="class" className="text-right py-3">
              Classes
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 p-1 min-h-[38px] h-fit border rounded-md">
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
          
          {(isOwner || isSuperadmin) && (character.campaignId || isSuperadmin) && (
            <div className="grid grid-cols-[112px_auto] items-center gap-3">
              <Label className="text-right">
                Character Type
              </Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isNPC"
                  checked={formData.isNPC}
                  onCheckedChange={(checked) => setFormData({ ...formData, isNPC: checked as boolean })}
                />
                <Label htmlFor="isNPC" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Icon icon="lucide:users" className="w-4 h-4" />
                  Mark as NPC
                </Label>
              </div>
            </div>
          )}
          </TabsContent>
          <TabsContent value="aesthetic" className="grid gap-4 p-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Add up to 6 images to display on your character sheet. These will appear above your character header.
              </div>
              {formData.aestheticImages.map((url, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid grid-cols-[80px_auto] items-center gap-3">
                    <Label htmlFor={`aestheticImage${index}`} className="text-right text-sm">
                      Image {index + 1}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`aestheticImage${index}`}
                        value={url}
                        onChange={(e) => {
                          const newImages = [...formData.aestheticImages]
                          newImages[index] = e.target.value
                          setFormData({ ...formData, aestheticImages: newImages })
                        }}
                        className="flex-1"
                        placeholder="https://... or upload an image"
                      />
                      <input
                        ref={(el) => {
                          aestheticInputRefs.current[index] = el
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAestheticFileChange(e, index)}
                        className="hidden"
                        id={`aestheticFileInput${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => aestheticInputRefs.current[index]?.click()}
                        disabled={uploadingAestheticIndex === index}
                        className="h-[38px] whitespace-nowrap"
                      >
                        {uploadingAestheticIndex === index ? (
                          <>
                            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {url && (
                    <div className="grid grid-cols-[80px_auto] gap-3">
                      <div></div>
                      <div className="relative w-full h-24 border rounded-md overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`Aesthetic preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
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
