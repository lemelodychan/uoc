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
import { BackgroundTraitSelectionModal } from "./background-trait-selection-modal"
import { getCurrentUser, getAllUsers, loadAllRaces, loadBackgroundsWithDetails, loadBackgroundDetails } from "@/lib/database"
import type { UserProfile } from "@/lib/user-profiles"
import { useUser } from "@/lib/user-context"
import type { BackgroundData } from "@/lib/database"

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
      race: character.race,
      alignment: character.alignment,
      partyStatus: character.partyStatus || 'active',
      imageUrl: character.imageUrl || "",
      visibility: character.visibility || 'public',
      isNPC: character.isNPC || false,
      aestheticImages: paddedImages,
    }
  })
  const [raceIds, setRaceIds] = useState<Array<{id: string, isMain: boolean}>>(
    character.raceIds?.map(r => typeof r === 'string' ? {id: r, isMain: true} : r) || []
  )
  const [races, setRaces] = useState<Array<{id: string, name: string}>>([])
  const [backgrounds, setBackgrounds] = useState<Array<{id: string, name: string}>>([])
  const [backgroundName, setBackgroundName] = useState<string>("")
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | undefined>(character.backgroundId)
  const [selectedBackgroundIdForModal, setSelectedBackgroundIdForModal] = useState<string | null>(null)
  const [multiclassModalOpen, setMulticlassModalOpen] = useState(false)
  const [backgroundTraitModalOpen, setBackgroundTraitModalOpen] = useState(false)
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

  // Load users, races, and backgrounds when modal opens
  useEffect(() => {
    if (isOpen) {
      getAllUsers().then(({ users, error }) => {
        if (error) {
          console.error("Failed to load users:", error)
        } else {
          setUsers(users || [])
        }
      })
      loadRaces()
      loadBackgrounds()
      
      // Load background name if backgroundId exists
      if (character.backgroundId) {
        setSelectedBackgroundId(character.backgroundId)
        loadBackgroundDetails(character.backgroundId).then(({ background, error }) => {
          if (background && !error) {
            setBackgroundName(background.name)
          }
        })
      } else {
        setSelectedBackgroundId(undefined)
        setBackgroundName("")
      }
    }
  }, [isOpen, character.backgroundId])

  // Set main race to first race when 2 races are selected and no main is set
  useEffect(() => {
    if (raceIds.length === 2 && !raceIds.some(r => r.isMain)) {
      setRaceIds([{...raceIds[0], isMain: true}, raceIds[1]])
    } else if (raceIds.length === 1 && !raceIds[0]?.isMain) {
      setRaceIds([{...raceIds[0], isMain: true}])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceIds.length, raceIds.some(r => r.isMain)])

  const loadRaces = async () => {
    try {
      const { races: loadedRaces, error: loadError } = await loadAllRaces()
      if (loadError) {
        console.error("Error loading races:", loadError)
      } else {
        setRaces(loadedRaces || [])
      }
    } catch (err) {
      console.error("Failed to load races:", err)
    }
  }

  const loadBackgrounds = async () => {
    try {
      const { backgrounds: loadedBackgrounds, error: loadError } = await loadBackgroundsWithDetails()
      if (loadError) {
        console.error("Error loading backgrounds:", loadError)
      } else {
        setBackgrounds(loadedBackgrounds || [])
      }
    } catch (err) {
      console.error("Failed to load backgrounds:", err)
    }
  }


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
      race: character.race,
      alignment: character.alignment,
      partyStatus: character.partyStatus || 'active',
      imageUrl: character.imageUrl || "",
      visibility: character.visibility || 'public',
      isNPC: character.isNPC || false,
      aestheticImages: paddedImages,
    })
    setRaceIds(
      character.raceIds?.map(r => typeof r === 'string' ? {id: r, isMain: true} : r) || []
    )
    }
  }, [isOpen, character.id, character.name, character.class, character.subclass, character.classes, character.race, character.raceIds, character.alignment, character.partyStatus, character.imageUrl, character.visibility, character.isNPC, character.aestheticImages])


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
      aestheticImages: preservedAestheticImages,
      raceIds: raceIds.length > 0 ? raceIds : undefined
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
                className="h-[38px] w-9"
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
                className="w-16 h-9 bg-muted"
              />
              <span className="text-xs text-muted-foreground">
                (calculated from classes)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[112px_auto] items-start gap-3">
            <Label htmlFor="race" className="text-right min-h-9">
              Race
            </Label>
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <Select
                  value={raceIds[0]?.id || ""}
                  onValueChange={(value) => {
                    if (value) {
                      // If selecting a first race, keep the second race if it exists
                      const newRaceIds: Array<{id: string, isMain: boolean}> = [
                        {id: value, isMain: raceIds[0]?.isMain || false},
                        raceIds[1]
                      ].filter(Boolean) as Array<{id: string, isMain: boolean}>
                      // If we had 2 races and the first was main, keep it as main
                      if (raceIds.length === 2 && raceIds[0]?.isMain) {
                        newRaceIds[0].isMain = true
                        if (newRaceIds[1]) newRaceIds[1].isMain = false
                      } else if (newRaceIds.length === 1) {
                        newRaceIds[0].isMain = true
                      }
                      setRaceIds(newRaceIds)
                    } else {
                      // If clearing the first race, clear both
                      setRaceIds([])
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select first race" />
                  </SelectTrigger>
                  <SelectContent>
                    {races.map((race) => (
                      <SelectItem 
                        key={race.id} 
                        value={race.id}
                        disabled={raceIds[1]?.id === race.id} // Only disable if it's the second race
                      >
                        {race.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {raceIds.length === 2 && raceIds[0] && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="main-race-1"
                      checked={raceIds[0]?.isMain || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRaceIds([
                            {...raceIds[0], isMain: true},
                            {...raceIds[1], isMain: false}
                          ])
                        }
                      }}
                    />
                    <Label htmlFor="main-race-1" className="text-xs cursor-pointer whitespace-nowrap">
                      Main
                    </Label>
                  </div>
                )}
              </div>
              {raceIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={raceIds[1]?.id || undefined}
                    onValueChange={(value) => {
                      if (value && value !== "__clear__") {
                        const newRaceIds: Array<{id: string, isMain: boolean}> = [
                          raceIds[0],
                          {id: value, isMain: false}
                        ]
                        setRaceIds(newRaceIds)
                      } else if (value === "__clear__") {
                        // Remove second race, ensure first is main
                        setRaceIds([{...raceIds[0], isMain: true}])
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select second race (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">None</SelectItem>
                      {races.map((race) => (
                        <SelectItem 
                          key={race.id} 
                          value={race.id}
                          disabled={raceIds[0]?.id === race.id} // Only disable if it's the first race
                        >
                          {race.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {raceIds.length === 2 && raceIds[1] && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="main-race-2"
                        checked={raceIds[1]?.isMain || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRaceIds([
                              {...raceIds[0], isMain: false},
                              {...raceIds[1], isMain: true}
                            ])
                          }
                        }}
                      />
                      <Label htmlFor="main-race-2" className="text-xs cursor-pointer whitespace-nowrap">
                        Main
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-[112px_auto] items-center gap-3">
            <Label htmlFor="background" className="text-right">
              Background
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedBackgroundId || "__none__"}
                onValueChange={(value) => {
                  if (value && value !== "__none__") {
                    // Find the background to get its name
                    const selectedBackground = backgrounds.find(b => b.id === value)
                    if (selectedBackground) {
                      setBackgroundName(selectedBackground.name)
                      setSelectedBackgroundId(value)
                      setSelectedBackgroundIdForModal(value)
                      // Save the backgroundId first, then open trait selection modal
                      onSave({ backgroundId: value })
                      // Open trait selection modal after a brief delay to ensure backgroundId is saved
                      setTimeout(() => {
                        setBackgroundTraitModalOpen(true)
                      }, 100)
                    }
                  } else if (value === "__none__") {
                    // Clear background
                    setBackgroundName("")
                    setSelectedBackgroundId(undefined)
                    setSelectedBackgroundIdForModal(null)
                    onSave({ 
                      backgroundId: undefined,
                      backgroundData: undefined
                    })
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={selectedBackgroundId ? backgroundName || "Select background" : "No background selected"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {backgrounds.map((background) => (
                    <SelectItem key={background.id} value={background.id}>
                      {background.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBackgroundId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBackgroundTraitModalOpen(true)}
                  title="Edit background traits"
                  className="h-9 w-9"
                >
                  <Icon icon="lucide:edit" className="w-4 h-4" />
                </Button>
              )}
            </div>
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

                    <div className="flex flex-row items-start gap-2">
                      {url && (
                        <div className="relative w-32 h-20 border rounded-md overflow-hidden bg-muted">
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
                      )}
                      <div className="flex flex-col gap-2 w-full">
                        <Input
                          id={`aestheticImage${index}`}
                          value={url}
                          onChange={(e) => {
                            const newImages = [...formData.aestheticImages]
                            newImages[index] = e.target.value
                            setFormData({ ...formData, aestheticImages: newImages })
                          }}
                          className="flex w-full h-9"
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
                          className="h-9 w-fit whitespace-nowrap"
                        >
                          {uploadingAestheticIndex === index ? (
                            <>
                              <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Icon icon="lucide:upload" className="w-4 h-4" />
                              Upload
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
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
      
      {(selectedBackgroundId || selectedBackgroundIdForModal) && (
        <BackgroundTraitSelectionModal
          isOpen={backgroundTraitModalOpen}
          onClose={() => {
            setBackgroundTraitModalOpen(false)
            setSelectedBackgroundIdForModal(null)
          }}
          backgroundId={selectedBackgroundIdForModal || selectedBackgroundId || ""}
          existingBackgroundData={character.backgroundData || null}
          onSave={(backgroundData) => {
            // Update both backgroundData and preserve backgroundId
            const backgroundIdToSave = selectedBackgroundIdForModal || selectedBackgroundId
            if (backgroundIdToSave) {
              onSave({ 
                backgroundId: backgroundIdToSave,
                backgroundData 
              })
            }
            setSelectedBackgroundIdForModal(null)
          }}
        />
      )}
    </Dialog>
  )
}