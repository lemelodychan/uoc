export interface CharacterClass {
  name: string
  subclass?: string
  class_id?: string
  level: number
}

export interface Campaign {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  characters: string[] // Array of character IDs
  isActive?: boolean // Whether this is the currently active campaign
}

export interface CharacterData {
  
  id: string
  name: string
  // Legacy single class support (for backward compatibility)
  class: string
  subclass?: string
  class_id?: string
  level: number
  // New multiclassing support
  classes: CharacterClass[]
  background: string
  race: string
  alignment: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  armorClass: number
  initiative: number
  speed: number
  currentHitPoints: number
  maxHitPoints: number
  temporaryHitPoints?: number
  exhaustion?: number
  hitDice?: {
    total: number
    used: number
    dieType: string
  }
  // Multiclassing hit dice support
  hitDiceByClass?: Array<{
    className: string
    dieType: string
    total: number
    used: number
  }>
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
  notes?: string
  // Character portrait URL
  imageUrl?: string
  proficiencyBonus?: number
  savingThrowProficiencies: SavingThrowProficiency[]
  skills: Skill[]
  weapons: Array<{
    name: string
    attackBonus: string
    damageType: string
    weaponProperties?: string[]
  }>
  weaponNotes: string
  features: Array<{
    name: string
    description: string
    // Optional usage tracking per long rest (number or ability modifier string)
    usesPerLongRest?: number | string
    currentUses?: number
    // Optional refueling die (e.g., "1d6")
    refuelingDie?: string
  }>
  spellData: SpellData
  classFeatures: Array<{
    name: string
    description: string
    source: string
    level: number
    className?: string
  }>
  toolsProficiencies: ToolProficiency[]
  equipment: string
  magicItems: Array<{
    name: string
    description: string
    maxUses?: number
    dailyRecharge?: string
    currentUses?: number
  }>
  languages: string
  otherTools?: string
  // Money/currency tracking
  money?: {
    gold: number
    silver: number
    copper: number
  }
  // Equipment proficiencies (armor/weapons) tracked via checkboxes in UI
  equipmentProficiencies?: EquipmentProficiencies
  // Per-feature custom rich-text notes appended to class feature modals (keyed by feature name)
  featureNotes?: Record<string, { content: string; imageUrl?: string }>
  // Active Eldritch Cannon for Artificer Artillerist
  eldritchCannon?: EldritchCannon
  feats: Array<{
    name: string
    description: string
  }>
  infusions: Infusion[]
  infusionNotes: string
  // Temporary field to store bardic inspiration used count from database
  bardicInspirationUsed?: number
  // Temporary field to store used spell slot counts from database
  spellSlotsUsed?: {
    1: number
    2: number
    3: number
    4: number
    5: number
    6: number
    7: number
    8: number
    9: number
  }
  // Party status: 'active', 'away', or 'deceased'
  partyStatus?: 'active' | 'away' | 'deceased'
  // Campaign association
  campaignId?: string
}

export type ProficiencyLevel = "none" | "proficient" | "expertise"

export interface Skill {
  name: string
  ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"
  proficiency: ProficiencyLevel
}

export interface SavingThrowProficiency {
  ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"
  proficient: boolean
  source?: string
}

export interface ToolProficiency {
  name: string
  proficiency: ProficiencyLevel
  manualModifier?: number
}

export interface EquipmentProficiencies {
  lightArmor: boolean
  mediumArmor: boolean
  heavyArmor: boolean
  shields: boolean
  simpleWeapons: boolean
  martialWeapons: boolean
  firearms: boolean
  handCrossbows: boolean
  longswords: boolean
  rapiers: boolean
  shortswords: boolean
  scimitars: boolean
  lightCrossbows: boolean
  darts: boolean
  slings: boolean
  quarterstaffs: boolean
}

export interface EldritchCannon {
  size: 'Small' | 'Tiny'
  type: 'Flamethrower' | 'Force Ballista' | 'Protector'
  currentHitPoints: number
  maxHitPoints: number
  armorClass: number
  attackBonus: number
  damage: string
  specialProperty: string
}

export interface SpellSlot {
  level: number
  total: number
  used: number
}

export interface BardicInspiration {
  dieType: string // "d6", "d8", "d10", "d12"
  usesPerRest: number
  currentUses: number
}

export interface BardicInspirationSlot {
  dieType: string // "d6", "d8", "d10", "d12"
  usesPerRest: number
  currentUses: number
}

export interface SongOfRest {
  healingDie: string // "d6", "d8", "d10", "d12"
  available: boolean
}

export interface FlashOfGeniusSlot {
  usesPerRest: number
  currentUses: number
  replenishesOnLongRest: boolean // Always true for Flash of Genius
  // Future automation: When long rest is triggered, if replenishesOnLongRest is true,
  // set currentUses = usesPerRest to restore all uses
}

export interface FeatSpellSlot {
  spellName: string // e.g., "Misty Step", "Bless"
  featName: string // e.g., "Fey Touched", "Magic Initiate"
  usesPerLongRest: number
  currentUses: number
}

export interface Infusion {
  title: string
  description: string
  needsAttunement: boolean
}

export interface SpellComponents {
  v?: boolean
  s?: boolean
  m?: boolean
  material?: string
}

export interface Spell {
  name: string
  level: number
  school: string
  // Detailed 5e fields (all optional for backward compatibility)
  castingTime?: string
  range?: string
  duration?: string
  components?: SpellComponents
  saveThrow?: string
  damage?: string
  tag?: string
  description?: string
  higherLevel?: string
  // Prepared flag remains
  isPrepared: boolean
}

export interface SpellData {
  spellAttackBonus: number
  spellSaveDC: number
  cantripsKnown: number
  spellsKnown: number
  spellSlots: SpellSlot[]
  featSpellSlots: FeatSpellSlot[]
  bardicInspirationSlot?: BardicInspirationSlot
  songOfRest?: SongOfRest
  flashOfGeniusSlot?: FlashOfGeniusSlot
  // Paladin-specific features
  divineSenseSlot?: {
    usesPerRest: number
    currentUses: number
    replenishesOnLongRest: boolean
  }
  layOnHands?: {
    totalHitPoints: number
    currentHitPoints: number
    replenishesOnLongRest: boolean
  }
  channelDivinitySlot?: {
    usesPerRest: number
    currentUses: number
    replenishesOnLongRest: boolean
  }
  cleansingTouchSlot?: {
    usesPerRest: number
    currentUses: number
    replenishesOnLongRest: boolean
  }
  // Warlock-specific features
  eldritchInvocations?: EldritchInvocation[]
  mysticArcanum?: MysticArcanum[]
  genieWrath?: {
    damageType: 'bludgeoning' | 'cold' | 'fire' | 'thunder'
    usesPerTurn: number
    currentUses: number
  }
  elementalGift?: {
    flyingSpeed: number
    usesPerLongRest: number
    currentUses: number
  }
  sanctuaryVessel?: {
    vesselType: string
    hoursRemaining: number
    maxHours: number
  }
  limitedWish?: {
    usesPerLongRest: number
    currentUses: number
    longRestCooldown: number
  }
  // Raven Queen Warlock features
  sentinelRaven?: {
    isActive: boolean
    isPerched: boolean
    currentHP: number
    maxHP: number
    lastCalled: string
  }
  soulOfTheRaven?: {
    isMerged: boolean
    usesPerLongRest: number
    currentUses: number
  }
  ravensShield?: {
    hasAdvantageOnDeathSaves: boolean
    isImmuneToFrightened: boolean
    hasNecroticResistance: boolean
  }
  queensRightHand?: {
    usesPerLongRest: number
    currentUses: number
  }
  spellNotes: string
  spells: Spell[]
}

