"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { calculateModifier, calculateProficiencyBonus, calculateSavingThrowBonus, calculateSpellAttackBonus, calculateSkillBonus } from "@/lib/character-data"

interface DiceRollModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onUpdateHP: (newHP: number) => void
  canEdit?: boolean
}

type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100"
type RollType = "damage" | "weapon-atk" | "ranged-atk" | "spell" | "saving-throw" | "ability-check" | "initiative" | "healing" | "other"
type SavingThrowType = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"
type SkillType = "acrobatics" | "animal-handling" | "arcana" | "athletics" | "deception" | "history" | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception" | "performance" | "persuasion" | "religion" | "sleight-of-hand" | "stealth" | "survival" | "other"

const DICE_OPTIONS: { value: DiceType; label: string; max: number }[] = [
  { value: "d4", label: "d4", max: 4 },
  { value: "d6", label: "d6", max: 6 },
  { value: "d8", label: "d8", max: 8 },
  { value: "d10", label: "d10", max: 10 },
  { value: "d12", label: "d12", max: 12 },
  { value: "d20", label: "d20", max: 20 },
  { value: "d100", label: "d100", max: 100 },
]

const ROLL_TYPES: { value: RollType; label: string }[] = [
  { value: "damage", label: "Damage" },
  { value: "weapon-atk", label: "Weapon Attack" },
  { value: "ranged-atk", label: "Ranged Attack" },
  { value: "spell", label: "Spell" },
  { value: "saving-throw", label: "Saving Throw" },
  { value: "ability-check", label: "Ability Check" },
  { value: "initiative", label: "Initiative" },
  { value: "healing", label: "Healing" },
  { value: "other", label: "Other" },
]

const SAVING_THROW_OPTIONS: { value: SavingThrowType; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "dexterity", label: "Dexterity" },
  { value: "constitution", label: "Constitution" },
  { value: "intelligence", label: "Intelligence" },
  { value: "wisdom", label: "Wisdom" },
  { value: "charisma", label: "Charisma" },
]

const SKILL_OPTIONS: { value: SkillType; label: string; ability: string }[] = [
  { value: "acrobatics", label: "Acrobatics", ability: "dexterity" },
  { value: "animal-handling", label: "Animal Handling", ability: "wisdom" },
  { value: "arcana", label: "Arcana", ability: "intelligence" },
  { value: "athletics", label: "Athletics", ability: "strength" },
  { value: "deception", label: "Deception", ability: "charisma" },
  { value: "history", label: "History", ability: "intelligence" },
  { value: "insight", label: "Insight", ability: "wisdom" },
  { value: "intimidation", label: "Intimidation", ability: "charisma" },
  { value: "investigation", label: "Investigation", ability: "intelligence" },
  { value: "medicine", label: "Medicine", ability: "wisdom" },
  { value: "nature", label: "Nature", ability: "intelligence" },
  { value: "perception", label: "Perception", ability: "wisdom" },
  { value: "performance", label: "Performance", ability: "charisma" },
  { value: "persuasion", label: "Persuasion", ability: "charisma" },
  { value: "religion", label: "Religion", ability: "intelligence" },
  { value: "sleight-of-hand", label: "Sleight of Hand", ability: "dexterity" },
  { value: "stealth", label: "Stealth", ability: "dexterity" },
  { value: "survival", label: "Survival", ability: "wisdom" },
  { value: "other", label: "Other", ability: "varies" },
]

const getDiceIcon = (diceType: DiceType) => {
  switch (diceType) {
    case "d4": return <Icon icon="lucide:dice-1" className="w-4 h-4" />
    case "d6": return <Icon icon="lucide:dice-2" className="w-4 h-4" />
    case "d8": return <Icon icon="lucide:dice-3" className="w-4 h-4" />
    case "d10": return <Icon icon="lucide:dice-4" className="w-4 h-4" />
    case "d12": return <Icon icon="lucide:dice-5" className="w-4 h-4" />
    case "d20": return <Icon icon="lucide:dice-6" className="w-4 h-4" />
    case "d100": return <Icon icon="lucide:dice-6" className="w-4 h-4" />
    default: return <Icon icon="lucide:dice-6" className="w-4 h-4" />
  }
}

