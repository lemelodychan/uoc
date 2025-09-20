import { createClient } from "./supabase"
import type { CharacterData } from "./character-data"
import { createDefaultSkills, createDefaultSavingThrowProficiencies, createClassBasedSavingThrowProficiencies, calculateSpellSaveDC, calculateSpellAttackBonus, getSpellsKnown, calculateProficiencyBonus, getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData } from "./character-data"
import { getBardicInspirationData, getSongOfRestData } from "./class-utils"

const supabase = createClient()

export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("[v0] Testing Supabase connection...")
    const { data, error } = await supabase.from("characters").select("count", { count: "exact", head: true })

    if (error) {
      console.log("[v0] Connection test failed:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Connection test successful, character count:", data)
    return { success: true }
  } catch (error) {
    console.log("[v0] Connection test error:", error)
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
    console.log(`[v0] Updating party status for character ${characterId} to ${status}`)
    
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

    console.log("[v0] Party status updated successfully")
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
      console.log(`[v0] Generated new UUID for character: ${characterId}`)
    }

    const saveData: any = {
      id: characterId, // Use the UUID instead of character.id
      name: character.name,
      class_name: character.class,
      class_id: character.class_id,
      subclass: character.subclass,
      level: character.level,
      background: character.background,
      race: character.race,
      alignment: character.alignment,
      image_url: character.imageUrl || null,
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
      bardic_inspiration_used: character.spellData?.bardicInspirationSlot ? 
        (character.spellData.bardicInspirationSlot.usesPerRest - character.spellData.bardicInspirationSlot.currentUses) : 0,
      flash_of_genius_used: (character.class.toLowerCase() === "artificer" && character.level >= 7 && character.spellData?.flashOfGeniusSlot)
        ? (character.spellData.flashOfGeniusSlot.usesPerRest - character.spellData.flashOfGeniusSlot.currentUses)
        : 0,
      // song_of_rest column intentionally omitted; feature controlled in UI state
      class_features: character.classFeatures,
      tools: character.toolsProficiencies,
      feats: character.feats,
      infusions: character.infusions || [],
      infusion_notes: character.infusionNotes || "",
      saving_throw_proficiencies: character.savingThrowProficiencies || [],
      equipment: character.equipment || "",
      magic_items: character.magicItems || [],
      languages: character.languages || "",
      other_tools: character.otherTools || "",
      equipment_proficiencies: character.equipmentProficiencies || null,
      feature_custom_descriptions: character.featureNotes || null,
      eldritch_cannon: character.eldritchCannon || null,
      personality_traits: character.personalityTraits || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
      updated_at: new Date().toISOString(),
    }

    // Only write spell slot usage columns when we have concrete slot data.
    // This prevents resetting DB values on initial loads where slots haven't been calculated yet.
    const hasSpellSlots = Array.isArray(character.spellData?.spellSlots) && character.spellData!.spellSlots.length > 0
    if (hasSpellSlots) {
      if (character.class.toLowerCase() === "warlock") {
        // For Warlocks, save the unified Pact Magic usage to spell_slots_1_used
        // and set all other levels to 0
        const warlockSlot = character.spellData!.spellSlots.find((x) => x.level === 0)
        if (warlockSlot) {
          const warlockUsed = warlockSlot.used
          saveData.spell_slots_1_used = warlockUsed
          // Set all other levels to 0 for Warlocks
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
        // For other classes, use the normal level-based saving
        const getUnchecked = (lvl: number) => {
          const s = character.spellData!.spellSlots.find((x) => x.level === lvl)
          return s ? Math.max(0, s.total - s.used) : undefined
        }
        const lvlUnchecked: Record<number, number | undefined> = {}
        for (let lvl = 1; lvl <= 9; lvl++) lvlUnchecked[lvl] = getUnchecked(lvl)

        if (lvlUnchecked[1] !== undefined) saveData.spell_slots_1_used = lvlUnchecked[1]
        if (lvlUnchecked[2] !== undefined) saveData.spell_slots_2_used = lvlUnchecked[2]
        if (lvlUnchecked[3] !== undefined) saveData.spell_slots_3_used = lvlUnchecked[3]
        if (lvlUnchecked[4] !== undefined) saveData.spell_slots_4_used = lvlUnchecked[4]
        if (lvlUnchecked[5] !== undefined) saveData.spell_slots_5_used = lvlUnchecked[5]
        if (lvlUnchecked[6] !== undefined) saveData.spell_slots_6_used = lvlUnchecked[6]
        if (lvlUnchecked[7] !== undefined) saveData.spell_slots_7_used = lvlUnchecked[7]
        if (lvlUnchecked[8] !== undefined) saveData.spell_slots_8_used = lvlUnchecked[8]
        if (lvlUnchecked[9] !== undefined) saveData.spell_slots_9_used = lvlUnchecked[9]
      }
    }

    // Save Paladin-specific feature usage
    if (character.class.toLowerCase() === "paladin") {
      if (character.spellData.divineSenseSlot) {
        saveData.divine_sense_used = character.spellData.divineSenseSlot.usesPerRest - character.spellData.divineSenseSlot.currentUses
      }
      if (character.spellData.channelDivinitySlot) {
        saveData.channel_divinity_used = character.spellData.channelDivinitySlot.usesPerRest - character.spellData.channelDivinitySlot.currentUses
      }
      if (character.spellData.layOnHands) {
        saveData.lay_on_hands_hp_used = character.spellData.layOnHands.totalHitPoints - character.spellData.layOnHands.currentHitPoints
      }
    }

    // Save Warlock-specific features
    if (character.class.toLowerCase() === "warlock") {
      saveData.eldritch_invocations = character.spellData.eldritchInvocations || null
      saveData.mystic_arcanum = character.spellData.mysticArcanum || null
      saveData.genie_wrath = character.spellData.genieWrath || null
      saveData.elemental_gift = character.spellData.elementalGift || null
      saveData.sanctuary_vessel = character.spellData.sanctuaryVessel || null
      saveData.limited_wish = character.spellData.limitedWish || null
    }


    console.log("[v0] Attempting to save character to database:", {
      id: saveData.id,
      name: saveData.name,
      spell_attack_bonus: saveData.spell_attack_bonus,
      spell_save_dc: saveData.spell_save_dc,
      spell_notes: saveData.spell_notes
    })

    const { error } = await supabase.from("characters").upsert(saveData)

    if (error) {
      console.error("[v0] Database save error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Character saved successfully to database")
    return { success: true, characterId }
  } catch (error) {
    console.error("Error saving character:", error)
    return { success: false, error: "Failed to save character" }
  }
}

