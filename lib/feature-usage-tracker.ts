/**
 * Unified Feature Usage Tracking System
 * 
 * This system manages all class feature usage in a single JSONB column
 * to avoid creating individual columns for each possible feature.
 */

import type { CharacterData } from './character-data'

export interface FeatureUsageData {
  [featureId: string]: {
    // Slots-based features (Bardic Inspiration, Flash of Genius, etc.)
    currentUses?: number
    maxUses?: number
    lastReset?: string // ISO timestamp
    
    // Points pool features (Lay on Hands, Ki Points, etc.)
    currentPoints?: number
    maxPoints?: number
    
    // Options list features (Infusions, Eldritch Invocations, etc.)
    selectedOptions?: string[] | Array<{
      id: string
      title: string
      description: string
      needsAttunement?: boolean
      [key: string]: any
    }>
    maxSelections?: number
    
    // Special UX features (Eldritch Cannon, etc.)
    customState?: Record<string, any>
    
    // Notes for features (Infusion notes, etc.)
    notes?: string
    
    // Availability toggle features (Song of Rest, Genie's Wrath, etc.)
    isAvailable?: boolean
    
    // Metadata
    featureName?: string
    featureType?: 'slots' | 'points_pool' | 'options_list' | 'special_ux' | 'skill_modifier' | 'availability_toggle'
    enabledAtLevel?: number
    lastUpdated?: string // ISO timestamp
  }
}

/**
 * Get the current feature usage data for a character
 */
export function getFeatureUsageData(character: CharacterData): FeatureUsageData {
  return character.classFeatureSkillsUsage || {}
}

/**
 * Get the custom description for a feature from the class features
 */
export function getFeatureCustomDescription(character: CharacterData, featureId: string): string | undefined {
  if (!character.classFeatures || !Array.isArray(character.classFeatures)) {
    console.log(`🔮 getFeatureCustomDescription: No class features found for ${featureId}`)
    return undefined
  }
  
  console.log(`🔮 getFeatureCustomDescription: Looking for feature ${featureId}`)
  console.log(`🔮 Available class features:`, character.classFeatures.map(f => ({
    title: f.title,
    level: f.level,
    class_features_skills: f.class_features_skills,
    feature_id: f.class_features_skills && typeof f.class_features_skills === 'object' && 'id' in f.class_features_skills ? (f.class_features_skills as any).id : 'no-id'
  })))
  
  // Find the feature in the class features
  // First try to match by ID, then by title as fallback
  const feature = character.classFeatures.find(f => {
    if (f.class_features_skills && typeof f.class_features_skills === 'object') {
      // Try to match by ID first
      if ('id' in f.class_features_skills && f.class_features_skills.id === featureId) {
        return true
      }
      // Fallback: match by title (convert featureId to title format)
      const titleFromId = featureId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
      
      // Special case for genies-wrath -> Genie's Wrath
      const normalizedTitleFromId = titleFromId === 'Genies Wrath' ? 'Genie\'s Wrath' : titleFromId
      
      console.log(`🔮 getFeatureCustomDescription: Checking title match: "${f.title}" === "${normalizedTitleFromId}"`)
      return f.title === normalizedTitleFromId
    }
    return false
  })
  
  if (feature && feature.class_features_skills && typeof feature.class_features_skills === 'object') {
    const customDescription = (feature.class_features_skills as any).customDescription
    console.log(`🔮 getFeatureCustomDescription: Found custom description for ${featureId}: "${customDescription}"`)
    return customDescription
  }
  
  console.log(`🔮 getFeatureCustomDescription: No custom description found for ${featureId}`)
  return undefined
}

/**
 * Get the max uses for a slots-based feature
 * First checks character usage data, then falls back to template-based calculation
 */
