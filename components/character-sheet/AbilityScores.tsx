"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { getAbilityModifierColor } from "@/lib/color-mapping"
import type { CharacterData } from "@/lib/character-data"
import { AbilityScoresSkeleton } from "./character-sheet-skeletons"

interface AbilityScoresProps {
  character: CharacterData
  strengthMod: number
  dexterityMod: number
  constitutionMod: number
  intelligenceMod: number
  wisdomMod: number
  charismaMod: number
  onEdit: () => void
  canEdit?: boolean
  isLoading?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}


export function AbilityScores({ 
  character, 
  strengthMod, 
  dexterityMod, 
  constitutionMod, 
  intelligenceMod, 
  wisdomMod, 
  charismaMod, 
  onEdit,
  canEdit = true,
  isLoading = false
}: AbilityScoresProps) {
  if (isLoading) return <AbilityScoresSkeleton />
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:brain" className="w-5 h-5" />
            Ability Scores
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "STR", fullName: "Strength", score: character.strength, modifier: strengthMod },
            { name: "DEX", fullName: "Dexterity", score: character.dexterity, modifier: dexterityMod },
            {
              name: "CON",
              fullName: "Constitution",
              score: character.constitution,
              modifier: constitutionMod,
            },
            {
              name: "INT",
              fullName: "Intelligence",
              score: character.intelligence,
              modifier: intelligenceMod,
            },
            { name: "WIS", fullName: "Wisdom", score: character.wisdom, modifier: wisdomMod },
            { name: "CHA", fullName: "Charisma", score: character.charisma, modifier: charismaMod },
          ].map((ability) => (
            <div key={ability.name} className="text-center flex flex-col items-center gap-1">
              <div className="text-sm text-muted-foreground">{ability.fullName}</div>
              <div className="text-2xl font-bold mb-2 font-mono">{ability.score}</div>
              <Badge variant="outline" className={`${getAbilityModifierColor(ability.name)} border-0`}>
                {formatModifier(ability.modifier)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