export const loadCharacter = async (characterId: string): Promise<{ character?: CharacterData; error?: string }> => {
  try {
    const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single()

    if (error) {
      console.error("Error loading character:", error)
      return { error: error.message }
    }

    if (!data) {
      return { error: "Character not found" }
    }

  // Load class features from database
  let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
  if (data.class_id) {
    console.log(`[DEBUG] loadCharacter: Loading features for class_id: ${data.class_id}, level: ${data.level}`)
    const { features, error: featuresError } = await loadClassFeatures(data.class_id, data.level)
    if (featuresError) {
      console.error("Error loading class features:", featuresError)
    } else {
      classFeatures = features || []
      console.log(`[DEBUG] loadCharacter: Loaded ${classFeatures.length} features for character ${data.name}`)
    }
  } else {
    console.log(`[DEBUG] loadCharacter: No class_id found for character ${data.name}`)
  }

    // Load class data for automatic spell calculations
    const { classData } = await loadClassData(data.class_name, data.subclass)
    const proficiencyBonus = calculateProficiencyBonus(data.level)
    
    // Create temporary character for calculations
    const tempCharacter: CharacterData = {
      id: data.id,
      name: data.name,
      class: data.class_name, // Fixed: class_name -> class
      class_id: data.class_id,
      subclass: data.subclass,
      level: data.level,
      background: data.background,
      race: data.race,
      alignment: data.alignment,
      imageUrl: data.image_url || undefined,
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
        flashOfGeniusSlot: undefined,
        divineSenseSlot: undefined,
        layOnHands: undefined,
        channelDivinitySlot: undefined,
        cleansingTouchSlot: undefined,
        // Warlock-specific features
        eldritchInvocations: data.eldritch_invocations || undefined,
        mysticArcanum: data.mystic_arcanum || undefined,
        genieWrath: data.genie_wrath || undefined,
        elementalGift: data.elemental_gift || undefined,
        sanctuaryVessel: data.sanctuary_vessel || undefined,
        limitedWish: data.limited_wish || undefined,
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
      equipmentProficiencies: data.equipment_proficiencies || undefined,
      featureNotes: data.feature_custom_descriptions || undefined,
      eldritchCannon: data.eldritch_cannon || undefined,
      personalityTraits: data.personality_traits || "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: data.backstory || "",
      notes: data.notes || "",
      feats: data.feats,
      infusions: data.infusions || [],
      infusionNotes: data.infusion_notes || "",
      savingThrowProficiencies: data.saving_throw_proficiencies && data.saving_throw_proficiencies.length > 0 ? data.saving_throw_proficiencies : createClassBasedSavingThrowProficiencies(data.class_name),
      bardicInspirationUsed: data.bardic_inspiration_used || 0,
      partyStatus: 'active', // Default to 'active' for single character load (will be updated separately if needed)
    }
    
    // Load spell slots from database or calculate them if not available
    let calculatedSpellSlots: any[] = data.spell_slots || []
    
    // If no spell slots in database, calculate them from class data
    if (calculatedSpellSlots.length === 0 && classData) {
      if (data.class_name.toLowerCase() === "warlock") {
        // For Warlocks, use the special Pact Magic system
        const { getWarlockSpellSlots } = await import('./character-data')
        calculatedSpellSlots = getWarlockSpellSlots(data.level)
        console.log("[DEBUG] loadCharacter: Calculated Warlock Pact Magic slots for", data.name, ":", calculatedSpellSlots)
      } else {
        // For other classes, use the standard spell slot calculation
        const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
        calculatedSpellSlots = calculateSpellSlotsFromClass(classData, data.level)
        console.log("[DEBUG] loadCharacter: Calculated spell slots for", data.name, ":", calculatedSpellSlots)
      }
    }
    
    // Restore usage if we have spell slots and usage data
    if (calculatedSpellSlots.length > 0 && tempCharacter.spellSlotsUsed) {
      if (data.class_name.toLowerCase() === "warlock") {
        // For Warlocks, use the first available spell slot usage column as the unified Pact Magic usage
        // Since all individual columns should be 0 for Warlocks, we'll use spell_slots_1_used as the unified counter
        const warlockUsed = data.spell_slots_1_used || 0
        calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
          return { ...slot, used: warlockUsed }
        })
        console.log("[DEBUG] loadCharacter: Restored Warlock Pact Magic usage for", data.name, ":", calculatedSpellSlots)
      } else {
        // For other classes, use the normal level-based restoration
        calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
          const unchecked = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
          const usedCount = Math.max(0, slot.total - unchecked)
          return { ...slot, used: usedCount }
        })
        console.log("[DEBUG] loadCharacter: Restored spell slot usage for", data.name, ":", calculatedSpellSlots)
      }
    } else {
      console.log("[DEBUG] loadCharacter: No spell slots to restore for", data.name)
    }
    
    // Now calculate spell values and create final character
    const character: CharacterData = {
      ...tempCharacter,
      spellData: {
        ...tempCharacter.spellData,
        spellAttackBonus: data.spell_attack_bonus || calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
        spellSaveDC: data.spell_save_dc || calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
        spellsKnown: getSpellsKnown(tempCharacter, classData, data.spells_known),
        spellSlots: calculatedSpellSlots, // Populate immediately
        // Add class-specific features (Bard, Artificer, Paladin)
        bardicInspirationSlot: (() => {
          const bardicInspiration = getBardicInspirationData(data.level, Math.floor((data.charisma - 10) / 2), classData)
          if (bardicInspiration && data.bardic_inspiration_used !== undefined) {
            return {
              ...bardicInspiration,
              currentUses: Math.max(0, bardicInspiration.usesPerRest - (data.bardic_inspiration_used || 0))
            }
          }
          return bardicInspiration || undefined
        })(),
        songOfRest: getSongOfRestData(data.level, classData) || undefined,
        flashOfGeniusSlot: (data.class_name?.toLowerCase() === "artificer" && data.level >= 7)
          ? (() => {
              const usesPerRest = Math.max(1, Math.floor((data.intelligence - 10) / 2))
              const used = Math.max(0, Math.min(usesPerRest, data.flash_of_genius_used || 0))
              return { 
                usesPerRest, 
                currentUses: usesPerRest - used,
                replenishesOnLongRest: true
              }
            })()
          : undefined,
        // Add Paladin-specific features with restored usage
        divineSenseSlot: (() => {
          const divineSense = getDivineSenseData(tempCharacter)
          if (divineSense && data.divine_sense_used !== undefined) {
            return {
              ...divineSense,
              currentUses: Math.max(0, divineSense.usesPerRest - (data.divine_sense_used || 0))
            }
          }
          return divineSense
        })(),
        layOnHands: (() => {
          const layOnHands = getLayOnHandsData(tempCharacter)
          if (layOnHands && data.lay_on_hands_hp_used !== undefined) {
            return {
              ...layOnHands,
              currentHitPoints: Math.max(0, layOnHands.totalHitPoints - (data.lay_on_hands_hp_used || 0))
            }
          }
          return layOnHands
        })(),
        channelDivinitySlot: (() => {
          const channelDivinity = getChannelDivinityData(tempCharacter)
          if (channelDivinity && data.channel_divinity_used !== undefined) {
            return {
              ...channelDivinity,
              currentUses: Math.max(0, channelDivinity.usesPerRest - (data.channel_divinity_used || 0))
            }
          }
          return channelDivinity
        })(),
        cleansingTouchSlot: getCleansingTouchData(tempCharacter),
      },
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

    // Load class features for all characters
    const charactersWithFeatures = await Promise.all(
      data.map(async (row) => {
    // Load class features from database
    let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
    if (row.class_id) {
      console.log(`[DEBUG] loadAllCharacters: Loading features for class_id: ${row.class_id}, level: ${row.level}`)
      const { features, error: featuresError } = await loadClassFeatures(row.class_id, row.level)
      if (featuresError) {
        console.error("Error loading class features:", featuresError)
      } else {
        classFeatures = features || []
        console.log(`[DEBUG] loadAllCharacters: Loaded ${classFeatures.length} features for character ${row.name}`)
      }
    } else {
      console.log(`[DEBUG] loadAllCharacters: No class_id found for character ${row.name}`)
    }

        // Load class data for automatic spell calculations
        const { classData } = await loadClassData(row.class_name, row.subclass)
        const proficiencyBonus = calculateProficiencyBonus(row.level)
        
        // Create temporary character for calculations
        const tempCharacter = {
          id: row.id,
          name: row.name,
          class: row.class_name,
          class_id: row.class_id,
          subclass: row.subclass,
          level: row.level,
          background: row.background,
          race: row.race,
          alignment: row.alignment,
          imageUrl: row.image_url || undefined,
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
            flashOfGeniusSlot: undefined,
            divineSenseSlot: undefined,
            layOnHands: undefined,
            channelDivinitySlot: undefined,
            cleansingTouchSlot: undefined,
            // Warlock-specific features
            eldritchInvocations: row.eldritch_invocations || undefined,
            mysticArcanum: row.mystic_arcanum || undefined,
            genieWrath: row.genie_wrath || undefined,
            elementalGift: row.elemental_gift || undefined,
            sanctuaryVessel: row.sanctuary_vessel || undefined,
            limitedWish: row.limited_wish || undefined,
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
          equipmentProficiencies: row.equipment_proficiencies || undefined,
          featureNotes: row.feature_custom_descriptions || undefined,
          eldritchCannon: row.eldritch_cannon || undefined,
          personalityTraits: row.personality_traits || "",
          ideals: "",
          bonds: "",
          flaws: "",
          backstory: row.backstory || "",
          notes: row.notes || "",
          feats: row.feats,
          infusions: row.infusions || [],
          infusionNotes: row.infusion_notes || "",
          savingThrowProficiencies: row.saving_throw_proficiencies && row.saving_throw_proficiencies.length > 0 ? row.saving_throw_proficiencies : createClassBasedSavingThrowProficiencies(row.class_name),
          bardicInspirationUsed: row.bardic_inspiration_used || 0,
          partyStatus: row.party_status?.status || 'active', // Default to 'active' if no status found
        }

        // Load spell slots from database or calculate them if not available
        let calculatedSpellSlots: any[] = row.spell_slots || []
        
        // If no spell slots in database, calculate them from class data
        if (calculatedSpellSlots.length === 0 && classData) {
          if (row.class_name.toLowerCase() === "warlock") {
            // For Warlocks, use the special Pact Magic system
            const { getWarlockSpellSlots } = await import('./character-data')
            calculatedSpellSlots = getWarlockSpellSlots(row.level)
            console.log("[DEBUG] loadAllCharacters: Calculated Warlock Pact Magic slots for", row.name, ":", calculatedSpellSlots)
          } else {
            // For other classes, use the standard spell slot calculation
            const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
            calculatedSpellSlots = calculateSpellSlotsFromClass(classData, row.level)
            console.log("[DEBUG] loadAllCharacters: Calculated spell slots for", row.name, ":", calculatedSpellSlots)
          }
        }
        
        // Restore usage if we have spell slots and usage data
        if (calculatedSpellSlots.length > 0 && tempCharacter.spellSlotsUsed) {
          if (row.class_name.toLowerCase() === "warlock") {
            // For Warlocks, use the first available spell slot usage column as the unified Pact Magic usage
            // Since all individual columns should be 0 for Warlocks, we'll use spell_slots_1_used as the unified counter
            const warlockUsed = row.spell_slots_1_used || 0
            calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
              return { ...slot, used: warlockUsed }
            })
            console.log("[DEBUG] loadAllCharacters: Restored Warlock Pact Magic usage for", row.name, ":", calculatedSpellSlots)
          } else {
            // For other classes, use the normal level-based restoration
            calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
              const unchecked = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
              const usedCount = Math.max(0, slot.total - unchecked)
              return { ...slot, used: usedCount }
            })
            console.log("[DEBUG] loadAllCharacters: Restored spell slot usage for", row.name, ":", calculatedSpellSlots)
          }
        } else {
          console.log("[DEBUG] loadAllCharacters: No spell slots to restore for", row.name)
        }

        return {
          ...tempCharacter,
          spellData: {
            ...tempCharacter.spellData,
            spellAttackBonus: row.spell_attack_bonus || calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
            spellSaveDC: row.spell_save_dc || calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
            spellsKnown: getSpellsKnown(tempCharacter, classData, row.spells_known),
            spellSlots: calculatedSpellSlots, // Populate immediately
            // Add class-specific features (Bard, Artificer, Paladin)
            bardicInspirationSlot: (() => {
              const bardicInspiration = getBardicInspirationData(row.level, Math.floor((row.charisma - 10) / 2), classData)
              if (bardicInspiration && row.bardic_inspiration_used !== undefined) {
                return {
                  ...bardicInspiration,
                  currentUses: Math.max(0, bardicInspiration.usesPerRest - (row.bardic_inspiration_used || 0))
                }
              }
              return bardicInspiration || undefined
            })(),
            songOfRest: getSongOfRestData(row.level, classData) || undefined,
            flashOfGeniusSlot: (row.class_name?.toLowerCase() === "artificer" && row.level >= 7)
              ? (() => {
                  const usesPerRest = Math.max(1, Math.floor((row.intelligence - 10) / 2))
                  const used = Math.max(0, Math.min(usesPerRest, row.flash_of_genius_used || 0))
                  return { 
                    usesPerRest, 
                    currentUses: usesPerRest - used,
                    replenishesOnLongRest: true
                  }
                })()
              : undefined,
            // Add Paladin-specific features with restored usage
            divineSenseSlot: (() => {
              const divineSense = getDivineSenseData(tempCharacter)
              if (divineSense && row.divine_sense_used !== undefined) {
                return {
                  ...divineSense,
                  currentUses: Math.max(0, divineSense.usesPerRest - (row.divine_sense_used || 0))
                }
              }
              return divineSense
            })(),
            layOnHands: (() => {
              const layOnHands = getLayOnHandsData(tempCharacter)
              if (layOnHands && row.lay_on_hands_hp_used !== undefined) {
                return {
                  ...layOnHands,
                  currentHitPoints: Math.max(0, layOnHands.totalHitPoints - (row.lay_on_hands_hp_used || 0))
                }
              }
              return layOnHands
            })(),
            channelDivinitySlot: (() => {
              const channelDivinity = getChannelDivinityData(tempCharacter)
              if (channelDivinity && row.channel_divinity_used !== undefined) {
                return {
                  ...channelDivinity,
                  currentUses: Math.max(0, channelDivinity.usesPerRest - (row.channel_divinity_used || 0))
                }
              }
              return channelDivinity
            })(),
            cleansingTouchSlot: getCleansingTouchData(tempCharacter),
          },
        }
      })
    )

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

