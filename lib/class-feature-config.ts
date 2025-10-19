import type { CharacterData } from "@/lib/character-data"

/**
 * Configuration for special UX features
 */
export interface FeatureConfig {
  [key: string]: any
  override?: {
    [key: string]: any
  }
}

/**
 * Get the effective configuration for a special UX feature by merging base config with overrides
 */
export function getEffectiveFeatureConfig(
  character: CharacterData,
  componentId: string,
  baseConfig: FeatureConfig = {}
): FeatureConfig {
  // TODO: This should query the class_features table to get all configurations
  // for the character's classes and merge them properly
  
  // For now, return the base config
  // In the future, this will:
  // 1. Get all class features for the character's classes
  // 2. Filter for features with feature_skill_type = 'special_ux'
  // 3. Filter for features with componentId matching the requested component
  // 4. Sort by level (ascending)
  // 5. Merge configurations, with later levels overriding earlier ones
  
  return baseConfig
}

/**
 * Get the maximum number of eldritch cannons for a character
 */
export function getMaxEldritchCannons(character: CharacterData): number {
  const baseConfig = {
    maxCannons: 1,
    baseHitPoints: 5,
    baseArmorClass: 18
  }
  
  const effectiveConfig = getEffectiveFeatureConfig(character, 'eldritch-cannon', baseConfig)
  
  // Check for Fortified Position feature (level 15 Artillerist)
  // This would normally come from the database
  const hasFortifiedPosition = hasFeatureAtLevel(character, 'Fortified Position', 15)
  
  if (hasFortifiedPosition) {
    return effectiveConfig.override?.maxCannons || 2
  }
  
  return effectiveConfig.maxCannons || 1
}

/**
 * Get the maximum number of infused items for a character
 */
export function getMaxInfusedItems(character: CharacterData): number {
  // Use the base Artificer calculation: Intelligence modifier (minimum 1)
  if (character.class.toLowerCase() !== 'artificer') {
    return 0
  }
  
  const intelligenceModifier = Math.floor((character.intelligence - 10) / 2)
  return Math.max(1, intelligenceModifier)
}

/**
 * Get the number of infusions known for a character from class features
 */
export function getInfusionsKnown(character: CharacterData): number {
  if (character.class.toLowerCase() !== 'artificer') {
    return 0
  }
  
  // Try to get from class features first
  const infusionsFeature = character.classes
    ?.flatMap(c => c.features || [])
    .find(f => f.feature_skill_type === 'options_list' && f.title?.toLowerCase().includes('infuse'))
  
  if (infusionsFeature?.class_features_skills?.config) {
    const config = infusionsFeature.class_features_skills.config as any
    if (config.maxSelections) {
      return config.maxSelections
    }
  }
  
  // Fallback to hardcoded progression
  const infusionsKnown = [0, 0, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 8, 10, 10, 10, 10, 12, 12, 12]
  const levelIndex = Math.min(character.level - 1, infusionsKnown.length - 1)
  return infusionsKnown[levelIndex] || 0
}

/**
 * Check if a character has a specific feature at a specific level
 * TODO: This should query the class_features table
 */
function hasFeatureAtLevel(character: CharacterData, featureName: string, minLevel: number): boolean {
  // This is a placeholder - in the real implementation, this would:
  // 1. Query class_features table for features with the given name
  // 2. Check if the character has the required class levels
  // 3. Return true if the feature is available
  
  // For now, use hardcoded logic as fallback
  if (featureName === 'Fortified Position') {
    const isArtillerist = character.classes?.some(c => 
      c.name.toLowerCase() === 'artificer' && 
      c.subclass?.toLowerCase() === 'artillerist'
    )
    const artificerLevel = character.classes?.reduce((total, c) => 
      c.name.toLowerCase() === 'artificer' ? total + (c.level || 0) : total, 0
    ) || 0
    
    return isArtillerist && artificerLevel >= minLevel
  }
  
  if (featureName === 'Enhanced Infusions') {
    const isArtificer = character.classes?.some(c => c.name.toLowerCase() === 'artificer')
    const artificerLevel = character.classes?.reduce((total, c) => 
      c.name.toLowerCase() === 'artificer' ? total + (c.level || 0) : total, 0
    ) || 0
    
    return isArtificer && artificerLevel >= minLevel
  }
  
  return false
}

