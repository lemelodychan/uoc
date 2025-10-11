"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getArtificerInfusionsKnown, getArtificerMaxInfusedItems } from "@/lib/character-data"

interface InfusionsProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
}

export function Infusions({ character, onEdit, onOpenFeatureModal }: InfusionsProps) {
  const isArtificer = character.class.toLowerCase() === "artificer" || character.classes?.some(c => c.name.toLowerCase() === "artificer")
  const artificerLevel = character.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) || character.level
  
  if (!isArtificer || artificerLevel < 2) {
    return null
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:wrench" className="w-5 h-5" />
            Infusions
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            disabled={artificerLevel < 2}
          >
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Infusion Tracking */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Infusions Known</div>
            <div className="text-xl font-bold font-mono">
              {getArtificerInfusionsKnown(artificerLevel)}
            </div>
          </div>
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Max Infused</div>
            <div className="text-xl font-bold font-mono">
              {getArtificerMaxInfusedItems(character)}
            </div>
          </div>
        </div>

        {/* Infusions List */}
        <div className="space-y-3 flex flex-col gap-2">
          {character.infusions.map((infusion, index) => (
            <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between">
              <h4 className="text-sm font-medium mb-0">{infusion.title || "Untitled Infusion"}</h4>
              {infusion.description && (
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-7 shadow-sm text-foreground"
                onClick={() => {
                  onOpenFeatureModal({ 
                    title: infusion.title || "Untitled Infusion", 
                    description: infusion.description,
                    needsAttunement: infusion.needsAttunement
                  })
                }}
              >
                Read more
              </Button>
              )}
            </div>
          ))}
          {character.infusions.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No infusions selected yet. You can choose {getArtificerInfusionsKnown(artificerLevel)} infusions at level {artificerLevel}.
            </div>
          )}
        </div>

        {/* Infusion Notes Display */}
        {character.infusionNotes && (
          <div className="mt-2 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Infusion Notes</div>
            <RichTextDisplay 
              content={character.infusionNotes} 
              className={
                !character.infusionNotes
                  ? "text-muted-foreground text-center py-2 text-sm"
                  : "text-sm"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