export const loadClassFeatures = async (classId: string, level: number): Promise<{ features?: Array<{name: string, description: string, source: string, level: number}>; error?: string }> => {
  try {
    // First get the class information to check if it's a Bard
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single()

    if (classError) {
      console.error("Error loading class data:", classError)
      return { error: classError.message }
    }

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

    const features = data?.map(feature => ({
      name: feature.title,
      description: feature.description,
      source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
      level: feature.level
    })) || []

    // Additional safeguard: filter out Bard-specific features for non-Bard classes
    const isBard = classData?.name?.toLowerCase() === "bard"
    const filteredFeatures = isBard ? features : features.filter(feature => 
      !feature.name.toLowerCase().includes("bardic inspiration") && 
      !feature.name.toLowerCase().includes("song of rest")
    )
    
    console.log(`[DEBUG] loadClassFeatures: Loaded ${filteredFeatures.length} features for ${classData?.name} (class_id: ${classId})`)

    return { features: filteredFeatures }
  } catch (error) {
    console.error("Error loading class features:", error)
    return { error: "Failed to load class features" }
  }
}

export const loadClassData = async (className: string, subclass?: string): Promise<{ classData?: any; error?: string }> => {
  try {
    console.log("[DEBUG] loadClassData called for:", className, subclass)
    
    let query = supabase
      .from("classes")
      .select("*")
      .eq("name", className)
    
    if (subclass) {
      query = query.eq("subclass", subclass)
    }

    const { data, error } = await query

    if (error) {
      console.error("[DEBUG] Error loading class data:", error)
      return { error: error.message }
    }

    if (!data || data.length === 0) {
      console.log("[DEBUG] No class data found for:", className, subclass)
      return { error: "Class not found" }
    }

    if (data.length > 1) {
      console.warn("[DEBUG] Multiple class entries found for:", className, subclass, "Using the first one")
      console.log("[DEBUG] Found entries:", data.map(d => ({ id: d.id, subclass: d.subclass, created_at: d.created_at })))
    }

    const classData = data[0] // Use the first entry if multiple found
    console.log("[DEBUG] loadClassData found data for:", className, subclass, classData)

    return { classData }
  } catch (error) {
    console.error("[DEBUG] Error loading class data:", error)
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
