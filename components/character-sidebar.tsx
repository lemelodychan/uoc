"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, User, Users, UserX, Skull, Moon, Dice6 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CharacterData } from "@/lib/character-data"

interface CharacterSidebarProps {
  characters: CharacterData[]
  activeCharacterId: string
  onSelectCharacter: (id: string) => void
  onCreateCharacter: () => void
  onStartLongRest: () => void
  onOpenDiceRoll: () => void
}

export function CharacterSidebar({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  onStartLongRest,
  onOpenDiceRoll,
}: CharacterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Group characters by party status and sort alphabetically within each group
  const groupedCharacters = characters.reduce((groups, character) => {
    const status = character.partyStatus || 'active'
    if (!groups[status]) {
      groups[status] = []
    }
    groups[status].push(character)
    return groups
  }, {} as Record<string, CharacterData[]>)

  // Sort characters alphabetically within each status group
  Object.keys(groupedCharacters).forEach(status => {
    groupedCharacters[status].sort((a, b) => a.name.localeCompare(b.name))
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
          {!isCollapsed && <h2 className="text-lg font-semibold text-sidebar-foreground">Character Sheets</h2>}
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
        <Button
          onClick={onCreateCharacter}
          className={`w-full mb-4 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground ${
            isCollapsed ? "px-2" : ""
          }`}
        >
         <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">New Character</span>}
        </Button>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 flex flex-col gap-2">
            {statusOrder.map((status) => {
              const charactersInStatus = groupedCharacters[status] || []
              if (charactersInStatus.length === 0) return null

              const config = statusConfig[status]
              const IconComponent = config.icon

              return (
                <div key={status} className="space-y-2 flex flex-col gap-2">
                  {!isCollapsed && (
                    <div className="flex items-center gap-2 px-1">
                      <IconComponent className="w-4 h-4 text-sidebar-foreground/70" />
                      <span className="text-sm font-medium text-sidebar-foreground/70">
                        {config.label}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-white border-gray-200">
                        {charactersInStatus.length}
                      </Badge>
                    </div>
                  )}
                  <TooltipProvider>
                    <div className="space-y-2 flex flex-col gap-2 relative">
                      {charactersInStatus.map((character) => (
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
                                        Level {character.level} {character.class}
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
                              <div className="text-xs text-muted-foreground mb-0.5">Level {character.level} {character.class}</div>
                              {character.subclass && (
                                <div className="text-xs text-muted-foreground mb-0.5">{character.subclass}</div>
                              )}
                              <div className="text-xs text-muted-foreground">{character.partyStatus || 'active'}</div>
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
