import type { CharacterData, SpellSlot, BardicInspirationSlot, SongOfRest } from "./character-data"

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
  if (classData?.name.toLowerCase() !== "bard") return null

  const levelFeatures = classData.class_features[level.toString()]
  if (!levelFeatures?.bardic_inspiration) return null

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
  if (classData?.name.toLowerCase() !== "bard") return null
  if (level < 2) return null // Song of Rest starts at level 2

  return {
    healingDie: "d6",
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
export function getSpellsKnown(level: number, classData?: ClassData): number {
  if (!classData?.spell_progression) return 0

  const levelData = classData.spell_progression[level.toString()]
  return levelData?.spells_known || 0
}

// Update character with class-based calculations
export function updateCharacterWithClassData(
  character: CharacterData,
  classData?: ClassData,
  subclassData?: SubclassData,
): Partial<CharacterData> {
  const proficiencyBonus = calculateProficiencyBonus(character.level)
  const charismaModifier = getAbilityModifier(character, "charisma")

  const updates: Partial<CharacterData> = {
    spellData: {
      ...character.spellData,
      spellAttackBonus: calculateSpellAttackBonus(character, classData, proficiencyBonus),
      spellSaveDC: calculateSpellSaveDC(character, classData, proficiencyBonus),
      cantripsKnown: getCantripsKnown(character.level, classData),
      spellsKnown: getSpellsKnown(character.level, classData),
      spellSlots: getMaxSpellSlots(character.level, classData),
      bardicInspirationSlot: getBardicInspirationData(character.level, charismaModifier, classData),
      songOfRest: getSongOfRestData(character.level, classData),
    },
  }

  return updates
}
