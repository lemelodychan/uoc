import {
  createDefaultSkills,
  createClassBasedSkills,
  createClassBasedSavingThrowProficiencies,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  getSpellsKnown,
  getCleansingTouchData,
  calculateProficiencyBonus,
  type CharacterData,
  type Campaign,
} from "@/lib/character-data"
import {
  getCurrentUser,
  loadClassData,
  loadClassFeatures,
  saveCharacter,
  saveCharacterAsGuest,
} from "@/lib/database"

export type CharacterCreationData = {
  name: string
  class: string
  subclass: string
  classId: string
  level: number
  classes?: Array<{ name: string; subclass?: string; class_id?: string; level: number; selectedSkillProficiencies?: string[] }>
  background: string
  backgroundId?: string
  backgroundData?: {
    defining_events?: Array<{ number: number; text: string }>
    personality_traits?: Array<{ number: number; text: string }>
    ideals?: Array<{ number: number; text: string }>
    bonds?: Array<{ number: number; text: string }>
    flaws?: Array<{ number: number; text: string }>
  }
  race: string
  raceIds?: Array<{ id: string; isMain: boolean }>
  alignment: string
  isNPC?: boolean
  campaignId?: string
  selectedFeatures?: string[]
  abilityScores?: { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number }
  skills?: Array<{ name: string; ability: string; proficiency: "none" | "proficient" | "expertise" }>
  savingThrowProficiencies?: Array<{ ability: string; proficient: boolean }>
  maxHitPoints?: number
  currentHitPoints?: number
  speed?: number
  armorClass?: number
  initiative?: number
  features?: Array<{ name: string; description: string; usesPerLongRest?: number | string; currentUses?: number; refuelingDie?: string }>
  feats?: Array<{ name: string; description: string }>
  languages?: string
  imageUrl?: string
  toolsProficiencies?: Array<{ name: string; proficiency: "none" | "proficient" | "expertise" }>
  equipment?: string
  money?: { gold: number; silver: number; copper: number }
  equipmentProficiencies?: {
    lightArmor: boolean; mediumArmor: boolean; heavyArmor: boolean; shields: boolean
    simpleWeapons: boolean; martialWeapons: boolean; firearms: boolean; handCrossbows: boolean
    longswords: boolean; rapiers: boolean; shortswords: boolean; scimitars: boolean
    lightCrossbows: boolean; darts: boolean; slings: boolean; quarterstaffs: boolean
  }
}

const HIT_DIE_BY_CLASS: Record<string, number> = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  artificer: 8, bard: 8, cleric: 8, druid: 8, monk: 8,
  rogue: 8, warlock: 8, wizard: 6, sorcerer: 6,
}

/**
 * Builds and saves a new CharacterData from CharacterCreationModal form output.
 * Returns the saved character (with real DB id) or throws on error.
 */
