// User role system for the application

export type UserRole = 'superadmin' | 'editor'

export interface UserWithRole {
  id: string
  email?: string
  role: UserRole
}

// Superadmin user ID (legacy - now handled by user_profiles table)
export const SUPERADMIN_USER_ID = 'ea6864ba-869e-45af-9342-546e01a07464'

/**
 * Get the role for a user (legacy function - use permissionLevel from user_profiles instead)
 */
export function getUserRole(userId?: string): UserRole {
  if (!userId) return 'editor'
  return userId === SUPERADMIN_USER_ID ? 'superadmin' : 'editor'
}

/**
 * Check if a user is a superadmin (legacy function - use permissionLevel from user_profiles instead)
 */
export function isSuperadmin(userId?: string): boolean {
  return getUserRole(userId) === 'superadmin'
}

/**
 * Check if a user is an editor (legacy function - use permissionLevel from user_profiles instead)
 */
export function isEditor(userId?: string): boolean {
  return getUserRole(userId) === 'editor'
}

/**
 * Check if a user can access a private character sheet
 * Superadmins can access any private sheet, owners can access their own
 */
export function canAccessPrivateSheet(characterUserId?: string, currentUserId?: string): boolean {
  if (!characterUserId || !currentUserId) return false
  return characterUserId === currentUserId || isSuperadmin(currentUserId)
}

/**
 * Check if a user can edit a character
 * Superadmins can edit any character, owners can edit their own
 */
export function canEditCharacter(characterUserId?: string, currentUserId?: string): boolean {
  if (!characterUserId || !currentUserId) return false
  return characterUserId === currentUserId || isSuperadmin(currentUserId)
}

/**
 * Check if a user can edit a character in a campaign
 * Superadmins can edit any character, owners can edit their own, DMs can edit campaign characters
 */
export function canEditCharacterInCampaign(
  characterUserId?: string, 
  currentUserId?: string, 
  campaignDmId?: string,
  characterCampaignId?: string,
  currentCampaignId?: string
): boolean {
  // Superadmin can edit everything
  if (isSuperadmin(currentUserId)) return true
  
  // Owner can edit their own characters
  if (characterUserId === currentUserId) return true
  
  // DM can edit characters in their campaign
  if (campaignDmId === currentUserId && characterCampaignId === currentCampaignId) return true
  
  return false
}

/**
 * Check if a user is a Dungeon Master for a specific campaign
 */
export function isDungeonMaster(campaignDmId?: string, currentUserId?: string): boolean {
  return campaignDmId === currentUserId
}