const calculateAutoModifier = (character: CharacterData, rollType: RollType, savingThrowType?: SavingThrowType, skillType?: SkillType): number => {
  const proficiencyBonus = character.proficiencyBonus ?? calculateProficiencyBonus(character.level)
  
  switch (rollType) {
    case "weapon-atk":
    case "ranged-atk":
      // For weapon attacks, we'd need to know which weapon, but we can provide a general STR/DEX modifier
      // Default to STR for melee, DEX for ranged (this is a simplification)
      return rollType === "ranged-atk" 
        ? calculateModifier(character.dexterity) + proficiencyBonus
        : calculateModifier(character.strength) + proficiencyBonus
    
    case "spell":
      // Use spell attack bonus if available, otherwise calculate it
      if (character.spellData?.spellAttackBonus) {
        return character.spellData.spellAttackBonus
      }
      // Fallback calculation (this would need class data for full accuracy)
      return calculateModifier(character.charisma) + proficiencyBonus
    
    case "saving-throw":
      // Use the specific saving throw type if provided
      if (savingThrowType) {
        return calculateSavingThrowBonus(character, savingThrowType, proficiencyBonus)
      }
      // Default to DEX if no specific type provided
      return calculateSavingThrowBonus(character, "dexterity", proficiencyBonus)
    
    case "ability-check":
      // Calculate skill check modifier
      if (skillType === "other") {
        return 0 // Will be set manually for "Other"
      }
      
      // Find the skill in character's skills
      const skill = character.skills?.find(s => {
        const skillOption = SKILL_OPTIONS.find(opt => opt.value === skillType)
        return skillOption && s.name === skillOption.label
      })
      
      if (skill) {
        // Use centralized skill bonus calculation (includes Jack of All Trades for Bards)
        return calculateSkillBonus(character, skill)
      }
      
      // Fallback to ability modifier if skill not found
      const skillOption = SKILL_OPTIONS.find(opt => opt.value === skillType)
      if (skillOption && skillOption.ability !== "varies") {
        return calculateModifier(character[skillOption.ability as keyof CharacterData] as number)
      }
      
      return 0
    
    case "initiative":
      return calculateModifier(character.dexterity)
    
    case "damage":
    case "healing":
    case "other":
    default:
      return 0
  }
}

