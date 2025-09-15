import { createClient } from "./supabase"
import type { CharacterData } from "./character-data"

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

    const { error } = await supabase.from("characters").upsert({
      id: characterId, // Use the UUID instead of character.id
      name: character.name,
      class_name: character.class,
      class_id: character.class_id,
      subclass: character.subclass,
      level: character.level,
      background: character.background,
      race: character.race,
      alignment: character.alignment,
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
      armor_class: character.armorClass,
      hit_points: character.currentHitPoints,
      max_hit_points: character.maxHitPoints,
      speed: character.speed,
      skills: character.skills,
      weapons: character.weapons,
      features: character.features,
      spell_attack_bonus: character.spellData?.spellAttackBonus || 0,
      spell_save_dc: character.spellData?.spellSaveDC || 8,
      cantrips_known: character.spellData?.cantripsKnown || 0,
      spells_known: character.spellData?.spellsKnown || 0,
      spell_slots_1_used: character.spellData?.spellSlots?.find((s) => s.level === 1)?.used || 0,
      spell_slots_2_used: character.spellData?.spellSlots?.find((s) => s.level === 2)?.used || 0,
      spell_slots_3_used: character.spellData?.spellSlots?.find((s) => s.level === 3)?.used || 0,
      spell_slots_4_used: character.spellData?.spellSlots?.find((s) => s.level === 4)?.used || 0,
      spell_slots_5_used: character.spellData?.spellSlots?.find((s) => s.level === 5)?.used || 0,
      spell_slots_6_used: character.spellData?.spellSlots?.find((s) => s.level === 6)?.used || 0,
      spell_slots_7_used: character.spellData?.spellSlots?.find((s) => s.level === 7)?.used || 0,
      spell_slots_8_used: character.spellData?.spellSlots?.find((s) => s.level === 8)?.used || 0,
      spell_slots_9_used: character.spellData?.spellSlots?.find((s) => s.level === 9)?.used || 0,
      feat_spell_slots: character.spellData?.featSpellSlots || {},
      bardic_inspiration_used: character.spellData?.bardicInspirationSlot?.currentUses || 0,
      song_of_rest: character.spellData?.songOfRest || { enabled: false, die: "d6" },
      class_features: character.classFeatures,
      tools: character.toolsProficiencies,
      feats: character.feats,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error saving character:", error)
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

    const character: CharacterData = {
      id: data.id,
      name: data.name,
      class: data.class_name, // Fixed: class_name -> class
      class_id: data.class_id,
      subclass: data.subclass,
      level: data.level,
      background: data.background,
      race: data.race,
      alignment: data.alignment,
      strength: data.strength,
      dexterity: data.dexterity,
      constitution: data.constitution,
      intelligence: data.intelligence,
      wisdom: data.wisdom,
      charisma: data.charisma,
      armorClass: data.armor_class,
      initiative: 0, // Calculate from dexterity
      speed: data.speed,
      currentHitPoints: data.hit_points, // Fixed: hit_points -> currentHitPoints
      maxHitPoints: data.max_hit_points,
      skills: data.skills,
      weapons: data.weapons,
      weaponNotes: "",
      features: data.features,
      spellData: {
        spellAttackBonus: data.spell_attack_bonus,
        spellSaveDC: data.spell_save_dc,
        cantripsKnown: data.cantrips_known,
        spellsKnown: data.spells_known,
        spellSlots: [
          ...(data.spell_slots_1_used !== undefined ? [{ level: 1, total: 0, used: data.spell_slots_1_used }] : []),
          ...(data.spell_slots_2_used !== undefined ? [{ level: 2, total: 0, used: data.spell_slots_2_used }] : []),
          ...(data.spell_slots_3_used !== undefined ? [{ level: 3, total: 0, used: data.spell_slots_3_used }] : []),
          ...(data.spell_slots_4_used !== undefined ? [{ level: 4, total: 0, used: data.spell_slots_4_used }] : []),
          ...(data.spell_slots_5_used !== undefined ? [{ level: 5, total: 0, used: data.spell_slots_5_used }] : []),
          ...(data.spell_slots_6_used !== undefined ? [{ level: 6, total: 0, used: data.spell_slots_6_used }] : []),
          ...(data.spell_slots_7_used !== undefined ? [{ level: 7, total: 0, used: data.spell_slots_7_used }] : []),
          ...(data.spell_slots_8_used !== undefined ? [{ level: 8, total: 0, used: data.spell_slots_8_used }] : []),
          ...(data.spell_slots_9_used !== undefined ? [{ level: 9, total: 0, used: data.spell_slots_9_used }] : []),
        ],
        spellNotes: "",
        featSpellSlots: data.feat_spell_slots || [],
        bardicInspirationSlot:
          data.bardic_inspiration_used !== undefined
            ? {
                dieType: "d6",
                usesPerRest: 0,
                currentUses: data.bardic_inspiration_used,
              }
            : null,
        songOfRest: data.song_of_rest || null,
      },
      classFeatures: data.class_features,
      toolsProficiencies: data.tools,
      equipment: "",
      languages: "",
      otherTools: "",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
      feats: data.feats,
    }

    return { character }
  } catch (error) {
    console.error("Error loading character:", error)
    return { error: "Failed to load character" }
  }
}

