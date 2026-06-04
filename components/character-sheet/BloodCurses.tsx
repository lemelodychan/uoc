"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getClassLevel } from "@/lib/class-feature-utils"
import { getBloodHunterCursesKnown } from "@/lib/character-data"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"
import { SectionCardSkeleton } from "./character-sheet-skeletons"

interface BloodCursesProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
  canEdit?: boolean
  isLoading?: boolean
}

export function BloodCurses({ character, onEdit, onOpenFeatureModal, canEdit = true, isLoading = false }: BloodCursesProps) {
  if (isLoading) return <SectionCardSkeleton contentLines={4} />

  const bloodHunterLevel = getClassLevel(character, "Blood Hunter")
  if (bloodHunterLevel < 1) {
    return null
  }

  const cursesKnown = getBloodHunterCursesKnown(bloodHunterLevel)
  const usage = getFeatureUsage(character, "blood-curses")
  const selectedCurses = (usage?.selectedOptions || []) as Array<{
    id: string
    title: string
    description: string
    amplified?: string
    granted?: boolean // Order-granted curse — doesn't count against curses known
  }>
  const countedCurses = selectedCurses.filter((c) => !c.granted)

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:droplets" className="w-5 h-5" />
            Blood Curses
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
          <div className="text-sm text-muted-foreground">Curses Known</div>
          <div className="text-xl font-bold font-mono">
            {countedCurses.length}/{cursesKnown}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {selectedCurses.length > 0 ? (
            selectedCurses.map((curse, index) => (
              <div key={curse.id || index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h4 className="text-sm font-medium mb-0 truncate">{curse.title}</h4>
                  {curse.granted && (
                    <Badge className="text-xs shrink-0">Order</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 h-7 shadow-sm text-foreground ml-2"
                  onClick={() => {
                    const description = curse.amplified
                      ? `${curse.description}<p><strong>Amplified.</strong> ${curse.amplified}</p>`
                      : curse.description
                    onOpenFeatureModal({ title: curse.title, description })
                  }}
                >
                  Read more
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No curses selected yet. You can choose {cursesKnown} blood {cursesKnown === 1 ? "curse" : "curses"} at level {bloodHunterLevel}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
