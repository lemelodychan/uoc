import type { CharacterData } from "@/lib/character-data"

/**
 * Check if a character has a specific class feature based on class feature data
 * This function will eventually check the actual class_features table, but for now
 * uses the existing hardcoded logic as a fallback
 */
export function hasClassFeature(
  character: CharacterData, 
  featureSkillType: 'infusions' | 'eldritch-cannon' | 'eldritch-invocations' | 'metamagic' | 'flash-of-genius',
  minLevel?: number
): boolean {
  // Get all class levels for the character
  const classLevels = character.classes || []
  
  // Check each class for the feature
  for (const classData of classLevels) {
    const level = classData.level || 0
    if (minLevel && level < minLevel) continue
    
    // TODO: Replace this hardcoded logic with actual database queries
    // This should check the class_features table for features with:
    // - feature_skill_type = 'special_ux'
    // - class_features_skills.componentId = featureSkillType
    // - level <= character's class level
    
    // Check if this class has the specific feature skill type
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
export function getClassLevel(character: CharacterData, className: string): number {
  const classLevels = character.classes || []
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
 * Future implementation: Check class features from database
 * This will replace the hardcoded logic above once we have proper class feature data
 */
export async function hasClassFeatureFromDB(
  character: CharacterData,
  componentId: string,
  minLevel?: number
): Promise<boolean> {
  // TODO: Implement database query to check class_features table
  // This should:
  // 1. Get all class IDs for the character's classes
  // 2. Query class_features where:
  //    - class_id IN (character's class IDs)
  //    - feature_skill_type = 'special_ux'
  //    - class_features_skills->>'componentId' = componentId
  //    - level <= character's class level
  // 3. Return true if any matching features are found
  
  // For now, fall back to the hardcoded logic
  return hasClassFeature(character, componentId as any, minLevel)
}
