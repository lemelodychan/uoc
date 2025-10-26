import type { CharacterData, SpellSlot, BardicInspirationSlot, SongOfRest } from "./character-data"
import { getSpellsKnown } from "./character-data"

export interface ClassData {
  id: string
  name: string
  subclass: string | null
  description: string | null
  hit_die: number
  primary_ability: string[]  // Array in database (e.g., ["Strength"], ["Intelligence", "Dexterity"])
  saving_throw_proficiencies: string[]
  skill_proficiencies: any | null
  equipment_proficiencies: any | null
  starting_equipment: any | null
  // Spell slots stored as arrays (one per character level 1-20)
  spell_slots_1: number[] | null
  spell_slots_2: number[] | null
  spell_slots_3: number[] | null
  spell_slots_4: number[] | null
  spell_slots_5: number[] | null
  spell_slots_6: number[] | null
  spell_slots_7: number[] | null
  spell_slots_8: number[] | null
  spell_slots_9: number[] | null
  cantrips_known: number[] | null
  spells_known: number[] | null
  // Column toggles for spell progression matrix
  showSpellsKnown?: boolean
  showSorceryPoints?: boolean
  showMartialArts?: boolean
  showKiPoints?: boolean
  showUnarmoredMovement?: boolean
  showRage?: boolean
  showRageDamage?: boolean
  // Special progression data
  sorcery_points?: number[] | null
  martial_arts_dice?: number[] | null
  ki_points?: number[] | null
  unarmored_movement?: number[] | null
  rage_uses?: number[] | null
  rage_damage?: number[] | null
  // New metadata fields for custom class support
  is_custom: boolean
  created_by: string | null
  duplicated_from: string | null
  source: string
  created_at: string
  updated_at: string
  subclass_selection_level: number // Level at which subclass must be selected (1 for Cleric/Warlock, 3 for most others)
  // Legacy fields kept for backward compatibility
  spell_progression?: Record<string, any>
  max_spell_slots?: Record<string, Record<string, number>>
  class_features?: Record<string, any>
  spellcasting_ability?: string
}

export interface SubclassData {
  id: string
  name: string
  class_id: string
  description: string | null
  // Legacy field kept for backward compatibility
  subclass_features?: Record<string, any>
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
  // For multiclassing, we might not have classData, so we assume it's for a Bard
  // The caller should ensure this is only called for Bard levels
  if (classData && classData.name.toLowerCase() !== "bard") {
    return null
  }

  // For Bards, Bardic Inspiration is available from level 1, so we don't need to check level features
  // Just check if it's a Bard and level >= 1
  if (level < 1) {
    return null
  }

  // Determine die type based on level
  let dieType = "d6"
  if (level >= 15) dieType = "d12"
  else if (level >= 10) dieType = "d10"
  else if (level >= 5) dieType = "d8"

  // Uses per rest is typically Charisma modifier
  const usesPerRest = Math.max(1, charismaModifier)

  return {
    dieType,
    usesPerRest,
    currentUses: usesPerRest,
  }
}

// Get song of rest data for bards
export function getSongOfRestData(level: number, classData?: ClassData): SongOfRest | null {
  // For multiclassing, we might not have classData, so we assume it's for a Bard
  // The caller should ensure this is only called for Bard levels
  if (classData && classData.name.toLowerCase() !== "bard") return null
  
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
export function getCantripsKnown(level: number, classData?: ClassData, className?: string, character?: any): number {
  // Handle multiclassing
  if (character?.classes && character.classes.length > 0) {
    return getMulticlassCantripsKnown(character)
  }

  // For Warlocks, use the Warlock-specific calculation
  if (className?.toLowerCase() === "warlock") {
    const { getWarlockCantripsKnown } = require('./character-data')
    return getWarlockCantripsKnown(level)
  }

  // Use the new cantrips_known array from class data
  if (classData?.cantrips_known && Array.isArray(classData.cantrips_known)) {
    const levelIndex = level - 1
    if (levelIndex >= 0 && levelIndex < classData.cantrips_known.length) {
      return classData.cantrips_known[levelIndex] || 0
    }
  }

  // Fallback to old spell_progression if new data not available
  if (classData?.spell_progression) {
    const levelData = classData.spell_progression[level.toString()]
    return levelData?.cantrips || 0
  }

  return 0
}

// Get cantrips known using class spell slots matrix (preferred method)
export async function getCantripsKnownFromClasses(level: number, classData?: ClassData, className?: string, character?: any): Promise<number> {
  // Handle multiclassing
  if (character?.classes && character.classes.length > 0) {
    return getMulticlassCantripsKnownFromClasses(character)
  }

  // For Warlocks, use the Warlock-specific calculation
  if (className?.toLowerCase() === "warlock") {
    const { getWarlockCantripsKnown } = require('./character-data')
    return getWarlockCantripsKnown(level)
  }

  // Use the new cantrips_known array from class data
  if (classData?.cantrips_known && Array.isArray(classData.cantrips_known)) {
    const levelIndex = level - 1
    if (levelIndex >= 0 && levelIndex < classData.cantrips_known.length) {
      return classData.cantrips_known[levelIndex] || 0
    }
  }

  // Fallback to old spell_progression if new data not available
  if (classData?.spell_progression) {
    const levelData = classData.spell_progression[level.toString()]
    return levelData?.cantrips || 0
  }

  return 0
}

// Calculate cantrips known for multiclassed characters
export function getMulticlassCantripsKnown(character: any): number {
  const { getSpellcastingClasses, getWarlockCantripsKnown } = require('./character-data')
  const spellcastingClasses = getSpellcastingClasses(character.classes)
  let totalCantripsKnown = 0
  
  for (const charClass of spellcastingClasses) {
    if (charClass.name.toLowerCase() === "warlock") {
      totalCantripsKnown += getWarlockCantripsKnown(charClass.level)
    } else {
      // For other spellcasting classes, use a simplified calculation
      // In practice, you'd want to load class data for each class
      const baseCantrips = Math.max(2, Math.floor(charClass.level / 4) + 2) // Rough approximation
      totalCantripsKnown += baseCantrips
    }
  }
  
  return totalCantripsKnown
}

// Calculate cantrips known for multiclassed characters using class spell slots matrix
export const getMulticlassCantripsKnownFromClasses = async (character: any): Promise<number> => {
  const { getMulticlassCantripsKnownFromClasses } = await import('./spell-slot-calculator')
  return getMulticlassCantripsKnownFromClasses(character)
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
      cantripsKnown: getCantripsKnown(character.level, classData, character.class),
      spellsKnown: getSpellsKnown(character, classData),
      spellSlots: calculatedSpellSlots, // Use new system
      bardicInspirationSlot: getBardicInspirationData(character.level, charismaModifier, classData),
      songOfRest: getSongOfRestData(character.level, classData),
    },
  }

  return updates
}
