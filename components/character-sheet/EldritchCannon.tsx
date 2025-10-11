"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface EldritchCannonProps {
  character: CharacterData
  onEdit: () => void
}

export function EldritchCannon({ character, onEdit }: EldritchCannonProps) {
  const isArtificerArtillerist = (character.class.toLowerCase() === "artificer" && character.subclass?.toLowerCase() === "artillerist") || 
    (character.classes?.some(c => c.name.toLowerCase() === "artificer" && c.subclass?.toLowerCase() === "artillerist"))
  const artificerLevel = character.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) || character.level
  
  if (!isArtificerArtillerist || artificerLevel < 3) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:zap" className="w-5 h-5" />
            Eldritch Cannon
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            disabled={artificerLevel < 3}
          >
            <Icon icon="lucide:edit" className="w-4 h-4" />
            {character.eldritchCannon ? "Edit" : "Create"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {character.eldritchCannon ? (
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium flex items-center gap-2">
                  {character.eldritchCannon.size} {character.eldritchCannon.type}
                  <Badge variant="outline" className="text-xs">
                    {character.eldritchCannon.currentHitPoints}/{character.eldritchCannon.maxHitPoints} HP
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">AC</div>
                  <div className="font-mono text-lg font-semibold">{character.eldritchCannon.armorClass}</div>
                </div>
                <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Attack</div>
                  <div className="font-mono text-lg font-semibold">+{character.eldritchCannon.attackBonus}</div>
                </div>
                <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">
                    {character.eldritchCannon.type === 'Protector' ? 'Temp HP' : 'Damage'}
                  </div>
                  <div className="font-mono text-lg font-semibold">{character.eldritchCannon.damage}</div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {character.eldritchCannon.specialProperty}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No active cannon. Artificers gain access to Eldritch Cannons at 3rd level.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
