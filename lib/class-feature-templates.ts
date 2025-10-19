/**
 * Class Feature Templates System
 * 
 * This file defines the template system for class features with usage tracking.
 * Templates are used to standardize how different types of class features are
 * configured and rendered in the UI.
 */

import type { 
  ClassFeatureSkill, 
  SlotConfig, 
  PointsPoolConfig, 
  OptionsListConfig, 
  SpecialUXConfig,
  FormulaContext,
  ValidationResult
} from './class-feature-types'
import type { CharacterData } from './character-data'
import { calculateProficiencyBonus } from './character-data'

/**
 * Predefined feature templates for common D&D 5e class features
 * These can be used as starting points when creating custom classes
 */
export const FEATURE_TEMPLATES: Record<string, ClassFeatureSkill> = {
  'bardic-inspiration': {
    id: 'bardic-inspiration',
    version: 1,
    title: 'Bardic Inspiration',
    subtitle: 'Grant allies inspiration dice',
    featureType: 'slots',
    enabledAtLevel: 1,
    enabledBySubclass: null,
    config: {
      usesFormula: 'charisma_modifier',
      dieType: createDieProgression('d6', 1, 'd8', 5, 'd10', 10, 'd12', 15),
      replenishOn: 'short_rest',
      displayStyle: 'circles'
    } as SlotConfig
  },
  'flash-of-genius': {
    id: 'flash-of-genius',
    version: 1,
    title: 'Flash of Genius',
    subtitle: 'Add Intelligence modifier to checks',
    featureType: 'slots',
    enabledAtLevel: 7,
    enabledBySubclass: null,
    config: {
      usesFormula: 'intelligence_modifier',
      replenishOn: 'long_rest',
      displayStyle: 'checkboxes'
    } as SlotConfig
  },
  'divine-sense': {
    id: 'divine-sense',
    version: 1,
    title: 'Divine Sense',
    subtitle: 'Detect celestials, fiends, and undead',
    featureType: 'slots',
    enabledAtLevel: 1,
    enabledBySubclass: null,
    config: {
      usesFormula: '1 + charisma_modifier',
      replenishOn: 'long_rest',
      displayStyle: 'circles'
    } as SlotConfig
  },
  'lay-on-hands': {
    id: 'lay-on-hands',
    version: 1,
    title: 'Lay on Hands',
    subtitle: 'Healing pool',
    featureType: 'points_pool',
    enabledAtLevel: 1,
    enabledBySubclass: null,
    config: {
      totalFormula: 'level * 5',
      canSpendPartial: true,
      replenishOn: 'long_rest',
      displayStyle: 'slider',
      minSpend: 1
    } as PointsPoolConfig
  },
  'channel-divinity': {
    id: 'channel-divinity',
    version: 1,
    title: 'Channel Divinity',
    subtitle: 'Channel divine power',
    featureType: 'slots',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      usesFormula: '1', // 1 at 2nd, 2 at 6th, 3 at 18th (handled by level checks)
      replenishOn: 'short_rest',
      displayStyle: 'circles'
    } as SlotConfig
  },
  'cleansing-touch': {
    id: 'cleansing-touch',
    version: 1,
    title: 'Cleansing Touch',
    subtitle: 'End spells on creatures',
    featureType: 'slots',
    enabledAtLevel: 14,
    enabledBySubclass: null,
    config: {
      usesFormula: 'charisma_modifier',
      replenishOn: 'long_rest',
      displayStyle: 'circles'
    } as SlotConfig
  },
  'eldritch-invocations': {
    id: 'eldritch-invocations',
    version: 1,
    title: 'Eldritch Invocations',
    subtitle: 'Mystical abilities',
    featureType: 'options_list',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      maxSelectionsFormula: 'warlock_invocations_known',
      optionsSource: 'database',
      databaseTable: 'eldritch_invocations',
      filterBy: {
        level: 2
      },
      allowDuplicates: false,
      displayStyle: 'grid',
      canSwapOnLevelUp: true
    } as OptionsListConfig
  },
  'artificer-infusions': {
    id: 'artificer-infusions',
    version: 1,
    title: 'Infusions',
    subtitle: 'Magical item enhancements',
    featureType: 'options_list',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      maxSelectionsFormula: 'artificer_infusions_known',
      optionsSource: 'database',
      databaseTable: 'artificer_infusions',
      filterBy: {
        level: 2
      },
      allowDuplicates: false,
      displayStyle: 'grid',
      canSwapOnLevelUp: true
    } as OptionsListConfig
  },
  'eldritch-cannon': {
    id: 'eldritch-cannon',
    version: 1,
    title: 'Eldritch Cannon',
    subtitle: 'Magical turret companion',
    featureType: 'special_ux',
    enabledAtLevel: 3,
    enabledBySubclass: 'Artillerist',
    config: {
      componentId: 'eldritch-cannon',
      customConfig: {
        cannonTypes: ['Flamethrower', 'Force Ballista', 'Protector'],
        sizeOptions: ['Tiny', 'Small'],
        hpFormula: '5 * level',
        acFormula: '18',
        attackBonusFormula: 'proficiency_bonus + intelligence_modifier'
      }
    } as SpecialUXConfig
  },
  'song-of-rest': {
    id: 'song-of-rest',
    version: 1,
    title: 'Song of Rest',
    subtitle: 'Enhanced short rest healing',
    featureType: 'special_ux',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      componentId: 'song-of-rest',
      customConfig: {
        healingDieProgression: ['d6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd8', 'd8', 'd8', 'd8', 'd10', 'd10', 'd10', 'd10', 'd12', 'd12', 'd12', 'd12'],
        isToggleable: true,
        requiresPerformance: true
      }
    } as SpecialUXConfig
  },
  'ki-points': {
    id: 'ki-points',
    version: 1,
    title: 'Ki Points',
    subtitle: 'Martial arts energy',
    featureType: 'points_pool',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      totalFormula: 'level',
      canSpendPartial: false,
      replenishOn: 'short_rest',
      displayStyle: 'increment_decrement',
      minSpend: 1
    } as PointsPoolConfig
  },
  'sorcery-points': {
    id: 'sorcery-points',
    version: 1,
    title: 'Sorcery Points',
    subtitle: 'Raw magical energy',
    featureType: 'points_pool',
    enabledAtLevel: 2,
    enabledBySubclass: null,
    config: {
      totalFormula: 'level',
      canSpendPartial: true,
      replenishOn: 'long_rest',
      displayStyle: 'slider',
      minSpend: 1
    } as PointsPoolConfig
  },
  'metamagic': {
    id: 'metamagic',
    version: 1,
    title: 'Metamagic',
    subtitle: 'Modify spell effects',
    featureType: 'options_list',
    enabledAtLevel: 3,
    enabledBySubclass: null,
    config: {
      maxSelectionsFormula: '2', // 2 at 3rd, 3 at 10th, 4 at 17th
      optionsSource: 'database',
      databaseTable: 'metamagic_options',
      filterBy: {
        level: 3
      },
      allowDuplicates: false,
      displayStyle: 'list',
      canSwapOnLevelUp: false
    } as OptionsListConfig
  }
}

