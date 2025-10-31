"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { CharacterData } from "@/lib/character-data"
import { calculateSavingThrowBonus } from "@/lib/character-data"
import { Icon } from "@iconify/react"

interface SavingThrowsProps {
  character: CharacterData
  proficiencyBonus: number
  onUpdateSavingThrows: (savingThrowProficiencies: any[]) => void
  onTriggerAutoSave: () => void
  canEdit?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function SavingThrows({ 
  character, 
  proficiencyBonus, 
  onUpdateSavingThrows, 
  onTriggerAutoSave,
  canEdit = true
}: SavingThrowsProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="lucide:dice-5" className="w-5 h-5" />
          Saving Throws
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {(() => {
            if (!character.savingThrowProficiencies || character.savingThrowProficiencies.length === 0) {
              return <div>No saving throws loaded</div>
            }
            return character.savingThrowProficiencies.map((savingThrow) => {
              const savingThrowBonus = calculateSavingThrowBonus(character, savingThrow.ability, proficiencyBonus)
              const abilityName = savingThrow.ability.charAt(0).toUpperCase() + savingThrow.ability.slice(1)

              return (
                <div key={savingThrow.ability} className="flex items-center justify-between mb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        id={`${savingThrow.ability}-save`}
                        checked={savingThrow.proficient}
                        onChange={(e) => {
                          if (!canEdit) return
                          const updatedSavingThrows = character.savingThrowProficiencies.map(st =>
                            st.ability === savingThrow.ability
                              ? { ...st, proficient: e.target.checked }
                              : st
                          )
                          onUpdateSavingThrows(updatedSavingThrows)
                          onTriggerAutoSave()
                        }}
                        disabled={!canEdit}
                        className="w-3 h-3 rounded border-border"
                      />
                      <Label htmlFor={`${savingThrow.ability}-save`} className="sr-only">
                        Proficient
                      </Label>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{abilityName}</span>
                      <span className="text-muted-foreground ml-1">
                        ({savingThrow.ability.slice(0, 3).toUpperCase()})
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">{formatModifier(savingThrowBonus)}</Badge>
                </div>
              )
            })
          })()}
        </div>
      </CardContent>
    </Card>
  )
}
