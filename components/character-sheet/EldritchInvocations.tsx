"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getWarlockInvocationsKnown } from "@/lib/character-data"

interface EldritchInvocationsProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
}

export function EldritchInvocations({ character, onEdit, onOpenFeatureModal }: EldritchInvocationsProps) {
  const isWarlock = character.class.toLowerCase() === "warlock" || character.classes?.some(c => c.name.toLowerCase() === "warlock")
  const warlockLevel = character.classes?.reduce((total, c) => c.name.toLowerCase() === "warlock" ? total + c.level : total, 0) || character.level
  
  if (!isWarlock || warlockLevel < 2) {
    return null
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:sparkles" className="w-5 h-5" />
            Eldritch Invocations
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            disabled={warlockLevel < 2}
          >
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Invocation Tracking */}
        <div className="grid grid-cols-1 gap-4">
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
            <div className="text-sm text-muted-foreground">Invocations Known</div>
            <div className="text-xl font-bold font-mono">
              {character.spellData.eldritchInvocations?.length || 0}/{getWarlockInvocationsKnown(warlockLevel)}
            </div>
          </div>
        </div>

        {/* Invocations List */}
        <div className="space-y-3 flex flex-col gap-2">
          {character.spellData.eldritchInvocations && character.spellData.eldritchInvocations.length > 0 ? (
            character.spellData.eldritchInvocations.map((invocation, index) => (
              <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                <h4 className="text-sm font-medium mb-0">{invocation.name}</h4>
                {invocation.description && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 h-7 shadow-sm text-foreground"
                    onClick={() => {
                      onOpenFeatureModal({ 
                        title: invocation.name, 
                        description: invocation.description
                      })
                    }}
                  >
                    Read more
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No invocations selected yet. You can choose {getWarlockInvocationsKnown(warlockLevel)} invocations at level {warlockLevel}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