export const loadAllCharacters = async (): Promise<{ characters?: CharacterData[]; error?: string }> => {
  try {
    const { data, error } = await supabase.from("characters").select("*").order("updated_at", { ascending: false })

    if (error) {
      console.error("Error loading characters:", error)
      return { error: error.message }
    }

    const characters: CharacterData[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      class: row.class_name, // Fixed: class_name -> class
      class_id: row.class_id,
      subclass: row.subclass,
      level: row.level,
      background: row.background,
      race: row.race,
      alignment: row.alignment,
      strength: row.strength,
      dexterity: row.dexterity,
      constitution: row.constitution,
      intelligence: row.intelligence,
      wisdom: row.wisdom,
      charisma: row.charisma,
      armorClass: row.armor_class,
      initiative: 0,
      speed: row.speed,
      currentHitPoints: row.hit_points, // Fixed: hit_points -> currentHitPoints
      maxHitPoints: row.max_hit_points,
      skills: row.skills,
      weapons: row.weapons,
      weaponNotes: "",
      features: row.features,
      spellData: {
        spellAttackBonus: row.spell_attack_bonus,
        spellSaveDC: row.spell_save_dc,
        cantripsKnown: row.cantrips_known,
        spellsKnown: row.spells_known,
        spellSlots: [
          ...(row.spell_slots_1_used !== undefined ? [{ level: 1, total: 0, used: row.spell_slots_1_used }] : []),
          ...(row.spell_slots_2_used !== undefined ? [{ level: 2, total: 0, used: row.spell_slots_2_used }] : []),
          ...(row.spell_slots_3_used !== undefined ? [{ level: 3, total: 0, used: row.spell_slots_3_used }] : []),
          ...(row.spell_slots_4_used !== undefined ? [{ level: 4, total: 0, used: row.spell_slots_4_used }] : []),
          ...(row.spell_slots_5_used !== undefined ? [{ level: 5, total: 0, used: row.spell_slots_5_used }] : []),
          ...(row.spell_slots_6_used !== undefined ? [{ level: 6, total: 0, used: row.spell_slots_6_used }] : []),
          ...(row.spell_slots_7_used !== undefined ? [{ level: 7, total: 0, used: row.spell_slots_7_used }] : []),
          ...(row.spell_slots_8_used !== undefined ? [{ level: 8, total: 0, used: row.spell_slots_8_used }] : []),
          ...(row.spell_slots_9_used !== undefined ? [{ level: 9, total: 0, used: row.spell_slots_9_used }] : []),
        ],
        spellNotes: "",
        featSpellSlots: row.feat_spell_slots || [],
        bardicInspirationSlot:
          row.bardic_inspiration_used !== undefined
            ? {
                dieType: "d6",
                usesPerRest: 0,
                currentUses: row.bardic_inspiration_used,
              }
            : null,
        songOfRest: row.song_of_rest || null,
      },
      classFeatures: row.class_features,
      toolsProficiencies: row.tools,
      equipment: "",
      languages: "",
      otherTools: "",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
      feats: row.feats,
    }))

    return { characters }
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