export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2)
}

export const calculateProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

export const calculateSkillBonus = (character: CharacterData, skill: Skill): number => {
  const abilityScore = character[skill.ability]
  const abilityModifier = calculateModifier(abilityScore)
  const proficiencyBonus = character.proficiencyBonus ?? calculateProficiencyBonus(character.level)

  switch (skill.proficiency) {
    case "proficient":
      return abilityModifier + proficiencyBonus
    case "expertise":
      return abilityModifier + proficiencyBonus * 2
    default:
      return abilityModifier
  }
}

export const calculateToolBonus = (character: CharacterData, tool: ToolProficiency): number => {
  const proficiencyBonus = character.proficiencyBonus ?? calculateProficiencyBonus(character.level)
  const isArtificer = character.class.toLowerCase() === "artificer"
  const hasToolExpertise = isArtificer && character.level >= 6

  // If a manual modifier is set, treat it as the base proficiency-derived bonus and
  // apply Artificer Tool Expertise doubling when applicable.
  if (tool.manualModifier !== undefined) {
    const base = tool.manualModifier
    return hasToolExpertise && base > 0 ? base * 2 : base
  }

  // Determine base multiplier from tool proficiency setting
  let multiplier = 0
  switch (tool.proficiency) {
    case "proficient":
      multiplier = 1
      break
    case "expertise":
      multiplier = 2
      break
    default:
      multiplier = 0
  }

  // Artificer Tool Expertise (level 6+): double tool proficiency
  if (hasToolExpertise && multiplier > 0) {
    multiplier = Math.min(2, multiplier * 2)
  }

  return multiplier * proficiencyBonus
}

export const defaultSkills: Omit<Skill, "proficiency">[] = [
  { name: "Acrobatics", ability: "dexterity" },
  { name: "Animal Handling", ability: "wisdom" },
  { name: "Arcana", ability: "intelligence" },
  { name: "Athletics", ability: "strength" },
  { name: "Deception", ability: "charisma" },
  { name: "History", ability: "intelligence" },
  { name: "Insight", ability: "wisdom" },
  { name: "Intimidation", ability: "charisma" },
  { name: "Investigation", ability: "intelligence" },
  { name: "Medicine", ability: "wisdom" },
  { name: "Nature", ability: "intelligence" },
  { name: "Perception", ability: "wisdom" },
  { name: "Performance", ability: "charisma" },
  { name: "Persuasion", ability: "charisma" },
  { name: "Religion", ability: "intelligence" },
  { name: "Sleight of Hand", ability: "dexterity" },
  { name: "Stealth", ability: "dexterity" },
  { name: "Survival", ability: "wisdom" },
]

export const createDefaultSkills = (): Skill[] => {
  return defaultSkills.map(skill => ({
    ...skill,
    proficiency: "none" as ProficiencyLevel
  }))
}

export const createClassBasedSkills = (classSkillProficiencies: string[] = []): Skill[] => {
  const defaultSkillsList = createDefaultSkills()
  
  return defaultSkillsList.map(skill => ({
    ...skill,
    proficiency: classSkillProficiencies.includes(skill.name) ? "proficient" as ProficiencyLevel : "none" as ProficiencyLevel
  }))
}

export const createDefaultSavingThrowProficiencies = (): SavingThrowProficiency[] => {
  const abilities: Array<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"> = [
    "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"
  ]
  
  return abilities.map(ability => ({
    ability,
    proficient: false
  }))
}

export const createClassBasedSavingThrowProficiencies = (className: string): SavingThrowProficiency[] => {
  const defaultProficiencies = createDefaultSavingThrowProficiencies()
  
  // Define class-based saving throw proficiencies
  const classSavingThrows: Record<string, string[]> = {
    "Bard": ["dexterity", "charisma"],
    "Artificer": ["constitution", "intelligence"],
    "Wizard": ["intelligence", "wisdom"],
    "Fighter": ["strength", "constitution"],
    "Rogue": ["dexterity", "intelligence"],
    "Cleric": ["wisdom", "charisma"],
    "Ranger": ["strength", "dexterity"],
    "Paladin": ["wisdom", "charisma"],
    "Barbarian": ["strength", "constitution"],
    "Monk": ["strength", "dexterity"],
    "Sorcerer": ["constitution", "charisma"],
    "Warlock": ["wisdom", "charisma"],
    "Druid": ["intelligence", "wisdom"]
  }
  
  const classProficiencies = classSavingThrows[className] || []
  
  return defaultProficiencies.map(proficiency => ({
    ...proficiency,
    proficient: classProficiencies.includes(proficiency.ability)
  }))
}

export const calculatePassivePerception = (character: CharacterData, proficiencyBonus: number = 2): number => {
  const perceptionSkill = character.skills.find(skill => skill.name === "Perception")
  const wisdomModifier = calculateModifier(character.wisdom)
  
  let skillBonus = wisdomModifier
  if (perceptionSkill?.proficiency === "proficient") {
    skillBonus += proficiencyBonus
  } else if (perceptionSkill?.proficiency === "expertise") {
    skillBonus += proficiencyBonus * 2
  }
  
  return 10 + skillBonus
}

export const calculatePassiveInsight = (character: CharacterData, proficiencyBonus: number = 2): number => {
  const insightSkill = character.skills.find(skill => skill.name === "Insight")
  const wisdomModifier = calculateModifier(character.wisdom)
  
  let skillBonus = wisdomModifier
  if (insightSkill?.proficiency === "proficient") {
    skillBonus += proficiencyBonus
  } else if (insightSkill?.proficiency === "expertise") {
    skillBonus += proficiencyBonus * 2
  }
  
  return 10 + skillBonus
}

export const calculateSavingThrowBonus = (
  character: CharacterData,
  ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma",
  proficiencyBonus: number = 2
): number => {
  const abilityModifier = calculateModifier(character[ability])
  const savingThrowProficiency = character.savingThrowProficiencies.find(st => st.ability === ability)
  
  let bonus = abilityModifier
  if (savingThrowProficiency?.proficient) {
    bonus += proficiencyBonus
  }
  
  return bonus
}

