"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getClassLevel } from "@/lib/class-feature-utils"
import { getMutagenFormulasKnown, getClassSubclass } from "@/lib/character-data"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface MutagensProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
  canEdit?: boolean
  isLoading?: boolean
}

export function Mutagens({ character, onEdit, onOpenFeatureModal, canEdit = true, isLoading = false }: MutagensProps) {
  if (isLoading) return <SectionCardSkeleton contentLines={4} />

  const bloodHunterLevel = getClassLevel(character, "Blood Hunter")
  const subclass = getClassSubclass(character.classes || [], "Blood Hunter") || character.subclass
  if (bloodHunterLevel < 3 || !subclass?.includes("Mutant")) {
    return null
  }

  const formulasKnown = getMutagenFormulasKnown(bloodHunterLevel)
  const usage = getFeatureUsage(character, "mutagen-formulas")
  const selectedMutagens = (usage?.selectedOptions || []) as Array<{
    id: string
    title: string
    description: string
    sideEffect?: string
  }>

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:flask-conical" className="w-5 h-5" />
            Mutagens
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
          <div className="text-sm text-muted-foreground">Formulas Known</div>
          <div className="text-xl font-bold font-mono">
            {selectedMutagens.length}/{formulasKnown}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {selectedMutagens.length > 0 ? (
            selectedMutagens.map((mutagen, index) => (
              <div key={mutagen.id || index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium mb-0 truncate">{mutagen.title}</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 h-7 shadow-sm text-foreground ml-2"
                  onClick={() => {
                    const description = mutagen.sideEffect
                      ? `${mutagen.description}<p><strong>Side effect.</strong> ${mutagen.sideEffect}</p>`
                      : mutagen.description
                    onOpenFeatureModal({ title: mutagen.title, description })
                  }}
                >
                  Read more
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No formulas selected yet. You can choose {formulasKnown} mutagen {formulasKnown === 1 ? "formula" : "formulas"} at level {bloodHunterLevel}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
