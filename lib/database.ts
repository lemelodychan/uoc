import { createClient as createBrowserClient } from "./supabase"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { CharacterData, Campaign } from "./character-data"

export interface CampaignNote {
  id: string
  campaign_id: string
  author_id: string
  title: string
  content: string
  session_date?: string
  members_attending?: string[]
  created_at: string
  updated_at: string
}
export interface CampaignResource {
  id: string
  campaign_id: string
  author_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface CampaignLink {
  id: string
  campaign_id: string
  title: string
  url: string
  created_at: string
  updated_at: string
}
import type { ClassData, SubclassData } from "./class-utils"
import { createDefaultSkills, createDefaultSavingThrowProficiencies, createClassBasedSavingThrowProficiencies, calculateSpellSaveDC, calculateSpellAttackBonus, getSpellsKnown, calculateProficiencyBonus, getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData } from "./character-data"
import { getBardicInspirationData, getSongOfRestData } from "./class-utils"
import { isSuperadmin, canAccessPrivateSheet, canEditCharacter as canEditCharacterRole, canEditCharacterInCampaign } from "./user-roles"
import type { UserProfile } from "./user-profiles"
const supabase = createBrowserClient()

export const getCurrentUser = async (): Promise<{ user?: any; error?: string }> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error("Error getting current user:", error)
      return { error: error.message }
    }
    return { user }
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return { error: "Failed to get current user" }
  }
}

export const getCurrentUserProfile = async (): Promise<{ profile?: UserProfile; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: authError?.message || "No authenticated user" }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.error("Error getting user profile:", profileError)
      return { error: profileError.message }
    }

    return { 
      profile: {
        id: profile.id,
        userId: profile.user_id,
        displayName: profile.display_name,
        permissionLevel: profile.permission_level,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        lastLogin: profile.last_login || undefined
      }
    }
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error)
    return { error: "Failed to get user profile" }
  }
}

export const createUserProfile = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || "No authenticated user" }
    }

    const { error } = await supabase
      .from("user_profiles")
      .insert([{
        user_id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        permission_level: 'viewer'
      }])

    if (error) {
      console.error("Error creating user profile:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in createUserProfile:", error)
    return { success: false, error: "Failed to create user profile" }
  }
}

export const updateUserProfile = async (updates: Partial<Pick<UserProfile, 'displayName' | 'permissionLevel'>>): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || "No authenticated user" }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.displayName !== undefined) {
      updateData.display_name = updates.displayName
    }
    if (updates.permissionLevel !== undefined) {
      updateData.permission_level = updates.permissionLevel
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error updating user profile:", error)
      return { success: false, error: error.message }
    }

    // Also update the auth user's display_name in metadata when displayName changes
    if (updates.displayName !== undefined) {
      try {
        // Use the same client; for server-side contexts use service role or session based update
        const { error: authUpdateError } = await supabase.auth.updateUser({ data: { display_name: updates.displayName } as any })
        if (authUpdateError) {
          // Auth display name update failed - non-critical
        }
      } catch (e) {
        // Auth display name update threw - non-critical
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateUserProfile:", error)
    return { success: false, error: "Failed to update user profile" }
  }
}

export const updateUserProfileByAdmin = async (
  targetUserId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'permissionLevel'>>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || "No authenticated user" }
    }

    // Ensure caller is superadmin
    const { data: callerProfile, error: callerError } = await supabase
      .from('user_profiles')
      .select('permission_level')
      .eq('user_id', user.id)
      .maybeSingle()

    if (callerError) {
      return { success: false, error: callerError.message }
    }
    if (!callerProfile || callerProfile.permission_level !== 'superadmin') {
      return { success: false, error: 'Forbidden: superadmin required' }
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName
    if (updates.permissionLevel !== undefined) updateData.permission_level = updates.permissionLevel

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', targetUserId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Try to reflect display name to auth metadata for the target user if we can (best-effort)
    // Note: client session cannot update other users' auth metadata; this is best-effort and may be a no-op.
    try {
      if (updates.displayName !== undefined && targetUserId === user.id) {
        await supabase.auth.updateUser({ data: { display_name: updates.displayName } as any })
      }
    } catch {}

    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to update user profile' }
  }
}

export const deleteUserProfileByAdmin = async (
  targetUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || 'No authenticated user' }
    }

    const { data: callerProfile, error: callerError } = await supabase
      .from('user_profiles')
      .select('permission_level')
      .eq('user_id', user.id)
      .maybeSingle()

    if (callerError) {
      return { success: false, error: callerError.message }
    }
    if (!callerProfile || callerProfile.permission_level !== 'superadmin') {
      return { success: false, error: 'Forbidden: superadmin required' }
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', targetUserId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete user profile' }
  }
}

/**
 * Update the last_login timestamp for the current authenticated user
 */
export const updateLastLogin = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || "No authenticated user" }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating last_login:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    console.error('Error in updateLastLogin:', e)
    return { success: false, error: 'Failed to update last login' }
  }
}

export const syncCurrentUserProfileFromAuth = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message || "No authenticated user" }
    }

    const meta: any = user.user_metadata || {}
    const displayName = meta.display_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'User'

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        display_name: displayName,
        permission_level: 'viewer',
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Error syncing user profile:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    console.error('Error in syncCurrentUserProfileFromAuth:', e)
    return { success: false, error: 'Failed to sync user profile' }
  }
}

// Debug function to check database state
export const debugDatabaseState = async (): Promise<void> => {
  try {
    // Check user_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*")
    
    // Check characters table
    const { data: characters, error: charactersError } = await supabase
      .from("characters")
      .select("id, name, user_id")
    
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
  } catch (error) {
    console.error("❌ Debug error:", error)
  }
}

export const getAllUsers = async (): Promise<{ users?: UserProfile[]; error?: string }> => {
  try {
    
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .order("display_name", { ascending: true })
    
    
    if (profilesError) {
      console.error("❌ Error getting user profiles:", profilesError)
      return { error: profilesError.message }
    }
    
    // If no profiles exist, try to get users from characters table
    if (!profiles || profiles.length === 0) {
      
      // Get unique user IDs from characters table
      const { data: characterData, error: characterError } = await supabase
        .from("characters")
        .select("user_id")
        .not("user_id", "is", null)
      
      
      if (characterError) {
        console.error("❌ Error getting character user IDs:", characterError)
        return { error: characterError.message }
      }
      
      // Get unique user IDs
      const userIds = [...new Set(characterData?.map(c => c.user_id).filter(Boolean) || [])]
      
      if (userIds.length === 0) {
        return { users: [] }
      }
      
      // Create temporary user profiles for users who have characters but no profiles
      const tempUsers: UserProfile[] = userIds.map((userId, index) => ({
        id: index + 1, // Temporary ID
        userId: userId,
        displayName: `User ${userId.slice(0, 8)}...`,
        permissionLevel: userId === 'ea6864ba-869e-45af-9342-546e01a07464' ? 'superadmin' : 'editor' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      return { users: tempUsers }
    }
    
    // Convert to UserProfile format
    const users: UserProfile[] = profiles.map(profile => ({
      id: profile.id,
      userId: profile.user_id,
      displayName: profile.display_name,
      permissionLevel: profile.permission_level,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login || undefined
    }))
    
    return { users }
  } catch (error) {
    console.error("❌ Error in getAllUsers:", error)
    return { error: "Failed to get users" }
  }
}

export const canViewCharacter = (character: CharacterData, userId?: string): boolean => {
  // Owner can always view
  if (character.userId === userId) {
    return true
  }
  // Public characters can be viewed by anyone
  if (character.visibility === 'public') {
    return true
  }
  // Private characters can only be viewed by owner or superadmin
  return canAccessPrivateSheet(character.userId, userId)
}

export const canEditCharacter = (character: CharacterData, userId?: string, permissionLevel?: 'superadmin' | 'editor' | 'viewer'): boolean => {
  // View-only users cannot edit anything regardless of ownership
  return canEditCharacterRole(character.userId, userId, permissionLevel)
}

export const canEditCharacterWithCampaign = (
  character: CharacterData, 
  userId?: string, 
  campaignDmId?: string,
  currentCampaignId?: string,
  permissionLevel?: 'superadmin' | 'editor' | 'viewer'
): boolean => {
  // Use campaign-aware editing permissions
  return canEditCharacterInCampaign(
    character.userId, 
    userId, 
    campaignDmId,
    character.campaignId,
    currentCampaignId,
    permissionLevel
  )
}

export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.from("characters").select("count", { count: "exact", head: true })

    if (error) {
      console.error("[v0] Connection test failed:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Connection test error:", error)
    return { success: false, error: "Failed to connect to database" }
  }
}

export const updatePartyStatus = async (
  characterId: string,
  status: 'active' | 'away' | 'deceased',
  className?: string,
  level?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = {
      character_id: characterId,
      status: status,
      updated_at: new Date().toISOString()
    }

    // Include class and level if provided
    if (className !== undefined) {
      updateData.class_name = className
    }
    if (level !== undefined) {
      updateData.level = level
    }
    
    const { error } = await supabase
      .from('party_status')
      .upsert(updateData, { onConflict: 'character_id' })

    if (error) {
      console.error("[v0] Error updating party status:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error in updatePartyStatus:", error)
    return { success: false, error: "Failed to update party status" }
  }
}

export const getPartyStatus = async (characterId: string): Promise<{ status: string | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('party_status')
      .select('status')
      .eq('character_id', characterId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("[v0] Error getting party status:", error)
      return { status: null, error: error.message }
    }

    return { status: data?.status || 'active' } // Default to 'active' if not found
  } catch (error) {
    console.error("[v0] Error in getPartyStatus:", error)
    return { status: 'active', error: "Failed to get party status" } // Default to 'active'
  }
}

export const getActivePartyMembers = async (): Promise<{ members: Array<{character_id: string, class_name: string, level: number}>; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('party_status')
      .select('character_id, class_name, level')
      .eq('status', 'active')
      .not('class_name', 'is', null)
      .not('level', 'is', null)

    if (error) {
      console.error("[v0] Error getting active party members:", error)
      return { members: [], error: error.message }
    }

    return { members: data || [] }
  } catch (error) {
    console.error("[v0] Error in getActivePartyMembers:", error)
    return { members: [], error: "Failed to get active party members" }
  }
}