/**
 * Create a die progression array for features that scale with level
 */
function createDieProgression(...args: Array<string | number>): string[] {
  const progression: string[] = new Array(20).fill('d6')
  for (let i = 0; i < args.length; i += 2) {
    const die = args[i] as string
    const level = args[i + 1] as number
    for (let j = level - 1; j < 20; j++) {
      progression[j] = die
    }
  }
  return progression
}

/**
 * Calculate the number of uses from a formula string
 */
export function calculateUsesFromFormula(formula: string, character: CharacterData): number {
  const context = createFormulaContext(character)
  return evaluateFormula(formula, context)
}

/**
 * Create a formula evaluation context from character data
 */
function createFormulaContext(character: CharacterData): FormulaContext {
  return {
    level: character.level,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    proficiencyBonus: calculateProficiencyBonus(character.level)
  }
}

/**
 * Evaluate a formula string with the given context
 */
function evaluateFormula(formula: string, context: FormulaContext): number {
  // Handle fixed values
  if (formula.startsWith('fixed:')) {
    return parseInt(formula.split(':')[1]) || 0
  }

  // Handle ability modifiers
  const abilityModifierMatch = formula.match(/^(\w+)_modifier$/)
  if (abilityModifierMatch) {
    const ability = abilityModifierMatch[1] as keyof FormulaContext
    const score = context[ability]
    if (typeof score === 'number') {
      return Math.max(1, Math.floor((score - 10) / 2))
    }
  }

  // Handle proficiency bonus
  if (formula === 'proficiency_bonus') {
    return context.proficiencyBonus
  }

  // Handle level-based formulas
  if (formula === 'level') {
    return context.level
  }

  // Handle complex expressions with level
  if (formula.includes('level')) {
    try {
      // Replace level with actual value and evaluate
      const expression = formula.replace(/level/g, context.level.toString())
      const result = eval(expression)
      return Math.floor(result)
    } catch (error) {
      console.error(`Invalid formula: ${formula}`, error)
      return 0
    }
  }

  // Handle specific class formulas
  if (formula === 'warlock_invocations_known') {
    return getWarlockInvocationsKnown(context.level)
  }

  if (formula === 'artificer_infusions_known') {
    return getArtificerInfusionsKnown(context.level)
  }

  // Handle expressions with ability modifiers
  if (formula.includes('_modifier')) {
    try {
      let expression = formula
      // Replace ability modifiers
      expression = expression.replace(/charisma_modifier/g, Math.floor((context.charisma - 10) / 2).toString())
      expression = expression.replace(/intelligence_modifier/g, Math.floor((context.intelligence - 10) / 2).toString())
      expression = expression.replace(/wisdom_modifier/g, Math.floor((context.wisdom - 10) / 2).toString())
      expression = expression.replace(/strength_modifier/g, Math.floor((context.strength - 10) / 2).toString())
      expression = expression.replace(/dexterity_modifier/g, Math.floor((context.dexterity - 10) / 2).toString())
      expression = expression.replace(/constitution_modifier/g, Math.floor((context.constitution - 10) / 2).toString())
      
      const result = eval(expression)
      return Math.max(1, Math.floor(result))
    } catch (error) {
      console.error(`Invalid formula: ${formula}`, error)
      return 0
    }
  }

  console.warn(`Unknown formula: ${formula}`)
  return 0
}