export function DiceRollModal({ isOpen, onClose, character, onUpdateHP, canEdit = true }: DiceRollModalProps) {
  const [diceType, setDiceType] = useState<DiceType>("d20")
  const [numDice, setNumDice] = useState(1)
  const [rollType, setRollType] = useState<RollType>("other")
  const [savingThrowType, setSavingThrowType] = useState<SavingThrowType>("dexterity")
  const [skillType, setSkillType] = useState<SkillType>("acrobatics")
  const [modifier, setModifier] = useState(0)
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState<{
    rolls: number[]
    total: number
    modifier: number
    finalTotal: number
  } | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDiceType("d20")
      setNumDice(1)
      setRollType("other")
      setSavingThrowType("dexterity")
      setSkillType("acrobatics")
      setModifier(0)
      setResult(null)
    }
  }, [isOpen])

  // Auto-calculate modifier when roll type, saving throw type, or skill type changes
  useEffect(() => {
    if (isOpen && rollType !== "other" && !(rollType === "ability-check" && skillType === "other")) {
      const autoModifier = calculateAutoModifier(character, rollType, savingThrowType, skillType)
      setModifier(autoModifier)
    }
  }, [rollType, savingThrowType, skillType, character, isOpen])

  const rollDice = async () => {
    setIsRolling(true)
    
    // Simulate rolling animation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const diceConfig = DICE_OPTIONS.find(d => d.value === diceType)!
    const rolls: number[] = []
    
    for (let i = 0; i < numDice; i++) {
      rolls.push(Math.floor(Math.random() * diceConfig.max) + 1)
    }
    
    const total = rolls.reduce((sum, roll) => sum + roll, 0)
    const finalTotal = total + modifier
    
    setResult({
      rolls,
      total,
      modifier,
      finalTotal
    })
    setIsRolling(false)
  }

  const handleHPChange = (operation: 'add' | 'subtract') => {
    if (!result) return
    
    const hpChange = operation === 'add' ? result.finalTotal : -result.finalTotal
    const newHP = Math.max(0, character.currentHitPoints + hpChange)
    onUpdateHP(newHP)
    onClose()
  }

  const formatRolls = (rolls: number[]) => {
    if (rolls.length === 1) return rolls[0].toString()
    return `[${rolls.join(', ')}] = ${rolls.reduce((sum, roll) => sum + roll, 0)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {getDiceIcon(diceType)}
            Dice Roll
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
            {/* Results */}
            {result && (
            <div className="relative mb-4 border flex flex-col gap-1 align-center justify-center items-center p-4 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="text-sm absolute top-2 left-2">Results</Badge>
                <div className="flex flex-col gap-1 align-center justify-center items-center">
                  <span className="text-3xl font-bold text-primary">
                    {result.finalTotal}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatRolls(result.rolls)}
                    {result.modifier !== 0 && (
                      <span className={result.modifier > 0 ? "text-green-600" : "text-red-600"}>
                        {result.modifier > 0 ? ` + ${result.modifier}` : ` ${result.modifier}`}
                      </span>
                    )}
                  </span>
                </div>
                {/* HP Integration */}
                {(rollType === "damage" || rollType === "healing") && canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(rollType === "healing" ? "add" : "subtract")}
                      className="w-fit mt-2"
                    >
                      <Icon icon={rollType === "damage" ? "lucide:heart-crack" : "lucide:heart"} className="w-4 h-4" />
                      {rollType === "healing" ? "Add to current HP" : "Subtract from current HP"}
                    </Button>
                )}
            </div>
          )}

          {/* Dice Selection */}
          <div className="flex flex-row gap-4 w-full">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dice-type">Die Type</Label>
              <Select value={diceType} onValueChange={(value: DiceType) => setDiceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DICE_OPTIONS.map((dice) => (
                    <SelectItem key={dice.value} value={dice.value}>
                      <div className="flex items-center gap-2">
                        {getDiceIcon(dice.value)}
                        {dice.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="num-dice"># of Dice</Label>
              <Input
                id="num-dice"
                type="number"
                min={1}
                max={20}
                value={numDice}
                onChange={(e) => setNumDice(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlForspace-y-2="roll-type">Roll Type</Label>
              <Select value={rollType} onValueChange={(value: RollType) => setRollType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Roll Type and Saving Throw Selection */}
          {(rollType === "saving-throw" || rollType === "ability-check") && (
            <div className="flex flex-row gap-4 w-full">
              {rollType === "saving-throw" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saving-throw-type">Saving Throw</Label>
                  <Select value={savingThrowType} onValueChange={(value: SavingThrowType) => setSavingThrowType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAVING_THROW_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {rollType === "ability-check" && (
                <div className="space-y-2">
                  <Label htmlFor="skill-type">Skill</Label>
                  <Select value={skillType} onValueChange={(value: SkillType) => setSkillType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}            
            </div>
          )}

          {/* Modifier */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="modifier">
              Modifier
              {rollType !== "other" && !(rollType === "ability-check" && skillType === "other") && (
                <span className="text-xs text-muted-foreground ml-1">
                  (auto-calculated)
                </span>
              )}
            </Label>
            <Input
              id="modifier"
              type="number"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
              placeholder="0"
              className={rollType !== "other" && !(rollType === "ability-check" && skillType === "other") ? "bg-muted/50" : ""}
            />
            {rollType !== "other" && !(rollType === "ability-check" && skillType === "other") && (
              <p className="text-xs text-muted-foreground">
                {rollType === "saving-throw" 
                  ? `Based on your ${savingThrowType} modifier and proficiency. You can still modify manually.`
                  : rollType === "ability-check"
                  ? `Based on your skill proficiency and ability modifier. You can still modify manually.`
                  : "Based on your character's stats. You can still modify manually."
                }
              </p>
            )}
            {rollType === "ability-check" && skillType === "other" && (
              <p className="text-xs text-muted-foreground">
                Enter the modifier manually for this custom skill check
              </p>
            )}
          </div>

          {/* Roll Button */}
          <div className="flex justify-center">
            <Button 
              onClick={rollDice} 
              disabled={isRolling}
              className="min-w-[120px]"
            >
              {isRolling ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Rolling...
                </>
              ) : (
                <>
                  {getDiceIcon(diceType)}
                  <span>Roll Dice!</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
