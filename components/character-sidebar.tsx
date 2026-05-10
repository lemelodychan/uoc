"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/config/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CharacterData, Campaign } from "@/lib/character-data"
import { calculateTotalLevel } from "@/lib/character-data"

const STATUS_CONFIG = {
  active: { label: 'Active Party', icon: 'lucide:users', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  away: { label: 'Away', icon: 'lucide:user-x', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' },
  deceased: { label: 'Deceased', icon: 'lucide:skull', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' }
}

const STATUS_ORDER = ['active', 'away', 'deceased'] as const

function getCharacterLevelDisplay(character: CharacterData): string {
  if (character.classes && character.classes.length > 1) {
    const totalLevel = calculateTotalLevel(character.classes)
    const classDisplay = character.classes.map(cls => cls.name).join('/')
    return `Level ${totalLevel} ${classDisplay}`
  }
  return `Level ${calculateTotalLevel(character.classes)} ${character.class}`
}

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
  onOpenManagement?: () => void
  onOpenSpellLibrary: () => void
  currentUserId?: string
  currentView?: 'character' | 'campaign'
  onViewChange?: (view: 'character' | 'campaign') => void
  canEdit?: boolean
  isReadOnly?: boolean
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
  onOpenManagement,
  onOpenSpellLibrary,
  currentUserId,
  currentView = 'character',
  onViewChange,
  canEdit = true,
  isReadOnly = false,
}: CharacterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()

  const visibleCharacters = useMemo(
    () => characters.filter(character => !character.isNPC),
    [characters]
  )

  const filteredCharacters = useMemo(() => {
    if (selectedCampaignId === "all") return visibleCharacters
    return visibleCharacters.filter(character => {
      if (selectedCampaignId === "no-campaign") return !character.campaignId
      return character.campaignId === selectedCampaignId
    })
  }, [visibleCharacters, selectedCampaignId])

  const globalStatusGroups = useMemo(() => {
    const groups: Record<string, CharacterData[]> = {}
    for (const character of filteredCharacters) {
      const status = character.partyStatus || 'active'
      if (!groups[status]) groups[status] = []
      groups[status].push(character)
    }
    for (const status of Object.keys(groups)) {
      groups[status].sort((a, b) => a.name.localeCompare(b.name))
    }
    return groups
  }, [filteredCharacters])

  const groupedByCampaign = useMemo(() => {
    const groups: Record<string, { campaign: Campaign | null, characters: any }> = {}
    for (const character of filteredCharacters) {
      const campaignId = character.campaignId || 'no-campaign'
      if (!groups[campaignId]) {
        groups[campaignId] = {
          campaign: (campaigns || []).find(c => c.id === campaignId) || null,
          characters: [] as CharacterData[]
        }
      }
      (groups[campaignId].characters as CharacterData[]).push(character)
    }
    for (const campaignId of Object.keys(groups)) {
      const statusGroups: Record<string, CharacterData[]> = {}
      for (const character of groups[campaignId].characters as CharacterData[]) {
        const status = character.partyStatus || 'active'
        if (!statusGroups[status]) statusGroups[status] = []
        statusGroups[status].push(character)
      }
      for (const status of Object.keys(statusGroups)) {
        statusGroups[status].sort((a, b) => a.name.localeCompare(b.name))
      }
      groups[campaignId] = { ...groups[campaignId], characters: statusGroups }
    }
    return groups
  }, [filteredCharacters, campaigns])

  return (
    <div
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-18" : "w-72"
      }`}
    >
      <div className={`flex flex-col gap-0 flex-1 min-h-0 w-full ${isCollapsed ? "p-2" : "p-0"}`}>
        {(() => {
          const selectedCampaign = selectedCampaignId && selectedCampaignId !== "all" && selectedCampaignId !== "no-campaign"
            ? campaigns?.find(c => c.id === selectedCampaignId)
            : null
          return (
            <h1 className="text-xs uppercase font-base text-muted-foreground tracking-wide font-bold px-4 pt-4">
              {selectedCampaign ? selectedCampaign.name : 'All Campaigns'}
            </h1>
          )
        })()}

        {/* Campaign Homepage Link */}
        <div className="px-4 w-full pt-2">
        {!isCollapsed && selectedCampaignId && selectedCampaignId !== "all" && selectedCampaignId !== "no-campaign" && (
          <div className="border-b pb-2 pt-1">
          <Button
            variant="outline"
            className={`w-full border-0 rounded-md justify-start bg-transparent shadow-none text-sm !px-1 !py-2 hover:text-primary`}
            onClick={() => {
              const campaign = campaigns?.find(c => c.id === selectedCampaignId)
              if (campaign?.slug) {
                router.push(ROUTES.campaign(campaign.slug))
              } else {
                onViewChange?.('campaign')
              }
            }}
          >
            <Icon icon="lucide:home" className="w-4 h-4" />
            Campaign Home
          </Button>
          </div>
        )}
        </div>

        <ScrollArea className="flex-1 min-h-0 flex flex-col gap-2 px-4">
          <div className="flex flex-col gap-2">
            {/* Campaign Filter Summary */}
			{selectedCampaignId === 'all' ? (
				// Single unified status grouping for All Campaigns
				<div className="flex flex-col gap-2">
					{STATUS_ORDER.map((status) => {
						const charactersInStatus = globalStatusGroups[status] || []
						if (charactersInStatus.length === 0) return null

						const config = STATUS_CONFIG[status]

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
              const hasCharacters = Object.values(statusGroups as Record<string, CharacterData[]>).some(chars => chars.length > 0)
              if (!hasCharacters) return null

              return (
                <div key={campaignId} className="flex flex-col gap-0 pt-2">
						{/* Campaign name header removed as requested */}
                  
                  {STATUS_ORDER.map((status) => {
                    const charactersInStatus = (statusGroups as Record<string, CharacterData[]>)[status] || []
                    if (charactersInStatus.length === 0) return null

                    const config = STATUS_CONFIG[status]

                    return (
                      <div key={`${campaignId}-${status}`} className="flex flex-col gap-3 mt-0 mb-4">
                        {!isCollapsed && (
										      <div className="flex items-center gap-2 ml-1 mt-2 text-sm">
                            <Icon icon={config.icon} className="w-4 h-4" />
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge variant="secondary" className="text-[10px] bg-card border-border text-sidebar-foreground">
                              {charactersInStatus.length}
                            </Badge>
                          </div>
                        )}
                        <TooltipProvider>
                          <div className="flex flex-col gap-2">
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
      <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
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
        {!isReadOnly && (
          <Button
            onClick={onStartLongRest}
            variant="secondary"
            disabled={!canEdit}
            className={`w-full ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            <Icon icon="lucide:moon" className="w-4 h-4" />
            {!isCollapsed && <span>Start Long Rest</span>}
          </Button>
        )}
      </div>
    </div>
  )
}
