/**
 * Feature Usage Migration System
 * 
 * This system migrates existing individual feature usage columns
 * to the unified class_features_skills_usage JSONB column.
 */

import type { CharacterData } from './character-data'
import { initializeFeatureUsage, updateFeatureUsage } from './feature-usage-tracker'

/**
 * Migrate existing character data to unified feature usage tracking
 */
export function migrateCharacterToUnifiedUsage(character: CharacterData): CharacterData {
  
  // Start with existing unified usage data to preserve it
  const migratedUsage: Record<string, any> = character.classFeatureSkillsUsage || {}
  
  // Migrate Flash of Genius (Artificer)
  if (character.class.toLowerCase() === 'artificer' && character.level >= 7) {
    const flashOfGeniusId = 'flash-of-genius'
    // Only migrate if not already in unified system
    if (!migratedUsage[flashOfGeniusId]) {
      const maxUses = Math.max(1, Math.floor((character.intelligence - 10) / 2)) // Intelligence modifier, minimum 1
      
      migratedUsage[flashOfGeniusId] = {
        featureName: 'Flash of Genius',
        featureType: 'slots',
        enabledAtLevel: 7,
        currentUses: maxUses, // Start with all uses available
        maxUses: maxUses,
        lastUpdated: new Date().toISOString()
      }
    }
  }
  
  // Migrate Bardic Inspiration (Bard)
  if (character.class.toLowerCase() === 'bard') {
    
    const bardicInspirationId = 'bardic-inspiration'
    // Only migrate if not already in unified system
    if (!migratedUsage[bardicInspirationId]) {
      const maxUses = Math.floor((character.charisma - 10) / 2) // Charisma modifier
      const currentUses = maxUses // Start with all uses available (legacy column dropped)
      
      
      migratedUsage[bardicInspirationId] = {
        featureName: 'Bardic Inspiration',
        featureType: 'slots',
        enabledAtLevel: 1,
        currentUses: Math.max(0, currentUses),
        maxUses: maxUses,
        lastUpdated: new Date().toISOString()
      }
    } else {
    }
    
    // Migrate Song of Rest (Bard)
    const songOfRestId = 'song-of-rest'
    // Only migrate if not already in unified system
    if (!migratedUsage[songOfRestId]) {
      // Song of Rest is available from level 2
      if (character.level >= 2) {
        const songOfRestAvailable = character.spellData?.songOfRest?.available ?? true
        
        
        migratedUsage[songOfRestId] = {
          featureName: 'Song of Rest',
          featureType: 'availability_toggle',
          enabledAtLevel: 2,
          isAvailable: songOfRestAvailable,
          lastUpdated: new Date().toISOString()
        }
      } else {
      }
    } else {
    }
  }
  
  // Migrate Infusions (Artificer)
  if (character.class.toLowerCase() === 'artificer') {
    const infusionsId = 'artificer-infusions'
    // Only migrate if not already in unified system
    if (!migratedUsage[infusionsId]) {
      const maxInfusions = Math.max(1, Math.floor((character.intelligence - 10) / 2))
      const selectedInfusions = [] // Legacy infusions column has been dropped
      
      migratedUsage[infusionsId] = {
      featureName: 'Infuse Item',
      featureType: 'options_list',
      enabledAtLevel: 2,
      selectedOptions: selectedInfusions.map(infusion => ({
        id: infusion.id || infusion.name || `infusion-${Date.now()}`,
        title: infusion.title || infusion.name || 'Untitled Infusion',
        description: infusion.description || '',
        needsAttunement: infusion.needsAttunement || false,
        ...infusion // Preserve any additional properties
      })),
      maxSelections: maxInfusions,
      notes: character.infusionNotes || '', // Include infusion notes
      lastUpdated: new Date().toISOString()
    }
    }
  }
  
  // Migrate Eldritch Cannon (Artificer Artillerist)
  if (character.class.toLowerCase() === 'artificer' && 
      character.subclass?.toLowerCase() === 'artillerist') {
    const eldritchCannonId = 'eldritch-cannon'
    // Only migrate if not already in unified system
    if (!migratedUsage[eldritchCannonId]) {
      migratedUsage[eldritchCannonId] = {
      featureName: 'Eldritch Cannon',
      featureType: 'special_ux',
      enabledAtLevel: 3,
      customState: {
        cannons: [],
        maxCannons: 1,
        lastUpdated: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    }
    }
  }
  
  // Migrate Warlock features
  if (character.class.toLowerCase() === 'warlock') {
    
    // Migrate Genie's Wrath (Genie Warlock)
    if (character.subclass?.toLowerCase() === 'the genie') {
      const genieWrathId = 'genies-wrath'
      // Only migrate if not already in unified system
      if (!migratedUsage[genieWrathId]) {
        // Since legacy columns have been dropped, start with default values
        const maxUses = 1 // Genie's Wrath is typically 1 use per turn
        const currentUses = maxUses // Start with all uses available
        
        
        migratedUsage[genieWrathId] = {
          featureName: 'Genie\'s Wrath',
          featureType: 'availability_toggle',
          enabledAtLevel: 1,
          isAvailable: true,
          lastUpdated: new Date().toISOString()
        }
      } else {
      }
    }
    
    // Migrate Elemental Gift (Genie Warlock)
    if (character.subclass?.toLowerCase() === 'the genie' && character.level >= 6) {
      const elementalGiftId = 'elemental-gift'
      // Only migrate if not already in unified system
      if (!migratedUsage[elementalGiftId]) {
        // Get max uses from class features table if available
        const { getFeatureMaxUses } = require('./feature-usage-tracker')
        const maxUses = getFeatureMaxUses(character, elementalGiftId) || 1 // Default to 1 if not found
        const currentUses = maxUses // Start with all uses available
        
        
        migratedUsage[elementalGiftId] = {
          featureName: 'Elemental Gift',
          featureType: 'slots',
          enabledAtLevel: 6,
          currentUses: currentUses,
          maxUses: maxUses,
          lastUpdated: new Date().toISOString()
        }
      } else {
      }
    }
    
    // Migrate Eldritch Invocations (Warlock)
    if (character.level >= 2) {
      const eldritchInvocationsId = 'eldritch-invocations'
      // Only migrate if not already in unified system
      if (!migratedUsage[eldritchInvocationsId]) {
        // Since legacy columns have been dropped, start with default values
        const maxInvocations = Math.floor(character.level / 2) + 1 // Warlock progression
        const selectedInvocations = [] // Start with no invocations selected
        
        
        migratedUsage[eldritchInvocationsId] = {
          featureName: 'Eldritch Invocations',
          featureType: 'options_list',
          enabledAtLevel: 2,
          selectedOptions: selectedInvocations,
          maxSelections: maxInvocations,
          lastUpdated: new Date().toISOString()
        }
      } else {
      }
    }
  }
  
  // Migrate Lay on Hands (Paladin)
  if (character.class.toLowerCase() === 'paladin') {
    const layOnHandsId = 'lay-on-hands'
    // Only migrate if not already in unified system
    if (!migratedUsage[layOnHandsId]) {
      // For multiclassed characters, use Paladin class level specifically
      const paladinClass = character.classes?.find(c => c.name.toLowerCase() === 'paladin')
      const paladinLevel = paladinClass?.level || character.level
      const maxPoints = paladinLevel * 5 // 5 points per Paladin level
      const currentPoints = maxPoints - (character.spellData?.layOnHands?.used || 0)
      
      migratedUsage[layOnHandsId] = {
      featureName: 'Lay on Hands',
      featureType: 'points_pool',
      enabledAtLevel: 1,
      currentPoints: Math.max(0, currentPoints),
      maxPoints: maxPoints,
      lastUpdated: new Date().toISOString()
    }
    }
  }
  
  // Migrate Channel Divinity (Cleric/Paladin)
  if (character.class.toLowerCase() === 'cleric' || character.class.toLowerCase() === 'paladin') {
    const channelDivinityId = 'channel-divinity'
    // Only migrate if not already in unified system
    if (!migratedUsage[channelDivinityId]) {
      const maxUses = character.level >= 6 ? 2 : 1 // Second use at 6th level
      const currentUses = maxUses - (character.spellData?.channelDivinitySlot?.currentUses || 0)
      
      migratedUsage[channelDivinityId] = {
      featureName: 'Channel Divinity',
      featureType: 'slots',
      enabledAtLevel: 2,
      currentUses: Math.max(0, currentUses),
      maxUses: maxUses,
      lastUpdated: new Date().toISOString()
    }
    }
  }
  
  // Migrate Divine Sense (Paladin)
  if (character.class.toLowerCase() === 'paladin') {
    const divineSenseId = 'divine-sense'
    // Only migrate if not already in unified system
    if (!migratedUsage[divineSenseId]) {
      const maxUses = Math.floor((character.charisma - 10) / 2) + 1 // Charisma modifier + 1
      const currentUses = maxUses - (character.spellData?.divineSenseSlot?.currentUses || 0)
      
      migratedUsage[divineSenseId] = {
      featureName: 'Divine Sense',
      featureType: 'slots',
      enabledAtLevel: 1,
      currentUses: Math.max(0, currentUses),
      maxUses: maxUses,
      lastUpdated: new Date().toISOString()
    }
    }
  }
  
  
  return {
    ...character,
    classFeatureSkillsUsage: migratedUsage
  }
}

/**
 * Check if a character needs migration to unified usage tracking
 */
export function needsMigration(character: CharacterData): boolean {
  // Since we've removed the old individual feature columns from the interface,
  // we should only check if the character has unified usage data
  const hasUnifiedUsage = character.classFeatureSkillsUsage && 
    Object.keys(character.classFeatureSkillsUsage).length > 0
  
  // If character already has unified usage data, no migration needed
  if (hasUnifiedUsage) {
    return false
  }
  
  // Check if character should have features based on their class/level
  // but doesn't have unified usage data yet
  const shouldHaveFeatures = (
    (character.class.toLowerCase() === 'artificer' && character.level >= 2) || // Infusions
    (character.class.toLowerCase() === 'artificer' && character.level >= 3 && character.subclass?.toLowerCase() === 'artillerist') || // Eldritch Cannon
    (character.class.toLowerCase() === 'artificer' && character.level >= 7) || // Flash of Genius
    (character.class.toLowerCase() === 'bard') || // Bardic Inspiration
    (character.class.toLowerCase() === 'warlock' && character.level >= 2) || // Eldritch Invocations
    (character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 1) || // Genie's Wrath
    (character.class.toLowerCase() === 'warlock' && character.subclass?.toLowerCase() === 'the genie' && character.level >= 6) || // Elemental Gift
    (character.class.toLowerCase() === 'paladin') || // Lay on Hands, Channel Divinity, Divine Sense
    (character.class.toLowerCase() === 'cleric') // Channel Divinity
  )
  
  const needsMig = shouldHaveFeatures && !hasUnifiedUsage
  
  
  return needsMig
}

/**
 * Migrate all characters in a campaign to unified usage tracking
 */
export async function migrateCampaignToUnifiedUsage(campaignId: string): Promise<{
  success: boolean
  migratedCount: number
  error?: string
}> {
  try {
    const { loadCharacters } = await import('./database')
    const { characters, error } = await loadCharacters(campaignId)
    
    if (error) {
      return { success: false, migratedCount: 0, error }
    }
    
    let migratedCount = 0
    const { saveCharacter } = await import('./database')
    
    for (const character of characters) {
      if (needsMigration(character)) {
        const migratedCharacter = migrateCharacterToUnifiedUsage(character)
        const { success } = await saveCharacter(migratedCharacter)
        
        if (success) {
          migratedCount++
        }
      }
    }
    
    return { success: true, migratedCount }
  } catch (error: any) {
    return { success: false, migratedCount: 0, error: error.message }
  }
}

/**
 * Clean up legacy infusions data after successful migration
 * This removes the old infusions array since we're now using unified feature usage
 */
export function cleanupLegacyInfusions(character: CharacterData): CharacterData {
  const infusionsUsage = character.classFeatureSkillsUsage?.['artificer-infusions']
  
  // Only clean up if we have unified infusions data
  if (infusionsUsage && infusionsUsage.selectedOptions && infusionsUsage.selectedOptions.length > 0) {
    return {
      ...character,
      infusions: [], // Clear legacy infusions data
      infusionNotes: '' // Clear legacy infusion notes
    }
  }
  
  return character
}

/**
 * Get a summary of what will be migrated for a character
 */
export function getMigrationSummary(character: CharacterData): {
  featuresToMigrate: string[]
  totalFeatures: number
} {
  const featuresToMigrate: string[] = []
  
  if (character.class.toLowerCase() === 'artificer' && character.level >= 7) {
    featuresToMigrate.push('Flash of Genius')
  }
  
  if (character.class.toLowerCase() === 'bard') {
    featuresToMigrate.push('Bardic Inspiration')
  }
  
  if (character.class.toLowerCase() === 'artificer') {
    featuresToMigrate.push('Infuse Item')
  }
  
  if (character.class.toLowerCase() === 'artificer' && 
      character.subclass?.toLowerCase() === 'artillerist') {
    featuresToMigrate.push('Eldritch Cannon')
  }
  
  if (character.class.toLowerCase() === 'warlock') {
    featuresToMigrate.push('Eldritch Invocations')
  }
  
  if (character.class.toLowerCase() === 'paladin') {
    featuresToMigrate.push('Lay on Hands')
  }
  
  if (character.class.toLowerCase() === 'cleric' || character.class.toLowerCase() === 'paladin') {
    featuresToMigrate.push('Channel Divinity')
  }
  
  if (character.class.toLowerCase() === 'paladin') {
    featuresToMigrate.push('Divine Sense')
  }
  
  return {
    featuresToMigrate,
    totalFeatures: featuresToMigrate.length
  }
}
