"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"

interface MetamagicProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
  canEdit?: boolean
}

function getMetamagicKnownBySorcererLevel(sorcererLevel: number): number {
  if (sorcererLevel >= 17) return 4
  if (sorcererLevel >= 10) return 3
  if (sorcererLevel >= 3) return 2
  return 0
}

export function Metamagic({ character, onEdit, onOpenFeatureModal, canEdit = true }: MetamagicProps) {
  const hasMetamagic = hasClassFeature(character, 'metamagic', 3)
  const sorcererLevel = getClassLevel(character, 'sorcerer')
  const metamagicUsage = getFeatureUsage(character, 'metamagic')
  const selectedOptions = metamagicUsage?.selectedOptions || []
  // Always derive the cap from Sorcerer level to avoid stale stored values
  const maxSelections = getMetamagicKnownBySorcererLevel(sorcererLevel)

  if (!hasMetamagic || sorcererLevel < 3) {
    return null
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:waves" className="w-5 h-5" />
            Metamagic
          </CardTitle>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              disabled={sorcererLevel < 3}
            >
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-4">
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
            <div className="text-sm text-muted-foreground">Metamagic Options Known</div>
            <div className="text-xl font-bold font-mono">
              {selectedOptions.length}/{maxSelections}
            </div>
          </div>
        </div>

        <div className="space-y-3 flex flex-col gap-2">
          {selectedOptions && selectedOptions.length > 0 ? (
            selectedOptions.map((option: any, index: number) => {
              const name = typeof option === 'string' ? option : (option.title || option.name)
              const description = typeof option === 'string' ? '' : (option.description || '')
              return (
                <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium mb-0">{name}</h4>
                  </div>
                  {description && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 h-7 shadow-sm text-foreground"
                      onClick={() => onOpenFeatureModal({ title: name, description })}
                    >
                      Read more
                    </Button>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No metamagic options selected yet. You can choose {maxSelections} options at sorcerer level {sorcererLevel}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


