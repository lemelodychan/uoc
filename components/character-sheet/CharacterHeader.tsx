"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { calculateTotalLevel } from "@/lib/character-data"
import { loadAllRaces } from "@/lib/database"

interface CharacterHeaderProps {
  character: CharacterData
  proficiencyBonus: number
  onEdit: () => void
  onOpenBiography: () => void
  onOpenPortrait: () => void
  onLevelUp: () => void
  canEdit?: boolean
  levelUpEnabled?: boolean
  campaign?: any
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CharacterHeader({ 
  character, 
  proficiencyBonus, 
  onEdit, 
  onOpenBiography, 
  onOpenPortrait,
  onLevelUp,
  canEdit = true,
  levelUpEnabled = false,
  campaign
}: CharacterHeaderProps) {
  const showLevelUpButton = canEdit && levelUpEnabled
  const levelUpCompleted = character.levelUpCompleted || false
  const [races, setRaces] = useState<Array<{id: string, name: string}>>([])

  // Load races to get names for display
  useEffect(() => {
    loadAllRaces().then(({ races: loadedRaces }) => {
      if (loadedRaces) {
        setRaces(loadedRaces)
      }
    })
  }, [])

  // Format race display based on raceIds
  const formatRaceDisplay = (): string => {
    if (character.raceIds && character.raceIds.length > 0) {
      const raceNames = character.raceIds.map(raceObj => {
        const race = races.find(r => r.id === raceObj.id)
        return race ? race.name : raceObj.id
      })

      if (raceNames.length === 1) {
        return raceNames[0]
      } else if (raceNames.length === 2) {
        const mainRace = character.raceIds.find(r => r.isMain)
        const otherRace = character.raceIds.find(r => !r.isMain)
        const mainRaceName = races.find(r => r.id === mainRace?.id)?.name || mainRace?.id || raceNames[0]
        const otherRaceName = races.find(r => r.id === otherRace?.id)?.name || otherRace?.id || raceNames[1]
        return `${mainRaceName}, ${otherRaceName}`
      }
    }
    // Fallback to legacy race field
    return character.race || "Unknown"
  }
  return (
    <Card className="rounded-none border-0">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {character.imageUrl && (
              <img
                src={character.imageUrl}
                alt="Portrait"
                className="w-20 h-24 rounded-lg object-cover border cursor-pointer"
                onClick={onOpenPortrait}
              />
            )}
            <div className="flex flex-col items-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl font-bold font-display">{character.name}</CardTitle>
                {character.isNPC && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Icon icon="lucide:users" className="w-3 h-3" />
                    NPC
                  </Badge>
                )}
                {character.visibility === 'private' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Icon icon="lucide:lock" className="w-3 h-3" />
                    Private
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Level {calculateTotalLevel(character.classes)}</Badge>
                <Badge variant="default">Proficiency {formatModifier(proficiencyBonus)}</Badge>
                <Badge variant="outline">
                  {character.classes && character.classes.length > 1 ? (
                    character.classes.map(charClass => 
                      `${charClass.name}${charClass.subclass ? `・${charClass.subclass}` : ''} ${charClass.level}` 
                    ).join(' / ')
                  ) : (
                    `${character.class}・${character.subclass}`
                  )}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground px-1">
                {formatRaceDisplay()}・{character.background}・{character.alignment}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showLevelUpButton && (
              <Button 
                variant={levelUpCompleted ? "secondary" : "default"} 
                size="sm" 
                onClick={onLevelUp}
                disabled={levelUpCompleted}
              >
                <Icon icon={levelUpCompleted ? "lucide:check" : "lucide:trending-up"} className="w-4 h-4" />
                {levelUpCompleted ? "Level Up Complete" : "Level Up"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onOpenBiography}>
              <Icon icon="lucide:book-open" className="w-4 h-4" />
              Biography
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Icon icon="lucide:edit" className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