/**
 * Evaluate a formula string (e.g., "level + 1") with character data
 */
function evaluateFormula(formula: string, character: CharacterData): number {
  // Simple formula evaluation - in a real implementation, this would be more sophisticated
  if (formula.includes('level')) {
    const level = character.level || 1
    if (formula === 'level + 1') return level + 1
    if (formula === 'level + 2') return level + 2
    if (formula === 'level') return level
  }
  
  // Try to parse as a number
  const num = parseInt(formula)
  return isNaN(num) ? 1 : num
}

/**
 * Get the effective configuration for a slots feature with level-based scaling
 */
export function getEffectiveSlotsConfig(
  character: CharacterData,
  baseConfig: any,
  classLevel: number
): any {
  if (!baseConfig || !baseConfig.override) {
    return baseConfig
  }

  const override = baseConfig.override
  let effectiveConfig = { ...baseConfig }

  // Apply level-based scaling
  if (override.levelScaling) {
    const levelScaling = override.levelScaling
    const levels = Object.keys(levelScaling)
      .map(Number)
      .sort((a, b) => b - a) // Sort descending to find highest applicable level

    // Find the highest level that applies
    for (const level of levels) {
      if (classLevel >= level) {
        const scalingConfig = levelScaling[level.toString()]
        effectiveConfig = { ...effectiveConfig, ...scalingConfig }
        break
      }
    }
  }

  return effectiveConfig
}

/**
 * Get the effective dice size for a feature with level-based scaling
 */
export function getEffectiveDiceSize(
  character: CharacterData,
  baseConfig: any,
  classLevel: number
): string {
  const effectiveConfig = getEffectiveSlotsConfig(character, baseConfig, classLevel)
  return effectiveConfig.dice || effectiveConfig.baseDice || '1d6'
}

/**
 * Calculate skill modifier bonuses from class features
 * This function evaluates all skill modifier features and returns the total bonus
 */
export function calculateSkillModifierBonus(
  character: CharacterData,
  skillName: string,
  skillType: 'skill' | 'saving_throw' | 'ability_check' | 'attack_roll' | 'damage_roll',
  isProficient: boolean,
  proficiencyBonus: number
): number {
  let totalBonus = 0

  // Get all class features that might affect this skill
  const relevantFeatures = character.classes
    ?.flatMap(c => c.features || [])
    .filter(f => 
      f.feature_skill_type === 'skill_modifier' && 
      f.class_features_skills?.config?.modifierType === skillType &&
      f.level <= character.level
    ) || []

  for (const feature of relevantFeatures) {
    const config = feature.class_features_skills?.config
    if (!config) continue

    // Check if this feature applies to this specific skill
    const targetSkills = config.targetSkills || []
    if (targetSkills.length > 0 && !targetSkills.includes(skillName)) {
      continue
    }

    // Check condition
    const condition = config.condition
    if (condition) {
      if (condition.type === 'proficient' && !isProficient) continue
      if (condition.type === 'not_proficient' && isProficient) continue
    }

    // Calculate the modifier value
    const modifierValue = evaluateModifierFormula(config.modifierFormula, proficiencyBonus)
    totalBonus += modifierValue
  }

  return totalBonus
}

/**
 * Evaluate a modifier formula string
 */
function evaluateModifierFormula(formula: string, proficiencyBonus: number): number {
  try {
    // Replace common formula patterns
    let processedFormula = formula
      .replace(/proficiency_bonus/g, String(proficiencyBonus))
      .replace(/half_proficiency_bonus/g, String(Math.floor(proficiencyBonus / 2)))
      .replace(/\*/g, '*')
      .replace(/\//g, '/')

    // Evaluate the formula
    return eval(processedFormula) || 0
  } catch (error) {
    console.error("Error evaluating modifier formula:", formula, error)
    return 0
  }
}

/**
 * Get all active skill modifier features for a character
 */
export function getActiveSkillModifierFeatures(character: CharacterData): Array<{
  title: string
  config: any
  level: number
}> {
  return character.classes
    ?.flatMap(c => c.features || [])
    .filter(f => 
      f.feature_skill_type === 'skill_modifier' && 
      f.level <= character.level
    )
    .map(f => ({
      title: f.title,
      config: f.class_features_skills?.config,
      level: f.level
    })) || []
}