export async function createCharacter(
  formData: CharacterCreationData,
  context: {
    existingCharacterCount: number
    isGuest: boolean
    currentCampaign?: Campaign | null
  }
): Promise<{ character: CharacterData; error?: never } | { character?: never; error: string }> {
  const tempId = (context.existingCharacterCount + 1).toString()

  const { user, error: userError } = await getCurrentUser()
  if (userError && !context.isGuest) {
    return { error: `Failed to get user information: ${userError}` }
  }

  const ownerId = formData.isNPC && context.currentCampaign?.dungeonMasterId
    ? context.currentCampaign.dungeonMasterId
    : user?.id

  const classesToUse = formData.classes && formData.classes.length > 0
    ? formData.classes
    : [{ name: formData.class, subclass: formData.subclass, class_id: formData.classId, level: formData.level }]

  const { classData } = await loadClassData(formData.class, formData.subclass)
  const proficiencyBonus = calculateProficiencyBonus(formData.level)

  // Load class features
  let classFeatures: Array<{ name: string; description: string; source: string; level: number }> = []
  if (formData.selectedFeatures && formData.selectedFeatures.length > 0) {
    for (const charClass of classesToUse) {
      if (charClass.class_id) {
        const { features, error: featuresError } = await loadClassFeatures(charClass.class_id, charClass.level, charClass.subclass, true)
        if (!featuresError && features) {
          classFeatures.push(
            ...features
              .filter(f => formData.selectedFeatures!.includes(f.id))
              .map(f => ({ name: f.name || f.title || "", description: f.description || "", source: f.source || charClass.name, level: f.level || 1 }))
          )
        }
      }
    }
  } else if (classData?.id) {
    const { features } = await loadClassFeatures(classData.id, formData.level, formData.subclass)
    classFeatures = features || []
  }

  const abilityScores = formData.abilityScores || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }
  const skills = formData.skills || (classData?.skill_proficiencies ? createClassBasedSkills(classData.skill_proficiencies) as any : createDefaultSkills())
  const savingThrowProficiencies = formData.savingThrowProficiencies?.map(st => ({
    ability: st.ability as "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma",
    proficient: st.proficient,
  })) ?? createClassBasedSavingThrowProficiencies(formData.class)

  const totalHitDice = classesToUse.reduce((sum, c) => sum + c.level, 0)

  const tempCharacter: CharacterData = {
    id: tempId,
    name: formData.name,
    class: formData.class,
    subclass: formData.subclass,
    class_id: formData.classId,
    level: formData.level,
    classes: classesToUse,
    background: formData.background,
    backgroundId: formData.backgroundId,
    backgroundData: formData.backgroundData,
    race: formData.raceIds && formData.raceIds.length > 0
      ? (formData.raceIds.find(r => r.isMain)?.id || formData.raceIds[0]?.id || formData.race)
      : formData.race,
    raceIds: formData.raceIds,
    alignment: formData.alignment,
    userId: ownerId,
    visibility: formData.isNPC ? "private" : "public",
    isNPC: formData.isNPC || false,
    campaignId: formData.campaignId || undefined,
    strength: abilityScores.strength,
    dexterity: abilityScores.dexterity,
    constitution: abilityScores.constitution,
    intelligence: abilityScores.intelligence,
    wisdom: abilityScores.wisdom,
    charisma: abilityScores.charisma,
    armorClass: formData.armorClass || 10,
    initiative: formData.initiative || 0,
    speed: formData.speed || 30,
    currentHitPoints: formData.currentHitPoints || 8,
    maxHitPoints: formData.maxHitPoints || 8,
    exhaustion: 0,
    hitDice: { total: totalHitDice, used: 0, dieType: classData?.hit_die ? `d${classData.hit_die}` : "d8" },
    hitDiceByClass: classesToUse.map(c => ({
      className: c.name,
      dieType: `d${HIT_DIE_BY_CLASS[c.name.toLowerCase()] || 8}`,
      total: c.level,
      used: 0,
    })),
    weapons: [],
    weaponNotes: "",
    features: formData.features || [],
    savingThrowProficiencies: savingThrowProficiencies as any,
    skills,
    spellData: {
      spellAttackBonus: 0,
      spellSaveDC: 8,
      cantripsKnown: 0,
      spellsKnown: 0,
      spellSlots: [],
      spellNotes: "",
      featSpellSlots: [],
      spells: [],
    },
    classFeatures: classFeatures.map(f => ({
      id: `feature-${Date.now()}-${Math.random()}`,
      class_id: formData.classId,
      level: f.level,
      title: f.name,
      description: f.description,
      feature_type: "class_feature",
      name: f.name,
      source: f.source,
      className: formData.class,
    })),
    toolsProficiencies: formData.toolsProficiencies || [],
    feats: formData.feats || [],
    equipment: formData.equipment || "",
    magicItems: [],
    languages: formData.languages || "",
    otherTools: "",
    money: formData.money || { gold: 0, silver: 0, copper: 0 },
    equipmentProficiencies: {
      lightArmor: false, mediumArmor: false, heavyArmor: false, shields: false,
      simpleWeapons: false, martialWeapons: false, firearms: false,
      handCrossbows: false, longswords: false, rapiers: false, shortswords: false,
      scimitars: false, lightCrossbows: false, longbows: false, shortbows: false,
      darts: false, slings: false, quarterstaffs: false,
      warhammers: false, battleaxes: false, handaxes: false, lightHammers: false,
      ...(formData.equipmentProficiencies || {}),
    } as any,
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    notes: "",
    spellSlotsUsed: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  }

  // Calculate spell slots
  let calculatedSpellSlots: any[] = []
  if (classData) {
    if (formData.class.toLowerCase() === "warlock") {
      const { getWarlockSpellSlots } = await import("@/lib/character-data")
      calculatedSpellSlots = getWarlockSpellSlots(formData.level)
    } else {
      const { calculateSpellSlotsFromClass } = await import("@/lib/spell-slot-calculator")
      calculatedSpellSlots = calculateSpellSlotsFromClass(classData, formData.level).map((s: any) => ({ ...s, used: 0 }))
    }
  }

  let warlockExtras = {}
  if (tempCharacter.class.toLowerCase() === "warlock" && tempCharacter.subclass?.toLowerCase() === "the raven queen") {
    const cd = await import("@/lib/character-data")
    warlockExtras = {
      sentinelRaven: cd.createSentinelRaven(),
      soulOfTheRaven: cd.createSoulOfTheRaven(tempCharacter.level),
      ravensShield: cd.createRavensShield(tempCharacter.level),
      queensRightHand: cd.createQueensRightHand(tempCharacter.level),
    }
  }

  const newCharacter: CharacterData = {
    ...tempCharacter,
    spellData: {
      ...tempCharacter.spellData,
      spellAttackBonus: calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
      spellSaveDC: calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
      cantripsKnown: formData.class.toLowerCase() === "warlock"
        ? ((await import("@/lib/character-data")).getWarlockCantripsKnown(formData.level))
        : 0,
      spellsKnown: formData.class.toLowerCase() === "warlock"
        ? ((await import("@/lib/character-data")).getWarlockSpellsKnown(formData.level))
        : getSpellsKnown(tempCharacter, classData, undefined),
      spellSlots: calculatedSpellSlots,
      cleansingTouchSlot: getCleansingTouchData(tempCharacter),
      ...warlockExtras,
    },
  }

  // Save to database
  const { success, error, characterId } = context.isGuest && formData.campaignId
    ? await saveCharacterAsGuest(newCharacter, formData.campaignId)
    : await saveCharacter(newCharacter)

  if (!success || error) {
    return { error: error || "Failed to save character" }
  }

  const finalId = characterId || tempId
  return { character: { ...newCharacter, id: finalId } }
}