export function getFeatureMaxUses(character: CharacterData, featureId: string): number | undefined {
  // First check if the feature already has maxUses in the character's usage data
  const usage = getFeatureUsage(character, featureId)
  if (usage && usage.maxUses !== undefined) {
    console.log(`🔮 getFeatureMaxUses: Found maxUses in usage data for ${featureId}: ${usage.maxUses}`)
    return usage.maxUses
  }
  
  // Fall back to template-based calculation for common features
  console.log(`🔮 getFeatureMaxUses: Calculating max uses for ${featureId} from character stats`)
  
  switch (featureId) {
    case 'bardic-inspiration':
      // Bardic Inspiration uses Charisma modifier
      const charismaModifier = Math.floor((character.charisma - 10) / 2)
      const maxUses = Math.max(1, charismaModifier)
      console.log(`🔮 getFeatureMaxUses: Bardic Inspiration - Charisma: ${character.charisma}, Modifier: ${charismaModifier}, Max Uses: ${maxUses}`)
      return maxUses
      
    case 'flash-of-genius':
      // Flash of Genius uses Intelligence modifier
      const intelligenceModifier = Math.floor((character.intelligence - 10) / 2)
      const flashMaxUses = Math.max(1, intelligenceModifier)
      console.log(`🔮 getFeatureMaxUses: Flash of Genius - Intelligence: ${character.intelligence}, Modifier: ${intelligenceModifier}, Max Uses: ${flashMaxUses}`)
      return flashMaxUses
      
    case 'divine-sense':
      // Divine Sense uses 1 + Charisma modifier
      const divineCharismaModifier = Math.floor((character.charisma - 10) / 2)
      const divineMaxUses = Math.max(1, 1 + divineCharismaModifier)
      console.log(`🔮 getFeatureMaxUses: Divine Sense - Charisma: ${character.charisma}, Modifier: ${divineCharismaModifier}, Max Uses: ${divineMaxUses}`)
      return divineMaxUses
      
    default:
      console.log(`🔮 getFeatureMaxUses: No max uses calculation found for ${featureId}`)
      return undefined
  }
}

/**
 * Update max uses for features that depend on character stats (like proficiency bonus)
 */
export function updateFeatureMaxUses(character: CharacterData, featureId: string): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage) return getFeatureUsageData(character)
  
  const newMaxUses = getFeatureMaxUses(character, featureId)
  if (newMaxUses !== undefined && newMaxUses !== usage.maxUses) {
    // When leveling up, give all new slots as available immediately
    return updateFeatureUsage(character, featureId, { 
      maxUses: newMaxUses, 
      currentUses: newMaxUses // All slots available immediately on level up
    })
  }
  
  return getFeatureUsageData(character)
}

/**
 * Update all features that depend on character stats (like proficiency bonus)
 */
export function updateAllDynamicFeatures(character: CharacterData): FeatureUsageData {
  let updatedUsage = getFeatureUsageData(character)
  
  // Update Elemental Gift if it exists
  if (updatedUsage['elemental-gift']) {
    updatedUsage = updateFeatureMaxUses(character, 'elemental-gift')
  }
  
  // Add more features here as needed
  
  return updatedUsage
}

/**
 * Update feature usage data for a character
 */
export function updateFeatureUsage(
  character: CharacterData,
  featureId: string,
  updates: Partial<FeatureUsageData[string]>
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  
  return {
    ...currentUsage,
    [featureId]: {
      ...currentUsage[featureId],
      ...updates,
      lastUpdated: new Date().toISOString()
    }
  }
}

/**
 * Get usage data for a specific feature
 */
export function getFeatureUsage(character: CharacterData, featureId: string): FeatureUsageData[string] | null {
  const usageData = getFeatureUsageData(character)
  return usageData[featureId] || null
}

/**
 * Initialize feature usage data for a new feature
 */
export function initializeFeatureUsage(
  character: CharacterData,
  featureId: string,
  featureConfig: {
    featureName: string
    featureType: 'slots' | 'points_pool' | 'options_list' | 'special_ux' | 'skill_modifier' | 'availability_toggle'
    enabledAtLevel: number
    maxUses?: number
    maxPoints?: number
    maxSelections?: number
    isAvailable?: boolean
  }
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  
  // Don't reinitialize if already exists
  if (currentUsage[featureId]) {
    return currentUsage
  }
  
  const newUsage: FeatureUsageData[string] = {
    featureName: featureConfig.featureName,
    featureType: featureConfig.featureType,
    enabledAtLevel: featureConfig.enabledAtLevel,
    lastUpdated: new Date().toISOString()
  }
  
  // Initialize based on feature type
  switch (featureConfig.featureType) {
    case 'slots':
      newUsage.currentUses = featureConfig.maxUses || 0
      newUsage.maxUses = featureConfig.maxUses || 0
      break
    case 'points_pool':
      newUsage.currentPoints = featureConfig.maxPoints || 0
      newUsage.maxPoints = featureConfig.maxPoints || 0
      break
    case 'availability_toggle':
      newUsage.isAvailable = featureConfig.isAvailable ?? true
      break
    case 'options_list':
      newUsage.selectedOptions = []
      newUsage.maxSelections = featureConfig.maxSelections || 0
      break
    case 'special_ux':
      newUsage.customState = {}
      break
    case 'skill_modifier':
      // Skill modifiers don't need usage tracking
      break
  }
  
  return {
    ...currentUsage,
    [featureId]: newUsage
  }
}