// Get the primary spellcasting ability for a class
export const getSpellcastingAbility = (className: string): string => {
  const spellcastingAbilities: Record<string, string> = {
    'artificer': 'intelligence',
    'bard': 'charisma',
    'cleric': 'wisdom',
    'druid': 'wisdom',
    'paladin': 'charisma',
    'ranger': 'wisdom',
    'sorcerer': 'charisma',
    'warlock': 'charisma',
    'wizard': 'intelligence',
    'rogue': 'intelligence', // Arcane Trickster
    'fighter': 'intelligence', // Eldritch Knight
    'monk': 'wisdom', // Way of the Four Elements
    'barbarian': 'wisdom', // Path of the Totem Warrior (some features)
  }
  
  return spellcastingAbilities[className.toLowerCase()] || 'charisma'
}

// Get the highest spellcasting ability modifier for multiclass characters
export const getMulticlassSpellcastingAbilityModifier = (character: CharacterData): number => {
  if (!character.classes || character.classes.length <= 1) {
    // Single class - use the primary class's spellcasting ability
    const spellcastingAbility = getSpellcastingAbility(character.class)
    const modifier = calculateModifier(character[spellcastingAbility as keyof CharacterData] as number)
    console.log(`[DEBUG] Single class ${character.class}: using ${spellcastingAbility} modifier = ${modifier}`)
    return modifier
  }
  
  // Multiclass - find the highest ability modifier among spellcasting classes
  // Define which classes are spellcasters
  const spellcastingClasses = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']
  
  const characterSpellcastingClasses = character.classes.filter(charClass => 
    spellcastingClasses.includes(charClass.name.toLowerCase())
  )
  
  if (characterSpellcastingClasses.length === 0) {
    // No spellcasting classes, return 0
    console.log('[DEBUG] No spellcasting classes found, returning 0')
    return 0
  }
  
  // Find the highest ability modifier among all spellcasting abilities
  let highestModifier = -10 // Start with a very low value
  let bestClass = ''
  let bestAbility = ''
  
  for (const charClass of characterSpellcastingClasses) {
    const ability = getSpellcastingAbility(charClass.name)
    const modifier = calculateModifier(character[ability as keyof CharacterData] as number)
    console.log(`[DEBUG] ${charClass.name}: ${ability} modifier = ${modifier}`)
    if (modifier > highestModifier) {
      highestModifier = modifier
      bestClass = charClass.name
      bestAbility = ability
    }
  }
  
  console.log(`[DEBUG] Multiclass spellcasting: using ${bestClass}'s ${bestAbility} modifier = ${highestModifier}`)
  return highestModifier
}

// Calculate spell save DC based on class and ability scores (multiclass-aware)
export const calculateSpellSaveDC = (
  character: CharacterData,
  classData?: any,
  proficiencyBonus?: number
): number => {
  const profBonus = proficiencyBonus || calculateProficiencyBonus(character.level)
  
  if (character.classes && character.classes.length > 1) {
    // Multiclass - use the highest spellcasting ability modifier
    const abilityModifier = getMulticlassSpellcastingAbilityModifier(character)
    return 8 + abilityModifier + profBonus
  } else {
    // Single class - use the primary class's spellcasting ability
    if (!classData?.primary_ability || !Array.isArray(classData.primary_ability) || classData.primary_ability.length === 0) {
      return 8 // Default DC if no spellcasting ability
    }
    
    const spellcastingAbility = classData.primary_ability[0].toLowerCase()
    const abilityModifier = calculateModifier(character[spellcastingAbility as keyof CharacterData] as number)
    
    return 8 + abilityModifier + profBonus
  }
}

// Calculate spell attack bonus based on class and ability scores (multiclass-aware)
export const calculateSpellAttackBonus = (
  character: CharacterData,
  classData?: any,
  proficiencyBonus?: number
): number => {
  const profBonus = proficiencyBonus || calculateProficiencyBonus(character.level)
  
  if (character.classes && character.classes.length > 1) {
    // Multiclass - use the highest spellcasting ability modifier
    const abilityModifier = getMulticlassSpellcastingAbilityModifier(character)
    return abilityModifier + profBonus
  } else {
    // Single class - use the primary class's spellcasting ability
    if (!classData?.primary_ability || !Array.isArray(classData.primary_ability) || classData.primary_ability.length === 0) {
      return 0 // No spell attack bonus if no spellcasting ability
    }
    
    const spellcastingAbility = classData.primary_ability[0].toLowerCase()
    const abilityModifier = calculateModifier(character[spellcastingAbility as keyof CharacterData] as number)
    
    return abilityModifier + profBonus
  }
}

// Calculate spells known for Artificers (Intelligence modifier + half artificer level, minimum 1)
export const calculateArtificerSpellsKnown = (character: CharacterData): number => {
  if (character.class.toLowerCase() !== "artificer") {
    return 0
  }
  
  const intelligenceModifier = calculateModifier(character.intelligence)
  const halfLevel = Math.floor(character.level / 2)
  
  return Math.max(1, intelligenceModifier + halfLevel)
}

// Calculate spells known for Paladins (Charisma modifier + half paladin level, minimum 1)
export const calculatePaladinSpellsKnown = (character: CharacterData): number => {
  if (character.class.toLowerCase() !== "paladin") {
    return 0
  }
  
  const charismaModifier = calculateModifier(character.charisma)
  const halfLevel = Math.floor(character.level / 2)
  const result = Math.max(1, charismaModifier + halfLevel)
  
  return result
}

// Calculate Paladin Divine Sense uses (1 + Charisma modifier)
export const getDivineSenseData = (character: CharacterData): { usesPerRest: number; currentUses: number; replenishesOnLongRest: boolean } | undefined => {
  if (character.class.toLowerCase() !== "paladin") {
    return undefined
  }
  
  const charismaModifier = calculateModifier(character.charisma)
  const usesPerRest = Math.max(1, 1 + charismaModifier)
  
  return {
    usesPerRest,
    currentUses: usesPerRest, // Start with all uses available
    replenishesOnLongRest: true
  }
}

// Calculate Paladin Lay on Hands (paladin level × 5 hit points)
export const getLayOnHandsData = (character: CharacterData): { totalHitPoints: number; currentHitPoints: number; replenishesOnLongRest: boolean } | undefined => {
  if (character.class.toLowerCase() !== "paladin") {
    return undefined
  }
  
  const totalHitPoints = character.level * 5
  
  return {
    totalHitPoints,
    currentHitPoints: totalHitPoints, // Start with all hit points available
    replenishesOnLongRest: true
  }
}

