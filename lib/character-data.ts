export interface CharacterData {
  id: string
  name: string
  class: string
  subclass?: string
  class_id?: string
  subclass_id?: string
  level: number
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
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
  notes?: string
  proficiencyBonus?: number
  skills: Skill[]
  weapons: Array<{
    name: string
    attackBonus: string
    damageType: string
  }>
  weaponNotes: string
  features: Array<{
    name: string
    description: string
  }>
  spellData: SpellData
  classFeatures: Array<{
    name: string
    description: string
    source: string
    level: number
  }>
  toolsProficiencies: ToolProficiency[]
  equipment: string
  languages: string
  otherTools: string
  feats: Array<{
    name: string
    description: string
  }>
}

export type ProficiencyLevel = "none" | "proficient" | "expertise"

export interface Skill {
  name: string
  ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"
  proficiency: ProficiencyLevel
}

export interface ToolProficiency {
  name: string
  proficiency: ProficiencyLevel
  manualModifier?: number
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

export interface FeatSpellSlot {
  name: string // e.g., "Fey Touched", "Magic Initiate"
  spells: string[] // spell names
  usesPerLongRest: number
  currentUses: number
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
  spellNotes: string
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
  if (tool.manualModifier !== undefined) {
    return tool.manualModifier
  }

  const proficiencyBonus = character.proficiencyBonus ?? calculateProficiencyBonus(character.level)

  switch (tool.proficiency) {
    case "proficient":
      return proficiencyBonus
    case "expertise":
      return proficiencyBonus * 2
    default:
      return 0
  }
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
  const classTemplate = classFeatureTemplates[characterClass as keyof typeof classFeatureTemplates]
  if (!classTemplate || !subclass) return []

  const subclassTemplate = classTemplate[subclass as keyof typeof classTemplate]
  if (!subclassTemplate) return []

  return subclassTemplate.filter((feature) => feature.level <= level)
}

export const sampleCharacter: CharacterData | null = null

export const sampleCharacters: CharacterData[] = []
