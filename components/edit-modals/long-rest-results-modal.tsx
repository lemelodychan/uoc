import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@iconify/react"

interface LongRestResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: {
    characterId: string;
    characterName: string;
    hpRestored: number;
    exhaustionReduced: number;
    magicItemReplenishments: {
      itemName: string;
      chargesReplenished: number;
      diceRoll?: number;
      maxCharges: number;
    }[];
    featureReplenishments: {
      featureName: string;
      usesReplenished: number;
      diceRoll?: number;
      maxUses: number;
    }[];
    spellSlotReplenishments: {
      level: number;
      slotsRestored: number;
    }[];
    classAbilityReplenishments: {
      abilityName: string;
      usesRestored: number;
      maxUses: number;
    }[];
    featSpellReplenishments: {
      featName: string;
      usesRestored: number;
      maxUses: number;
    }[];
    hitDiceReplenishments: {
      diceRestored: number;
      maxDice: number;
      dieType: string;
    };
  }[] | null
}

const getDiceIcon = (diceSize: number) => {
  switch (diceSize) {
    case 1: return Dice1
    case 2: return Dice2
    case 3: return Dice3
    case 4: return Dice4
    case 5: return Dice5
    case 6: return Dice6
    default: return Dice1
  }
}

export const LongRestResultsModal = ({ isOpen, onClose, results }: LongRestResultsModalProps) => {
  if (!results || results.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Long Rest Results</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 max-h-[50vh]">
            <p className="text-muted-foreground">No results to display.</p>
          </div>
          <DialogFooter className="p-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:heart" className="w-5 h-5 text-red-500 dark:text-red-400" />
            Long Rest Results
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4 max-h-[50vh]">
          {results.map((result) => (
            <Card key={result.characterId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{result.characterName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Hit Points Restored */}
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border">
                  <Icon icon="lucide:heart" className="w-5 h-5 text-red-500 dark:text-red-400" />
                  <div className="flex-1">
                    <div className="font-medium">Hit Points Restored</div>
                    <div className="text-sm text-muted-foreground">
                      {result.hpRestored > 0 ? `Restored ${result.hpRestored} hit points` : "Already at full health"}
                    </div>
                  </div>
                  {result.hpRestored > 0 && (
                    <Badge variant="destructive" className="text-sm">
                      +{result.hpRestored} HP
                    </Badge>
                  )}
                </div>

                {/* Exhaustion Reduction */}
                {result.exhaustionReduced > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border">
                    <Icon icon="lucide:skull" className="w-5 h-5 text-red-500 dark:text-red-400" />
                    <div className="flex-1">
                      <div className="font-medium">Exhaustion Reduced</div>
                      <div className="text-sm text-muted-foreground">
                        Exhaustion level reduced by {result.exhaustionReduced}
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-sm">
                      -{result.exhaustionReduced}
                    </Badge>
                  </div>
                )}

                {/* Magic Item Replenishments */}
                {result.magicItemReplenishments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:sparkles" className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      Magic Item Charges Replenished
                    </div>
                    {result.magicItemReplenishments.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-muted-foreground">
                            Replenished {item.chargesReplenished} charge{item.chargesReplenished !== 1 ? 's' : ''}
                            {item.diceRoll && ` (rolled ${item.diceRoll})`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.diceRoll && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const DiceIcon = getDiceIcon(6) // Default to d6 for display
                                return <DiceIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              })()}
                              <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                                {item.diceRoll}
                              </span>
                            </div>
                          )}
                          <Badge variant="secondary" className="text-sm">
                            {item.chargesReplenished}/{item.maxCharges}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No magic item replenishments */}
                {result.magicItemReplenishments.length === 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border text-center">
                    <div className="text-sm text-muted-foreground">
                      No magic items with daily recharge were found
                    </div>
                  </div>
                )}

                {/* Feature Replenishments */}
                {result.featureReplenishments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:star" className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      Feature Uses Replenished
                    </div>
                    {result.featureReplenishments.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{feature.featureName}</div>
                          <div className="text-sm text-muted-foreground">
                            Replenished {feature.usesReplenished} use{feature.usesReplenished !== 1 ? 's' : ''}
                            {feature.diceRoll && ` (rolled ${feature.diceRoll})`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.diceRoll && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const DiceIcon = getDiceIcon(6) // Default to d6 for display
                                return <DiceIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              })()}
                              <span className="text-sm font-mono font-bold text-yellow-600 dark:text-yellow-400">
                                {feature.diceRoll}
                              </span>
                            </div>
                          )}
                          <Badge variant="secondary" className="text-sm">
                            {feature.usesReplenished}/{feature.maxUses}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No feature replenishments */}
                {result.featureReplenishments.length === 0 && result.magicItemReplenishments.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border text-center">
                    <div className="text-sm text-muted-foreground">
                      No features with refueling dice were found
                    </div>
                  </div>
                )}

                {/* Spell Slots Replenished */}
                {result.spellSlotReplenishments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:book-open" className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Spell Slots Restored
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {result.spellSlotReplenishments.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                          <div className="flex-1">
                            <div className="font-medium">Level {slot.level} Spells</div>
                            <div className="text-sm text-muted-foreground">
                              Restored {slot.slotsRestored} slot{slot.slotsRestored !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            +{slot.slotsRestored}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Abilities Replenished */}
                {result.classAbilityReplenishments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:zap" className="w-4 h-4 text-green-500 dark:text-green-400" />
                      Class Abilities Restored
                    </div>
                    {result.classAbilityReplenishments.map((ability, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{ability.abilityName}</div>
                          <div className="text-sm text-muted-foreground">
                            Restored {ability.usesRestored} use{ability.usesRestored !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {ability.usesRestored}/{ability.maxUses}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feat Spells Replenished */}
                {result.featSpellReplenishments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:award" className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      Feat Spells Restored
                    </div>
                    {result.featSpellReplenishments.map((feat, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium">{feat.featName}</div>
                          <div className="text-sm text-muted-foreground">
                            Restored {feat.usesRestored} use{feat.usesRestored !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {feat.usesRestored}/{feat.maxUses}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hit Dice Replenished */}
                {result.hitDiceReplenishments.diceRestored > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Icon icon="lucide:dice-1" className="w-4 h-4 text-indigo-500" />
                      Hit Dice Restored
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium">Hit Dice</div>
                        <div className="text-sm text-muted-foreground">
                          Restored {result.hitDiceReplenishments.diceRestored} {result.hitDiceReplenishments.dieType} die{result.hitDiceReplenishments.diceRestored !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {result.hitDiceReplenishments.diceRestored}/{result.hitDiceReplenishments.maxDice}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