// Calculate Paladin Channel Divinity uses (1 use, 2 at 6th level, 3 at 18th level)
export const getChannelDivinityData = (character: CharacterData): { usesPerRest: number; currentUses: number; replenishesOnLongRest: boolean } | undefined => {
  if (character.class.toLowerCase() !== "paladin") {
    return undefined
  }
  
  let usesPerRest = 1
  if (character.level >= 18) {
    usesPerRest = 3
  } else if (character.level >= 6) {
    usesPerRest = 2
  }
  
  return {
    usesPerRest,
    currentUses: usesPerRest, // Start with all uses available
    replenishesOnLongRest: true
  }
}

// Calculate Paladin Cleansing Touch uses (Charisma modifier, minimum 1, available at 14th level)
export const getCleansingTouchData = (character: CharacterData): { usesPerRest: number; currentUses: number; replenishesOnLongRest: boolean } | undefined => {
  if (character.class.toLowerCase() !== "paladin" || character.level < 14) {
    return undefined
  }
  
  const charismaModifier = calculateModifier(character.charisma)
  const usesPerRest = Math.max(1, charismaModifier)
  
  return {
    usesPerRest,
    currentUses: usesPerRest, // Start with all uses available
    replenishesOnLongRest: true
  }
}

// Artificer infusion calculations
export const getArtificerInfusionsKnown = (level: number): number => {
  // Artificer infusions known progression
  const infusionsKnown = [0, 0, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 8, 10, 10, 10, 10, 12, 12, 12]
  const levelIndex = Math.min(level - 1, infusionsKnown.length - 1)
  return infusionsKnown[levelIndex] || 0
}

export const getArtificerMaxInfusedItems = (character: CharacterData): number => {
  // Artificer max infused items = Intelligence modifier (minimum 1)
  if (character.class.toLowerCase() !== "artificer") {
    return 0
  }
  const intelligenceModifier = calculateModifier(character.intelligence)
  return Math.max(1, intelligenceModifier)
}

export const getAdditionalSpellsFromFeats = (character: CharacterData): number => {
  let additionalSpells = 0
  
  // Check feats for spell-granting feats
  character.feats.forEach(feat => {
    const featName = feat.name.toLowerCase()
    
    // Fey Touched grants 2 spells (1st level divination or enchantment + Misty Step)
    if (featName.includes("fey touched")) {
      additionalSpells += 2
    }
    // Shadow Touched grants 2 spells (1st level illusion or necromancy + Invisibility)
    else if (featName.includes("shadow touched")) {
      additionalSpells += 2
    }
    // Magic Initiate grants 2 spells (1 cantrip + 1 1st level spell)
    else if (featName.includes("magic initiate")) {
      additionalSpells += 2
    }
    // Artificer Initiate grants 1 spell (1 cantrip + 1 1st level spell, but only 1 counts as "known")
    else if (featName.includes("artificer initiate")) {
      additionalSpells += 1
    }
    // Spell Sniper grants 1 cantrip
    else if (featName.includes("spell sniper")) {
      additionalSpells += 1
    }
    // Telekinetic grants 1 cantrip (Mage Hand)
    else if (featName.includes("telekinetic")) {
      additionalSpells += 1
    }
    // Telepathic grants 1 spell (Detect Thoughts)
    else if (featName.includes("telepathic")) {
      additionalSpells += 1
    }
  })
  
  return additionalSpells
}

// NEW: Count unique spells explicitly listed in featSpellSlots (manual list on character)
export const countUniqueFeatSpells = (character: CharacterData): number => {
  if (!character.spellData?.featSpellSlots?.length) return 0
  const set = new Set<string>()
  character.spellData.featSpellSlots.forEach(slot => {
    if (slot.spellName) {
      set.add(slot.spellName.trim().toLowerCase())
    }
  })
  return set.size
}

// NEW: Build the set of subclass-granted spells (currently supports Artificer subclasses)
export const getSubclassGrantedSpells = (character: CharacterData): Set<string> => {
  const spells = new Set<string>()
  character.classFeatures.forEach(feature => {
    const name = feature.name.toLowerCase()
    const addAll = (list: string[]) => list.forEach(s => spells.add(s.trim().toLowerCase()))
    if (name.includes("artillerist spells")) {
      if (character.level >= 3) addAll(["Shield", "Thunderwave"])
      if (character.level >= 5) addAll(["Scorching Ray", "Shatter"])
      if (character.level >= 9) addAll(["Fireball", "Wind Wall"])
      if (character.level >= 13) addAll(["Ice Storm", "Wall of Fire"])
      if (character.level >= 17) addAll(["Cone of Cold", "Wall of Force"])
    } else if (name.includes("alchemist spells")) {
      if (character.level >= 3) addAll(["Healing Word", "Ray of Sickness"])
      if (character.level >= 5) addAll(["Flaming Sphere", "Melf's Acid Arrow"])
      if (character.level >= 9) addAll(["Gaseous Form", "Mass Healing Word"])
      if (character.level >= 13) addAll(["Blight", "Death Ward"])
      if (character.level >= 17) addAll(["Cloudkill", "Raise Dead"])
    } else if (name.includes("armorer spells")) {
      if (character.level >= 3) addAll(["Magic Missile", "Thunderwave"])
      if (character.level >= 5) addAll(["Mirror Image", "Shatter"])
      if (character.level >= 9) addAll(["Hypnotic Pattern", "Lightning Bolt"])
      if (character.level >= 13) addAll(["Fire Shield", "Greater Invisibility"])
      if (character.level >= 17) addAll(["Passwall", "Wall of Force"])
    } else if (name.includes("battle smith spells")) {
      if (character.level >= 3) addAll(["Heroism", "Shield"])
      if (character.level >= 5) addAll(["Aid", "Branding Smite"])
      if (character.level >= 9) addAll(["Aura of Vitality", "Conjure Barrage"])
      if (character.level >= 13) addAll(["Aura of Purity", "Fire Shield"])
      if (character.level >= 17) addAll(["Banishing Smite", "Mass Cure Wounds"])
    }
  })
  return spells
}

// NEW: Total additional spells = unique union(featSpellSlots, subclassGranted)
export const getTotalAdditionalSpells = (character: CharacterData): number => {
  const featSpells = countUniqueFeatSpells(character)
  const subclassSpells = getSubclassGrantedSpells(character).size
  return featSpells + subclassSpells
}

