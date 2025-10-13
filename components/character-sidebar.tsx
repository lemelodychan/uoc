"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icon } from "@iconify/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CharacterData, Campaign } from "@/lib/character-data"
import { canViewCharacter } from "@/lib/database"

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
  onOpenSpellLibrary: () => void
  currentUserId?: string
  currentView?: 'character' | 'campaign'
  onViewChange?: (view: 'character' | 'campaign') => void
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
  onOpenSpellLibrary,
  currentUserId,
  currentView = 'character',
  onViewChange,
}: CharacterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Show all characters in sidebar, but we'll handle access control in the main view
  const visibleCharacters = characters

  // Helper function to format character level and class display
  const getCharacterLevelDisplay = (character: CharacterData): string => {
    // Treat as multiclass ONLY when there are 2+ classes.
    // For single-class characters (including when classes has a single entry),
    // always use the top-level level/class coming from the database.
    if (character.classes && character.classes.length > 1) {
      const totalLevel = character.classes.reduce((total, cls) => total + cls.level, 0)
      const classDisplay = character.classes.map(cls => cls.name).join('/')
      return `Level ${totalLevel} ${classDisplay}`
    }

    return `Level ${character.level} ${character.class}`
  }

  // Filter characters based on selected campaign
  const filteredCharacters = selectedCampaignId === "all" 
    ? visibleCharacters 
    : visibleCharacters.filter(character => {
        if (selectedCampaignId === "no-campaign") {
          return !character.campaignId
        }
        return character.campaignId === selectedCampaignId
      })

	// Global status groups for "All Campaigns" view
	const globalStatusGroups = filteredCharacters.reduce((groups, character) => {
		const status = character.partyStatus || 'active'
		if (!groups[status]) {
			groups[status] = []
		}
		groups[status].push(character)
		return groups
	}, {} as Record<string, CharacterData[]>)

	// Sort characters in global groups alphabetically
	Object.keys(globalStatusGroups).forEach(status => {
		globalStatusGroups[status].sort((a, b) => a.name.localeCompare(b.name))
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

	// Count characters per campaign for campaign selector labels
	const characterCountByCampaign = visibleCharacters.reduce((counts, character) => {
		const campaignId = character.campaignId || 'no-campaign'
		counts[campaignId] = (counts[campaignId] || 0) + 1
		return counts
	}, {} as Record<string, number>)

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
    active: { label: 'Active Party', icon: 'lucide:users', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
    away: { label: 'Away', icon: 'lucide:user-x', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' },
    deceased: { label: 'Deceased', icon: 'lucide:skull', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' }
  }

  const statusOrder = ['active', 'away', 'deceased'] as const

  return (
    <div
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-18" : "w-72"
      }`}
    >
{/*       <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <Icon icon="lucide:chevron-right" className="w-4 h-4" /> : <Icon icon="lucide:chevron-left" className="w-4 h-4" />}
          </Button>
        </div>
      </div> */}

      <div className={`flex flex-col gap-2 flex-1 min-h-0 w-full ${isCollapsed ? "p-2" : "p-4"}`}>

        {/* Campaign Selector */}
        <div className="flex items-center gap-2 mb-2">
          {!isCollapsed && (campaigns || []).length > 0 && (
              <Select value={selectedCampaignId} onValueChange={onCampaignChange}>
              <SelectTrigger className="w-full text-md font-medium pl-8 relative">
                <Icon icon="lucide:book-open" className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" />
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {(campaigns || []).map((campaign) => {
                  const count = characterCountByCampaign[campaign.id] || 0
                  return (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}

          {!isCollapsed && (
              <Button
                onClick={onOpenCampaignManagement}
                variant="outline"
                size="sm"
                className="h-9"
              >
                <Icon icon="lucide:settings" className="w-4 h-4" />
              </Button>
            )}
        </div>

        <div className="flex gap-2 mb-2">
          <Button
            onClick={onCreateCharacter}
            className={`flex-1 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground ${
              isCollapsed ? "px-0 h-12" : ""
            }`}
          >
            <Icon icon="lucide:user-round-plus" className={`${isCollapsed ? "w-6 h-6" : "w-4 h-4"}`} />
            {!isCollapsed && <span>New Character</span>}
          </Button>
        </div>

        {/* Campaign Homepage Link */}
        {!isCollapsed && selectedCampaignId && selectedCampaignId !== "all" && selectedCampaignId !== "no-campaign" && (
          <Button
            variant="outline"
            className={`w-full rounded-md justify-start bg-transparent shadow-none text-sm !px-1 !py-2 border-0 hover:text-primary ${
              currentView === 'campaign' ? 'text-primary' : ''
            }`}
            onClick={() => {
              if (currentView !== 'campaign') {
                onViewChange?.('campaign')
              }
            }}
          >
            <Icon icon="lucide:home" className="w-4 h-4" />
            Campaign Home
          </Button>
        )}

        <ScrollArea className="flex-1 min-h-0 border-t pt-1">
          <div className="space-y-4 flex flex-col gap-2">
            {/* Campaign Filter Summary */}
			{selectedCampaignId === 'all' ? (
				// Single unified status grouping for All Campaigns
				<div className="space-y-2 flex flex-col gap-2">
					{statusOrder.map((status) => {
						const charactersInStatus = (globalStatusGroups as unknown as Record<string, CharacterData[]>)[status] || []
						if (charactersInStatus.length === 0) return null

						const config = statusConfig[status]

						return (
							<div key={`all-${status}`} className="flex flex-col gap-3 mt-2">
								{!isCollapsed && (
									<div className="flex items-center gap-2 ml-1 text-sm">
										<Icon icon={config.icon} className="w-4 h-4" />
										<span className="text-sm font-medium">{config.label}</span>
										<Badge variant="secondary" className="text-[10px] bg-card border-border text-sidebar-foreground">
											{charactersInStatus.length}
										</Badge>
									</div>
								)}
								<TooltipProvider>
									<div className="flex flex-col gap-2 w-full">
										{charactersInStatus.map((character: CharacterData) => (
											<Tooltip key={character.id}>
												<TooltipTrigger asChild>
													<Card
														className={`cursor-pointer transition-colors mb-0 p-0 rounded-lg ${isCollapsed ? "w-full h-14" : "w-full h-auto"} ${
															character.id === activeCharacterId && currentView === 'character'
																? "bg-sidebar-accent border-sidebar-primary"
																: "hover:bg-sidebar-accent/25"
														}`}
														onClick={() => onSelectCharacter(character.id)}
													>
														<CardContent className={`${isCollapsed ? "w-full h-14 p-0" : "p-3"}`}>
															<div className={`flex ${isCollapsed ? "items-center justify-center" : "items-center gap-3"}`}>
																<div className={`${isCollapsed ? "w-full h-14" : "w-12 h-12"} rounded-md bg-sidebar-primary/20 flex items-center justify-center overflow-hidden`}>
																	{character.imageUrl ? (
																		<img 
																			src={character.imageUrl} alt={character.name} 
																			className="w-full h-full object-cover"
																		/>
																	) : (
																		<Icon icon="lucide:user" className={`${isCollapsed ? "w-4 h-4 p-0" : "w-12 h-14 p-3"} text-sidebar-primary`} />
																	)}
																</div>
																{!isCollapsed && (
																	<div className="flex-1 min-w-0">
																		<div className="flex items-center gap-1">
																			<div className="font-medium text-sidebar-foreground truncate">{character.name}</div>
																			{character.visibility === 'private' && (
																				<Icon icon="lucide:lock" className="w-3 h-3 text-sidebar-foreground/50" />
																			)}
																		</div>
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
														{character.visibility === 'private' && (
															<div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
																<Icon icon="lucide:lock" className="w-3 h-3" />
																{character.userId === currentUserId ? 'Private (yours)' : 'Private character'}
															</div>
														)}
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
			) : (
				Object.entries(groupedByCampaign).map(([campaignId, { campaign, characters: statusGroups }]) => {
              const hasCharacters = Object.values(statusGroups as unknown as Record<string, CharacterData[]>).some(chars => chars.length > 0)
              if (!hasCharacters) return null

              return (
                <div key={campaignId} className="space-y-2 flex flex-col gap-2">
						{/* Campaign name header removed as requested */}
                  
                  {statusOrder.map((status) => {
                    const charactersInStatus = (statusGroups as unknown as Record<string, CharacterData[]>)[status] || []
                    if (charactersInStatus.length === 0) return null

                    const config = statusConfig[status]

                    return (
                      <div key={`${campaignId}-${status}`} className="flex flex-col gap-3 mt-2">
                        {!isCollapsed && (
										      <div className="flex items-center gap-2 ml-1 text-sm">
                            <Icon icon={config.icon} className="w-4 h-4" />
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge variant="secondary" className="text-[10px] bg-card border-border text-sidebar-foreground">
                              {charactersInStatus.length}
                            </Badge>
                          </div>
                        )}
                        <TooltipProvider>
                          <div className="space-y-1 flex flex-col gap-2">
                      {charactersInStatus.map((character: CharacterData) => (
                        <Tooltip key={character.id}>
                          <TooltipTrigger asChild>
                            <Card
                              className={`cursor-pointer transition-colors mb-0 p-0 rounded-xl ${
                                character.id === activeCharacterId && currentView === 'character'
                                  ? "bg-sidebar-accent border-sidebar-primary"
                                  : "hover:bg-sidebar-accent/25"
                              }`}
                              onClick={() => onSelectCharacter(character.id)}
                            >
                              <CardContent className={`${isCollapsed ? "p-0" : "p-2"}`}>
                                <div className={`flex ${isCollapsed ? "items-center justify-center" : "items-center gap-3"}`}>
                                  <div className={`${isCollapsed ? "w-full h-12" : "w-12 h-12"} rounded-lg bg-sidebar-primary/20 flex items-center justify-center overflow-hidden`}>
                                    {character.imageUrl ? (
                                      <img 
                                        src={character.imageUrl} alt={character.name} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Icon icon="lucide:user" className={`${isCollapsed ? "w-4 h-4" : "w-12 h-12"} text-sidebar-primary`} />
                                    )}
                                  </div>
                                  {!isCollapsed && (
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1">
                                        <div className="font-bold text-sidebar-foreground truncate">{character.name}</div>
                                        {character.visibility === 'private' && (
                                          <Icon icon="lucide:lock" className="w-3 h-3 text-sidebar-foreground/50" />
                                        )}
                                      </div>
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
                              {character.visibility === 'private' && (
                                <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                  <Icon icon="lucide:lock" className="w-3 h-3" />
                                  {character.userId === currentUserId ? 'Private (yours)' : 'Private character'}
                                </div>
                              )}
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
				})
			)}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with Action Buttons */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          onClick={onOpenSpellLibrary}
          variant="outline"
          className={`w-full ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Icon icon="lucide:book-open" className="w-4 h-4" />
          {!isCollapsed && <span>Spell Library</span>}
        </Button>
        <Button
          onClick={onOpenDiceRoll}
          variant="default"
          className={`w-full ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Icon icon="lucide:dice-5" className="w-4 h-4" />
          {!isCollapsed && <span>Dice Roll</span>}
        </Button>
        <Button
          onClick={onStartLongRest}
          variant="secondary"
          className={`w-full ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Icon icon="lucide:moon" className="w-4 h-4" />
          {!isCollapsed && <span>Start Long Rest</span>}
        </Button>
      </div>
    </div>
  )
}
