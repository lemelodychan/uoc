"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getMaxEldritchCannons } from "@/lib/class-feature-config"
import { getFeatureUsage } from "@/lib/feature-usage-tracker"

interface EldritchCannonProps {
  character: CharacterData
  onEdit: () => void
  onUpdateFeatureUsage?: (featureId: string, updates: any) => void
  canEdit?: boolean
}

export function EldritchCannon({ character, onEdit, onUpdateFeatureUsage, canEdit = true }: EldritchCannonProps) {
  // Check if character has the eldritch cannon feature (level 3+ Artillerist)
  const hasEldritchCannon = hasClassFeature(character, 'eldritch-cannon', 3)
  const artificerLevel = getClassLevel(character, 'artificer')
  const maxCannons = getMaxEldritchCannons(character)
  
  // Get unified feature usage data
  const eldritchCannonUsage = getFeatureUsage(character, 'eldritch-cannon')
  const cannonData = eldritchCannonUsage?.customState || {}
  
  // Use unified data only (legacy eldritchCannon column has been dropped)
  const activeCannon = cannonData.cannons?.[0]
  
  if (!hasEldritchCannon) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:zap" className="w-5 h-5" />
            Eldritch Cannon
          </CardTitle>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              disabled={artificerLevel < 3}
            >
              <Icon icon="lucide:edit" className="w-4 h-4" />
              {activeCannon ? "Edit" : "Create"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Max Cannons Display */}
        <div className="mb-2 p-2 bg-background rounded-lg text-center border">
          <div className="text-sm text-muted-foreground">Active Cannons</div>
          <div className="text-lg font-bold">{activeCannon ? 1 : 0}/{maxCannons}</div>
        </div>
        
        {activeCannon ? (
          <div className="space-y-3">
            <div className="p-3 border rounded-lg bg-background">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium flex items-center gap-2">
                  {activeCannon.size} {activeCannon.type}
                  <Badge variant="outline" className="text-xs">
                    {activeCannon.currentHitPoints}/{activeCannon.maxHitPoints} HP
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center border p-2 rounded-lg flex flex-col gap-1 bg-card">
                  <div className="text-xs text-muted-foreground">AC</div>
                  <div className="font-mono text-lg font-semibold">{activeCannon.armorClass}</div>
                </div>
                <div className="text-center border p-2 rounded-lg flex flex-col gap-1 bg-card">
                  <div className="text-xs text-muted-foreground">Attack</div>
                  <div className="font-mono text-lg font-semibold">+{activeCannon.attackBonus}</div>
                </div>
                <div className="text-center border p-2 rounded-lg flex flex-col gap-1 bg-card">
                  <div className="text-xs text-muted-foreground">
                    {activeCannon.type === 'Protector' ? 'Temp HP' : 'Damage'}
                  </div>
                  <div className="font-mono text-lg font-semibold">{activeCannon.damage}</div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {activeCannon.specialProperty}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No active cannon. Artificers gain access to Eldritch Cannons at 3rd level.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