export const saveCharacter = async (
  character: CharacterData,
): Promise<{ success: boolean; error?: string; characterId?: string }> => {
  try {
    let characterId = character.id

    // If the ID is not a valid UUID (like "1", "2", etc.), generate a new UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(characterId)) {
      characterId = globalThis.crypto.randomUUID()
    }

    // Legacy classFeatures column has been dropped - using unified class_features_skills_usage system

    const saveData: any = {
      id: characterId, // Use the UUID instead of character.id
      name: character.name,
      class_name: character.class,
      class_id: character.class_id,
      subclass: character.subclass,
      level: character.level,
      classes: character.classes || null,
      hit_dice_by_class: character.hitDiceByClass || null,
      background: character.background,
      race: character.race,
      alignment: character.alignment,
      image_url: character.imageUrl || null,
      aesthetic_images: character.aestheticImages || null,
      user_id: character.userId || null,
      visibility: character.visibility || 'public',
      is_npc: character.isNPC || false,
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
      armor_class: character.armorClass,
      initiative: character.initiative ?? 0,
      hit_points: character.currentHitPoints,
      max_hit_points: character.maxHitPoints,
      temporary_hit_points: character.temporaryHitPoints ?? 0,
      exhaustion: character.exhaustion ?? 0,
      hit_dice_total: character.hitDice?.total ?? 0,
      hit_dice_used: character.hitDice?.used ?? 0,
      hit_dice_type: character.hitDice?.dieType ?? "d8",
      speed: character.speed,
      skills: character.skills,
      weapons: character.weapons,
      weapons_notes: character.weaponNotes || "",
      features: character.features,
      spell_attack_bonus: character.spellData?.spellAttackBonus || 0,
      spell_save_dc: character.spellData?.spellSaveDC || 8,
      cantrips_known: character.spellData?.cantripsKnown || 0,
      spells_known: character.spellData?.spellsKnown || 0,
      // spell slot columns appended conditionally below
      feat_spell_slots: character.spellData?.featSpellSlots || [],
      spell_notes: character.spellData?.spellNotes || "",
      spells: character.spellData?.spells || [],
      // Legacy class_features column has been dropped - using unified system only
      class_features_skills_usage: character.classFeatureSkillsUsage || {},
      tools: character.toolsProficiencies,
      feats: character.feats,
      saving_throw_proficiencies: character.savingThrowProficiencies || [],
      equipment: character.equipment || "",
      magic_items: character.magicItems || [],
      languages: character.languages || "",
      other_tools: character.otherTools || "",
      money: character.money || null,
      equipment_proficiencies: character.equipmentProficiencies || null,
      feature_custom_descriptions: character.featureNotes || null,
      personality_traits: character.personalityTraits || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
      campaign_id: character.campaignId || null,
      updated_at: new Date().toISOString(),
    }

    // Always save spell slot usage to ensure consistency
    // This prevents data loss and ensures all characters have their spell slot usage tracked
    if (character.class.toLowerCase() === "warlock" || character.classes?.some(c => c.name.toLowerCase() === "warlock")) {
      // For Warlocks (including multiclassed), find the Warlock slot and save its usage
      const warlockSlot = character.spellData?.spellSlots?.find((x) => (x as any).isWarlockSlot)
      if (warlockSlot) {
        // Save Warlock slot usage to the appropriate level column
        const warlockLevel = warlockSlot.level
        const warlockUsed = warlockSlot.used
        
        // Initialize all levels to 0
        saveData.spell_slots_1_used = 0
        saveData.spell_slots_2_used = 0
        saveData.spell_slots_3_used = 0
        saveData.spell_slots_4_used = 0
        saveData.spell_slots_5_used = 0
        saveData.spell_slots_6_used = 0
        saveData.spell_slots_7_used = 0
        saveData.spell_slots_8_used = 0
        saveData.spell_slots_9_used = 0
        
        // Set the Warlock slot usage to the correct level
        if (warlockLevel >= 1 && warlockLevel <= 9) {
          saveData[`spell_slots_${warlockLevel}_used`] = warlockUsed
        }
        
        // Also save any non-Warlock spell slots (for multiclassed characters)
        character.spellData?.spellSlots?.forEach(slot => {
          if (!(slot as any).isWarlockSlot && slot.level >= 1 && slot.level <= 9) {
            saveData[`spell_slots_${slot.level}_used`] = slot.used
          }
        })
      } else {
        // If no warlock slot found, set all to 0
        saveData.spell_slots_1_used = 0
        saveData.spell_slots_2_used = 0
        saveData.spell_slots_3_used = 0
        saveData.spell_slots_4_used = 0
        saveData.spell_slots_5_used = 0
        saveData.spell_slots_6_used = 0
        saveData.spell_slots_7_used = 0
        saveData.spell_slots_8_used = 0
        saveData.spell_slots_9_used = 0
      }
    } else {
      // For other classes, save the actual used slots (not available slots)
      const getUsed = (lvl: number) => {
        const s = character.spellData?.spellSlots?.find((x) => x.level === lvl)
        return s ? s.used : 0
      }
      
      // Always save all spell slot levels, defaulting to 0 if not found
      saveData.spell_slots_1_used = getUsed(1)
      saveData.spell_slots_2_used = getUsed(2)
      saveData.spell_slots_3_used = getUsed(3)
      saveData.spell_slots_4_used = getUsed(4)
      saveData.spell_slots_5_used = getUsed(5)
      saveData.spell_slots_6_used = getUsed(6)
      saveData.spell_slots_7_used = getUsed(7)
      saveData.spell_slots_8_used = getUsed(8)
      saveData.spell_slots_9_used = getUsed(9)
    }

    // Legacy feature columns removed - using unified class_features_skills_usage instead

    // Legacy Warlock columns have been dropped - using unified system only


    const { error } = await supabase.from("characters").upsert(saveData)

    if (error) {
      console.error("[v0] Database save error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, characterId }
  } catch (error) {
    console.error("Error saving character:", error)
    return { success: false, error: "Failed to save character" }
  }
}

export const loadCharacter = async (characterId: string): Promise<{ character?: CharacterData; error?: string }> => {
  try {
    const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).maybeSingle()

    if (error) {
      console.error("Error loading character:", error)
      return { error: error.message }
    }

    if (!data) {
      return { error: "Character not found" }
    }

  // Class features are now loaded independently by the ClassFeatures component
  // No longer loading class features here to avoid legacy system interference
  let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []

    // Load class data for automatic spell calculations
    const { classData } = await loadClassData(data.class_name, data.subclass)
    const proficiencyBonus = calculateProficiencyBonus(data.level)
    
    // Create temporary character for calculations
    // Calculate saving throw proficiencies
    let savingThrowProficiencies
    // TEMPORARY FIX: Force recalculation for multiclass characters to fix the missing saving throws
    if (data.classes && data.classes.length > 1) {
      savingThrowProficiencies = (await import('./character-data')).getMulticlassSavingThrowProficiencies(data.classes)
    } else if (data.saving_throw_proficiencies && data.saving_throw_proficiencies.length > 0) {
      savingThrowProficiencies = data.saving_throw_proficiencies
    } else {
      savingThrowProficiencies = (await import('./character-data')).createClassBasedSavingThrowProficiencies(data.class_name)
    }

    const tempCharacter: CharacterData = {
      id: data.id,
      name: data.name,
      class: data.class_name, // Fixed: class_name -> class
      class_id: data.class_id,
      subclass: data.subclass,
      level: data.level,
      classes: data.classes || [{
        name: data.class_name,
        subclass: data.subclass,
        class_id: data.class_id,
        level: data.level
      }],
      background: data.background,
      race: data.race,
      alignment: data.alignment,
      imageUrl: data.image_url || undefined,
      aestheticImages: data.aesthetic_images || undefined,
      userId: data.user_id || undefined,
      visibility: data.visibility || 'public',
      isNPC: data.is_npc || false,
      strength: data.strength,
      dexterity: data.dexterity,
      constitution: data.constitution,
      intelligence: data.intelligence,
      wisdom: data.wisdom,
      charisma: data.charisma,
      armorClass: data.armor_class,
      initiative: data.initiative ?? 0,
      speed: data.speed,
      currentHitPoints: data.hit_points, // Fixed: hit_points -> currentHitPoints
      maxHitPoints: data.max_hit_points,
      temporaryHitPoints: data.temporary_hit_points || 0,
      exhaustion: data.exhaustion || 0,
      hitDice: data.hit_dice_total ? {
        total: data.hit_dice_total,
        used: data.hit_dice_used || 0,
        dieType: data.hit_dice_type || "d8",
      } : undefined,
      hitDiceByClass: data.hit_dice_by_class || undefined,
      proficiencyBonus: proficiencyBonus,
      skills: data.skills && data.skills.length > 0 ? data.skills : createDefaultSkills(),
      weapons: data.weapons,
      weaponNotes: data.weapons_notes || "",
      features: data.features,
      spellData: {
        spellAttackBonus: data.spell_attack_bonus || 0,
        spellSaveDC: data.spell_save_dc || 8,
        cantripsKnown: data.cantrips_known,
        spellsKnown: data.spells_known || 0,
        spellSlots: [], // Will be populated from class data
        spellNotes: data.spell_notes || "",
        featSpellSlots: data.feat_spell_slots || [],
        spells: data.spells || [],
        // All class features will be populated from class data below
        bardicInspirationSlot: undefined,
        songOfRest: undefined,
        divineSenseSlot: undefined,
        layOnHands: undefined,
        channelDivinitySlot: undefined,
        cleansingTouchSlot: undefined,
        // Legacy Warlock columns have been dropped - using unified system only
      },
      // Store used spell slot counts for restoration
      spellSlotsUsed: {
        1: data.spell_slots_1_used || 0,
        2: data.spell_slots_2_used || 0,
        3: data.spell_slots_3_used || 0,
        4: data.spell_slots_4_used || 0,
        5: data.spell_slots_5_used || 0,
        6: data.spell_slots_6_used || 0,
        7: data.spell_slots_7_used || 0,
        8: data.spell_slots_8_used || 0,
        9: data.spell_slots_9_used || 0,
      },
      classFeatures: classFeatures,
      toolsProficiencies: data.tools,
      equipment: data.equipment || "",
      magicItems: (data.magic_items || []).map((item: any) => ({
        ...item,
        currentUses: item.currentUses ?? (item.maxUses ?? 0)
      })),
      languages: data.languages || "",
      otherTools: data.other_tools || "",
      money: data.money || undefined,
      equipmentProficiencies: data.equipment_proficiencies || undefined,
      featureNotes: data.feature_custom_descriptions || undefined,
      personalityTraits: data.personality_traits || "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: data.backstory || "",
      notes: data.notes || "",
      feats: data.feats,
      savingThrowProficiencies: savingThrowProficiencies,
      partyStatus: 'active', // Default to 'active' for single character load (will be updated separately if needed)
      campaignId: data.campaign_id || undefined,
      classFeatureSkillsUsage: data.class_features_skills_usage || {},
    }
    
        // Initialize features automatically based on what's available for the character
        // This is class-agnostic and works for any combination of classes
        const { addSingleFeature, getFeatureMaxUses } = await import('./feature-usage-tracker')
        let updatedUsage = tempCharacter.classFeatureSkillsUsage || {}
        
        // Load all available features for this character's classes and levels
        const { loadClassFeatureSkills } = await import('./database')
        const { featureSkills } = await loadClassFeatureSkills(tempCharacter)
    
    // Initialize usage data for any features that don't have it yet
    for (const feature of featureSkills || []) {
      if (!updatedUsage[feature.id]) {
        
        // Determine initial values based on feature type
        let initialUsage: any = {
          featureName: feature.title,
          featureType: feature.featureType,
          enabledAtLevel: feature.enabledAtLevel,
          lastUpdated: new Date().toISOString()
        }
        
        switch (feature.featureType) {
          case 'slots':
            const maxUses = getFeatureMaxUses(tempCharacter, feature.id) || 1
            initialUsage.maxUses = maxUses
            initialUsage.currentUses = maxUses // All slots available initially
            break
            
          case 'points_pool':
            const maxPoints = getFeatureMaxUses(tempCharacter, feature.id) || 1
            initialUsage.maxPoints = maxPoints
            initialUsage.currentPoints = maxPoints // All points available initially
            break
            
          case 'options_list':
            initialUsage.selectedOptions = []
            initialUsage.maxSelections = 1 // Default, can be overridden by feature config
            break
            
          case 'availability_toggle':
            initialUsage.isAvailable = true // Default to available
            break
            
          case 'special_ux':
            initialUsage.customState = {}
            break
            
          case 'skill_modifier':
            // Skill modifiers don't need usage tracking
            break
        }
        
        updatedUsage[feature.id] = initialUsage
      }
    }
    
    // Update tempCharacter with initialized features
    // Only update if new features were added (don't overwrite existing data)
    if (Object.keys(updatedUsage).length > Object.keys(tempCharacter.classFeatureSkillsUsage || {}).length) {
      tempCharacter.classFeatureSkillsUsage = updatedUsage
    }
    
    // Load spell slots from database or calculate them if not available
    let calculatedSpellSlots: any[] = data.spell_slots || []
    
    // If no spell slots in database, calculate them from class data
    if (calculatedSpellSlots.length === 0) {
      if (data.classes && data.classes.length > 1) {
        // Use multiclassing spell slot calculation
        const { getMulticlassSpellSlots } = await import('./character-data')
        calculatedSpellSlots = getMulticlassSpellSlots(data.classes)
      } else if (classData) {
        if (data.class_name.toLowerCase() === "warlock") {
          // For Warlocks, use the base class data from database (no subclass)
          const { classData: baseClassData } = await loadClassData(data.class_name)
          if (baseClassData) {
            const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
            calculatedSpellSlots = calculateSpellSlotsFromClass(baseClassData, data.level)
          } else {
            // Fallback to hardcoded calculation if base class data not found
            const { getWarlockSpellSlots } = await import('./character-data')
            calculatedSpellSlots = getWarlockSpellSlots(data.level)
          }
        } else {
          // For other classes, use the standard spell slot calculation
          const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
          calculatedSpellSlots = calculateSpellSlotsFromClass(classData, data.level)
        }
      }
    }
    
    // Restore usage if we have spell slots and usage data
    if (calculatedSpellSlots.length > 0 && tempCharacter.spellSlotsUsed) {
      if (data.class_name.toLowerCase() === "warlock" || (data.classes && data.classes.some((c: any) => c.name.toLowerCase() === "warlock"))) {
        // For Warlocks (including multiclassed), restore usage based on the actual spell level
        calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
          if ((slot as any).isWarlockSlot) {
            // For Warlock slots, get the usage from the appropriate level column
            const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
            return { ...slot, used: usedCount }
          } else {
            // For non-Warlock slots (multiclassed characters), use normal restoration
            const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
            return { ...slot, used: usedCount }
          }
        })
      } else {
        // For other classes, use the normal level-based restoration
        calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
          const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
          return { ...slot, used: usedCount }
        })
      }
    }
    
    // Now calculate spell values and create final character
    const character: CharacterData = {
      ...tempCharacter,
      classFeatures: classFeatures, // Add the loaded class features
      spellData: {
        ...tempCharacter.spellData,
        spellAttackBonus: data.spell_attack_bonus || calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
        spellSaveDC: data.spell_save_dc || calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
        cantripsKnown: data.cantrips_known || (() => {
          const { getCantripsKnown } = require('./class-utils')
          return getCantripsKnown(data.level, classData, data.class_name, tempCharacter)
        })(),
        spellsKnown: getSpellsKnown(tempCharacter, classData, data.spells_known),
        spellSlots: calculatedSpellSlots, // Populate immediately
        // Add class-specific features (Bard, Artificer, Paladin) - use multiclass calculation if applicable
        ...(data.classes && data.classes.length > 1 ? await (async () => {
          const { getMulticlassFeatures } = await import('./character-data')
          const multiclassFeatures = await getMulticlassFeatures(tempCharacter)
          return {
            bardicInspirationSlot: multiclassFeatures.bardicInspirationSlot ? {
              ...multiclassFeatures.bardicInspirationSlot,
              currentUses: multiclassFeatures.bardicInspirationSlot.usesPerRest
            } : undefined,
            songOfRest: multiclassFeatures.songOfRest || undefined,
            divineSenseSlot: multiclassFeatures.divineSenseSlot || undefined,
            layOnHands: multiclassFeatures.layOnHands || undefined,
            channelDivinitySlot: multiclassFeatures.channelDivinitySlot || undefined,
            cleansingTouchSlot: multiclassFeatures.cleansingTouchSlot || undefined,
          }
        })() : {
          // Single class feature calculation
          bardicInspirationSlot: (() => {
            const bardicInspiration = getBardicInspirationData(data.level, Math.floor((data.charisma - 10) / 2), classData)
            if (bardicInspiration) {
              return {
                ...bardicInspiration,
                currentUses: bardicInspiration.usesPerRest
              }
            }
            return bardicInspiration || undefined
          })(),
          songOfRest: getSongOfRestData(data.level, classData) || undefined,
          // Paladin features
          // Legacy feature slots removed - using unified class_features_skills_usage instead
          divineSenseSlot: undefined,
          layOnHands: undefined,
          channelDivinitySlot: undefined,
          cleansingTouchSlot: undefined,
        }),
      },
    }

    // Character loaded successfully - no automatic migration checks
    
    // Recalculate max uses for all features that depend on character stats
    const { recalculateAllFeatureMaxUses } = await import('./feature-usage-tracker')
    const recalculatedUsage = recalculateAllFeatureMaxUses(character)
    if (Object.keys(recalculatedUsage).length > 0) {
      character.classFeatureSkillsUsage = recalculatedUsage
    }

    return { character }
  } catch (error) {
    console.error("Error loading character:", error)
    return { error: "Failed to load character" }
  }
}

