import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import { type CharacterData, type EldritchCannon, createEldritchCannon } from "@/lib/character-data"
import { getFeatureUsage, updateFeatureCustomState, addSingleFeature } from "@/lib/feature-usage-tracker"

interface EldritchCannonModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export const EldritchCannonModal = ({ isOpen, onClose, character, onSave }: EldritchCannonModalProps) => {
  const [cannon, setCannon] = useState<EldritchCannon | null>(null)
  const [size, setSize] = useState<'Small' | 'Tiny'>('Small')
  const [type, setType] = useState<'Flamethrower' | 'Force Ballista' | 'Protector'>('Flamethrower')

  // Get unified feature usage data
  const eldritchCannonUsage = getFeatureUsage(character, 'eldritch-cannon')
  const cannonData = eldritchCannonUsage?.customState || {}

  useEffect(() => {
    // Use unified data only (legacy eldritchCannon column has been dropped)
    const activeCannon = cannonData.cannons?.[0]
    setCannon(activeCannon || null)
  }, [eldritchCannonUsage])

  const handleCreateCannon = () => {
    const newCannon = createEldritchCannon(size, type, character)
    setCannon(newCannon)
  }

  const handleDismissCannon = () => {
    setCannon(null)
  }

  const handleSave = () => {
    console.log('🔧 Eldritch Cannon Save - Before:', {
      existingUsage: character.classFeatureSkillsUsage,
      eldritchCannonUsage,
      cannonData
    })
    
    // Ensure the feature is initialized first
    let characterWithUsage = character
    if (!eldritchCannonUsage) {
      const updatedUsage = addSingleFeature(character, 'eldritch-cannon', {
        featureName: 'Eldritch Cannon',
        featureType: 'special_ux',
        enabledAtLevel: 3
      })
      characterWithUsage = {
        ...character,
        classFeatureSkillsUsage: updatedUsage
      }
      console.log('🔧 Eldritch Cannon Save - After initialization:', {
        updatedUsage,
        characterWithUsage: characterWithUsage.classFeatureSkillsUsage
      })
    }
    
    // Save to unified system using proper feature usage tracker
    const finalUsage = updateFeatureCustomState(characterWithUsage, 'eldritch-cannon', {
      cannons: cannon ? [cannon] : [],
      maxCannons: 1,
      lastUpdated: new Date().toISOString()
    })
    
    console.log('🔧 Eldritch Cannon Save - Final usage:', finalUsage)
    
    onSave({ classFeatureSkillsUsage: finalUsage })
    onClose()
  }

  const handleCurrentHPChange = (value: string) => {
    if (!cannon) return
    const newHP = Math.max(0, Math.min(cannon.maxHitPoints, parseInt(value) || 0))
    setCannon({
      ...cannon,
      currentHitPoints: newHP
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <span>Eldritch Cannon</span>
            {cannon && (
              <Badge variant="outline" className="text-xs">
                {cannon.size} {cannon.type}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4 max-h-[50vh]">
          {!cannon ? (
            // Create new cannon
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Create a new Eldritch Cannon. You can have only one cannon at a time.
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cannon-size">Size</Label>
                  <Select value={size} onValueChange={(value: 'Small' | 'Tiny') => setSize(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Small">Small (occupies space)</SelectItem>
                      <SelectItem value="Tiny">Tiny (held in hand)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cannon-type">Type</Label>
                  <Select value={type} onValueChange={(value: 'Flamethrower' | 'Force Ballista' | 'Protector') => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Flamethrower">Flamethrower</SelectItem>
                      <SelectItem value="Force Ballista">Force Ballista</SelectItem>
                      <SelectItem value="Protector">Protector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Special Property</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {type === 'Flamethrower' && (
                    <div>
                      <strong>Flamethrower:</strong> The cannon exhales fire in an adjacent 15-foot cone that you designate. Each creature in that area must make a Dexterity saving throw against your spell save DC, taking 2d8 fire damage on a failed save or half as much damage on a successful one. The fire ignites any flammable objects in the area that aren't being worn or carried.
                    </div>
                  )}
                  {type === 'Force Ballista' && (
                    <div>
                      <strong>Force Ballista:</strong> Make a ranged spell attack, originating from the cannon, at one creature or object within 120 feet of it. On a hit, the target takes 2d8 force damage, and if the target is a creature, it is pushed up to 5 feet away from the cannon.
                    </div>
                  )}
                  {type === 'Protector' && (
                    <div>
                      <strong>Protector:</strong> The cannon emits a burst of positive energy that grants itself and each creature of your choice within 10 feet of it a number of temporary hit points equal to 1d8 + your Intelligence modifier (minimum of +1).
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleCreateCannon} className="w-full">
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Create Cannon
              </Button>
            </div>
          ) : (
            // Manage existing cannon
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{cannon.size} {cannon.type}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                      onClick={handleDismissCannon}
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      Dismiss
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cannon Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-hp">Current Hit Points</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="current-hp"
                          type="number"
                          min="0"
                          max={cannon.maxHitPoints}
                          value={cannon.currentHitPoints}
                          onChange={(e) => handleCurrentHPChange(e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">
                          / {cannon.maxHitPoints}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Armor Class</Label>
                      <div className="p-2 bg-muted rounded text-center font-mono text-lg">
                        {cannon.armorClass}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Attack Bonus</Label>
                      <div className="p-2 bg-muted rounded text-center font-mono text-lg">
                        +{cannon.attackBonus}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{cannon.type === 'Protector' ? 'Temp HP' : 'Damage'}</Label>
                      <div className="p-2 bg-muted rounded text-center font-mono text-lg">
                        {cannon.damage}
                      </div>
                    </div>
                  </div>

                  {/* Special Property */}
                  <div className="space-y-2">
                    <Label>Special Property</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {cannon.specialProperty}
                    </div>
                  </div>

                  {/* Cannon Properties */}
                  <div className="space-y-2">
                    <Label>Cannon Properties</Label>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>• AC: 18</div>
                      <div>• Hit Points: 5 × Artificer level ({cannon.maxHitPoints})</div>
                      <div>• Immunities: Poison damage, Psychic damage</div>
                      <div>• Ability Scores: All treated as 10 (+0) for checks and saves</div>
                      <div>• Mending spell restores 2d6 hit points</div>
                      <div>• Disappears if reduced to 0 hit points or after 1 hour</div>
                      <div>• Can be dismissed early as an action</div>
                      <div>• Bonus action to activate within 60 feet</div>
                      <div>• Can move 15 feet as part of activation (if it has legs)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
