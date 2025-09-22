"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, Shield, Sparkles, Users, Moon, BookOpen } from "lucide-react"
import type { CharacterData, Campaign } from "@/lib/character-data"

interface LongRestModalProps {
  isOpen: boolean
  onClose: () => void
  characters: CharacterData[]
  campaigns?: Campaign[]
  selectedCampaignId?: string
  onConfirmLongRest: (selectedCharacterIds: string[]) => void
  longRestEvent?: {
    id: string
    initiated_by_character_id: string
    selected_character_ids: string[]
    event_data: any
    status: string
  } | null
  activeCharacterId?: string
}

export function LongRestModal({
  isOpen,
  onClose,
  characters,
  campaigns,
  selectedCampaignId,
  onConfirmLongRest,
  longRestEvent,
  activeCharacterId,
}: LongRestModalProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [modalSelectedCampaignId, setModalSelectedCampaignId] = useState<string>("all")

  // Filter characters based on selected campaign using useMemo to prevent infinite loops
  const filteredCharacters = useMemo(() => {
    if (modalSelectedCampaignId === "all") {
      return characters
    }
    return characters.filter(character => {
      if (modalSelectedCampaignId === "no-campaign") {
        return !character.campaignId
      }
      return character.campaignId === modalSelectedCampaignId
    })
  }, [characters, modalSelectedCampaignId])

  // Get active party members from filtered characters
  const activePartyMembers = useMemo(() => {
    return filteredCharacters.filter(char => char.partyStatus === 'active')
  }, [filteredCharacters])

  useEffect(() => {
    if (isOpen) {
      // Initialize campaign selection from sidebar
      setModalSelectedCampaignId(selectedCampaignId || "all")
      
      if (longRestEvent) {
        // Use the characters from the long rest event
        setSelectedCharacters(longRestEvent.selected_character_ids)
      } else {
        // Preselect all active party members for new long rest
        setSelectedCharacters(activePartyMembers.map(char => char.id))
      }
    }
  }, [isOpen, longRestEvent?.id, selectedCampaignId]) // Only depend on isOpen and longRestEvent.id to avoid infinite loops

  // Handle campaign selection change
  const handleCampaignChange = (campaignId: string) => {
    setModalSelectedCampaignId(campaignId)
    // Update selected characters to active party members from the new campaign
    if (!longRestEvent) {
      const newFilteredCharacters = campaignId === "all" 
        ? characters 
        : characters.filter(character => {
            if (campaignId === "no-campaign") {
              return !character.campaignId
            }
            return character.campaignId === campaignId
          })
      const newActivePartyMembers = newFilteredCharacters.filter(char => char.partyStatus === 'active')
      setSelectedCharacters(newActivePartyMembers.map(char => char.id))
    }
  }

  const handleCharacterToggle = (characterId: string, checked: boolean) => {
    if (checked) {
      setSelectedCharacters(prev => [...prev, characterId])
    } else {
      setSelectedCharacters(prev => prev.filter(id => id !== characterId))
    }
  }

  const handleSelectAll = () => {
    setSelectedCharacters(activePartyMembers.map(char => char.id))
  }

  const handleSelectNone = () => {
    setSelectedCharacters([])
  }

  const selectedCharacterData = characters.filter(char => selectedCharacters.includes(char.id))
  
  // Determine if this is a collaborative long rest (from another player)
  const isCollaborativeLongRest = longRestEvent && longRestEvent.initiated_by_character_id !== activeCharacterId
  const initiatorName = longRestEvent ? characters.find(c => c.id === longRestEvent.initiated_by_character_id)?.name || 'Another player' : null

  const longRestEffects = [
    {
      icon: Heart,
      title: "Restore Hit Points",
      description: "All characters regain all lost hit points",
      color: "text-red-600"
    },
    {
      icon: Sparkles,
      title: "Restore Spell Slots",
      description: "All expended spell slots are restored",
      color: "text-purple-600"
    },
    {
      icon: Shield,
      title: "Restore Class Features",
      description: "All expended class features are restored",
      color: "text-blue-600"
    },
    {
      icon: Moon,
      title: "Remove Exhaustion",
      description: "Reduce exhaustion level by 1",
      color: "text-gray-600"
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            {isCollaborativeLongRest ? `Long Rest - Initiated by ${initiatorName}` : 'Start Long Rest'}
          </DialogTitle>
          {isCollaborativeLongRest && (
            <p className="text-sm text-muted-foreground">
              {initiatorName} has initiated a long rest. Review the effects below and confirm when ready.
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
          {/* Party Member Selection */}
          <div className="space-y-4">
            {/* Campaign Selector */}
            {!isCollaborativeLongRest && (campaigns || []).length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Filter by Campaign
                </label>
                <Select value={modalSelectedCampaignId} onValueChange={handleCampaignChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    {(campaigns || []).map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                {isCollaborativeLongRest ? 'Party Members (Selected by Initiator)' : 'Select Party Members'}
              </h3>
              {!isCollaborativeLongRest && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All Active
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNone}>
                    Select None
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-4 space-y-3">
                {filteredCharacters.map((character) => (
                  <div key={character.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={character.id}
                      checked={selectedCharacters.includes(character.id)}
                      disabled={isCollaborativeLongRest || false}
                      onCheckedChange={(checked) => 
                        handleCharacterToggle(character.id, checked as boolean)
                      }
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {character.imageUrl ? (
                          <img 
                            src={character.imageUrl} 
                            alt={character.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{character.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Level {character.level} {character.class}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {character.currentHitPoints}/{character.maxHitPoints} HP
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {activePartyMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active party members found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Long Rest Effects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Long Rest Effects</h3>
            <div className="grid gap-3">
              {longRestEffects.map((effect, index) => {
                const IconComponent = effect.icon
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-5 h-5 mt-0.5 ${effect.color}`} />
                      <div className="flex-1">
                        <div className="font-medium">{effect.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {effect.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Selected Characters Summary */}
          {selectedCharacterData.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Characters Taking Long Rest ({selectedCharacterData.length})
              </h3>
              <div className="grid gap-2">
                {selectedCharacterData.map((character) => (
                  <div key={character.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {character.imageUrl ? (
                          <img 
                            src={character.imageUrl} 
                            alt={character.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{character.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Level {character.level} {character.class}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {character.currentHitPoints}/{character.maxHitPoints} HP
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCharacterData.length} character{selectedCharacterData.length !== 1 ? 's' : ''} selected
            {isCollaborativeLongRest && (
              <span className="ml-2 text-blue-600">• Awaiting confirmation</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {isCollaborativeLongRest ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              onClick={() => {
                onConfirmLongRest(selectedCharacters)
                onClose()
              }}
              disabled={selectedCharacters.length === 0}
              className={isCollaborativeLongRest ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isCollaborativeLongRest ? 'Confirm & Rest for 8 Hours' : 'Start Long Rest'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