export const loadAllCharacters = async (): Promise<{ characters?: CharacterData[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("characters")
      .select(`
        *,
        party_status!left(status)
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error loading characters:", error)
      return { error: error.message }
    }

    // Batch load class data for all unique classes
    const uniqueClasses = [...new Set(data.map(row => `${row.class_name}-${row.subclass || ''}`))]
    const classDataMap = new Map()
    
    await Promise.all(uniqueClasses.map(async (classKey) => {
      const [className, subclass] = classKey.split('-')
      const { classData } = await loadClassData(className, subclass || undefined)
      if (classData) {
        classDataMap.set(classKey, classData)
      }
    }))

    // Batch load class features for all unique class_id + level combinations
    // Support both single class and multiclassing
    const uniqueClassFeatures = new Set<string>()
    
    data.forEach(row => {
      if (row.classes && row.classes.length > 0) {
        // Add multiclass features
        row.classes.forEach((charClass: any) => {
          if (charClass.class_id) {
            uniqueClassFeatures.add(`${charClass.class_id}-${charClass.level}`)
          }
        })
      } else if (row.class_name) {
        // For single class characters, we need to get the base class ID (where subclass IS NULL)
        // because features are stored under the base class, not the subclass
        // We'll handle this in the feature loading loop below
        uniqueClassFeatures.add(`BASE-${row.class_name}-${row.level}-${row.subclass || ''}`)
      }
    })
    
    const classFeaturesMap = new Map()
    
    await Promise.all([...uniqueClassFeatures].map(async (featureKey) => {
      if (featureKey.startsWith('BASE-')) {
        // Handle single class characters - need to get base class ID
        const parts = featureKey.split('-')
        const className = parts[1]
        const level = parseInt(parts[2])
        const subclass = parts[3] || undefined
        
        // Get the base class ID (where subclass IS NULL)
        const { data: baseClassData, error: baseClassError } = await supabase
          .from("classes")
          .select("id")
          .eq("name", className)
          .is("subclass", null)
          .maybeSingle()
        
        if (!baseClassError && baseClassData) {
          const { features } = await loadClassFeatures(baseClassData.id, level, subclass)
          if (features) {
            classFeaturesMap.set(featureKey, features)
          }
        }
      } else {
        // Handle multiclass characters - use class_id directly
        const lastDashIndex = featureKey.lastIndexOf('-')
        const classId = featureKey.substring(0, lastDashIndex)
        const level = featureKey.substring(lastDashIndex + 1)
        
        const { features } = await loadClassFeatures(classId, parseInt(level))
        if (features) {
          classFeaturesMap.set(featureKey, features)
        }
      }
    }))

    // Process characters with pre-loaded data
    const charactersWithFeatures = await Promise.all(
      data.map(async (row) => {
    // Get pre-loaded class features - support multiclassing
    let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
    
    if (row.classes && row.classes.length > 0) {
      // Load features for all classes in multiclassing
      classFeatures = row.classes
        .map((charClass: any) => {
          if (charClass.class_id) {
            return classFeaturesMap.get(`${charClass.class_id}-${charClass.level}`) || []
          }
          return []
        })
        .flat()
    } else if (row.class_name) {
      // For single class characters, use the BASE- prefix
      classFeatures = classFeaturesMap.get(`BASE-${row.class_name}-${row.level}-${row.subclass || ''}`) || []
    }
    
    

        // Get pre-loaded class data
        const classData = classDataMap.get(`${row.class_name}-${row.subclass || ''}`)
        const proficiencyBonus = calculateProficiencyBonus(row.level)
        
        // Calculate saving throw proficiencies
        let savingThrowProficiencies
        // TEMPORARY FIX: Force recalculation for multiclass characters to fix the missing saving throws
        if (row.classes && row.classes.length > 1) {
          savingThrowProficiencies = (await import('./character-data')).getMulticlassSavingThrowProficiencies(row.classes)
        } else if (row.saving_throw_proficiencies && row.saving_throw_proficiencies.length > 0) {
          savingThrowProficiencies = row.saving_throw_proficiencies
        } else {
          savingThrowProficiencies = (await import('./character-data')).createClassBasedSavingThrowProficiencies(row.class_name)
        }

        // Create temporary character for calculations
        const tempCharacter = {
          id: row.id,
          name: row.name,
          class: row.class_name,
          class_id: row.class_id,
          subclass: row.subclass,
          level: row.level,
          classes: row.classes || [{
            name: row.class_name,
            subclass: row.subclass,
            class_id: row.class_id,
            level: row.level
          }],
          background: row.background,
          race: row.race,
          alignment: row.alignment,
          imageUrl: row.image_url || undefined,
          aestheticImages: row.aesthetic_images || undefined,
          userId: row.user_id || undefined,
          visibility: row.visibility || 'public',
          isNPC: row.is_npc || false,
          strength: row.strength,
          dexterity: row.dexterity,
          constitution: row.constitution,
          intelligence: row.intelligence,
          wisdom: row.wisdom,
          charisma: row.charisma,
          armorClass: row.armor_class,
          initiative: row.initiative ?? 0,
          speed: row.speed,
          currentHitPoints: row.hit_points,
          maxHitPoints: row.max_hit_points,
          temporaryHitPoints: row.temporary_hit_points || 0,
          exhaustion: row.exhaustion || 0,
          hitDice: row.hit_dice_total ? {
            total: row.hit_dice_total,
            used: row.hit_dice_used || 0,
            dieType: row.hit_dice_type || "d8",
          } : undefined,
          hitDiceByClass: row.hit_dice_by_class || undefined,
          proficiencyBonus: proficiencyBonus,
          skills: row.skills && row.skills.length > 0 ? row.skills : createDefaultSkills(),
          weapons: row.weapons,
          weaponNotes: row.weapons_notes || "",
          features: row.features,
          spellData: {
            spellAttackBonus: row.spell_attack_bonus || 0,
            spellSaveDC: row.spell_save_dc || 8,
            cantripsKnown: row.cantrips_known,
            spellsKnown: row.spells_known || 0,
            spellSlots: [],
            spellNotes: row.spell_notes || "",
            featSpellSlots: row.feat_spell_slots || [],
            spells: row.spells || [],
            // All class features will be populated from class data below
            bardicInspirationSlot: undefined,
            songOfRest: undefined,
            divineSenseSlot: undefined,
            layOnHands: undefined,
            channelDivinitySlot: undefined,
            cleansingTouchSlot: undefined,
            // Legacy Warlock columns have been dropped - using unified system only
          },
          spellSlotsUsed: {
            1: row.spell_slots_1_used || 0,
            2: row.spell_slots_2_used || 0,
            3: row.spell_slots_3_used || 0,
            4: row.spell_slots_4_used || 0,
            5: row.spell_slots_5_used || 0,
            6: row.spell_slots_6_used || 0,
            7: row.spell_slots_7_used || 0,
            8: row.spell_slots_8_used || 0,
            9: row.spell_slots_9_used || 0,
          },
          classFeatures: classFeatures,
          toolsProficiencies: row.tools,
          equipment: row.equipment || "",
          magicItems: (row.magic_items || []).map((item: any) => ({
            ...item,
            currentUses: item.currentUses ?? (item.maxUses ?? 0)
          })),
          languages: row.languages || "",
          otherTools: row.other_tools || "",
          money: row.money || undefined,
          equipmentProficiencies: row.equipment_proficiencies || undefined,
          featureNotes: row.feature_custom_descriptions || undefined,
          personalityTraits: row.personality_traits || "",
          ideals: "",
          bonds: "",
          flaws: "",
          backstory: row.backstory || "",
          notes: row.notes || "",
          feats: row.feats,
          savingThrowProficiencies: savingThrowProficiencies,
          partyStatus: row.party_status?.status || 'active', // Default to 'active' if no status found
          campaignId: row.campaign_id || undefined,
          classFeatureSkillsUsage: row.class_features_skills_usage || {},
        }

        // Initialize features automatically based on what's available for the character
        // This is class-agnostic and works for any combination of classes
        const { addSingleFeature, getFeatureMaxUses } = await import('./feature-usage-tracker')
        let updatedUsage = tempCharacter.classFeatureSkillsUsage || {}
        
        // Load all available features for this character's classes and levels
        const { loadClassFeatureSkills } = await import('./database')
        const { featureSkills } = await loadClassFeatureSkills(tempCharacter)
        
        // Initialize usage data for any features that don't have it yet
        for (const feature of featureSkills || []) {
          if (!updatedUsage[feature.id]) {
            
            // Determine initial values based on feature type
            let initialUsage: any = {
              featureName: feature.title,
              featureType: feature.featureType,
              enabledAtLevel: feature.enabledAtLevel,
              lastUpdated: new Date().toISOString()
            }
            
            switch (feature.featureType) {
              case 'slots':
                const maxUses = getFeatureMaxUses(tempCharacter, feature.id) || 1
                initialUsage.maxUses = maxUses
                initialUsage.currentUses = maxUses // All slots available initially
                break
                
              case 'points_pool':
                const maxPoints = getFeatureMaxUses(tempCharacter, feature.id) || 1
                initialUsage.maxPoints = maxPoints
                initialUsage.currentPoints = maxPoints // All points available initially
                break
                
              case 'options_list':
                initialUsage.selectedOptions = []
                initialUsage.maxSelections = 1 // Default, can be overridden by feature config
                break
                
              case 'availability_toggle':
                initialUsage.isAvailable = true // Default to available
                break
                
              case 'special_ux':
                initialUsage.customState = {}
                break
                
              case 'skill_modifier':
                // Skill modifiers don't need usage tracking
                break
            }
            
            updatedUsage[feature.id] = initialUsage
          }
        }
        
        // Update tempCharacter with initialized features
        // Only update if new features were added (don't overwrite existing data)
        if (Object.keys(updatedUsage).length > Object.keys(tempCharacter.classFeatureSkillsUsage || {}).length) {
          tempCharacter.classFeatureSkillsUsage = updatedUsage
        }

        // Load spell slots from database or calculate them if not available
        let calculatedSpellSlots: any[] = row.spell_slots || []
        
        // If no spell slots in database, calculate them from class data
        if (calculatedSpellSlots.length === 0) {
          if (row.classes && row.classes.length > 1) {
            // Use multiclassing spell slot calculation
            const { getMulticlassSpellSlots } = await import('./character-data')
            calculatedSpellSlots = getMulticlassSpellSlots(row.classes)
          } else if (classData) {
            if (row.class_name.toLowerCase() === "warlock") {
              // For Warlocks, use the base class data from database (no subclass)
              const { classData: baseClassData } = await loadClassData(row.class_name)
              if (baseClassData) {
                const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
                calculatedSpellSlots = calculateSpellSlotsFromClass(baseClassData, row.level)
              } else {
                // Fallback to hardcoded calculation if base class data not found
                const { getWarlockSpellSlots } = await import('./character-data')
                calculatedSpellSlots = getWarlockSpellSlots(row.level)
              }
            } else {
              // For other classes, use the standard spell slot calculation
              const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
              calculatedSpellSlots = calculateSpellSlotsFromClass(classData, row.level)
            }
          }
        }
        
        // Restore usage if we have spell slots and usage data
        if (calculatedSpellSlots.length > 0 && tempCharacter.spellSlotsUsed) {
          if (row.class_name.toLowerCase() === "warlock" || (row.classes && row.classes.some((c: any) => c.name.toLowerCase() === "warlock"))) {
            // For Warlocks (including multiclassed), restore usage based on the actual spell level
            calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
              if ((slot as any).isWarlockSlot) {
                // For Warlock slots, get the usage from the appropriate level column
                const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
                return { ...slot, used: usedCount }
              } else {
                // For non-Warlock slots (multiclassed characters), use normal restoration
                const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
                return { ...slot, used: usedCount }
              }
            })
          } else {
            // For other classes, use the normal level-based restoration
            calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
              const usedCount = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
              return { ...slot, used: usedCount }
            })
          }
        }

        return {
          ...tempCharacter,
          classFeatures: classFeatures, // Add the loaded class features
          spellData: {
            ...tempCharacter.spellData,
            spellAttackBonus: row.spell_attack_bonus || calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
            spellSaveDC: row.spell_save_dc || calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
            cantripsKnown: row.cantrips_known || (() => {
              const { getCantripsKnown } = require('./class-utils')
              return getCantripsKnown(row.level, classData, row.class_name, tempCharacter)
            })(),
            spellsKnown: getSpellsKnown(tempCharacter, classData, row.spells_known),
            spellSlots: calculatedSpellSlots, // Populate immediately
            // Add class-specific features (Bard, Artificer, Paladin) - use multiclass calculation if applicable
            ...(row.classes && row.classes.length > 1 ? await (async () => {
              const { getMulticlassFeatures } = await import('./character-data')
              const multiclassFeatures = await getMulticlassFeatures(tempCharacter)
              return {
                bardicInspirationSlot: multiclassFeatures.bardicInspirationSlot ? {
                  ...multiclassFeatures.bardicInspirationSlot,
                  currentUses: multiclassFeatures.bardicInspirationSlot.usesPerRest
                } : undefined,
                songOfRest: multiclassFeatures.songOfRest || undefined,
                divineSenseSlot: multiclassFeatures.divineSenseSlot || undefined,
                layOnHands: multiclassFeatures.layOnHands || undefined,
                channelDivinitySlot: multiclassFeatures.channelDivinitySlot || undefined,
                cleansingTouchSlot: multiclassFeatures.cleansingTouchSlot || undefined,
              }
            })() : {
              // Single class feature calculation
              bardicInspirationSlot: (() => {
                const bardicInspiration = getBardicInspirationData(row.level, Math.floor((row.charisma - 10) / 2), classData)
                if (bardicInspiration) {
                  return {
                    ...bardicInspiration,
                    currentUses: bardicInspiration.usesPerRest
                  }
                }
                return bardicInspiration || undefined
              })(),
              songOfRest: getSongOfRestData(row.level, classData) || undefined,
              // Paladin features
              // Legacy feature slots removed - using unified class_features_skills_usage instead
              divineSenseSlot: undefined,
              layOnHands: undefined,
              channelDivinitySlot: undefined,
              cleansingTouchSlot: undefined,
            }),
          },
        }
      })
    )

    // Initialize Warlock features for all Warlock characters
    for (const character of charactersWithFeatures) {
      if (character.class.toLowerCase() === 'warlock') {
        const { addSingleFeature } = await import('./feature-usage-tracker')
        let updatedUsage = character.classFeatureSkillsUsage || {}
        
        // Initialize Genie's Wrath (Genie Warlock level 1+)
        if (character.subclass?.toLowerCase() === 'the genie' && character.level >= 1 && !updatedUsage['genies-wrath']) {
          updatedUsage = addSingleFeature(character, 'genies-wrath', {
            featureName: 'Genie\'s Wrath',
            featureType: 'availability_toggle',
            enabledAtLevel: 1,
            isAvailable: true
          })
        }
        
        // Initialize Elemental Gift (Genie Warlock level 6+) - only if it doesn't exist
        if (character.subclass?.toLowerCase() === 'the genie' && character.level >= 6 && !updatedUsage['elemental-gift']) {
          // Only initialize if feature doesn't exist - don't overwrite existing data
          const { getFeatureMaxUses } = await import('./feature-usage-tracker')
          const maxUses = getFeatureMaxUses(character, 'elemental-gift') || 1
          
          updatedUsage = addSingleFeature(character, 'elemental-gift', {
            featureName: 'Elemental Gift',
            featureType: 'slots',
            enabledAtLevel: 6,
            maxUses: maxUses,
            currentUses: maxUses // All slots available immediately
          })
        }
        
        // Initialize Eldritch Invocations (Warlock level 2+)
        if (character.level >= 2 && !updatedUsage['eldritch-invocations']) {
          const maxInvocations = Math.floor(character.level / 2) + 1
          updatedUsage = addSingleFeature(character, 'eldritch-invocations', {
            featureName: 'Eldritch Invocations',
            featureType: 'options_list',
            enabledAtLevel: 2,
            maxSelections: maxInvocations,
            selectedOptions: []
          })
        }
        
        // Update character with initialized features
        // Only update if new features were added (don't overwrite existing data)
        if (Object.keys(updatedUsage).length > Object.keys(character.classFeatureSkillsUsage || {}).length) {
          character.classFeatureSkillsUsage = updatedUsage
        }
      }
      
      // Initialize Paladin features for all Paladin characters
      if (character.class.toLowerCase() === 'paladin') {
        const { addSingleFeature } = await import('./feature-usage-tracker')
        let updatedUsage = character.classFeatureSkillsUsage || {}
        
        // Initialize Lay on Hands (Paladin level 1+) - only if it doesn't exist
        if (character.level >= 1 && !updatedUsage['lay-on-hands']) {
          // Calculate max points from class feature or fallback to hardcoded
          // For multiclassed characters, use Paladin class level specifically
          const paladinClass = character.classes?.find(c => c.name.toLowerCase() === 'paladin')
          const paladinLevel = paladinClass?.level || character.level
          let maxPoints = paladinLevel * 5 // Default Lay on Hands formula
          
          // Try to get from class features if available
          if (character.classFeatures) {
            const layOnHandsFeature = character.classFeatures.find(f => 
              f.title?.toLowerCase().includes('lay on hands') && 
              f.class_features_skills && 
              typeof f.class_features_skills === 'object' &&
              'config' in f.class_features_skills &&
              f.class_features_skills.config?.totalFormula
            )
            
            if (layOnHandsFeature && layOnHandsFeature.class_features_skills && 
                typeof layOnHandsFeature.class_features_skills === 'object' &&
                'config' in layOnHandsFeature.class_features_skills) {
              const config = layOnHandsFeature.class_features_skills.config
              if (config?.totalFormula) {
                const { calculateUsesFromFormula } = await import('./class-feature-templates')
                maxPoints = calculateUsesFromFormula(config.totalFormula, character, 'paladin')
              }
            }
          }
          
          // Calculate current points from legacy data if available
          let currentPoints = maxPoints
          if (character.spellData?.layOnHands) {
            currentPoints = character.spellData.layOnHands.currentHitPoints
          }
          
          updatedUsage = addSingleFeature(character, 'lay-on-hands', {
            featureName: 'Lay on Hands',
            featureType: 'points_pool',
            enabledAtLevel: 1,
            maxPoints: maxPoints,
            currentPoints: currentPoints
          })
        }
        
        // Initialize Divine Sense (Paladin level 1+) - only if it doesn't exist
        if (character.level >= 1 && !updatedUsage['divine-sense']) {
          // Calculate max uses from class features or fallback to hardcoded
          const { getFeatureMaxUses } = require('./feature-usage-tracker')
          let maxUses = getFeatureMaxUses(character, 'divine-sense') || 0
          
          // Fallback to hardcoded calculation if not found in class features
          if (maxUses === 0) {
            maxUses = 1 + Math.floor((character.level - 1) / 2) // Default Divine Sense formula
          }
          
          // Calculate current uses from legacy data if available
          let currentUses = maxUses
          if (character.spellData?.divineSenseSlot) {
            currentUses = character.spellData.divineSenseSlot.currentUses
          }
          
          updatedUsage = addSingleFeature(character, 'divine-sense', {
            featureName: 'Divine Sense',
            featureType: 'slots',
            enabledAtLevel: 1,
            maxUses: maxUses,
            currentUses: currentUses
          })
        }
        
        // Initialize Channel Divinity (Paladin level 3+) - only if it doesn't exist
        if (character.level >= 3 && !updatedUsage['channel-divinity']) {
          // Calculate max uses from class features or fallback to hardcoded
          const { getFeatureMaxUses } = require('./feature-usage-tracker')
          let maxUses = getFeatureMaxUses(character, 'channel-divinity') || 0
          
          // Fallback to hardcoded calculation if not found in class features
          if (maxUses === 0) {
            maxUses = 1 // Default Channel Divinity formula (1 use per rest)
          }
          
          // Calculate current uses from legacy data if available
          let currentUses = maxUses
          if (character.spellData?.channelDivinitySlot) {
            currentUses = character.spellData.channelDivinitySlot.currentUses
          }
          
          updatedUsage = addSingleFeature(character, 'channel-divinity', {
            featureName: 'Channel Divinity',
            featureType: 'slots',
            enabledAtLevel: 3,
            maxUses: maxUses,
            currentUses: currentUses
          })
        }
        
        // Update character with initialized features
        // Only update if new features were added (don't overwrite existing data)
        if (Object.keys(updatedUsage).length > Object.keys(character.classFeatureSkillsUsage || {}).length) {
          character.classFeatureSkillsUsage = updatedUsage
        }
      }
    }

    // Recalculate max uses for all features that depend on character stats
    const { recalculateAllFeatureMaxUses } = await import('./feature-usage-tracker')
    for (const character of charactersWithFeatures) {
      const recalculatedUsage = recalculateAllFeatureMaxUses(character)
      if (Object.keys(recalculatedUsage).length > 0) {
        character.classFeatureSkillsUsage = recalculatedUsage
      }
    }

    return { characters: charactersWithFeatures }
  } catch (error) {
    console.error("Error loading characters:", error)
    return { error: "Failed to load characters" }
  }
}

export const deleteCharacter = async (characterId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("characters").delete().eq("id", characterId)

    if (error) {
      console.error("Error deleting character:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting character:", error)
    return { success: false, error: "Failed to delete character" }
  }
}

/**
 * Clean up a character's class features to remove any features above their current level
 * This is useful for fixing characters that have leftover features from level ups that were reverted
 */
export const cleanupCharacterFeatures = async (characterId: string): Promise<{ success: boolean; error?: string; cleanedCount?: number }> => {
  try {
    // Load the character
    const { character, error: loadError } = await loadCharacter(characterId)
    
    if (loadError || !character) {
      return { success: false, error: loadError || "Character not found" }
    }
    
    // Count features that will be removed
    const featuresToRemove = character.classFeatures?.filter(feature => feature.level > character.level) || []
    const cleanedCount = featuresToRemove.length
    
    if (cleanedCount === 0) {
      return { success: true, cleanedCount: 0 }
    }
    
    // Clean up the features
    const cleanedClassFeatures = character.classFeatures?.filter(feature => 
      feature.level <= character.level
    ) || []
    
    // Update the character with cleaned features
    const updatedCharacter = {
      ...character,
      classFeatures: cleanedClassFeatures
    }
    
    // Save the updated character
    const { success, error: saveError } = await saveCharacter(updatedCharacter)
    
    if (!success) {
      return { success: false, error: saveError || "Failed to save cleaned character" }
    }
    
    return { success: true, cleanedCount }
  } catch (error: any) {
    console.error("Error cleaning up character features:", error)
    return { success: false, error: "Failed to clean up character features" }
  }
}

export const loadClassFeatures = async (classId: string, level: number, subclass?: string): Promise<{ features?: Array<{
  id: string
  class_id: string
  level: number
  title: string
  description: string
  feature_type: string
  feature_skill_type?: string
  subclass_id?: string
  class_features_skills?: any
  name: string
  source: string
  className: string
}>; error?: string }> => {
  try {
    // Import cache dynamically to avoid circular dependencies
    const { classFeaturesCache } = await import('./class-features-cache')
    
    // Check cache first
    const cachedFeatures = classFeaturesCache.get(classId, level, subclass)
    if (cachedFeatures) {
      return { features: cachedFeatures }
    }
    // First get the class information to check if it's a Bard
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("name, subclass")
      .eq("id", classId)
      .maybeSingle()

    if (classError) {
      console.error("Error loading class data:", classError)
      return { error: classError.message }
    }
    

    // Load features for this specific class_id (could be base class or subclass)
    // Load features for this specific class_id (could be base class or subclass)
    const { data, error } = await supabase
      .from("class_features")
      .select("*")
      .eq("class_id", classId)
      .lte("level", level)
      .order("level", { ascending: true })

    if (error) {
      console.error("Error loading class features:", error)
      return { error: error.message }
    }

    // Filter out hidden features
    let features = data?.filter(feature => !feature.is_hidden).map(feature => ({
      id: feature.id,
      class_id: feature.class_id,
      level: feature.level,
      title: feature.title,
      description: feature.description,
      feature_type: feature.feature_type,
      feature_skill_type: feature.feature_skill_type,
      subclass_id: feature.subclass_id,
      is_hidden: feature.is_hidden,
      class_features_skills: feature.class_features_skills,
      name: feature.title,
      source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
      className: classData.name
    })) || []

    // If this class_id is a subclass, we need to also load base class features
    // This ensures we get level 1-2 features that are stored under the base class
    const hasClassFeatures = features.some(f => f.source === 'Class')
    const hasSubclassFeatures = features.some(f => f.source === 'Subclass')
    
    if (classData.subclass || (hasSubclassFeatures && !hasClassFeatures)) {
      
      // Find the base class_id for this class name (where subclass IS NULL)
      const { data: baseClassData, error: baseClassError } = await supabase
        .from("classes")
        .select("id")
        .eq("name", classData.name)
        .is("subclass", null) // Specifically look for the base class
        .limit(1)
        .maybeSingle()

      if (!baseClassError && baseClassData) {
        // Load base class features
        const { data: baseFeatures, error: baseError } = await supabase
          .from("class_features")
          .select("*")
          .eq("class_id", baseClassData.id)
          .lte("level", level)
          .order("level", { ascending: true })

        if (!baseError && baseFeatures) {
          // Filter out hidden features and map to feature objects
          const baseClassFeatures = baseFeatures
            .filter(feature => !feature.is_hidden)
            .map(feature => ({
              id: feature.id,
              class_id: feature.class_id,
              level: feature.level,
              title: feature.title,
              description: feature.description,
              feature_type: feature.feature_type,
              feature_skill_type: feature.feature_skill_type,
              subclass_id: feature.subclass_id,
              is_hidden: feature.is_hidden,
              class_features_skills: feature.class_features_skills,
              name: feature.title,
              source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
              className: classData.name
            }))
          
          // Combine base class and subclass features
          features = [...baseClassFeatures, ...features]
        }
      }
    } else if (!hasClassFeatures && !hasSubclassFeatures) {
      // If no features found at all, try to find the base class_id (where subclass IS NULL)
      const { data: baseClassData, error: baseClassError } = await supabase
        .from("classes")
        .select("id")
        .eq("name", classData.name)
        .is("subclass", null) // Specifically look for the base class
        .limit(1)
        .maybeSingle()

      if (!baseClassError && baseClassData) {
        // Load base class features
        const { data: baseFeatures, error: baseError } = await supabase
          .from("class_features")
          .select("*")
          .eq("class_id", baseClassData.id)
          .lte("level", level)
          .order("level", { ascending: true })

        if (!baseError && baseFeatures) {
          // Filter out hidden features and map to feature objects
          const baseClassFeatures = baseFeatures
            .filter(feature => !feature.is_hidden)
            .map(feature => ({
              id: feature.id,
              class_id: feature.class_id,
              level: feature.level,
              title: feature.title,
              description: feature.description,
              feature_type: feature.feature_type,
              feature_skill_type: feature.feature_skill_type,
              subclass_id: feature.subclass_id,
              is_hidden: feature.is_hidden,
              class_features_skills: feature.class_features_skills,
              name: feature.title,
              source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
              className: classData.name
            }))
          
          // Use the base class features
          features = baseClassFeatures
        }
      }
    }

    // If we have a subclass and we're loading base class features, also load subclass features
    if (subclass && hasClassFeatures && !hasSubclassFeatures) {
      // Find the subclass_id for this class name and subclass
      const { data: subclassData, error: subclassError } = await supabase
        .from("classes")
        .select("id")
        .eq("name", classData.name)
        .eq("subclass", subclass)
        .limit(1)
        .maybeSingle()

      if (!subclassError && subclassData) {
        // Load subclass features
        const { data: subclassFeatures, error: subclassFeaturesError } = await supabase
          .from("class_features")
          .select("*")
          .eq("class_id", subclassData.id)
          .lte("level", level)
          .order("level", { ascending: true })

        if (!subclassFeaturesError && subclassFeatures) {
          // Filter out hidden features and map to feature objects
          const subclassFeaturesMapped = subclassFeatures
            .filter(feature => !feature.is_hidden)
            .map(feature => ({
              id: feature.id,
              class_id: feature.class_id,
              level: feature.level,
              title: feature.title,
              description: feature.description,
              feature_type: feature.feature_type,
              feature_skill_type: feature.feature_skill_type,
              subclass_id: feature.subclass_id,
              is_hidden: feature.is_hidden,
              class_features_skills: feature.class_features_skills,
              name: feature.title,
              source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
              className: classData.name
            }))
          
          // Combine base class and subclass features
          features = [...features, ...subclassFeaturesMapped]
        }
      }
    }

    // Store in cache before returning
    classFeaturesCache.set(classId, level, features, subclass)
    
    // Return all features for the class - no filtering needed
    // The filtering was causing issues with multiclassing
    return { features }
  } catch (error) {
    console.error("Error loading class features:", error)
    return { error: "Failed to load class features" }
  }
}

export const loadClassData = async (className: string, subclass?: string): Promise<{ classData?: any; error?: string }> => {
  try {
    // Load all classes for this class name (base class + all subclasses)
    const { data: allClasses, error: allClassesError } = await supabase
      .from("classes")
      .select("*")
      .eq("name", className)
      .order("subclass", { ascending: true })

    if (allClassesError) {
      console.error("Error loading class data:", allClassesError)
      return { error: allClassesError.message }
    }

    if (!allClasses || allClasses.length === 0) {
      return { error: "Class not found" }
    }

    // Use the new priority system to get the correct class data
    const classData = getClassDataWithSubclassPriority(allClasses, className, subclass)

    return { classData }
  } catch (error) {
    console.error("Error loading class data:", error)
    return { error: "Failed to load class data" }
  }
}

export const loadAllClasses = async (): Promise<{ classes?: Array<{id: string, name: string, subclass: string}>; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, subclass")
      .order("name", { ascending: true })
      .order("subclass", { ascending: true })

    if (error) {
      console.error("Error loading classes:", error)
      return { error: error.message }
    }

    return { classes: data || [] }
  } catch (error) {
    console.error("Error loading classes:", error)
    return { error: "Failed to load classes" }
  }
}

// Admin: Classes, Subclasses, and Features Management
export const loadClassesWithDetails = async (): Promise<{
  classes?: Array<{
    id: string
    name: string
    subclass: string | null
    description?: string | null
    subclass_features?: any | null
    hit_die: number | null
    primary_ability: string | null
    saving_throw_proficiencies: string[] | null
    skill_proficiencies?: any | null
    equipment_proficiencies?: any | null
    starting_equipment?: any | null
    spell_slots_1?: any | null
    spell_slots_2?: any | null
    spell_slots_3?: any | null
    spell_slots_4?: any | null
    spell_slots_5?: any | null
    spell_slots_6?: any | null
    spell_slots_7?: any | null
    spell_slots_8?: any | null
    spell_slots_9?: any | null
    cantrips_known?: number | null
    spells_known?: number | null
    spell_progression: any | null
    max_spell_slots: any | null
    // Column toggles for spell progression matrix
    show_spells_known?: boolean | null
    show_sorcery_points?: boolean | null
    show_martial_arts?: boolean | null
    show_ki_points?: boolean | null
    show_unarmored_movement?: boolean | null
    show_rage?: boolean | null
    show_rage_damage?: boolean | null
    // Sorcerer-specific fields
    sorcery_points?: number | null
    // Monk-specific fields
    martial_arts_dice?: number | null
    ki_points?: number | null
    unarmored_movement?: number | null
    // Barbarian-specific fields
    rage_uses?: number | null
    rage_damage?: number | null
    // Custom class support fields
    is_custom?: boolean | null
    created_by?: string | null
    duplicated_from?: string | null
    source?: string | null
    created_at?: string | null
    updated_at?: string | null
    subclass_selection_level?: number | null
    // class_features column has been dropped - using separate class_features table
  }>
  error?: string
}> => {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true })
      .order("subclass", { ascending: true })

    if (error) {
      console.error("Error loading classes with details:", error)
      return { error: error.message }
    }


    return { classes: data || [] }
  } catch (error) {
    console.error("Error loading classes with details:", error)
    return { error: "Failed to load classes" }
  }
}

// Helper function to get class data with subclass spellcasting priority
export const getClassDataWithSubclassPriority = (classes: any[], className: string, subclassName?: string) => {
  // Find the base class
  const baseClass = classes.find(cls => cls.name === className && !cls.subclass)
  
  if (!baseClass) {
    return null
  }
  
  // If no subclass specified, return base class
  if (!subclassName) {
    return baseClass
  }
  
  // Find the subclass
  const subclass = classes.find(cls => cls.name === className && cls.subclass === subclassName)
  
  if (!subclass) {
    return baseClass
  }
  
  // Merge base class with subclass, prioritizing subclass spellcasting data
  const mergedClass = {
    ...baseClass,
    ...subclass,
    // Override with subclass data if subclass has spellcasting enabled
    show_spells_known: subclass.show_spells_known ? subclass.show_spells_known : baseClass.show_spells_known,
    show_sorcery_points: subclass.show_spells_known ? subclass.show_sorcery_points : baseClass.show_sorcery_points,
    show_martial_arts: subclass.show_spells_known ? subclass.show_martial_arts : baseClass.show_martial_arts,
    show_ki_points: subclass.show_spells_known ? subclass.show_ki_points : baseClass.show_ki_points,
    show_unarmored_movement: subclass.show_spells_known ? subclass.show_unarmored_movement : baseClass.show_unarmored_movement,
    show_rage: subclass.show_spells_known ? subclass.show_rage : baseClass.show_rage,
    show_rage_damage: subclass.show_spells_known ? subclass.show_rage_damage : baseClass.show_rage_damage,
    // Override progression data if subclass has spellcasting enabled
    spells_known: subclass.show_spells_known ? subclass.spells_known : baseClass.spells_known,
    sorcery_points: subclass.show_spells_known ? subclass.sorcery_points : baseClass.sorcery_points,
    martial_arts_dice: subclass.show_spells_known ? subclass.martial_arts_dice : baseClass.martial_arts_dice,
    ki_points: subclass.show_spells_known ? subclass.ki_points : baseClass.ki_points,
    unarmored_movement: subclass.show_spells_known ? subclass.unarmored_movement : baseClass.unarmored_movement,
    rage_uses: subclass.show_spells_known ? subclass.rage_uses : baseClass.rage_uses,
    rage_damage: subclass.show_spells_known ? subclass.rage_damage : baseClass.rage_damage,
  }
  
  return mergedClass
}

export const upsertClass = async (cls: Partial<ClassData> & { id?: string }): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const toStringArray = (v: any): string[] | null => {
      if (v === undefined || v === null) return null
      return Array.isArray(v) ? v.map((x) => String(x)) : [String(v)]
    }
    const toNumberArray = (v: any): number[] | null => {
      if (v === undefined || v === null) return null
      return Array.isArray(v) ? v.map((x) => Number(x)) : [Number(v)]
    }
    const toTitleArray = (v: any): string[] | null => {
      const arr = toStringArray(v)
      if (!arr) return null
      return arr.map((s) => s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s)
    }
    const id = cls.id && cls.id.length > 0 ? cls.id : globalThis.crypto.randomUUID()
    // Start with minimal payload and only include fields that are likely to exist in the database
    const payload: any = {
      id,
      name: cls.name,
      subclass: (cls as any).subclass ?? null,
      description: (cls as any).description ?? null,
      hit_die: cls.hit_die ?? null,
      subclass_selection_level: (cls as any).subclass_selection_level ?? null,
      // Store as an array of Title-cased strings per DB convention, e.g., ["Charisma"]
      primary_ability: toTitleArray(cls.primary_ability),
      saving_throw_proficiencies: toStringArray(cls.saving_throw_proficiencies),
      skill_proficiencies: (cls as any).skill_proficiencies ?? null,
      equipment_proficiencies: (cls as any).equipment_proficiencies ?? null,
      starting_equipment: (cls as any).starting_equipment ?? null,
      spell_slots_1: toNumberArray((cls as any).spell_slots_1),
      spell_slots_2: toNumberArray((cls as any).spell_slots_2),
      spell_slots_3: toNumberArray((cls as any).spell_slots_3),
      spell_slots_4: toNumberArray((cls as any).spell_slots_4),
      spell_slots_5: toNumberArray((cls as any).spell_slots_5),
      spell_slots_6: toNumberArray((cls as any).spell_slots_6),
      spell_slots_7: toNumberArray((cls as any).spell_slots_7),
      spell_slots_8: toNumberArray((cls as any).spell_slots_8),
      spell_slots_9: toNumberArray((cls as any).spell_slots_9),
      cantrips_known: toNumberArray((cls as any).cantrips_known),
      spells_known: toNumberArray((cls as any).spells_known),
      // Column toggles for spell progression matrix
      show_spells_known: (cls as any).showSpellsKnown || false,
      show_sorcery_points: (cls as any).showSorceryPoints || false,
      show_martial_arts: (cls as any).showMartialArts || false,
      show_ki_points: (cls as any).showKiPoints || false,
      show_unarmored_movement: (cls as any).showUnarmoredMovement || false,
      show_rage: (cls as any).showRage || false,
      show_rage_damage: (cls as any).showRageDamage || false,
      // Sorcerer-specific fields
      sorcery_points: toNumberArray((cls as any).sorcery_points),
      // Monk-specific fields
      martial_arts_dice: toNumberArray((cls as any).martial_arts_dice),
      ki_points: toNumberArray((cls as any).ki_points),
      unarmored_movement: toNumberArray((cls as any).unarmored_movement),
      // Barbarian-specific fields
      rage_uses: toNumberArray((cls as any).rage_uses),
      rage_damage: toNumberArray((cls as any).rage_damage),
    }

    // Always include is_custom field, defaulting to true for new classes
    payload.is_custom = (cls as any).is_custom ?? true
    
    if ((cls as any).created_by !== undefined) {
      payload.created_by = (cls as any).created_by
    }
    if ((cls as any).duplicated_from !== undefined) {
      payload.duplicated_from = (cls as any).duplicated_from
    }
    // Always include source field, defaulting to 'custom' if not specified
    payload.source = (cls as any).source ?? 'custom'
    if ((cls as any).created_at !== undefined) {
      payload.created_at = (cls as any).created_at
    }
    if ((cls as any).updated_at !== undefined) {
      payload.updated_at = (cls as any).updated_at
    }

    
    const { error } = await supabase.from("classes").upsert(payload)
    if (error) {
      console.error("❌ Error upserting class:", error)
      console.error("📤 Payload that failed:", payload)
      return { success: false, error: error.message }
    }

    // Synchronize spell slots to ALL entries with the same class name (base class + all subclasses)
    if (cls.name) {
      await synchronizeSpellSlotsToSubclasses(cls.name, {
        spell_slots_1: payload.spell_slots_1,
        spell_slots_2: payload.spell_slots_2,
        spell_slots_3: payload.spell_slots_3,
        spell_slots_4: payload.spell_slots_4,
        spell_slots_5: payload.spell_slots_5,
        spell_slots_6: payload.spell_slots_6,
        spell_slots_7: payload.spell_slots_7,
        spell_slots_8: payload.spell_slots_8,
        spell_slots_9: payload.spell_slots_9,
        cantrips_known: payload.cantrips_known,
      })
    } else {
    }

    return { success: true, id }
  } catch (error) {
    console.error("Error upserting class:", error)
    return { success: false, error: "Failed to upsert class" }
  }
}

// Synchronize spell slots from base class to ALL entries with the same class name
export const synchronizeSpellSlotsToSubclasses = async (
  className: string, 
  spellSlotData: {
    spell_slots_1: number[] | null
    spell_slots_2: number[] | null
    spell_slots_3: number[] | null
    spell_slots_4: number[] | null
    spell_slots_5: number[] | null
    spell_slots_6: number[] | null
    spell_slots_7: number[] | null
    spell_slots_8: number[] | null
    spell_slots_9: number[] | null
    cantrips_known: number[] | null
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    
    // Find ALL entries with this class name (base class + all subclasses)
    const { data: allClasses, error: fetchError } = await supabase
      .from("classes")
      .select("id, subclass")
      .eq("name", className)

    if (fetchError) {
      console.error("❌ Error fetching all class entries:", fetchError)
      return { success: false, error: fetchError.message }
    }


    if (!allClasses || allClasses.length === 0) {
      return { success: true }
    }

    const updatePayload = {
      spell_slots_1: spellSlotData.spell_slots_1,
      spell_slots_2: spellSlotData.spell_slots_2,
      spell_slots_3: spellSlotData.spell_slots_3,
      spell_slots_4: spellSlotData.spell_slots_4,
      spell_slots_5: spellSlotData.spell_slots_5,
      spell_slots_6: spellSlotData.spell_slots_6,
      spell_slots_7: spellSlotData.spell_slots_7,
      spell_slots_8: spellSlotData.spell_slots_8,
      spell_slots_9: spellSlotData.spell_slots_9,
      cantrips_known: spellSlotData.cantrips_known,
      updated_at: new Date().toISOString()
    }


    // Update ALL entries with this class name (base class + all subclasses)
    const { error: updateError } = await supabase
      .from("classes")
      .update(updatePayload)
      .eq("name", className)

    if (updateError) {
      console.error("❌ Error updating all class entries:", updateError)
      return { success: false, error: updateError.message }
    }

    const baseClassCount = allClasses.filter(c => c.subclass === null).length
    const subclassCount = allClasses.filter(c => c.subclass !== null).length
    return { success: true }
  } catch (error) {
    console.error("❌ Error synchronizing spell slots to all class entries:", error)
    return { success: false, error: "Failed to synchronize spell slots to all class entries" }
  }
}

export const loadClassById = async (id: string): Promise<{ klass?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.from("classes").select("*").eq("id", id).maybeSingle()
    if (error) return { error: error.message }
    return { klass: data }
  } catch (error) {
    console.error("Error loading class by id:", error)
    return { error: "Failed to load class" }
  }
}

export const loadBaseClassByName = async (name: string): Promise<{ klass?: any; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("name", name)
      .is("subclass", null)
      .maybeSingle()
    if (error) return { error: error.message }
    return { klass: data }
  } catch (error) {
    console.error("Error loading base class by name:", error)
    return { error: "Failed to load base class" }
  }
}

export const deleteClass = async (classId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Delete features for this class id
    const { error: featError } = await supabase.from("class_features").delete().eq("class_id", classId)
    if (featError) {
      console.error("Error deleting class features:", featError)
      return { success: false, error: featError.message }
    }

    // Delete subclasses that reference this as base via same name is handled at caller level.
    const { error } = await supabase.from("classes").delete().eq("id", classId)
    if (error) {
      console.error("Error deleting class:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting class:", error)
    return { success: false, error: "Failed to delete class" }
  }
}

export const loadFeaturesForClass = async (classId: string): Promise<{
  features?: Array<{ id: string; class_id: string; level: number; title: string; description: string; feature_type: string; subclass_id?: string | null }>
  error?: string
}> => {
  try {
    const { data, error } = await supabase
      .from("class_features")
      .select("id, class_id, level, title, description, feature_type")
      .eq("class_id", classId)
      .order("level", { ascending: true })

    if (error) {
      console.error("Error loading class features:", error)
      return { error: error.message }
    }
    return { features: (data || []).map((f: any) => ({ ...f, subclass_id: f.subclass_id ?? null })) }
  } catch (error) {
    console.error("Error loading class features:", error)
    return { error: "Failed to load class features" }
  }
}

export const loadFeaturesForBaseWithSubclasses = async (baseClassId: string, subclassIds: string[]): Promise<{
  features?: Array<{ 
    id: string; 
    class_id: string; 
    level: number; 
    title: string; 
    description: string; 
    feature_type: string; 
    feature_skill_type?: string;
    subclass_id?: string | null;
    is_hidden?: boolean;
    class_features_skills?: any;
  }>
  error?: string
}> => {
  try {
    // Fetch base class features (including is_hidden)
    const { data: base, error: baseErr } = await supabase
      .from("class_features")
      .select("id, class_id, level, title, description, feature_type, feature_skill_type, subclass_id, is_hidden, class_features_skills")
      .eq("class_id", baseClassId)

    if (baseErr) return { error: baseErr.message }

    let all: any[] = base || []

    if (subclassIds.length > 0) {
      // Prefer schema-agnostic: fetch subclass features by class_id IN subclassIds
      const { data: fallbackFeats, error: fallbackErr } = await supabase
        .from("class_features")
        .select("id, class_id, level, title, description, feature_type, feature_skill_type, subclass_id, is_hidden, class_features_skills")
        .in("class_id", subclassIds)
      if (fallbackErr) return { error: fallbackErr.message }
      const subFeats = (fallbackFeats || []).map((f: any) => ({ ...f, subclass_id: f.class_id, feature_type: 'subclass' }))
      all = [...all, ...subFeats]
    }

    // Normalize subtype tag
    all.forEach(f => { if ((f as any).subclass_id) (f as any).feature_type = 'subclass' })

    // Deduplicate and sort
    const uniq = new Map<string, any>()
    all.forEach(f => uniq.set(f.id, f))
    const merged = Array.from(uniq.values()).sort((a,b) => a.level - b.level)
    return { features: merged }
  } catch (error) {
    console.error("Error loading base+subclass features:", error)
    return { error: "Failed to load class features" }
  }
}

/**
 * Invalidate cache for a specific class
 * Call this when features are updated through the management interface
 */
export const invalidateClassFeaturesCache = async (classId: string, className?: string): Promise<void> => {
  try {
    const { classFeaturesCache } = await import('./class-features-cache')
    
    // Get all cache entries and remove ones that match this class
    const stats = classFeaturesCache.getStats()
    let removedCount = 0
    
    for (const entry of stats.entries) {
      // Remove entries that match the classId or className
      if (entry.key.startsWith(classId) || (className && entry.key.includes(className))) {
        // We need to reconstruct the key to remove it
        // Since we can't directly remove by partial key, we'll clear the entire cache
        // This is simpler and ensures consistency
        classFeaturesCache.clear()
        removedCount = stats.size
        break
      }
    }
    
    if (removedCount > 0) {
    }
  } catch (error) {
    console.error('Error invalidating class features cache:', error)
  }
}

export const upsertClassFeature = async (feature: { 
  id?: string; 
  class_id: string; 
  level: number; 
  title: string; 
  description: string; 
  feature_type: "class" | "subclass"; 
  feature_skill_type?: "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle";
  subclass_id?: string | null; 
  is_hidden?: boolean;
  class_features_skills?: any 
}): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    // Ensure subclass_id is properly set based on feature_type
    const normalizedSubclassId = feature.feature_type === 'subclass' ? feature.subclass_id : null
    
    // If we have an ID, try to update first
    if (feature.id && feature.id.length > 0) {
      const { error: updateError } = await supabase
        .from("class_features")
        .update({
          class_id: feature.class_id,
          level: feature.level,
          title: feature.title,
          description: feature.description,
          feature_type: feature.feature_type,
          feature_skill_type: feature.feature_skill_type,
          subclass_id: normalizedSubclassId,
          is_hidden: feature.is_hidden || false,
          class_features_skills: feature.class_features_skills
        })
        .eq("id", feature.id)
      
      if (!updateError) {
        // Invalidate cache for this class
        await invalidateClassFeaturesCache(feature.class_id)
        return { success: true, id: feature.id }
      }
    }
    
    // If update failed or no ID, try to find existing feature by unique constraint
    // For base class features, subclass_id should be null
    // For subclass features, subclass_id should match the specific subclass
    const { data: existingFeature, error: findError } = await supabase
      .from("class_features")
      .select("id")
      .eq("class_id", feature.class_id)
      .eq("level", feature.level)
      .eq("title", feature.title)
      .eq("feature_type", feature.feature_type)
      .eq("subclass_id", normalizedSubclassId)
      .maybeSingle()
    
    if (existingFeature && !findError) {
      // Update existing feature
      const { error: updateError } = await supabase
        .from("class_features")
        .update({
          description: feature.description,
          feature_skill_type: feature.feature_skill_type,
          is_hidden: feature.is_hidden || false,
          class_features_skills: feature.class_features_skills
        })
        .eq("id", existingFeature.id)
      
      if (updateError) {
        console.error("Error updating existing class feature:", updateError)
        return { success: false, error: updateError.message }
      }
      
      // Invalidate cache for this class
      await invalidateClassFeaturesCache(feature.class_id)
      return { success: true, id: existingFeature.id }
    }
    
    // Create new feature only if no existing feature found
    const id = globalThis.crypto.randomUUID()
    const payload = { 
      ...feature, 
      id,
      subclass_id: normalizedSubclassId,
      is_hidden: feature.is_hidden || false
    }
    const { error } = await supabase.from("class_features").insert(payload)
    if (error) {
      console.error("Error creating class feature:", error)
      return { success: false, error: error.message }
    }
    
    // Invalidate cache for this class
    await invalidateClassFeaturesCache(feature.class_id)
    return { success: true, id }
  } catch (error) {
    console.error("Error upserting class feature:", error)
    return { success: false, error: "Failed to upsert class feature" }
  }
}

export const deleteClassFeature = async (featureId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First get the class_id before deleting so we can invalidate the cache
    const { data: feature, error: fetchError } = await supabase
      .from("class_features")
      .select("class_id")
      .eq("id", featureId)
      .single()
    
    if (fetchError) {
      console.error("Error fetching class feature for deletion:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    const { error } = await supabase.from("class_features").delete().eq("id", featureId)
    if (error) {
      console.error("Error deleting class feature:", error)
      return { success: false, error: error.message }
    }
    
    // Invalidate cache for this class
    if (feature?.class_id) {
      await invalidateClassFeaturesCache(feature.class_id)
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting class feature:", error)
    return { success: false, error: "Failed to delete class feature" }
  }
}

// Campaign management functions
export const createCampaign = async (campaign: Campaign): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("campaigns")
      .insert([{
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        characters: campaign.characters,
        is_active: campaign.isActive || false,
        dungeon_master_id: campaign.dungeonMasterId || null,
        level_up_mode_enabled: campaign.levelUpModeEnabled || false,
        next_session_date: campaign.nextSessionDate || null,
        next_session_time: campaign.nextSessionTime || null,
        next_session_timezone: campaign.nextSessionTimezone || null,
        next_session_number: campaign.nextSessionNumber || null,
        discord_webhook_url: campaign.discordWebhookUrl || null,
        discord_notifications_enabled: campaign.discordNotificationsEnabled || false,
        discord_reminder_sent: campaign.discordReminderSent || false
      }])

    if (error) {
      console.error("Error creating campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error creating campaign:", error)
    return { success: false, error: "Failed to create campaign" }
  }
}

export const loadAllCampaigns = async (useServiceRole = false): Promise<{ campaigns?: Campaign[]; error?: string }> => {
  try {
    // Use service role client if requested (for API routes that need to bypass RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    const client = useServiceRole && serviceRoleKey 
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    const { data, error } = await client
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading campaigns:", error)
      return { error: error.message }
    }

    const campaigns = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
      characters: row.characters || [],
      isActive: row.is_active || false,
      dungeonMasterId: row.dungeon_master_id || undefined,
      levelUpModeEnabled: row.level_up_mode_enabled || false,
      nextSessionDate: row.next_session_date || undefined,
      nextSessionTime: row.next_session_time || undefined,
      nextSessionTimezone: row.next_session_timezone || undefined,
      nextSessionNumber: row.next_session_number || undefined,
      discordWebhookUrl: row.discord_webhook_url || undefined,
      discordNotificationsEnabled: row.discord_notifications_enabled || false,
      discordReminderSent: row.discord_reminder_sent || false
    }))

    return { campaigns }
  } catch (error) {
    console.error("Error loading campaigns:", error)
    return { error: "Failed to load campaigns" }
  }
}

export const updateCampaign = async (campaign: Campaign): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("campaigns")
      .update({
        name: campaign.name,
        description: campaign.description,
        updated_at: campaign.updated_at,
        characters: campaign.characters,
        is_active: campaign.isActive || false,
        dungeon_master_id: campaign.dungeonMasterId || null,
        level_up_mode_enabled: campaign.levelUpModeEnabled || false,
        next_session_date: campaign.nextSessionDate || null,
        next_session_time: campaign.nextSessionTime || null,
        next_session_timezone: campaign.nextSessionTimezone || null,
        next_session_number: campaign.nextSessionNumber || null,
        discord_webhook_url: campaign.discordWebhookUrl || null,
        discord_notifications_enabled: campaign.discordNotificationsEnabled || false,
        discord_reminder_sent: campaign.discordReminderSent || false
      })
      .eq("id", campaign.id)

    if (error) {
      console.error("Error updating campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating campaign:", error)
    return { success: false, error: "Failed to update campaign" }
  }
}

export const setActiveCampaign = async (campaignId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, deactivate all campaigns
    const { error: deactivateError } = await supabase
      .from("campaigns")
      .update({ is_active: false })

    if (deactivateError) {
      console.error("Error deactivating campaigns:", deactivateError)
      return { success: false, error: deactivateError.message }
    }

    // Then activate the selected campaign
    const { error } = await supabase
      .from("campaigns")
      .update({ is_active: true })
      .eq("id", campaignId)

    if (error) {
      console.error("Error setting active campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error setting active campaign:", error)
    return { success: false, error: "Failed to set active campaign" }
  }
}

export const deleteCampaign = async (campaignId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, remove campaign association from all characters
    const { error: updateError } = await supabase
      .from("characters")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)

    if (updateError) {
      console.error("Error removing campaign from characters:", updateError)
      return { success: false, error: updateError.message }
    }

    // Then delete the campaign
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)

    if (error) {
      console.error("Error deleting campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return { success: false, error: "Failed to delete campaign" }
  }
}

export const assignCharacterToCampaign = async (characterId: string, campaignId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("characters")
      .update({ campaign_id: campaignId })
      .eq("id", characterId)

    if (error) {
      console.error("Error assigning character to campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error assigning character to campaign:", error)
    return { success: false, error: "Failed to assign character to campaign" }
  }
}

export const removeCharacterFromCampaign = async (characterId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("characters")
      .update({ campaign_id: null })
      .eq("id", characterId)

    if (error) {
      console.error("Error removing character from campaign:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error removing character from campaign:", error)
    return { success: false, error: "Failed to remove character from campaign" }
  }
}

// Campaign Notes Functions
export const getCampaignNotes = async (campaignId: string): Promise<{ notes?: CampaignNote[]; error?: string }> => {
  try {
    const { data: notes, error } = await supabase
      .from("campaign_notes")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campaign notes:", error)
      return { error: error.message }
    }

    return { notes: notes || [] }
  } catch (error) {
    console.error("Error in getCampaignNotes:", error)
    return { error: "Failed to fetch campaign notes" }
  }
}

export const createCampaignNote = async (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>): Promise<{ note?: CampaignNote; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("campaign_notes")
      .insert([note])
      .select()
      .single()

    if (error) {
      console.error("Error creating campaign note:", error)
      return { error: error.message }
    }

    
    // Update cache
    try {
      const { addNoteToCache } = await import('./campaign-notes-cache')
      addNoteToCache(note.campaign_id, data)
    } catch (cacheError) {
      console.warn("Failed to update cache after creating note:", cacheError)
    }
    
    return { note: data }
  } catch (error) {
    console.error("Error in createCampaignNote:", error)
    return { error: "Failed to create campaign note" }
  }
}

export const updateCampaignNote = async (id: string, updates: Partial<Pick<CampaignNote, 'title' | 'content' | 'session_date' | 'members_attending'>>): Promise<{ note?: CampaignNote; error?: string }> => {
  try {
    if (!id) {
      console.error("updateCampaignNote called with empty id")
      return { error: "Note ID is required" }
    }

    // First check if the note exists and fetch it
    const { data: existingNote, error: checkError } = await supabase
      .from("campaign_notes")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking if note exists:", checkError)
      return { error: checkError.message }
    }

    if (!existingNote) {
      console.error(`Note with id ${id} not found in database`)
      return { error: `Note not found (ID: ${id})` }
    }

    const { error: updateError } = await supabase
      .from("campaign_notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating campaign note:", updateError)
      return { error: updateError.message }
    }

    // Fetch the updated note separately (in case RLS blocks the select after update)
    const { data, error: selectError } = await supabase
      .from("campaign_notes")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (selectError) {
      console.error("Error fetching updated note:", selectError)
      // Update succeeded, but couldn't fetch - construct the note from existing + updates
      if (existingNote) {
        // Use the updates we know were applied
        const constructedNote = {
          ...existingNote,
          ...updates,
          updated_at: new Date().toISOString()
        } as CampaignNote
        return { note: constructedNote }
      }
      return { error: selectError.message }
    }

    if (!data) {
      console.error(`Update succeeded but note ${id} not found after fetch`)
      // Update succeeded, construct note from existing + updates
      if (existingNote) {
        const constructedNote = {
          ...existingNote,
          ...updates,
          updated_at: new Date().toISOString()
        } as CampaignNote
        return { note: constructedNote }
      }
      return { error: "Note not found after update" }
    }

    const updatedNote = data

    
    // Update cache
    try {
      const { updateNoteInCache } = await import('./campaign-notes-cache')
      updateNoteInCache(updatedNote.campaign_id, id, updatedNote)
    } catch (cacheError) {
      console.warn("Failed to update cache after updating note:", cacheError)
    }
    
    return { note: updatedNote }
  } catch (error) {
    console.error("Error in updateCampaignNote:", error)
    return { error: "Failed to update campaign note" }
  }
}

export const deleteCampaignNote = async (id: string, campaignId?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("campaign_notes")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting campaign note:", error)
      return { success: false, error: error.message }
    }

    // Update cache if we have the campaign ID
    if (campaignId) {
      try {
        const { removeNoteFromCache } = await import('./campaign-notes-cache')
        removeNoteFromCache(campaignId, id)
      } catch (cacheError) {
        console.warn("Failed to update cache after deleting note:", cacheError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCampaignNote:", error)
    return { success: false, error: "Failed to delete campaign note" }
  }
}

// Campaign Resources Functions
export const getCampaignResources = async (campaignId: string): Promise<{ resources?: CampaignResource[]; error?: string }> => {
  try {
    const { data: resources, error } = await supabase
      .from("campaign_resources")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campaign resources:\n", error)
      return { error: error.message }
    }

    return { resources: resources || [] }
  } catch (error) {
    console.error("Error in getCampaignResources:", error)
    return { error: "Failed to fetch campaign resources" }
  }
}

export const createCampaignResource = async (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>): Promise<{ resource?: CampaignResource; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("campaign_resources")
      .insert([resource])
      .select()
      .single()

    if (error) {
      console.error("Error creating campaign resource:", error)
      return { error: error.message }
    }

    return { resource: data }
  } catch (error) {
    console.error("Error in createCampaignResource:", error)
    return { error: "Failed to create campaign resource" }
  }
}

export const updateCampaignResource = async (id: string, updates: Partial<Pick<CampaignResource, 'title' | 'content'>>): Promise<{ resource?: CampaignResource; error?: string }> => {
  try {
    if (!id) {
      console.error("updateCampaignResource called with empty id")
      return { error: "Resource ID is required" }
    }

    // First check if the resource exists and fetch it
    const { data: existingResource, error: checkError } = await supabase
      .from("campaign_resources")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking if resource exists:", checkError)
      return { error: checkError.message }
    }

    if (!existingResource) {
      console.error(`Resource with id ${id} not found in database`)
      return { error: `Resource not found (ID: ${id})` }
    }

    const { error: updateError } = await supabase
      .from("campaign_resources")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating campaign resource:", updateError)
      return { error: updateError.message }
    }

    // Fetch the updated resource separately (in case RLS blocks the select after update)
    const { data, error: selectError } = await supabase
      .from("campaign_resources")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (selectError) {
      console.error("Error fetching updated resource:", selectError)
      // Update succeeded, but couldn't fetch - construct the resource from existing + updates
      if (existingResource) {
        const constructedResource = {
          ...existingResource,
          ...updates,
          updated_at: new Date().toISOString()
        } as CampaignResource
        return { resource: constructedResource }
      }
      return { error: selectError.message }
    }

    if (!data) {
      console.error(`Update succeeded but resource ${id} not found after fetch`)
      // Update succeeded, construct resource from existing + updates
      if (existingResource) {
        const constructedResource = {
          ...existingResource,
          ...updates,
          updated_at: new Date().toISOString()
        } as CampaignResource
        return { resource: constructedResource }
      }
      return { error: "Resource not found after update" }
    }

    return { resource: data }
  } catch (error) {
    console.error("Error in updateCampaignResource:", error)
    return { error: "Failed to update campaign resource" }
  }
}

export const deleteCampaignResource = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("campaign_resources")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting campaign resource:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCampaignResource:", error)
    return { success: false, error: "Failed to delete campaign resource" }
  }
}

// Campaign Links Functions
export const getCampaignLinks = async (campaignId: string): Promise<{ links?: CampaignLink[]; error?: string }> => {
  try {
    const { data: links, error } = await supabase
      .from("campaign_links")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campaign links:", error)
      return { error: error.message }
    }

    return { links: links || [] }
  } catch (error) {
    console.error("Error in getCampaignLinks:", error)
    return { error: "Failed to fetch campaign links" }
  }
}

export const createCampaignLink = async (link: Omit<CampaignLink, 'id' | 'created_at' | 'updated_at'>): Promise<{ link?: CampaignLink; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("campaign_links")
      .insert([link])
      .select()
      .single()

    if (error) {
      console.error("Error creating campaign link:", error)
      return { error: error.message }
    }

    return { link: data }
  } catch (error) {
    console.error("Error in createCampaignLink:", error)
    return { error: "Failed to create campaign link" }
  }
}

export const deleteCampaignLink = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("campaign_links")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting campaign link:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCampaignLink:", error)
    return { success: false, error: "Failed to delete campaign link" }
  }
}

// ============================================================================
// CLASS MANAGEMENT SYSTEM FUNCTIONS
// ============================================================================

import type { ClassFeatureSkill, FeatureSkillUsage } from './class-feature-types'
import { FEATURE_TEMPLATES } from './class-feature-templates'
import { getFeaturesForClass } from './class-feature-mapping'

/**
 * Load class feature skills for a character based on their classes and levels
 */
export const loadClassFeatureSkills = async (character: CharacterData): Promise<{
  featureSkills?: ClassFeatureSkill[]
  error?: string
}> => {
  try {
    const featureSkills: ClassFeatureSkill[] = []

    // Load feature skills for each class the character has
    for (const charClass of character.classes || []) {
      
      // First try to load from templates/mapping
      const classFeatures = getFeaturesForClass(charClass.name, charClass.level, charClass.subclass)
      
      // Ensure each feature has the correct className property
      const featuresWithClassName = classFeatures.map(feature => ({
        ...feature,
        className: charClass.name
      }))
      featureSkills.push(...featuresWithClassName)
      
      // Also try to load from database as fallback/supplement
      try {
        const { data: classData } = await supabase
          .from('classes')
          .select('id')
          .eq('name', charClass.name)
          .eq('subclass', charClass.subclass || null)
          .maybeSingle()

        if (classData) {
          const { data: features } = await supabase
            .from('class_features')
            .select('class_features_skills, is_hidden')
            .eq('class_id', classData.id)
            .lte('level', charClass.level)

          for (const feature of features || []) {
            // Skip hidden features
            if (feature.is_hidden) {
              continue
            }
            
            if (feature.class_features_skills) {
              const skills = Array.isArray(feature.class_features_skills) 
                ? feature.class_features_skills 
                : [feature.class_features_skills]
              // Ensure each skill has the correct className property
              const skillsWithClassName = skills.map(skill => ({
                ...skill,
                className: charClass.name
              }))
              featureSkills.push(...skillsWithClassName)
            }
          }
        }
      } catch (dbError) {
      }
    }

    return { featureSkills }
  } catch (error) {
    console.error("Error loading class feature skills:", error)
    return { error: "Failed to load class feature skills" }
  }
}

/**
 * Save class feature skills usage for a character
 */
export const saveClassFeatureSkillsUsage = async (
  characterId: string, 
  usage: FeatureSkillUsage
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('characters')
      .update({ class_features_skills_usage: usage })
      .eq('id', characterId)

    if (error) {
      console.error("Error saving class feature skills usage:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in saveClassFeatureSkillsUsage:", error)
    return { success: false, error: "Failed to save feature skills usage" }
  }
}

/**
 * Create a new custom class
 */
export const createCustomClass = async (classData: Partial<ClassData>): Promise<{
  success: boolean
  classId?: string
  error?: string
}> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        ...classData,
        is_custom: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (error) {
      console.error("Error creating custom class:", error)
      return { success: false, error: error.message }
    }

    return { success: true, classId: data.id }
  } catch (error) {
    console.error("Error in createCustomClass:", error)
    return { success: false, error: "Failed to create custom class" }
  }
}

/**
 * Duplicate an existing class
 */
export const duplicateClass = async (
  sourceClassId: string,
  newName: string,
  options: {
    copySubclasses?: boolean
    copyFeatures?: boolean
    copyFeatureSkills?: boolean
  } = {}
): Promise<{
  success: boolean
  newClassId?: string
  error?: string
}> => {
  try {
    // Get the source class
    const { data: sourceClass, error: sourceError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', sourceClassId)
      .maybeSingle()

    if (sourceError || !sourceClass) {
      return { success: false, error: "Source class not found" }
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id

    // Create the new class
    const { data: newClass, error: createError } = await supabase
      .from('classes')
      .insert([{
        name: newName,
        subclass: null, // Reset subclass for base class
        description: sourceClass.description,
        hit_die: sourceClass.hit_die,
        primary_ability: sourceClass.primary_ability,
        saving_throw_proficiencies: sourceClass.saving_throw_proficiencies,
        skill_proficiencies: sourceClass.skill_proficiencies,
        equipment_proficiencies: sourceClass.equipment_proficiencies,
        starting_equipment: sourceClass.starting_equipment,
        spell_slots_1: sourceClass.spell_slots_1,
        spell_slots_2: sourceClass.spell_slots_2,
        spell_slots_3: sourceClass.spell_slots_3,
        spell_slots_4: sourceClass.spell_slots_4,
        spell_slots_5: sourceClass.spell_slots_5,
        spell_slots_6: sourceClass.spell_slots_6,
        spell_slots_7: sourceClass.spell_slots_7,
        spell_slots_8: sourceClass.spell_slots_8,
        spell_slots_9: sourceClass.spell_slots_9,
        cantrips_known: sourceClass.cantrips_known,
        spells_known: sourceClass.spells_known,
        is_custom: true,
        created_by: currentUserId,
        duplicated_from: sourceClassId,
        source: 'Custom',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (createError) {
      console.error("Error creating duplicated class:", createError)
      return { success: false, error: createError.message }
    }

    const newClassId = newClass.id

    // Copy subclasses if requested
    if (options.copySubclasses) {
      const { data: subclasses } = await supabase
        .from('classes')
        .select('*')
        .eq('name', sourceClass.name)
        .not('subclass', 'is', null)

      if (subclasses && subclasses.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        const currentUserId = user?.id

        const subclassInserts = subclasses.map(subclass => ({
          ...subclass,
          id: undefined,
          name: newName,
          is_custom: true,
          created_by: currentUserId,
          duplicated_from: subclass.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: subclassError } = await supabase
          .from('classes')
          .insert(subclassInserts)

        if (subclassError) {
          console.error("Error copying subclasses:", subclassError)
          // Continue anyway, don't fail the whole operation
        }
      }
    }

    // Copy features if requested
    if (options.copyFeatures) {
      const { data: features } = await supabase
        .from('class_features')
        .select('*')
        .eq('class_id', sourceClassId)

      if (features && features.length > 0) {
        const featureInserts = features.map(feature => ({
          ...feature,
          id: undefined,
          class_id: newClassId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: featureError } = await supabase
          .from('class_features')
          .insert(featureInserts)

        if (featureError) {
          console.error("Error copying features:", featureError)
          // Continue anyway, don't fail the whole operation
        }
      }
    }

    return { success: true, newClassId }
  } catch (error) {
    console.error("Error in duplicateClass:", error)
    return { success: false, error: "Failed to duplicate class" }
  }
}

/**
 * Update class feature skills for a class
 */
export const updateClassFeatureSkills = async (
  classId: string,
  featureSkills: ClassFeatureSkill[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update all features for this class with the new feature skills
    const { error } = await supabase
      .from('class_features')
      .update({ class_features_skills: featureSkills })
      .eq('class_id', classId)

    if (error) {
      console.error("Error updating class feature skills:", error)
      return { success: false, error: error.message }
    }

    // Invalidate cache for this class
    await invalidateClassFeaturesCache(classId)

    return { success: true }
  } catch (error) {
    console.error("Error in updateClassFeatureSkills:", error)
    return { success: false, error: "Failed to update class feature skills" }
  }
}

/**
 * Get all custom classes created by the current user
 */
export const getCustomClasses = async (): Promise<{
  classes?: ClassData[]
  error?: string
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: "User not authenticated" }
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_custom', true)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching custom classes:", error)
      return { error: error.message }
    }

    return { classes: data || [] }
  } catch (error) {
    console.error("Error in getCustomClasses:", error)
    return { error: "Failed to fetch custom classes" }
  }
}

/**
 * Check if a class can be edited by the current user
 */
export const canEditClass = async (classId: string): Promise<{
  canEdit: boolean
  error?: string
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { canEdit: false, error: "User not authenticated" }
    }

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('permission_level')
      .eq('user_id', user.id)
      .single()

    if (profile?.permission_level === 'superadmin') {
      return { canEdit: true }
    }
    // View-only users cannot edit classes
    if (profile?.permission_level === 'viewer') {
      return { canEdit: false }
    }

    // Check if user owns this custom class
    const { data: classData } = await supabase
      .from('classes')
      .select('is_custom, created_by')
      .eq('id', classId)
      .maybeSingle()

    if (!classData) {
      return { canEdit: false, error: "Class not found" }
    }

    if (classData.is_custom && classData.created_by === user.id) {
      return { canEdit: true }
    }

    return { canEdit: false }
  } catch (error) {
    console.error("Error in canEditClass:", error)
    return { canEdit: false, error: "Failed to check edit permissions" }
  }
}
