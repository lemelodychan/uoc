import { createClient } from "./supabase"
import type { CharacterData, Campaign } from "./character-data"
import type { ClassData, SubclassData } from "./class-utils"
import { createDefaultSkills, createDefaultSavingThrowProficiencies, createClassBasedSavingThrowProficiencies, calculateSpellSaveDC, calculateSpellAttackBonus, getSpellsKnown, calculateProficiencyBonus, getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData } from "./character-data"
import { getBardicInspirationData, getSongOfRestData } from "./class-utils"

const supabase = createClient()

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
      campaign_id: character.campaignId || null,
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
    const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single()

    if (error) {
      console.error("Error loading character:", error)
      return { error: error.message }
    }

    if (!data) {
      return { error: "Character not found" }
    }

  // Load class features from database - support multiclassing
  let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
  
  if (data.classes && data.classes.length > 0) {
    // Load features for all classes in multiclassing
    const allFeatures = await Promise.all(
      data.classes.map(async (charClass: any) => {
        if (charClass.class_id) {
          const { features, error: featuresError } = await loadClassFeatures(charClass.class_id, charClass.level)
          if (featuresError) {
            console.error(`Error loading class features for ${charClass.name}:`, featuresError)
            return []
          }
          return features || []
        } else {
          console.log(`[DEBUG] No class_id for ${charClass.name}, skipping`)
          return []
        }
      })
    )
    // Flatten and combine all features
    classFeatures = allFeatures.flat()
  } else if (data.class_id) {
    // Fallback to single class loading
    const { features, error: featuresError } = await loadClassFeatures(data.class_id, data.level)
    if (featuresError) {
      console.error("Error loading class features:", featuresError)
    } else {
      classFeatures = features || []
    }
  }

    // Load class data for automatic spell calculations
    const { classData } = await loadClassData(data.class_name, data.subclass)
    const proficiencyBonus = calculateProficiencyBonus(data.level)
    
    // Create temporary character for calculations
    // Calculate saving throw proficiencies
    let savingThrowProficiencies
    // TEMPORARY FIX: Force recalculation for multiclass characters to fix the missing saving throws
    if (data.classes && data.classes.length > 1) {
      console.log('[DEBUG] loadCharacter: FORCING multiclass saving throws recalculation for classes:', data.classes)
      savingThrowProficiencies = (await import('./character-data')).getMulticlassSavingThrowProficiencies(data.classes)
    } else if (data.saving_throw_proficiencies && data.saving_throw_proficiencies.length > 0) {
      console.log('[DEBUG] loadCharacter: Using existing saving throws from database:', data.saving_throw_proficiencies)
      savingThrowProficiencies = data.saving_throw_proficiencies
    } else {
      console.log('[DEBUG] loadCharacter: Using single class saving throws for:', data.class_name)
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
      savingThrowProficiencies: savingThrowProficiencies,
      bardicInspirationUsed: data.bardic_inspiration_used || 0,
      partyStatus: 'active', // Default to 'active' for single character load (will be updated separately if needed)
      campaignId: data.campaign_id || undefined,
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
          // For Warlocks, use the special Pact Magic system
          const { getWarlockSpellSlots } = await import('./character-data')
          calculatedSpellSlots = getWarlockSpellSlots(data.level)
        } else {
          // For other classes, use the standard spell slot calculation
          const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
          calculatedSpellSlots = calculateSpellSlotsFromClass(classData, data.level)
        }
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
      } else {
        // For other classes, use the normal level-based restoration
        calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
          const unchecked = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
          const usedCount = Math.max(0, slot.total - unchecked)
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
              currentUses: Math.max(0, multiclassFeatures.bardicInspirationSlot.usesPerRest - (data.bardic_inspiration_used || 0))
            } : undefined,
            songOfRest: multiclassFeatures.songOfRest || undefined,
            flashOfGeniusSlot: multiclassFeatures.flashOfGeniusSlot ? {
              ...multiclassFeatures.flashOfGeniusSlot,
              currentUses: Math.max(0, multiclassFeatures.flashOfGeniusSlot.usesPerRest - (data.flash_of_genius_used || 0))
            } : undefined,
            divineSenseSlot: multiclassFeatures.divineSenseSlot || undefined,
            layOnHands: multiclassFeatures.layOnHands || undefined,
            channelDivinitySlot: multiclassFeatures.channelDivinitySlot || undefined,
            cleansingTouchSlot: multiclassFeatures.cleansingTouchSlot || undefined,
          }
        })() : {
          // Single class feature calculation
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
        }),
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
      } else if (row.class_id) {
        // Add single class features
        uniqueClassFeatures.add(`${row.class_id}-${row.level}`)
      }
    })
    
    const classFeaturesMap = new Map()
    
    await Promise.all([...uniqueClassFeatures].map(async (featureKey) => {
      // Split on the last dash to handle UUIDs with dashes
      const lastDashIndex = featureKey.lastIndexOf('-')
      const classId = featureKey.substring(0, lastDashIndex)
      const level = featureKey.substring(lastDashIndex + 1)
      
      const { features } = await loadClassFeatures(classId, parseInt(level))
      if (features) {
        classFeaturesMap.set(featureKey, features)
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
    } else if (row.class_id) {
      // Fallback to single class loading
      classFeatures = classFeaturesMap.get(`${row.class_id}-${row.level}`) || []
    }
    
    

        // Get pre-loaded class data
        const classData = classDataMap.get(`${row.class_name}-${row.subclass || ''}`)
        const proficiencyBonus = calculateProficiencyBonus(row.level)
        
        // Calculate saving throw proficiencies
        let savingThrowProficiencies
        // TEMPORARY FIX: Force recalculation for multiclass characters to fix the missing saving throws
        if (row.classes && row.classes.length > 1) {
          console.log('[DEBUG] loadAllCharacters: FORCING multiclass saving throws recalculation for classes:', row.classes)
          savingThrowProficiencies = (await import('./character-data')).getMulticlassSavingThrowProficiencies(row.classes)
        } else if (row.saving_throw_proficiencies && row.saving_throw_proficiencies.length > 0) {
          console.log('[DEBUG] loadAllCharacters: Using existing saving throws from database:', row.saving_throw_proficiencies)
          savingThrowProficiencies = row.saving_throw_proficiencies
        } else {
          console.log('[DEBUG] loadAllCharacters: Using single class saving throws for:', row.class_name)
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
          savingThrowProficiencies: savingThrowProficiencies,
          bardicInspirationUsed: row.bardic_inspiration_used || 0,
          partyStatus: row.party_status?.status || 'active', // Default to 'active' if no status found
          campaignId: row.campaign_id || undefined,
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
              // For Warlocks, use the special Pact Magic system
              const { getWarlockSpellSlots } = await import('./character-data')
              calculatedSpellSlots = getWarlockSpellSlots(row.level)
            } else {
              // For other classes, use the standard spell slot calculation
              const { calculateSpellSlotsFromClass } = await import('./spell-slot-calculator')
              calculatedSpellSlots = calculateSpellSlotsFromClass(classData, row.level)
            }
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
          } else {
            // For other classes, use the normal level-based restoration
            calculatedSpellSlots = calculatedSpellSlots.map((slot) => {
              const unchecked = tempCharacter.spellSlotsUsed?.[slot.level as keyof typeof tempCharacter.spellSlotsUsed] || 0
              const usedCount = Math.max(0, slot.total - unchecked)
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
                  currentUses: Math.max(0, multiclassFeatures.bardicInspirationSlot.usesPerRest - (row.bardic_inspiration_used || 0))
                } : undefined,
                songOfRest: multiclassFeatures.songOfRest || undefined,
                flashOfGeniusSlot: multiclassFeatures.flashOfGeniusSlot ? {
                  ...multiclassFeatures.flashOfGeniusSlot,
                  currentUses: Math.max(0, multiclassFeatures.flashOfGeniusSlot.usesPerRest - (row.flash_of_genius_used || 0))
                } : undefined,
                divineSenseSlot: multiclassFeatures.divineSenseSlot || undefined,
                layOnHands: multiclassFeatures.layOnHands || undefined,
                channelDivinitySlot: multiclassFeatures.channelDivinitySlot || undefined,
                cleansingTouchSlot: multiclassFeatures.cleansingTouchSlot || undefined,
              }
            })() : {
              // Single class feature calculation
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
            }),
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

