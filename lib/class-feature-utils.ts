import type { CharacterData } from "@/lib/character-data"

// Map from feature skill type to possible feature IDs in the classFeatureSkillsUsage
const FEATURE_ID_MAPPING: Record<string, string[]> = {
  'infusions': ['artificer-infusions', 'infusions', 'feature-infusions'],
  'eldritch-cannon': ['eldritch-cannon', 'feature-eldritch-cannon'],
  'eldritch-invocations': ['eldritch-invocations', 'feature-eldritch-invocations'],
  'metamagic': ['metamagic', 'feature-metamagic'],
  'flash-of-genius': ['flash-of-genius', 'feature-flash-of-genius'],
}

/**
 * Check if a character has a specific class feature.
 *
 * Detection order:
 * 1. Check character's loaded classFeatureSkillsUsage (runtime data)
 * 2. Fall back to hardcoded class name checks
 */
export function hasClassFeature(
  character: CharacterData,
  featureSkillType: 'infusions' | 'eldritch-cannon' | 'eldritch-invocations' | 'metamagic' | 'flash-of-genius',
  minLevel?: number
): boolean {
  // 1. Check character's loaded classFeatureSkillsUsage for the feature
  if (character.classFeatureSkillsUsage) {
    const possibleIds = FEATURE_ID_MAPPING[featureSkillType] || [featureSkillType]
    for (const featureId of possibleIds) {
      if (character.classFeatureSkillsUsage[featureId]) {
        // Feature exists in usage data - check minLevel if specified
        if (minLevel) {
          const enabledAtLevel = (character.classFeatureSkillsUsage[featureId] as any)?.enabledAtLevel
          if (enabledAtLevel && enabledAtLevel > (character.level || 0)) {
            continue
          }
        }
        return true
      }
    }
  }

  // 2. Hardcoded fallback - check class names
  return hasClassFeatureHardcoded(character, featureSkillType, minLevel)
}

/**
 * Hardcoded fallback for class feature detection.
 * Will be removed once all features are fully data-driven.
 */
function hasClassFeatureHardcoded(
  character: CharacterData,
  featureSkillType: 'infusions' | 'eldritch-cannon' | 'eldritch-invocations' | 'metamagic' | 'flash-of-genius',
  minLevel?: number
): boolean {
  const classLevels = character.classes || []

  for (const classData of classLevels) {
    const level = classData.level || 0
    if (minLevel && level < minLevel) continue

    if (classData.name.toLowerCase() === 'artificer' && featureSkillType === 'infusions') {
      return true
    }

    if (classData.name.toLowerCase() === 'artificer' &&
        classData.subclass?.toLowerCase() === 'artillerist' &&
        featureSkillType === 'eldritch-cannon') {
      return true
    }

    if (classData.name.toLowerCase() === 'warlock' && featureSkillType === 'eldritch-invocations') {
      return true
    }

    if (classData.name.toLowerCase() === 'sorcerer' && featureSkillType === 'metamagic') {
      return true
    }

    if (classData.name.toLowerCase() === 'artificer' && featureSkillType === 'flash-of-genius') {
      return true
    }
  }

  return false
}

/**
 * Get the total level for a specific class
 */
export function getClassLevel(character: CharacterData | { classes: Array<{ name: string; level: number }> }, className: string): number {
  const classLevels = ('classes' in character ? character.classes : []) || []
  return classLevels
    .filter(c => c.name.toLowerCase() === className.toLowerCase())
    .reduce((total, c) => total + (c.level || 0), 0)
}

/**
 * Check if a character has a specific subclass
 */
export function hasSubclass(character: CharacterData, className: string, subclassName: string): boolean {
  const classLevels = character.classes || []
  return classLevels.some(c =>
    c.name.toLowerCase() === className.toLowerCase() &&
    c.subclass?.toLowerCase() === subclassName.toLowerCase()
  )
}

/**
 * Check class features from database (async version)
 * Falls back to synchronous hasClassFeature
 */
export async function hasClassFeatureFromDB(
  character: CharacterData,
  componentId: string,
  minLevel?: number
): Promise<boolean> {
  return hasClassFeature(character, componentId as any, minLevel)
}
