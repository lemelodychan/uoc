"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getWarlockInvocationsKnown } from "@/lib/character-data"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"

interface EldritchInvocationsProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
}

export function EldritchInvocations({ character, onEdit, onOpenFeatureModal }: EldritchInvocationsProps) {
  // Check if character has the eldritch invocations feature (level 2+ Warlock)
  const hasEldritchInvocations = hasClassFeature(character, 'eldritch-invocations', 2)
  const warlockLevel = getClassLevel(character, 'warlock')
  
  // Get unified feature usage data
  const eldritchInvocationsUsage = getFeatureUsage(character, 'eldritch-invocations')
  
  // Determine which data to use
  const useUnified = eldritchInvocationsUsage && eldritchInvocationsUsage.featureType === 'options_list'
  const selectedInvocations = useUnified ? 
    (eldritchInvocationsUsage.selectedOptions || []) : 
    (character.spellData.eldritchInvocations || [])
  const maxInvocations = useUnified ? 
    (eldritchInvocationsUsage.maxSelections || getWarlockInvocationsKnown(warlockLevel)) : 
    getWarlockInvocationsKnown(warlockLevel)
  
  // Show component if character is Warlock level 2+ (even if no invocations selected yet)
  if (warlockLevel < 2) {
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
              {selectedInvocations.length}/{maxInvocations}
            </div>
          </div>
        </div>

        {/* Invocations List */}
        <div className="space-y-3 flex flex-col gap-2">
          {selectedInvocations && selectedInvocations.length > 0 ? (
            selectedInvocations.map((invocation, index) => {
              // Handle both string and object formats
              const invocationName = typeof invocation === 'string' ? invocation : (invocation.title || invocation.name)
              const invocationDescription = typeof invocation === 'string' ? '' : (invocation.description || '')
              
              return (
                <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                  <h4 className="text-sm font-medium mb-0">{invocationName}</h4>
                  {invocationDescription && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2 h-7 shadow-sm text-foreground"
                      onClick={() => {
                        onOpenFeatureModal({ 
                          title: invocationName, 
                          description: invocationDescription
                        })
                      }}
                    >
                      Read more
                    </Button>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No invocations selected yet. You can choose {maxInvocations} invocations at level {warlockLevel}.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
