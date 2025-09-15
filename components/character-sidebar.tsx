"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, Plus, User } from "lucide-react"
import type { CharacterData } from "@/lib/character-data"

interface CharacterSidebarProps {
  characters: CharacterData[]
  activeCharacterId: string
  onSelectCharacter: (id: string) => void
  onCreateCharacter: () => void
}

export function CharacterSidebar({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onCreateCharacter,
}: CharacterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-80"
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

      <div className="p-4">
        <Button
          onClick={onCreateCharacter}
          className={`w-full mb-4 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">New Character</span>}
        </Button>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {characters.map((character) => (
              <Card
                key={character.id}
                className={`cursor-pointer transition-colors ${
                  character.id === activeCharacterId
                    ? "bg-sidebar-accent border-sidebar-primary"
                    : "hover:bg-sidebar-accent/50"
                }`}
                onClick={() => onSelectCharacter(character.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-sidebar-primary" />
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
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
