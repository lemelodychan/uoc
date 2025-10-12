"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { UserProfile } from "@/lib/user-profiles"

interface CampaignCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (campaign: Campaign) => void
  editingCampaign?: Campaign | null
  characters?: CharacterData[]
  users?: any[]
  onAssignCharacterToCampaign?: (characterId: string, campaignId: string) => void
  onRemoveCharacterFromCampaign?: (characterId: string, campaignId: string) => void
}

export function CampaignCreationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCampaign,
  characters = [],
  users = [],
  onAssignCharacterToCampaign,
  onRemoveCharacterFromCampaign
}: CampaignCreationModalProps) {
  const [name, setName] = useState(editingCampaign?.name || "")
  const [description, setDescription] = useState(editingCampaign?.description || "")
  const [dungeonMasterId, setDungeonMasterId] = useState(editingCampaign?.dungeonMasterId || "")

  // Update form state when editingCampaign changes
  useEffect(() => {
    if (editingCampaign) {
      setName(editingCampaign.name || "")
      setDescription(editingCampaign.description || "")
      setDungeonMasterId(editingCampaign.dungeonMasterId || "")
    } else {
      setName("")
      setDescription("")
      setDungeonMasterId("")
    }
  }, [editingCampaign])


  // Helper function to format character level and class display (same as sidebar)
  const getCharacterLevelDisplay = (character: CharacterData): string => {
    if (character.classes && character.classes.length > 0) {
      // Multiclass character
      const totalLevel = character.classes.reduce((total, cls) => total + cls.level, 0)
      const classDisplay = character.classes
        .map(cls => cls.name)
        .join('/')
      return `Level ${totalLevel} ${classDisplay}`
    } else {
      // Single class character
      return `Level ${character.level} ${character.class}`
    }
  }

  const getCharactersInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId === campaignId)
  }

  const getCharactersNotInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId !== campaignId)
  }

  const handleSave = () => {
    if (!name.trim()) return

    const campaign: Campaign = {
      id: editingCampaign?.id || `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      created_at: editingCampaign?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      characters: editingCampaign?.characters || [],
      isActive: editingCampaign?.isActive || false, // Preserve the isActive status
      dungeonMasterId: dungeonMasterId || undefined
    }

    onSave(campaign)
    handleClose()
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setDungeonMasterId("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editingCampaign 
              ? 'Update your campaign details and manage characters below.'
              : 'Create a new campaign to organize your characters and adventures.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-0 max-h-[50vh]">
          <div className="flex-shrink-0 flex flex-col gap-4 p-4 bg-background">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-name">Campaign Name *</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter campaign name..."
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-description">Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Enter campaign description, setting details, or notes..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dungeon-master">Dungeon Master</Label>
              <Select value={dungeonMasterId || "none"} onValueChange={(value) => setDungeonMasterId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Dungeon Master (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Dungeon Master</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.displayName || `User ${user.userId.slice(0, 8)}...`}
                    </SelectItem>
                  ))}
                  {users.length === 0 && (
                    <SelectItem value="no-users" disabled>
                      No users found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Character Management Section - Only show when editing existing campaign */}
          {editingCampaign && onAssignCharacterToCampaign && onRemoveCharacterFromCampaign && (
            <div className="flex-1 overflow-y-auto space-y-4 border-t p-4 bg-background">
              {/* Characters in Campaign */}
              {getCharactersInCampaign(editingCampaign.id).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:users" className="w-4 h-4" /> Characters in Campaign <Badge variant="outline" className="text-xs">
                      {getCharactersInCampaign(editingCampaign.id).length}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {getCharactersInCampaign(editingCampaign.id).map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 border bg-card rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                            {character.imageUrl ? (
                              <img 
                                src={character.imageUrl} 
                                alt={character.name} 
                                className="w-full h-full object-cover border rounded-md"
                              />
                            ) : (
                              <Icon icon="lucide:user" className="w-full h-full p-2 text-muted-foreground border rounded-md" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{character.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {getCharacterLevelDisplay(character)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white h-8"
                            onClick={() => onRemoveCharacterFromCampaign(character.id, editingCampaign.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No characters assigned to this campaign yet.
                </div>
              )}

              {/* Add Character to Campaign */}
              {getCharactersNotInCampaign(editingCampaign.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:user-plus" className="w-4 h-4" />
                    Add Characters
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {getCharactersNotInCampaign(editingCampaign.id).map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 bg-muted/100 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                            {character.imageUrl ? (
                              <img 
                                src={character.imageUrl} 
                                alt={character.name} 
                                className="w-full h-full object-cover border rounded-md"
                              />
                            ) : (
                              <Icon icon="lucide:user" className="w-full h-full p-2 text-muted-foreground border rounded-md" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{character.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {getCharacterLevelDisplay(character)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignCharacterToCampaign(character.id, editingCampaign.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
