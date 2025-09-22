"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus, User, UserRoundPlus, Users, UserX, Skull, Moon, Dice6, BookOpen, Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CharacterData, Campaign } from "@/lib/character-data"

interface CharacterSidebarProps {
  characters: CharacterData[]
  campaigns?: Campaign[]
  selectedCampaignId?: string
  onCampaignChange?: (campaignId: string) => void
  activeCharacterId: string
  onSelectCharacter: (id: string) => void
  onCreateCharacter: () => void
  onStartLongRest: () => void
  onOpenDiceRoll: () => void
  onOpenCampaignManagement: () => void
}

export function CharacterSidebar({
  characters,
  campaigns,
  selectedCampaignId = "all",
  onCampaignChange,
  activeCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  onStartLongRest,
  onOpenDiceRoll,
  onOpenCampaignManagement,
}: CharacterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Helper function to format character level and class display
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

  // Filter characters based on selected campaign
  const filteredCharacters = selectedCampaignId === "all" 
    ? characters 
    : characters.filter(character => {
        if (selectedCampaignId === "no-campaign") {
          return !character.campaignId
        }
        return character.campaignId === selectedCampaignId
      })

  // Group filtered characters by campaign, then by status
  const groupedByCampaign = filteredCharacters.reduce((groups, character) => {
    const campaignId = character.campaignId || 'no-campaign'
    if (!groups[campaignId]) {
      groups[campaignId] = {
        campaign: (campaigns || []).find(c => c.id === campaignId) || null,
        characters: [] as CharacterData[]
      }
    }
    groups[campaignId].characters.push(character)
    return groups
  }, {} as Record<string, { campaign: Campaign | null, characters: CharacterData[] }>)

  // Sort characters within each campaign by status, then alphabetically
  Object.keys(groupedByCampaign).forEach(campaignId => {
    const campaignData = groupedByCampaign[campaignId]
    const statusGroups = campaignData.characters.reduce((groups, character) => {
      const status = character.partyStatus || 'active'
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(character)
      return groups
    }, {} as Record<string, CharacterData[]>)

    // Sort characters alphabetically within each status group
    Object.keys(statusGroups).forEach(status => {
      statusGroups[status].sort((a, b) => a.name.localeCompare(b.name))
    })

    groupedByCampaign[campaignId] = {
      ...campaignData,
      characters: statusGroups as any
    }
  })

  // Define status order and labels
  const statusConfig = {
    active: { label: 'Active Party', icon: Users, color: 'bg-green-100 text-green-800 border-green-200' },
    away: { label: 'Away', icon: UserX, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    deceased: { label: 'Deceased', icon: Skull, color: 'bg-red-100 text-red-800 border-red-200' }
  }

  const statusOrder = ['active', 'away', 'deceased'] as const

  return (
    <div
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-18" : "w-80"
      }`}
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Character Sheets</h2>
              <div className="text-xs text-muted-foreground">
                {selectedCampaignId === "all" 
                  ? `${characters.length} total characters`
                  : `${filteredCharacters.length} characters`
                }
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1 min-h-0">
        {/* Campaign Selector */}
        {!isCollapsed && (campaigns || []).length > 0 && (
            <Select value={selectedCampaignId} onValueChange={onCampaignChange}>
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
        )}

        <div className="flex gap-2 mb-4">
          <Button
            onClick={onCreateCharacter}
            className={`flex-1 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            <UserRoundPlus className="w-4 h-4" />
            {!isCollapsed && <span>New Character</span>}
          </Button>
          {!isCollapsed && (
            <Button
              onClick={onOpenCampaignManagement}
              variant="outline"
              size="sm"
              className="h-9"
            >
              <Settings className="w-4 h-4" />Edit
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 flex flex-col gap-2">
            {/* Campaign Filter Summary */}
            {Object.entries(groupedByCampaign).map(([campaignId, { campaign, characters: statusGroups }]) => {
              const hasCharacters = Object.values(statusGroups as unknown as Record<string, CharacterData[]>).some(chars => chars.length > 0)
              if (!hasCharacters) return null

              return (
                <div key={campaignId} className="space-y-2 flex flex-col gap-2">
                  {!isCollapsed && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-md font-medium">
                        {campaign ? campaign.name : 'No Campaign'}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-white border-gray-200">
                        {Object.values(statusGroups).flat().length}
                      </Badge>
                    </div>
                  )}
                  
                  {statusOrder.map((status) => {
                    const charactersInStatus = (statusGroups as unknown as Record<string, CharacterData[]>)[status] || []
                    if (charactersInStatus.length === 0) return null

                    const config = statusConfig[status]
                    const IconComponent = config.icon

                    return (
                      <div key={`${campaignId}-${status}`} className="flex flex-col gap-2">
                        {!isCollapsed && (
                          <div className="flex items-center gap-2 ml-1">
                            <IconComponent className="w-4 h-4 text-sidebar-foreground/50" />
                            <span className="text-xs font-medium text-sidebar-foreground/50">
                              {config.label}
                            </span>
                          </div>
                        )}
                        <TooltipProvider>
                          <div className="space-y-1 flex flex-col gap-2">
                      {charactersInStatus.map((character: CharacterData) => (
                        <Tooltip key={character.id}>
                          <TooltipTrigger asChild>
                            <Card
                              className={`cursor-pointer transition-colors mb-0 p-0 rounded-lg ${
                                character.id === activeCharacterId
                                  ? "bg-sidebar-accent border-sidebar-primary"
                                  : "hover:bg-sidebar-accent/25"
                              }`}
                              onClick={() => onSelectCharacter(character.id)}
                            >
                              <CardContent className={`${isCollapsed ? "p-0" : "p-3"}`}>
                                <div className={`flex ${isCollapsed ? "items-center justify-center" : "items-center gap-3"}`}>
                                  <div className={`${isCollapsed ? "w-full h-12" : "w-12 h-12"} rounded-md bg-sidebar-primary/20 flex items-center justify-center overflow-hidden`}>
                                    {character.imageUrl ? (
                                      <img 
                                        src={character.imageUrl} alt={character.name} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className={`${isCollapsed ? "w-4 h-4" : "w-12 h-12"} text-sidebar-primary`} />
                                    )}
                                  </div>
                                  {!isCollapsed && (
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sidebar-foreground truncate">{character.name}</div>
                                      <div className="text-xs text-sidebar-foreground/70">
                                        {getCharacterLevelDisplay(character)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right" className="max-w-[220px] z-99 relative">
                              <div className="text-sm font-medium mb-0.5">{character.name}</div>
                              <div className="text-xs text-muted-foreground mb-0.5">{getCharacterLevelDisplay(character)}</div>
                              {character.subclass && (
                                <div className="text-xs text-muted-foreground mb-0.5">{character.subclass}</div>
                              )}
                              <div className="text-xs text-muted-foreground mb-0.5">{character.partyStatus || 'active'}</div>
                              {campaign && <div className="text-xs text-muted-foreground">Campaign: {campaign.name}</div>}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                          </div>
                        </TooltipProvider>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with Action Buttons */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          onClick={onOpenDiceRoll}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Dice6 className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Dice Roll</span>}
        </Button>
        <Button
          onClick={onStartLongRest}
          className={`w-full bg-green-600 hover:bg-green-700 text-white ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Moon className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Start Long Rest</span>}
        </Button>
      </div>
    </div>
  )
}