export const getAdditionalSpellsFromClassFeatures = (character: CharacterData): number => {
  let additionalSpells = 0
  
  // Check class features for additional spells
  character.classFeatures.forEach(feature => {
    const featureName = feature.name.toLowerCase()
    
    // Artillerist Spells grants additional spells at certain levels
    if (featureName.includes("artillerist spells")) {
      if (character.level >= 3) additionalSpells += 2 // Shield, Thunderwave
      if (character.level >= 5) additionalSpells += 2 // Scorching Ray, Shatter
      if (character.level >= 9) additionalSpells += 2 // Fireball, Wind Wall
      if (character.level >= 13) additionalSpells += 2 // Ice Storm, Wall of Fire
      if (character.level >= 17) additionalSpells += 2 // Cone of Cold, Wall of Force
    }
    // Add other subclass spell features as needed
    // Alchemist Spells, Armorer Spells, Battle Smith Spells, etc.
    else if (featureName.includes("alchemist spells")) {
      if (character.level >= 3) additionalSpells += 2 // Healing Word, Ray of Sickness
      if (character.level >= 5) additionalSpells += 2 // Flaming Sphere, Melf's Acid Arrow
      if (character.level >= 9) additionalSpells += 2 // Gaseous Form, Mass Healing Word
      if (character.level >= 13) additionalSpells += 2 // Blight, Death Ward
      if (character.level >= 17) additionalSpells += 2 // Cloudkill, Raise Dead
    }
    else if (featureName.includes("armorer spells")) {
      if (character.level >= 3) additionalSpells += 2 // Magic Missile, Thunderwave
      if (character.level >= 5) additionalSpells += 2 // Mirror Image, Shatter
      if (character.level >= 9) additionalSpells += 2 // Hypnotic Pattern, Lightning Bolt
      if (character.level >= 13) additionalSpells += 2 // Fire Shield, Greater Invisibility
      if (character.level >= 17) additionalSpells += 2 // Passwall, Wall of Force
    }
    else if (featureName.includes("battle smith spells")) {
      if (character.level >= 3) additionalSpells += 2 // Heroism, Shield
      if (character.level >= 5) additionalSpells += 2 // Aid, Branding Smite
      if (character.level >= 9) additionalSpells += 2 // Aura of Vitality, Conjure Barrage
      if (character.level >= 13) additionalSpells += 2 // Aura of Purity, Fire Shield
      if (character.level >= 17) additionalSpells += 2 // Banishing Smite, Mass Cure Wounds
    }
  })
  
  return additionalSpells
}

// Get spells known based on class data or calculate for Artificers, Paladins, and Warlocks
export const getSpellsKnown = (
  character: CharacterData,
  classData?: any,
  storedValue?: number
): number => {
  // If there's a stored value (from database), use it
  if (storedValue !== undefined && storedValue !== null) {
    return storedValue
  }
  
  // Handle multiclassing
  if (character.classes && character.classes.length > 0) {
    return getMulticlassSpellsKnown(character)
  }
  
  // For Warlocks, use the Warlock-specific calculation
  if (character.class.toLowerCase() === "warlock") {
    return getWarlockSpellsKnown(character.level)
  }
  
  // For Artificers, use the dynamic calculation
  if (character.class.toLowerCase() === "artificer") {
    return calculateArtificerSpellsKnown(character)
  }
  
  // For Paladins, use the dynamic calculation
  if (character.class.toLowerCase() === "paladin") {
    return calculatePaladinSpellsKnown(character)
  }
  
  // For other classes, use the class data if available
  if (classData?.spells_known && Array.isArray(classData.spells_known)) {
    const levelIndex = character.level - 1
    if (levelIndex >= 0 && levelIndex < classData.spells_known.length) {
      const spellsKnown = classData.spells_known[levelIndex]
      // If spells_known is 0 in the array, fall back to dynamic logic for Artificers and Paladins
      if (spellsKnown === 0 && character.class.toLowerCase() === "artificer") {
        return calculateArtificerSpellsKnown(character)
      }
      if (spellsKnown === 0 && character.class.toLowerCase() === "paladin") {
        return calculatePaladinSpellsKnown(character)
      }
      return spellsKnown
    }
  }
  
  return 0
}

// Calculate spells known for multiclassed characters
export const getMulticlassSpellsKnown = (character: CharacterData): number => {
  const spellcastingClasses = getSpellcastingClasses(character.classes)
  let totalSpellsKnown = 0
  
  for (const charClass of spellcastingClasses) {
    if (charClass.name.toLowerCase() === "warlock") {
      totalSpellsKnown += getWarlockSpellsKnown(charClass.level)
    } else if (charClass.name.toLowerCase() === "artificer") {
      // Create a temporary character with just this class for calculation
      const tempCharacter = { ...character, class: charClass.name, level: charClass.level }
      totalSpellsKnown += calculateArtificerSpellsKnown(tempCharacter)
    } else if (charClass.name.toLowerCase() === "paladin") {
      // Create a temporary character with just this class for calculation
      const tempCharacter = { ...character, class: charClass.name, level: charClass.level }
      totalSpellsKnown += calculatePaladinSpellsKnown(tempCharacter)
    } else {
      // For other classes, use a simplified calculation based on level
      // This is a rough approximation - in practice, you'd want to load class data
      const baseSpells = Math.max(2, charClass.level) // Minimum 2 spells known
      totalSpellsKnown += baseSpells
    }
  }
  
  return totalSpellsKnown
}

export const classFeatureTemplates = {
  Bard: {
    "College of Lore": [
      {
        name: "Bardic Inspiration",
        description:
          "1 bonus action, target 1 creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die (d8 at 5th lvl; d10 at 10th lvl; d12 at 15th lvl). Once within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll or saving throw (d20). You can use Bardic Inspiration a number of times equal to your CHA Mod and regain all uses when you finish a short or long rest.",
        source: "Bard",
        level: 1,
      },
      {
        name: "Song of Rest",
        description:
          "You can heal during a short rest. If you or any friendly creatures who can hear your performance regain hit points at the end of the short rest (uses a hit die), each of those creatures regains an extra 1d6 hit points. The hit points regained increases to 1d8 at 9th level, to 1d10 at 13th level, and to 1d12 at 17th level.",
        source: "Bard",
        level: 2,
      },
      {
        name: "Cutting Words",
        description:
          "When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature's roll. You can choose to use this feature after the creature makes its roll, but before the DM determines whether the attack roll or ability check succeeds or fails, or before the creature deals its damage. The creature is immune if it can't hear you or if it's immune to being charmed.",
        source: "College of Lore",
        level: 3,
      },
      {
        name: "Additional Magical Secrets",
        description:
          "At 6th level, you learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you but don't count against the number of bard spells you know.",
        source: "College of Lore",
        level: 6,
      },
      {
        name: "Countercharm",
        description:
          "1 action, lasts until end of your next turn. During that time, you and any friendly creatures within 30 feet of you have advantage on saving throws against being frightened or charmed. A creature must be able to hear you to gain this benefit. The performance ends early if you are incapacitated or silenced or if you voluntarily end it (no action required).",
        source: "Bard",
        level: 6,
      },
    ],
  },
}