/**
 * Add a single feature to existing usage data without overwriting other features
 */
export function addSingleFeature(
  character: CharacterData,
  featureId: string,
  featureConfig: {
    featureName: string
    featureType: 'slots' | 'points_pool' | 'options_list' | 'special_ux' | 'skill_modifier' | 'availability_toggle'
    enabledAtLevel: number
    maxUses?: number
    maxPoints?: number
    maxSelections?: number
    isAvailable?: boolean
  }
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  
  // Don't add if already exists
  if (currentUsage[featureId]) {
    return currentUsage
  }
  
  const newUsage: FeatureUsageData[string] = {
    featureName: featureConfig.featureName,
    featureType: featureConfig.featureType,
    enabledAtLevel: featureConfig.enabledAtLevel,
    lastUpdated: new Date().toISOString()
  }
  
  // Initialize based on feature type
  switch (featureConfig.featureType) {
    case 'slots':
      newUsage.currentUses = featureConfig.maxUses || 0
      newUsage.maxUses = featureConfig.maxUses || 0
      break
    case 'points_pool':
      newUsage.currentPoints = featureConfig.maxPoints || 0
      newUsage.maxPoints = featureConfig.maxPoints || 0
      break
    case 'availability_toggle':
      newUsage.isAvailable = featureConfig.isAvailable ?? true
      break
    case 'options_list':
      newUsage.selectedOptions = []
      newUsage.maxSelections = featureConfig.maxSelections || 0
      break
    case 'special_ux':
      newUsage.customState = {}
      break
    case 'skill_modifier':
      // Skill modifiers don't need usage tracking
      break
  }
  
  return {
    ...currentUsage,
    [featureId]: newUsage
  }
}

/**
 * Reset feature usage (for short/long rest)
 */
export function resetFeatureUsage(
  character: CharacterData,
  featureId: string,
  resetType: 'short_rest' | 'long_rest' | 'dawn'
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage) return getFeatureUsageData(character)
  
  const currentUsage = getFeatureUsageData(character)
  const now = new Date().toISOString()
  
  // Determine what to reset based on feature type and reset type
  const updates: Partial<FeatureUsageData[string]> = {
    lastReset: now
  }
  
  switch (usage.featureType) {
    case 'slots':
      // Reset to max uses on long rest, or based on feature config
      if (resetType === 'long_rest' || resetType === 'dawn') {
        updates.currentUses = usage.maxUses || 0
      }
      break
    case 'points_pool':
      // Reset to max points on long rest
      if (resetType === 'long_rest' || resetType === 'dawn') {
        updates.currentPoints = usage.maxPoints || 0
      }
      break
    case 'availability_toggle':
      // Reset availability to true on long rest
      if (resetType === 'long_rest' || resetType === 'dawn') {
        updates.isAvailable = true
      }
      break
    case 'options_list':
      // Options typically don't reset on rest
      break
    case 'special_ux':
      // Custom reset logic based on feature
      if (usage.customState) {
        updates.customState = { ...usage.customState }
        // Add custom reset logic here based on specific features
      }
      break
  }
  
  return updateFeatureUsage(character, featureId, updates)
}

/**
 * Reset all features for a character (for short/long rest)
 */
export function resetAllFeatureUsage(
  character: CharacterData,
  resetType: 'short_rest' | 'long_rest' | 'dawn'
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  let updatedUsage = { ...currentUsage }
  
  // Reset each feature
  Object.keys(currentUsage).forEach(featureId => {
    updatedUsage = resetFeatureUsage(
      { ...character, classFeatureSkillsUsage: updatedUsage },
      featureId,
      resetType
    )
  })
  
  return updatedUsage
}

/**
 * Use a slot-based feature (decrement current uses)
 */
