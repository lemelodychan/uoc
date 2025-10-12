"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"

interface WeaponsProps {
  character: CharacterData
  onEdit: () => void
}

export function Weapons({ character, onEdit }: WeaponsProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:sword" className="w-5 h-5" />
            Weapons
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {character.weapons.map((weapon, index) => (
            <div key={index} className="p-2 border text-sm font-medium rounded flex flex-row gap-2 bg-background">
              <div className="w-full flex flex-col gap-1">
                <span>{weapon.name}</span>
                  {weapon.weaponProperties && weapon.weaponProperties.length > 0 && (
                    <div className="flex flex-wrap gap-0 mb-1">
                      <span className="text-xs font-normal text-muted-foreground">
                        {weapon.weaponProperties
                          .map((prop, i) => (i === 0 ? prop.charAt(0).toUpperCase() + prop.slice(1) : prop))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs h-fit">{weapon.damageType}</Badge>
              </div>
              <div className="flex flex-col gap-1 w-fit items-end">
                <Badge variant="secondary" className="text-xs h-fit">{weapon.attackBonus} ATK</Badge>
              </div>
            </div>
          ))}
          {character.weapons.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No weapons equipped</div>
          )}
        </div>
        
        {character.weaponNotes && character.weaponNotes.trim() !== "" && (
          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Weapon Notes</h4>
            </div>
            <RichTextDisplay
              content={character.weaponNotes}
              className="text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
