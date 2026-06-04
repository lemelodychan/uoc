"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getClassLevel } from "@/lib/class-feature-utils"
import { getClassSubclass } from "@/lib/character-data"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"
import { BLOOD_HUNTER_PATRONS } from "@/lib/blood-hunter-patrons"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface OtherworldlyPatronProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
  canEdit?: boolean
  isLoading?: boolean
}

export function OtherworldlyPatron({ character, onEdit, onOpenFeatureModal, canEdit = true, isLoading = false }: OtherworldlyPatronProps) {
  if (isLoading) return <SectionCardSkeleton contentLines={3} />

  const bloodHunterLevel = getClassLevel(character, "Blood Hunter")
  const subclass = getClassSubclass(character.classes || [], "Blood Hunter") || character.subclass
  if (bloodHunterLevel < 3 || !subclass?.includes("Profane Soul")) {
    return null
  }

  const usage = getFeatureUsage(character, "otherworldly-patron")
  const selectedOptions = (usage?.selectedOptions || []) as Array<{ id: string; title: string }>
  const patron = selectedOptions.length > 0
    ? BLOOD_HUNTER_PATRONS.find((p) => p.id === selectedOptions[0].id)
    : undefined

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:eye" className="w-5 h-5" />
            Otherworldly Patron
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
        {patron ? (
          <>
            <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Patron</div>
              <div className="text-xl font-bold">{patron.name}</div>
            </div>

            <div className="p-2 border rounded-lg flex items-center justify-between bg-background">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium mb-0 truncate">Rite Focus</h4>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-7 shadow-sm text-foreground ml-2"
                onClick={() =>
                  onOpenFeatureModal({
                    title: `Rite Focus — ${patron.name}`,
                    description: `<p>While you have an active crimson rite, you can use your weapon as a spellcasting focus for your spells.</p><p>${patron.riteFocus}</p>`,
                  })
                }
              >
                Read more
              </Button>
            </div>

            {bloodHunterLevel >= 7 && (
              <div className="p-2 border rounded-lg flex items-center justify-between bg-background">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h4 className="text-sm font-medium mb-0 truncate">Revealed Arcana</h4>
                  <Badge variant="outline" className="text-xs">{patron.revealedArcana}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 h-7 shadow-sm text-foreground ml-2"
                  onClick={() =>
                    onOpenFeatureModal({
                      title: `Revealed Arcana — ${patron.name}`,
                      description: `<p>Your patron grants you the rare use of a dangerous arcane spell. You can cast <strong>${patron.revealedArcana}</strong> once using a pact magic spell slot. You can't do so again until you finish a long rest.</p>`,
                    })
                  }
                >
                  Read more
                </Button>
              </div>
            )}

            {bloodHunterLevel >= 15 && (
              <div className="p-2 border rounded-lg flex items-center justify-between bg-background">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h4 className="text-sm font-medium mb-0 truncate">Unsealed Arcana</h4>
                  <Badge variant="outline" className="text-xs">{patron.unsealedArcana}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 h-7 shadow-sm text-foreground ml-2"
                  onClick={() =>
                    onOpenFeatureModal({
                      title: `Unsealed Arcana — ${patron.name}`,
                      description: `<p>Your patron grants you the rare use of an additional arcane spell. You can cast <strong>${patron.unsealedArcana}</strong> once without expending a spell slot. You can't do so again until you finish a long rest.</p>`,
                    })
                  }
                >
                  Read more
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No patron selected yet. Choose the otherworldly being you struck a bargain with.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
