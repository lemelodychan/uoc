// User profiles interface and functions

export interface UserProfile {
  id: number
  userId: string
  displayName?: string
  permissionLevel: 'superadmin' | 'editor'
  createdAt: string
  updatedAt: string
}

export type PermissionLevel = 'superadmin' | 'editor'

// Permission level hierarchy
export const PERMISSION_LEVELS: Record<PermissionLevel, number> = {
  editor: 1,
  superadmin: 2
}

/**
 * Check if a user has a specific permission level or higher
 */
export function hasPermissionLevel(
  userPermissionLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  return PERMISSION_LEVELS[userPermissionLevel] >= PERMISSION_LEVELS[requiredLevel]
}

/**
 * Check if a user is a superadmin
 */
export function isSuperadmin(permissionLevel?: PermissionLevel): boolean {
  return permissionLevel === 'superadmin'
}

/**
 * Check if a user is an editor or higher
 */
export function isEditor(permissionLevel?: PermissionLevel): boolean {
  return permissionLevel === 'editor' || permissionLevel === 'superadmin'
}