export const getClassFeatures = (characterClass: string, subclass: string | undefined, level: number) => {
  // This function is now deprecated in favor of loading features from the database
  // It's kept for backward compatibility and fallback scenarios
  const classTemplate = classFeatureTemplates[characterClass as keyof typeof classFeatureTemplates]
  if (!classTemplate || !subclass) return []

  const subclassTemplate = classTemplate[subclass as keyof typeof classTemplate]
  if (!subclassTemplate) return []

  return subclassTemplate.filter((feature) => feature.level <= level)
}

// Eldritch Cannon utility functions
export const createEldritchCannon = (
  size: 'Small' | 'Tiny',
  type: 'Flamethrower' | 'Force Ballista' | 'Protector',
  character: CharacterData
): EldritchCannon => {
  const maxHitPoints = 5 * character.level
  const attackBonus = calculateProficiencyBonus(character.level) + calculateModifier(character.intelligence)
  const intModifier = calculateModifier(character.intelligence)
  
  // Different damage/effect based on cannon type
  const damage = type === 'Protector' 
    ? `1d8 ${intModifier >= 0 ? '+' : ''}${intModifier}`
    : `2d8`
  
  const specialProperties = {
    'Flamethrower': 'The cannon exhales fire in an adjacent 15-foot cone that you designate. Each creature in that area must make a Dexterity saving throw against your spell save DC, taking 2d8 fire damage on a failed save or half as much damage on a successful one. The fire ignites any flammable objects in the area that aren\'t being worn or carried.',
    'Force Ballista': 'Make a ranged spell attack, originating from the cannon, at one creature or object within 120 feet of it. On a hit, the target takes 2d8 force damage, and if the target is a creature, it is pushed up to 5 feet away from the cannon.',
    'Protector': 'The cannon emits a burst of positive energy that grants itself and each creature of your choice within 10 feet of it a number of temporary hit points equal to 1d8 + your Intelligence modifier (minimum of +1).'
  }

  return {
    size,
    type,
    currentHitPoints: maxHitPoints,
    maxHitPoints,
    armorClass: 18,
    attackBonus,
    damage,
    specialProperty: specialProperties[type]
  }
}

// Warlock-specific interfaces
export interface EldritchInvocation {
  name: string
  description: string
  level?: number
  prerequisite?: string
}

export interface MysticArcanum {
  level: number
  spellName: string
  used: boolean
}

// Warlock utility functions
export const getWarlockSpellSlots = (level: number): SpellSlot[] => {
  // Warlock Pact Magic: fewer slots but they recover on short rest and can be used for any spell level
  // Based on official D&D 5e Warlock table
  const slots: SpellSlot[] = []
  
  // Determine the number of spell slots based on level
  let numberOfSlots = 1
  
  if (level >= 1) { numberOfSlots = 1 }
  if (level >= 2) { numberOfSlots = 2 }
  if (level >= 11) { numberOfSlots = 3 }
  if (level >= 17) { numberOfSlots = 4 }
  
  // Create a single slot entry with level 0 to indicate "any level" for Warlocks
  slots.push({ level: 0, total: numberOfSlots, used: 0 })
  
  return slots
}

// Raven Queen Warlock helper functions
export const createSentinelRaven = () => ({
  isActive: true,
  isPerched: true,
  currentHP: 1,
  maxHP: 1,
  lastCalled: new Date().toISOString()
})

export const createSoulOfTheRaven = (level: number) => ({
  isMerged: false,
  usesPerLongRest: level >= 6 ? 1 : 0,
  currentUses: level >= 6 ? 1 : 0
})

export const createRavensShield = (level: number) => ({
  hasAdvantageOnDeathSaves: level >= 10,
  isImmuneToFrightened: level >= 10,
  hasNecroticResistance: level >= 10
})

export const createQueensRightHand = (level: number) => ({
  usesPerLongRest: level >= 14 ? 1 : 0,
  currentUses: level >= 14 ? 1 : 0
})

export const getWarlockSpellsKnown = (level: number): number => {
  // Warlock spells known progression
  const spellsKnown = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
  return spellsKnown[Math.min(level - 1, 19)] || 2
}

export const getWarlockCantripsKnown = (level: number): number => {
  // Warlock cantrips known progression: 2 at 1st-3rd, 3 at 4th-9th, 4 at 10th+
  if (level >= 10) return 4
  if (level >= 4) return 3
  return 2
}

// Multiclassing utility functions
export const getTotalLevel = (classes: CharacterClass[]): number => {
  return classes.reduce((total, charClass) => total + charClass.level, 0)
}

export const getPrimaryClass = (classes: CharacterClass[]): CharacterClass | null => {
  if (classes.length === 0) return null
  return classes.reduce((primary, charClass) => 
    charClass.level > primary.level ? charClass : primary
  )
}

export const getSpellcastingClasses = (classes: CharacterClass[]): CharacterClass[] => {
  const spellcastingClasses = ['wizard', 'sorcerer', 'warlock', 'bard', 'cleric', 'druid', 'ranger', 'paladin', 'artificer']
  return classes.filter(charClass => 
    spellcastingClasses.includes(charClass.name.toLowerCase())
  )
}

export const getHitDiceByClass = (classes: CharacterClass[]): Array<{
  className: string
  dieType: string
  total: number
  used: number
}> => {
  const hitDieTypes: Record<string, string> = {
    'barbarian': 'd12',
    'fighter': 'd10',
    'paladin': 'd10',
    'ranger': 'd10',
    'artificer': 'd8',
    'bard': 'd8',
    'cleric': 'd8',
    'druid': 'd8',
    'monk': 'd8',
    'rogue': 'd8',
    'warlock': 'd8',
    'wizard': 'd6',
    'sorcerer': 'd6'
  }

  return classes.map(charClass => ({
    className: charClass.name,
    dieType: hitDieTypes[charClass.name.toLowerCase()] || 'd8',
    total: charClass.level,
    used: 0 // Will be loaded from database
  }))
}

// Get saving throw proficiencies from all classes
export const getMulticlassSavingThrowProficiencies = (classes: CharacterClass[]): SavingThrowProficiency[] => {
  const classSavingThrows: Record<string, string[]> = {
    'barbarian': ['strength', 'constitution'],
    'bard': ['dexterity', 'charisma'],
    'cleric': ['wisdom', 'charisma'],
    'druid': ['intelligence', 'wisdom'],
    'fighter': ['strength', 'constitution'],
    'monk': ['strength', 'dexterity'],
    'paladin': ['wisdom', 'charisma'],
    'ranger': ['strength', 'dexterity'],
    'rogue': ['dexterity', 'intelligence'],
    'sorcerer': ['constitution', 'charisma'],
    'warlock': ['wisdom', 'charisma'],
    'wizard': ['intelligence', 'wisdom'],
    'artificer': ['constitution', 'intelligence']
  }

  // Start with all six abilities, all non-proficient
  const allAbilities: Array<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"> = [
    "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"
  ]
  
  const proficiencies: SavingThrowProficiency[] = allAbilities.map(ability => ({
    ability,
    proficient: false
  }))

  // Mark the appropriate ones as proficient based on classes
  const proficientAbilities = new Set<string>()
  
  for (const charClass of classes) {
    const savingThrows = classSavingThrows[charClass.name.toLowerCase()] || []
    for (const ability of savingThrows) {
      proficientAbilities.add(ability)
    }
  }

  // Update the proficiencies array
  const result = proficiencies.map(proficiency => ({
    ...proficiency,
    proficient: proficientAbilities.has(proficiency.ability)
  }))
  
  console.log('[DEBUG] getMulticlassSavingThrowProficiencies result:', result)
  return result
}