export function useFeatureSlot(
  character: CharacterData,
  featureId: string,
  amount: number = 1
): FeatureUsageData {
  let usage = getFeatureUsage(character, featureId)
  let workingCharacter = character
  
  // Initialize feature if it doesn't exist
  if (!usage) {
    // For Flash of Genius, initialize with Intelligence modifier
    if (featureId === 'flash-of-genius' && character.class.toLowerCase() === 'artificer' && character.level >= 7) {
      const maxUses = Math.max(1, Math.floor((character.intelligence - 10) / 2))
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Flash of Genius',
        featureType: 'slots',
        enabledAtLevel: 7,
        maxUses: maxUses
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    // For Genie's Wrath, initialize with default values
    else if (featureId === 'genies-wrath' && character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 1) {
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Genie\'s Wrath',
        featureType: 'availability_toggle',
        enabledAtLevel: 1,
        isAvailable: true
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    // For Elemental Gift, initialize with values from class features table
    else if (featureId === 'elemental-gift' && character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 6) {
      const maxUses = getFeatureMaxUses(character, featureId) || 1 // Default to 1 if not found in class features
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Elemental Gift',
        featureType: 'slots',
        enabledAtLevel: 6,
        maxUses: maxUses
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    else {
      return getFeatureUsageData(character)
    }
  }
  
  if (!usage || usage.featureType !== 'slots') {
    return getFeatureUsageData(workingCharacter)
  }
  
  const newUses = Math.max(0, (usage.currentUses || 0) - amount)
  return updateFeatureUsage(workingCharacter, featureId, { currentUses: newUses })
}

/**
 * Restore a slot-based feature (increment current uses)
 */
export function restoreFeatureSlot(
  character: CharacterData,
  featureId: string,
  amount: number = 1
): FeatureUsageData {
  let usage = getFeatureUsage(character, featureId)
  let workingCharacter = character
  
  // Initialize feature if it doesn't exist
  if (!usage) {
    // For Flash of Genius, initialize with Intelligence modifier
    if (featureId === 'flash-of-genius' && character.class.toLowerCase() === 'artificer' && character.level >= 7) {
      const maxUses = Math.max(1, Math.floor((character.intelligence - 10) / 2))
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Flash of Genius',
        featureType: 'slots',
        enabledAtLevel: 7,
        maxUses: maxUses
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    // For Genie's Wrath, initialize with default values
    else if (featureId === 'genies-wrath' && character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 1) {
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Genie\'s Wrath',
        featureType: 'availability_toggle',
        enabledAtLevel: 1,
        isAvailable: true
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    // For Elemental Gift, initialize with values from class features table
    else if (featureId === 'elemental-gift' && character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 6) {
      const maxUses = getFeatureMaxUses(character, featureId) || 1 // Default to 1 if not found in class features
      const updatedUsage = addSingleFeature(character, featureId, {
        featureName: 'Elemental Gift',
        featureType: 'slots',
        enabledAtLevel: 6,
        maxUses: maxUses
      })
      workingCharacter = { ...character, classFeatureSkillsUsage: updatedUsage }
      usage = getFeatureUsage(workingCharacter, featureId)
    }
    else {
      return getFeatureUsageData(character)
    }
  }
  
  if (!usage || usage.featureType !== 'slots') {
    return getFeatureUsageData(workingCharacter)
  }
  
  const maxUses = usage.maxUses || 0
  const newUses = Math.min(maxUses, (usage.currentUses || 0) + amount)
  return updateFeatureUsage(workingCharacter, featureId, { currentUses: newUses })
}

/**
 * Spend points from a points pool feature
 */
export function spendFeaturePoints(
  character: CharacterData,
  featureId: string,
  amount: number
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage || usage.featureType !== 'points_pool') {
    return getFeatureUsageData(character)
  }
  
  const newPoints = Math.max(0, (usage.currentPoints || 0) - amount)
  return updateFeatureUsage(character, featureId, { currentPoints: newPoints })
}

/**
 * Restore points to a points pool feature
 */
export function restoreFeaturePoints(
  character: CharacterData,
  featureId: string,
  amount: number
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage || usage.featureType !== 'points_pool') {
    return getFeatureUsageData(character)
  }
  
  const maxPoints = usage.maxPoints || 0
  const newPoints = Math.min(maxPoints, (usage.currentPoints || 0) + amount)
  return updateFeatureUsage(character, featureId, { currentPoints: newPoints })
}

/**
 * Add an option to an options list feature
 */
export function addFeatureOption(
  character: CharacterData,
  featureId: string,
  optionId: string | { id: string; title: string; description: string; needsAttunement?: boolean; [key: string]: any }
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage || usage.featureType !== 'options_list') {
    return getFeatureUsageData(character)
  }
  
  const currentOptions = usage.selectedOptions || []
  const maxSelections = usage.maxSelections || 0
  
  // Check if already selected (handle both string and object options)
  const isAlreadySelected = currentOptions.some(option => {
    if (typeof option === 'string') {
      return option === optionId || option === (optionId as any).id
    } else {
      return option.id === optionId || option.id === (optionId as any).id
    }
  })
  
  // Don't add if already selected or at max capacity
  if (isAlreadySelected || currentOptions.length >= maxSelections) {
    return getFeatureUsageData(character)
  }
  
  const newOptions = [...currentOptions, optionId]
  return updateFeatureUsage(character, featureId, { selectedOptions: newOptions })
}

/**
 * Remove an option from an options list feature
 */
export function removeFeatureOption(
  character: CharacterData,
  featureId: string,
  optionId: string
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage || usage.featureType !== 'options_list') {
    return getFeatureUsageData(character)
  }
  
  const currentOptions = usage.selectedOptions || []
  const newOptions = currentOptions.filter(option => {
    if (typeof option === 'string') {
      return option !== optionId
    } else {
      return option.id !== optionId
    }
  })
  return updateFeatureUsage(character, featureId, { selectedOptions: newOptions })
}

/**
 * Update custom state for a special UX feature
 */
export function updateFeatureCustomState(
  character: CharacterData,
  featureId: string,
  stateUpdates: Record<string, any>
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage || usage.featureType !== 'special_ux') {
    return getFeatureUsageData(character)
  }
  
  const currentState = usage.customState || {}
  const newState = { ...currentState, ...stateUpdates }
  return updateFeatureUsage(character, featureId, { customState: newState })
}

