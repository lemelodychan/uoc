"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"

interface MoneyProps {
  character: CharacterData
  onEdit: () => void
}

export function Money({ character, onEdit }: MoneyProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:coins" className="w-5 h-5" />
            Money
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className={`text-sm font-medium ${getCombatColor('initiative')}`}>Gold</div>
              <div className="text-lg font-semibold text-foreground">
                {character.money?.gold || 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Silver</div>
              <div className="text-lg font-semibold text-foreground">
                {character.money?.silver || 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Copper</div>
              <div className="text-lg font-semibold text-foreground">
                {character.money?.copper || 0}
              </div>
            </div>
          </div>
{/*           <div className="pt-2 border-t text-center">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-lg font-semibold">
              {(() => {
                const gold = character.money?.gold || 0
                const silver = character.money?.silver || 0
                const copper = character.money?.copper || 0
                const totalCopper = (gold * 100) + (silver * 10) + copper
                return (totalCopper / 100).toFixed(2)
              })()} Gold Pieces
            </div>
          </div> */}
        </div>
      </CardContent>
    </Card>
  )
}