/**
 * Get Warlock invocations known by level
 */
function getWarlockInvocationsKnown(level: number): number {
  const invocationsKnown = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 8, 8]
  return invocationsKnown[Math.min(level - 1, 19)] || 0
}

/**
 * Get Artificer infusions known by level
 */
function getArtificerInfusionsKnown(level: number): number {
  const infusionsKnown = [0, 0, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 8, 10, 10, 10, 10, 12, 12, 12]
  const levelIndex = Math.min(level - 1, infusionsKnown.length - 1)
  return infusionsKnown[levelIndex] || 0
}

/**
 * Validate a feature skill configuration
 */
export function validateFeatureSkill(feature: ClassFeatureSkill): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic validation
  if (!feature.id || feature.id.trim() === '') {
    errors.push('Feature ID is required')
  }

  if (!feature.title || feature.title.trim() === '') {
    errors.push('Feature title is required')
  }

  if (feature.enabledAtLevel < 1 || feature.enabledAtLevel > 20) {
    errors.push('Enabled at level must be between 1 and 20')
  }

  // Type-specific validation
  switch (feature.featureType) {
    case 'slots':
      const slotConfig = feature.config as SlotConfig
      if (!slotConfig.usesFormula || slotConfig.usesFormula.trim() === '') {
        errors.push('Uses formula is required for slots features')
      }
      if (!slotConfig.replenishOn) {
        errors.push('Replenish timing is required for slots features')
      }
      break

    case 'points_pool':
      const pointsConfig = feature.config as PointsPoolConfig
      if (!pointsConfig.totalFormula || pointsConfig.totalFormula.trim() === '') {
        errors.push('Total formula is required for points pool features')
      }
      if (!pointsConfig.replenishOn) {
        errors.push('Replenish timing is required for points pool features')
      }
      break

    case 'options_list':
      const optionsConfig = feature.config as OptionsListConfig
      if (!optionsConfig.maxSelectionsFormula || optionsConfig.maxSelectionsFormula.trim() === '') {
        errors.push('Max selections formula is required for options list features')
      }
      if (!optionsConfig.optionsSource) {
        errors.push('Options source is required for options list features')
      }
      if (optionsConfig.optionsSource === 'database' && !optionsConfig.databaseTable) {
        errors.push('Database table is required when using database options source')
      }
      break

    case 'special_ux':
      const specialConfig = feature.config as SpecialUXConfig
      if (!specialConfig.componentId || specialConfig.componentId.trim() === '') {
        errors.push('Component ID is required for special UX features')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Get a feature template by ID
 */
export function getFeatureTemplate(templateId: string): ClassFeatureSkill | null {
  return FEATURE_TEMPLATES[templateId] || null
}

/**
 * Get all available feature templates
 */
export function getAllFeatureTemplates(): ClassFeatureSkill[] {
  return Object.values(FEATURE_TEMPLATES)
}

/**
 * Get feature templates by type
 */
export function getFeatureTemplatesByType(featureType: string): ClassFeatureSkill[] {
  return Object.values(FEATURE_TEMPLATES).filter(template => template.featureType === featureType)
}