export const loadClassFeatures = async (classId: string, level: number, subclass?: string): Promise<{ features?: Array<{name: string, description: string, source: string, level: number}>; error?: string }> => {
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

    let features = data?.map(feature => ({
      name: feature.title,
      description: feature.description,
      source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
      level: feature.level,
      className: classData.name
    })) || []

    // If this class_id only has subclass features, we need to also load base class features
    const hasClassFeatures = features.some(f => f.source === 'Class')
    const hasSubclassFeatures = features.some(f => f.source === 'Subclass')
    
    if (hasSubclassFeatures && !hasClassFeatures) {
      // Find the base class_id for this class name (where subclass IS NULL)
      const { data: baseClassData, error: baseClassError } = await supabase
        .from("classes")
        .select("id")
        .eq("name", classData.name)
        .is("subclass", null) // Specifically look for the base class
        .limit(1)
        .single()

      if (!baseClassError && baseClassData) {
        // Load base class features
        const { data: baseFeatures, error: baseError } = await supabase
          .from("class_features")
          .select("*")
          .eq("class_id", baseClassData.id)
          .lte("level", level)
          .order("level", { ascending: true })

        if (!baseError && baseFeatures) {
          const baseClassFeatures = baseFeatures.map(feature => ({
            name: feature.title,
            description: feature.description,
            source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
            level: feature.level,
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
        .single()

      if (!baseClassError && baseClassData) {
        // Load base class features
        const { data: baseFeatures, error: baseError } = await supabase
          .from("class_features")
          .select("*")
          .eq("class_id", baseClassData.id)
          .lte("level", level)
          .order("level", { ascending: true })

        if (!baseError && baseFeatures) {
          const baseClassFeatures = baseFeatures.map(feature => ({
            name: feature.title,
            description: feature.description,
            source: feature.feature_type === 'subclass' ? 'Subclass' : 'Class',
            level: feature.level,
            className: classData.name
          }))
          
          // Use the base class features
          features = baseClassFeatures
        }
      }
    }

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
    let query = supabase
      .from("classes")
      .select("*")
      .eq("name", className)
    
    if (subclass) {
      query = query.eq("subclass", subclass)
    } else {
      // When no subclass is specified, get the base class (subclass IS NULL)
      query = query.is("subclass", null)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error loading class data:", error)
      return { error: error.message }
    }

    if (!data || data.length === 0) {
      return { error: "Class not found" }
    }

    if (data.length > 1) {
      console.warn("Multiple class entries found for:", className, subclass, "Using the first one")
    }

    const classData = data[0] // Use the first entry if multiple found

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
    class_features: any | null
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
    const payload: any = {
      id,
      name: cls.name,
      subclass: (cls as any).subclass ?? null,
      description: (cls as any).description ?? null,
      hit_die: cls.hit_die ?? null,
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
      // Removed legacy columns not present in DB schema: spell_progression, max_spell_slots
      class_features: cls.class_features ?? null,
    }

    const { error } = await supabase.from("classes").upsert(payload)
    if (error) {
      console.error("Error upserting class:", error)
      return { success: false, error: error.message }
    }
    return { success: true, id }
  } catch (error) {
    console.error("Error upserting class:", error)
    return { success: false, error: "Failed to upsert class" }
  }
}

export const loadClassById = async (id: string): Promise<{ klass?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.from("classes").select("*").eq("id", id).single()
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
      .single()
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
  features?: Array<{ id: string; class_id: string; level: number; title: string; description: string; feature_type: string; subclass_id?: string | null }>
  error?: string
}> => {
  try {
    // Fetch base class features
    const { data: base, error: baseErr } = await supabase
      .from("class_features")
      .select("id, class_id, level, title, description, feature_type")
      .eq("class_id", baseClassId)

    if (baseErr) return { error: baseErr.message }

    let all: any[] = base || []

    if (subclassIds.length > 0) {
      // Prefer schema-agnostic: fetch subclass features by class_id IN subclassIds
      const { data: fallbackFeats, error: fallbackErr } = await supabase
        .from("class_features")
        .select("id, class_id, level, title, description, feature_type")
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

export const upsertClassFeature = async (feature: { id?: string; class_id: string; level: number; title: string; description: string; feature_type: "class" | "subclass"; subclass_id?: string | null }): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const id = feature.id && feature.id.length > 0 ? feature.id : globalThis.crypto.randomUUID()
    const payload = { ...feature, id }
    const { error } = await supabase.from("class_features").upsert(payload)
    if (error) {
      console.error("Error upserting class feature:", error)
      return { success: false, error: error.message }
    }
    return { success: true, id }
  } catch (error) {
    console.error("Error upserting class feature:", error)
    return { success: false, error: "Failed to upsert class feature" }
  }
}

export const deleteClassFeature = async (featureId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("class_features").delete().eq("id", featureId)
    if (error) {
      console.error("Error deleting class feature:", error)
      return { success: false, error: error.message }
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
        is_active: campaign.isActive || false
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

export const loadAllCampaigns = async (): Promise<{ campaigns?: Campaign[]; error?: string }> => {
  try {
    const { data, error } = await supabase
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
      isActive: row.is_active || false
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
        is_active: campaign.isActive || false
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