/**
 * Toggle availability for a special UX feature (like Song of Rest)
 */
export function toggleFeatureAvailability(
  character: CharacterData,
  featureId: string
): FeatureUsageData {
  const usage = getFeatureUsage(character, featureId)
  if (!usage) {
    return getFeatureUsageData(character)
  }
  
  // Handle different feature types
  if (usage.featureType === 'special_ux') {
    const currentState = usage.customState || {}
    const newState = { 
      ...currentState, 
      available: !currentState.available,
      lastUpdated: new Date().toISOString()
    }
    return updateFeatureUsage(character, featureId, { customState: newState })
  } else if (usage.featureType === 'availability_toggle') {
    const currentAvailable = usage.isAvailable ?? true
    return updateFeatureUsage(character, featureId, { 
      isAvailable: !currentAvailable,
      lastUpdated: new Date().toISOString()
    })
  }
  
  return getFeatureUsageData(character)
}

/**
 * Get all features that need to be reset on a specific rest type
 */
export function getFeaturesForReset(
  character: CharacterData,
  resetType: 'short_rest' | 'long_rest' | 'dawn'
): string[] {
  const usageData = getFeatureUsageData(character)
  const featuresToReset: string[] = []
  
  Object.entries(usageData).forEach(([featureId, usage]) => {
    // This would need to be enhanced to check the actual feature configuration
    // to determine what resets on what type of rest
    if (usage.featureType === 'slots' || usage.featureType === 'points_pool') {
      featuresToReset.push(featureId)
    }
  })
  
  return featuresToReset
}

/**
 * Update feature notes
 */
export function updateFeatureNotes(
  character: CharacterData,
  featureId: string,
  notes: string
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  const featureUsage = currentUsage[featureId] || {}
  
  return {
    ...currentUsage,
    [featureId]: {
      ...featureUsage,
      notes,
      lastUpdated: new Date().toISOString()
    }
  }
}

/**
 * Clean up usage data for features that are no longer available
 * (e.g., when character level changes or class changes)
 */
export function cleanupFeatureUsage(
  character: CharacterData,
  availableFeatureIds: string[]
): FeatureUsageData {
  const currentUsage = getFeatureUsageData(character)
  const cleanedUsage: FeatureUsageData = {}
  
  // Only keep usage data for features that are still available
  availableFeatureIds.forEach(featureId => {
    if (currentUsage[featureId]) {
      cleanedUsage[featureId] = currentUsage[featureId]
    }
  })
  
  return cleanedUsage
}
