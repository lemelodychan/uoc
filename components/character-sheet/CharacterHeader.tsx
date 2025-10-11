"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface CharacterHeaderProps {
  character: CharacterData
  proficiencyBonus: number
  onEdit: () => void
  onOpenBiography: () => void
  onOpenPortrait: () => void
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CharacterHeader({ 
  character, 
  proficiencyBonus, 
  onEdit, 
  onOpenBiography, 
  onOpenPortrait 
}: CharacterHeaderProps) {
  return (
    <Card className="mb-6">
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
              <CardTitle className="text-3xl font-bold font-display">{character.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Level {character.level}</Badge>
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
                {character.race}・{character.background}・{character.alignment}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onOpenBiography}>
              <Icon icon="lucide:book-open" className="w-4 h-4" />
              Character Biography
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
