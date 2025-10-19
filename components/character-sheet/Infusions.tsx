"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getMaxInfusedItems, getInfusionsKnown } from "@/lib/class-feature-config"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"

interface InfusionsProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string }) => void
  onUpdateFeatureUsage?: (featureId: string, updates: any) => void
}

export function Infusions({ character, onEdit, onOpenFeatureModal, onUpdateFeatureUsage }: InfusionsProps) {
  // Check if character has the infusions feature (level 2+ Artificer)
  const hasInfusions = hasClassFeature(character, 'infusions', 2)
  const artificerLevel = getClassLevel(character, 'artificer')
  const maxInfusedItems = getMaxInfusedItems(character)
  
  // Get unified feature usage data
  const infusionsUsage = getFeatureUsage(character, 'artificer-infusions')
  const selectedInfusions = infusionsUsage?.selectedOptions || []
  const maxSelections = infusionsUsage?.maxSelections || maxInfusedItems
  const infusionNotes = infusionsUsage?.notes || character.infusionNotes || ''
  
  // Helper function to check if selectedOptions contains full objects or just strings
  const isFullInfusionObjects = selectedInfusions.length > 0 && typeof selectedInfusions[0] === 'object'
  
  if (!hasInfusions) {
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
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
            <div className="text-sm text-muted-foreground">Infusions Known</div>
            <div className="text-xl font-bold font-mono">
              {getInfusionsKnown(character)}
            </div>
          </div>
          <div className="text-center p-2 border rounded-lg flex flex-col gap-1 bg-background">
            <div className="text-sm text-muted-foreground">Max Infused</div>
            <div className="text-xl font-bold font-mono">
              {maxSelections}
            </div>
          </div>
        </div>

        {/* Infusions List */}
        <div className="space-y-3 flex flex-col gap-2">
          {/* Show unified feature usage data if available, otherwise fallback to legacy data */}
          {selectedInfusions.length > 0 ? (
            // Show unified feature usage data
            selectedInfusions.map((infusion, index) => {
              // Handle both string IDs and full infusion objects
              const infusionData = typeof infusion === 'object' ? infusion : {
                id: infusion,
                title: infusion,
                description: 'Infusion details from unified feature usage tracking',
                needsAttunement: false
              }
              
              return (
                <div key={infusionData.id || index} className="p-2 mb-0 border rounded-lg flex items-center justify-between bg-background">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-0 truncate">{infusionData.title}</h4>
                    {infusionData.needsAttunement && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Requires Attunement
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 h-7 shadow-sm text-foreground ml-2"
                    onClick={() => {
                      onOpenFeatureModal({ 
                        title: infusionData.title, 
                        description: infusionData.description,
                        needsAttunement: infusionData.needsAttunement
                      })
                    }}
                  >
                    Read more
                  </Button>
                </div>
              )
            })
          ) : (
            // No infusions available (legacy infusions column has been dropped)
            <div className="text-center py-4 text-sm text-muted-foreground">
              No infusions available. Use the unified system to manage infusions.
            </div>
          )}
          
          {/* Show message if no infusions are selected */}
          {selectedInfusions.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No infusions selected yet. You can choose {getInfusionsKnown(character)} infusions at level {artificerLevel}.
            </div>
          )}
        </div>

        {/* Infusion Notes Display */}
        {infusionNotes && (
          <div className="mt-2 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Infusion Notes</div>
            <RichTextDisplay 
              content={infusionNotes} 
              className="text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