// Get equipment proficiencies from all classes
export const getMulticlassEquipmentProficiencies = (classes: CharacterClass[]): EquipmentProficiencies => {
  const classEquipment: Record<string, Partial<EquipmentProficiencies>> = {
    'barbarian': {
      lightArmor: true,
      mediumArmor: true,
      shields: true,
      simpleWeapons: true,
      martialWeapons: true
    },
    'bard': {
      lightArmor: true,
      simpleWeapons: true,
      handCrossbows: true,
      longswords: true,
      rapiers: true,
      shortswords: true
    },
    'cleric': {
      lightArmor: true,
      mediumArmor: true,
      shields: true,
      simpleWeapons: true
    },
    'druid': {
      lightArmor: true,
      mediumArmor: true,
      shields: true,
      simpleWeapons: true,
      scimitars: true
    },
    'fighter': {
      lightArmor: true,
      mediumArmor: true,
      heavyArmor: true,
      shields: true,
      simpleWeapons: true,
      martialWeapons: true
    },
    'monk': {
      simpleWeapons: true,
      shortswords: true
    },
    'paladin': {
      lightArmor: true,
      mediumArmor: true,
      heavyArmor: true,
      shields: true,
      simpleWeapons: true,
      martialWeapons: true
    },
    'ranger': {
      lightArmor: true,
      mediumArmor: true,
      shields: true,
      simpleWeapons: true,
      martialWeapons: true
    },
    'rogue': {
      lightArmor: true,
      simpleWeapons: true,
      handCrossbows: true,
      longswords: true,
      rapiers: true,
      shortswords: true
    },
    'sorcerer': {
      simpleWeapons: true,
      lightCrossbows: true,
      darts: true,
      slings: true,
      quarterstaffs: true
    },
    'warlock': {
      lightArmor: true,
      simpleWeapons: true
    },
    'wizard': {
      simpleWeapons: true,
      lightCrossbows: true,
      darts: true,
      slings: true,
      quarterstaffs: true
    },
    'artificer': {
      lightArmor: true,
      mediumArmor: true,
      shields: true,
      simpleWeapons: true
    }
  }

  const proficiencies: EquipmentProficiencies = {
    lightArmor: false,
    mediumArmor: false,
    heavyArmor: false,
    shields: false,
    simpleWeapons: false,
    martialWeapons: false,
    firearms: false,
    handCrossbows: false,
    longswords: false,
    rapiers: false,
    shortswords: false,
    scimitars: false,
    lightCrossbows: false,
    darts: false,
    slings: false,
    quarterstaffs: false
  }

  // Combine proficiencies from all classes
  for (const charClass of classes) {
    const classProficiencies = classEquipment[charClass.name.toLowerCase()] || {}
    for (const [key, value] of Object.entries(classProficiencies)) {
      if (value && key in proficiencies) {
        (proficiencies as any)[key] = true
      }
    }
  }

  return proficiencies
}

// Calculate multiclassing spell slots according to D&D 5e rules
export const getMulticlassSpellSlots = (classes: CharacterClass[]): SpellSlot[] => {
  const spellcastingClasses = getSpellcastingClasses(classes)
  const warlockClasses = classes.filter(charClass => charClass.name.toLowerCase() === "warlock")
  
  // Separate Warlock levels (Pact Magic) from other spellcasting classes
  const nonWarlockSpellcasters = spellcastingClasses.filter(charClass => charClass.name.toLowerCase() !== "warlock")
  
  let spellSlots: SpellSlot[] = []
  
  // Calculate spell slots for non-Warlock spellcasters using multiclassing table
  if (nonWarlockSpellcasters.length > 0) {
    const totalSpellcasterLevel = nonWarlockSpellcasters.reduce((total, charClass) => {
      // Each class contributes its full level to spellcaster level
      return total + charClass.level
    }, 0)
    
    // Use the standard multiclassing spell slot table
    const multiclassSpellSlots = getMulticlassSpellSlotTable(totalSpellcasterLevel)
    spellSlots = [...multiclassSpellSlots]
  }
  
  // Add Warlock Pact Magic slots separately
  if (warlockClasses.length > 0) {
    const totalWarlockLevel = warlockClasses.reduce((total, charClass) => total + charClass.level, 0)
    const warlockSlots = getWarlockSpellSlots(totalWarlockLevel)
    spellSlots = [...spellSlots, ...warlockSlots]
  }
  
  return spellSlots
}

// D&D 5e multiclassing spell slot table (from Player's Handbook page 165)
const getMulticlassSpellSlotTable = (totalLevel: number): SpellSlot[] => {
  // Official D&D 5e Multiclass Spellcaster table
  const multiclassSpellSlots = [
    // Level 1: 2 first-level slots
    [{ level: 1, total: 2, used: 0 }],
    // Level 2: 3 first-level slots  
    [{ level: 1, total: 3, used: 0 }],
    // Level 3: 4 first-level, 2 second-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 2, used: 0 }],
    // Level 4: 4 first-level, 3 second-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }],
    // Level 5: 4 first-level, 3 second-level, 2 third-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 2, used: 0 }],
    // Level 6: 4 first-level, 3 second-level, 3 third-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }],
    // Level 7: 4 first-level, 3 second-level, 3 third-level, 1 fourth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 1, used: 0 }],
    // Level 8: 4 first-level, 3 second-level, 3 third-level, 2 fourth-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 2, used: 0 }],
    // Level 9: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 1 fifth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 1, used: 0 }],
    // Level 10: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level slots
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }],
    // Level 11: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }],
    // Level 12: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }],
    // Level 13: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level, 1 seventh-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }],
    // Level 14: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level, 1 seventh-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }],
    // Level 15: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level, 1 seventh-level, 1 eighth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }, { level: 8, total: 1, used: 0 }],
    // Level 16: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level, 1 seventh-level, 1 eighth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }, { level: 8, total: 1, used: 0 }],
    // Level 17: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level, 1 sixth-level, 1 seventh-level, 1 eighth-level, 1 ninth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 2, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }, { level: 8, total: 1, used: 0 }, { level: 9, total: 1, used: 0 }],
    // Level 18: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 3 fifth-level, 1 sixth-level, 1 seventh-level, 1 eighth-level, 1 ninth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 3, used: 0 }, { level: 6, total: 1, used: 0 }, { level: 7, total: 1, used: 0 }, { level: 8, total: 1, used: 0 }, { level: 9, total: 1, used: 0 }],
    // Level 19: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 3 fifth-level, 2 sixth-level, 1 seventh-level, 1 eighth-level, 1 ninth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 3, used: 0 }, { level: 6, total: 2, used: 0 }, { level: 7, total: 1, used: 0 }, { level: 8, total: 1, used: 0 }, { level: 9, total: 1, used: 0 }],
    // Level 20: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 3 fifth-level, 2 sixth-level, 2 seventh-level, 1 eighth-level, 1 ninth-level slot
    [{ level: 1, total: 4, used: 0 }, { level: 2, total: 3, used: 0 }, { level: 3, total: 3, used: 0 }, { level: 4, total: 3, used: 0 }, { level: 5, total: 3, used: 0 }, { level: 6, total: 2, used: 0 }, { level: 7, total: 2, used: 0 }, { level: 8, total: 1, used: 0 }, { level: 9, total: 1, used: 0 }],
  ]
  
  // Get the spell slots for the specified multiclass spellcaster level
  const levelIndex = Math.min(totalLevel - 1, 19) // Convert to 0-based index, cap at 20
  const slotsForLevel = multiclassSpellSlots[levelIndex]
  
  if (!slotsForLevel) {
    return []
  }
  
  // Return all the spell slots for this level
  return slotsForLevel
}

