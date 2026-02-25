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
export function calculateUsesFromFormula(formula: string, character: CharacterData, className?: string): number {
  const context = createFormulaContext(character, className)
  return evaluateFormula(formula, context)
}

/**
 * Create a formula evaluation context from character data
 */
function createFormulaContext(character: CharacterData, className?: string): FormulaContext {
  // For multiclassed characters, use the specific class level if provided
  let effectiveLevel = character.level
  if (className && character.classes && character.classes.length > 1) {
    const classData = character.classes.find(c => c.name.toLowerCase() === className.toLowerCase())
    if (classData) {
      effectiveLevel = classData.level
    }
  }
  
  // Use character's proficiencyBonus if available, otherwise calculate from total level
  const profBonus = character.proficiencyBonus ?? calculateProficiencyBonus(character.level)
  
  return {
    level: effectiveLevel,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    proficiencyBonus: profBonus
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

  // Handle proficiency bonus FIRST (before ability modifiers to avoid false matches)
  if (formula === 'proficiency_bonus' || formula === 'proficiency') {
    return context.proficiencyBonus
  }

  // Handle simple ability modifiers (only if it's a simple modifier, not in an expression)
  if (!formula.includes('+') && !formula.includes('-') && !formula.includes('*') && !formula.includes('/')) {
    const abilityModifierMatch = formula.match(/^(\w+)_modifier$/)
    if (abilityModifierMatch) {
      const ability = abilityModifierMatch[1] as keyof FormulaContext
      const score = context[ability]
      if (typeof score === 'number') {
        return Math.max(1, Math.floor((score - 10) / 2))
      }
    }
    
    // Handle simple numeric values (only if it's a pure number, not part of an expression)
    const numericValue = parseInt(formula)
    if (!isNaN(numericValue)) {
      return numericValue
    }
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

  // Handle expressions with ability modifiers or proficiency bonus
  if (formula.includes('_modifier') || formula.includes('proficiency_bonus') || formula.includes('proficiency')) {
    try {
      let expression = formula
      // Replace proficiency bonus first (before ability modifiers to avoid conflicts)
      expression = expression.replace(/proficiency_bonus/g, context.proficiencyBonus.toString())
      expression = expression.replace(/\bproficiency\b/g, context.proficiencyBonus.toString())
      
      // Replace ability modifiers
      expression = expression.replace(/charisma_modifier/g, Math.floor((context.charisma - 10) / 2).toString())
      expression = expression.replace(/intelligence_modifier/g, Math.floor((context.intelligence - 10) / 2).toString())
      expression = expression.replace(/wisdom_modifier/g, Math.floor((context.wisdom - 10) / 2).toString())
      expression = expression.replace(/strength_modifier/g, Math.floor((context.strength - 10) / 2).toString())
      expression = expression.replace(/dexterity_modifier/g, Math.floor((context.dexterity - 10) / 2).toString())
      expression = expression.replace(/constitution_modifier/g, Math.floor((context.constitution - 10) / 2).toString())
      
      // Debug logging for complex formulas
      if (formula.includes('+') || formula.includes('-') || formula.includes('*') || formula.includes('/')) {
        console.log('Evaluating complex formula:', {
          original: formula,
          expression: expression,
          context: {
            proficiencyBonus: context.proficiencyBonus,
            charisma: context.charisma,
            charismaMod: Math.floor((context.charisma - 10) / 2)
          }
        })
      }
      
      const result = eval(expression)
      const finalResult = Math.max(1, Math.floor(result))
      
      if (formula.includes('+') || formula.includes('-') || formula.includes('*') || formula.includes('/')) {
        console.log('Formula result:', { formula, result, finalResult })
      }
      
      return finalResult
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
 * Delegates to character-data.ts version which supports classData param
 */
function getWarlockInvocationsKnown(level: number): number {
  // Import dynamically to avoid circular dependency
  const { getWarlockInvocationsKnown: getFromCharData } = require('./character-data')
  return getFromCharData(level)
}

/**
 * Get Artificer infusions known by level
 * Delegates to character-data.ts version which supports classData param
 */
function getArtificerInfusionsKnown(level: number): number {
  // Import dynamically to avoid circular dependency
  const { getArtificerInfusionsKnown: getFromCharData } = require('./character-data')
  return getFromCharData(level)
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

/**
 * Resolve template variables in a feature description string.
 * 
 * Any {variable} token in the description is replaced with its computed value.
 *
 * Built-in variables:
 *   {dice}                  - Current die from config (level scaling → baseDice → dieType[])
 *   {proficiency_bonus}     - Proficiency bonus (also {proficiency})
 *   {charisma_modifier}     - Charisma modifier (also {charisma_mod})
 *   {intelligence_modifier} - Intelligence modifier (also {intelligence_mod})
 *   {wisdom_modifier}       - Wisdom modifier (also {wisdom_mod})
 *   {strength_modifier}     - Strength modifier (also {strength_mod})
 *   {dexterity_modifier}    - Dexterity modifier (also {dexterity_mod})
 *   {constitution_modifier} - Constitution modifier (also {constitution_mod})
 *   {level}                 - Class level (or total level if no class)
 *   {max_uses}              - Calculated max uses (pass as extra)
 *   {max_points}            - Calculated max points (pass as extra)
 *
 * Config-driven variables:
 *   Any string or number property on the effective config (after level scaling is applied)
 *   is also available as a variable. For example, if config has { "dice": "1d8" }, then
 *   {dice} resolves to "1d8". Properties from config.override are also included.
 */
export function resolveDescriptionVariables(
  description: string,
  character: CharacterData,
  config?: any,
  className?: string,
  extras?: { maxUses?: number; maxPoints?: number }
): string {
  if (!description || !description.includes('{')) return description

  const vars = buildVariableLookup(character, config, className, extras)

  // Replace all {variable} tokens
  return description.replace(/\{(\w+)\}/g, (match, varName) => {
    return vars[varName] !== undefined ? vars[varName] : match
  })
}

/**
 * Segment type for styled description rendering.
 * 'text' segments are plain text, 'variable' segments are resolved template values
 * that should be displayed as styled badges.
 */
export interface DescriptionSegment {
  type: 'text' | 'variable'
  value: string
}

/**
 * Like resolveDescriptionVariables, but returns an array of segments so the UI
 * can render resolved variables with custom styling (e.g. badges with mono font).
 *
 * Text between variables is returned as 'text' segments, and each resolved
 * {variable} is returned as a 'variable' segment with the computed value.
 * Unresolved variables are kept as plain text.
 */
export function resolveDescriptionSegments(
  description: string,
  character: CharacterData,
  config?: any,
  className?: string,
  extras?: { maxUses?: number; maxPoints?: number }
): DescriptionSegment[] {
  if (!description) return []
  if (!description.includes('{')) return [{ type: 'text', value: description }]

  const vars = buildVariableLookup(character, config, className, extras)

  const segments: DescriptionSegment[] = []
  let lastIndex = 0
  const pattern = /\{(\w+)\}/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(description)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: description.slice(lastIndex, match.index) })
    }

    const varName = match[1]
    if (vars[varName] !== undefined) {
      segments.push({ type: 'variable', value: vars[varName] })
    } else {
      // Unresolved variable → keep as plain text
      segments.push({ type: 'text', value: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Push remaining text after last match
  if (lastIndex < description.length) {
    segments.push({ type: 'text', value: description.slice(lastIndex) })
  }

  return segments
}

/**
 * Build the variable lookup map used by both resolveDescriptionVariables and resolveDescriptionSegments.
 */
function buildVariableLookup(
  character: CharacterData,
  config?: any,
  className?: string,
  extras?: { maxUses?: number; maxPoints?: number }
): Record<string, string> {
  const context = createFormulaContext(character, className)

  const vars: Record<string, string> = {
    'charisma_modifier': formatSignedMod(context.charisma),
    'charisma_mod': formatSignedMod(context.charisma),
    'intelligence_modifier': formatSignedMod(context.intelligence),
    'intelligence_mod': formatSignedMod(context.intelligence),
    'wisdom_modifier': formatSignedMod(context.wisdom),
    'wisdom_mod': formatSignedMod(context.wisdom),
    'strength_modifier': formatSignedMod(context.strength),
    'strength_mod': formatSignedMod(context.strength),
    'dexterity_modifier': formatSignedMod(context.dexterity),
    'dexterity_mod': formatSignedMod(context.dexterity),
    'constitution_modifier': formatSignedMod(context.constitution),
    'constitution_mod': formatSignedMod(context.constitution),
    'proficiency_bonus': String(context.proficiencyBonus),
    'proficiency': String(context.proficiencyBonus),
    'level': String(context.level),
  }

  if (config?.override && typeof config.override === 'object') {
    for (const [key, value] of Object.entries(config.override)) {
      if (typeof value === 'string' || typeof value === 'number') {
        vars[key] = String(value)
      }
    }
  }

  if (config && typeof config === 'object') {
    for (const [key, value] of Object.entries(config)) {
      if (key === 'override') continue
      if (typeof value === 'string' || typeof value === 'number') {
        vars[key] = String(value)
      }
    }
  }

  if (!vars['dice']) {
    if (config?.baseDice) {
      vars['dice'] = String(config.baseDice)
    } else if (config?.override?.baseDice) {
      vars['dice'] = String(config.override.baseDice)
    }
  }
  if (!vars['dice'] && config?.dieType && Array.isArray(config.dieType)) {
    const dieIndex = Math.min(Math.max(context.level - 1, 0), config.dieType.length - 1)
    vars['dice'] = config.dieType[dieIndex] || 'd6'
  }

  if (extras?.maxUses !== undefined) vars['max_uses'] = String(extras.maxUses)
  if (extras?.maxPoints !== undefined) vars['max_points'] = String(extras.maxPoints)

  return vars
}

/** Helper: compute ability modifier and return as a string (just the number, no sign) */
function formatSignedMod(score: number): string {
  return String(Math.floor((score - 10) / 2))
}
