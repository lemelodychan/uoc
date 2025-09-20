import type { CharacterData, SpellSlot, BardicInspirationSlot, SongOfRest } from "./character-data"
import { getSpellsKnown } from "./character-data"

export interface ClassData {
  id: string
  name: string
  hit_die: number
  primary_ability: string
  saving_throw_proficiencies: string[]
  spell_progression: Record<string, any>
  max_spell_slots: Record<string, Record<string, number>>
  class_features: Record<string, any>
  spellcasting_ability?: string
}

export interface SubclassData {
  id: string
  class_id: string
  name: string
  description: string
  subclass_features: Record<string, any>
}

// Calculate spell attack bonus based on class and ability scores
export function calculateSpellAttackBonus(
  character: CharacterData,
  classData?: ClassData,
  proficiencyBonus = 2,
): number {
  if (!classData?.spellcasting_ability) return 0

  const abilityModifier = getAbilityModifier(character, classData.spellcasting_ability)
  return abilityModifier + proficiencyBonus
}

// Calculate spell save DC based on class and ability scores
export function calculateSpellSaveDC(character: CharacterData, classData?: ClassData, proficiencyBonus = 2): number {
  if (!classData?.spellcasting_ability) return 8

  const abilityModifier = getAbilityModifier(character, classData.spellcasting_ability)
  return 8 + abilityModifier + proficiencyBonus
}

// Get ability modifier from character data
function getAbilityModifier(character: CharacterData, ability: string): number {
  const abilityScore = getAbilityScore(character, ability)
  return Math.floor((abilityScore - 10) / 2)
}

// Get ability score from character data
function getAbilityScore(character: CharacterData, ability: string): number {
  switch (ability.toLowerCase()) {
    case "strength":
      return character.strength
    case "dexterity":
      return character.dexterity
    case "constitution":
      return character.constitution
    case "intelligence":
      return character.intelligence
    case "wisdom":
      return character.wisdom
    case "charisma":
      return character.charisma
    default:
      return 10
  }
}

// Calculate proficiency bonus based on level
export function calculateProficiencyBonus(level: number): number {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

// Get max spell slots for a character based on class and level
// DEPRECATED: Use calculateSpellSlotsFromClass from spell-slot-calculator.ts instead
export function getMaxSpellSlots(level: number, classData?: ClassData): SpellSlot[] {
  console.warn("[v0] getMaxSpellSlots is deprecated. Use calculateSpellSlotsFromClass instead.")
  if (!classData?.max_spell_slots) return []

  const levelData = classData.max_spell_slots[level.toString()]
  if (!levelData) return []

  return Object.entries(levelData).map(([spellLevel, maxSlots]) => ({
    level: Number.parseInt(spellLevel),
    total: maxSlots,
    used: 0,
  }))
}

// Get bardic inspiration data for bards
export function getBardicInspirationData(
  level: number,
  charismaModifier: number,
  classData?: ClassData,
): BardicInspirationSlot | null {
  console.log("[DEBUG] getBardicInspirationData called:", {
    level,
    charismaModifier,
    className: classData?.name,
    classFeatures: classData?.class_features
  })

  if (classData?.name.toLowerCase() !== "bard") {
    console.log("[DEBUG] Not a Bard class, returning null")
    return null
  }

  // For Bards, Bardic Inspiration is available from level 1, so we don't need to check level features
  // Just check if it's a Bard and level >= 1
  if (level < 1) {
    console.log("[DEBUG] Level too low for Bardic Inspiration, returning null")
    return null
  }

  // Determine die type based on level
  let dieType = "d6"
  if (level >= 15) dieType = "d12"
  else if (level >= 10) dieType = "d10"
  else if (level >= 5) dieType = "d8"

  // Uses per rest is typically Charisma modifier
  const usesPerRest = Math.max(1, charismaModifier)

  const result = {
    dieType,
    usesPerRest,
    currentUses: usesPerRest,
  }

  console.log("[DEBUG] getBardicInspirationData returning:", result)
  return result
}

// Get song of rest data for bards
export function getSongOfRestData(level: number, classData?: ClassData): SongOfRest | null {
  // Multiple safeguards to ensure only Bard classes get Song of Rest
  if (!classData) return null
  
  // Primary check: class name must be "bard"
  if (classData.name.toLowerCase() !== "bard") return null
  
  // Song of Rest starts at level 2
  if (level < 2) return null

  // Determine healing die based on level
  let healingDie = "d6"
  if (level >= 17) healingDie = "d12"
  else if (level >= 13) healingDie = "d10"
  else if (level >= 9) healingDie = "d8"

  return {
    healingDie,
    available: true,
  }
}

// Get cantrips known based on class and level
export function getCantripsKnown(level: number, classData?: ClassData): number {
  if (!classData?.spell_progression) return 0

  const levelData = classData.spell_progression[level.toString()]
  return levelData?.cantrips || 0
}

// Get spells known based on class and level
// getSpellsKnown function moved to character-data.ts for consistency

// Update character with class-based calculations
export async function updateCharacterWithClassData(
  character: CharacterData,
  classData?: ClassData,
  subclassData?: SubclassData,
): Promise<Partial<CharacterData>> {
  const proficiencyBonus = calculateProficiencyBonus(character.level)
  const charismaModifier = getAbilityModifier(character, "charisma")

  // Use the new spell slot calculation system for consistency
  let calculatedSpellSlots: any[] = []
  if (classData) {
    const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
    calculatedSpellSlots = calculateSpellSlotsFromClass(classData as any, character.level)
  }

  const updates: Partial<CharacterData> = {
    spellData: {
      ...character.spellData,
      spellAttackBonus: calculateSpellAttackBonus(character, classData, proficiencyBonus),
      spellSaveDC: calculateSpellSaveDC(character, classData, proficiencyBonus),
      cantripsKnown: getCantripsKnown(character.level, classData),
      spellsKnown: getSpellsKnown(character, classData),
      spellSlots: calculatedSpellSlots, // Use new system
      bardicInspirationSlot: getBardicInspirationData(character.level, charismaModifier, classData),
      songOfRest: getSongOfRestData(character.level, classData),
    },
  }

  return updates
}