// Get combined class features for multiclassed characters
export const getMulticlassFeatures = async (character: CharacterData): Promise<{
  bardicInspirationSlot?: any
  songOfRest?: any
  flashOfGeniusSlot?: any
  divineSenseSlot?: any
  layOnHands?: any
  channelDivinitySlot?: any
  cleansingTouchSlot?: any
}> => {
  const features: any = {}
  
  // Check for Bard features
  const bardClasses = character.classes.filter(charClass => charClass.name.toLowerCase() === "bard")
  if (bardClasses.length > 0) {
    const totalBardLevel = bardClasses.reduce((total, charClass) => total + charClass.level, 0)
    const charismaModifier = Math.floor((character.charisma - 10) / 2)
    
    // Import the functions we need
    const { getBardicInspirationData, getSongOfRestData } = await import('./class-utils')
    
    features.bardicInspirationSlot = getBardicInspirationData(totalBardLevel, charismaModifier)
    features.songOfRest = getSongOfRestData(totalBardLevel)
  }
  
  // Check for Artificer features
  const artificerClasses = character.classes.filter(charClass => charClass.name.toLowerCase() === "artificer")
  if (artificerClasses.length > 0) {
    const totalArtificerLevel = artificerClasses.reduce((total, charClass) => total + charClass.level, 0)
    if (totalArtificerLevel >= 7) {
      const intelligenceModifier = Math.floor((character.intelligence - 10) / 2)
      features.flashOfGeniusSlot = {
        usesPerRest: Math.max(1, intelligenceModifier),
        currentUses: Math.max(1, intelligenceModifier),
        replenishesOnLongRest: true
      }
    }
  }
  
  // Check for Paladin features
  const paladinClasses = character.classes.filter(charClass => charClass.name.toLowerCase() === "paladin")
  if (paladinClasses.length > 0) {
    const totalPaladinLevel = paladinClasses.reduce((total, charClass) => total + charClass.level, 0)
    
    // Import Paladin functions
    const { getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData } = await import('./character-data')
    
    // Create a temporary character with Paladin level for calculations
    const tempPaladinCharacter = { ...character, level: totalPaladinLevel }
    
    features.divineSenseSlot = getDivineSenseData(tempPaladinCharacter)
    features.layOnHands = getLayOnHandsData(tempPaladinCharacter)
    features.channelDivinitySlot = getChannelDivinityData(tempPaladinCharacter)
    features.cleansingTouchSlot = getCleansingTouchData(tempPaladinCharacter)
  }
  
  return features
}

export const getWarlockInvocationsKnown = (level: number): number => {
  // Warlock Eldritch Invocations known progression (0-indexed array for levels 1-20)
  const invocationsKnown = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 8, 8]
  return invocationsKnown[Math.min(level - 1, 19)] || 0
}

export const createGenieWrath = (genieType: 'dao' | 'djinni' | 'efreeti' | 'marid') => {
  const damageTypes = {
    'dao': 'bludgeoning' as const,
    'djinni': 'cold' as const,
    'efreeti': 'fire' as const,
    'marid': 'thunder' as const
  }
  
  return {
    damageType: damageTypes[genieType],
    usesPerTurn: 1,
    currentUses: 1
  }
}

export const createElementalGift = (genieType: 'dao' | 'djinni' | 'efreeti' | 'marid', level: number) => {
  return {
    flyingSpeed: 30,
    usesPerLongRest: calculateProficiencyBonus(level),
    currentUses: calculateProficiencyBonus(level)
  }
}

export const getEldritchCannonStats = (cannon: EldritchCannon) => {
  return {
    maxHP: cannon.maxHitPoints,
    currentHP: cannon.currentHitPoints,
    AC: cannon.armorClass,
    attackBonus: cannon.attackBonus,
    damage: cannon.damage
  }
}

// Campaign management functions
export const createCampaign = (name: string, description?: string): Campaign => {
  const now = new Date().toISOString()
  return {
    id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    created_at: now,
    updated_at: now,
    characters: []
  }
}

export const addCharacterToCampaign = (campaign: Campaign, characterId: string): Campaign => {
  if (!campaign.characters.includes(characterId)) {
    return {
      ...campaign,
      characters: [...campaign.characters, characterId],
      updated_at: new Date().toISOString()
    }
  }
  return campaign
}

export const removeCharacterFromCampaign = (campaign: Campaign, characterId: string): Campaign => {
  return {
    ...campaign,
    characters: campaign.characters.filter(id => id !== characterId),
    updated_at: new Date().toISOString()
  }
}

export const updateCampaign = (campaign: Campaign, updates: Partial<Pick<Campaign, 'name' | 'description'>>): Campaign => {
  return {
    ...campaign,
    ...updates,
    updated_at: new Date().toISOString()
  }
}

export const getCharactersByCampaign = (characters: CharacterData[], campaignId: string): CharacterData[] => {
  return characters.filter(character => character.campaignId === campaignId)
}

export const getCharactersByStatus = (characters: CharacterData[], status: 'active' | 'away' | 'deceased'): CharacterData[] => {
  return characters.filter(character => character.partyStatus === status)
}

export const sampleCharacter: CharacterData | null = null

export const sampleCharacters: CharacterData[] = []
