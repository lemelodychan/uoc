import type { SpellSlot } from "./character-data"
import { createBrowserClient } from "@supabase/ssr"

export interface ClassSpellData {
  id: string
  name: string
  subclass: string
  spell_slots_1: number[]
  spell_slots_2: number[]
  spell_slots_3: number[]
  spell_slots_4: number[]
  spell_slots_5: number[]
  spell_slots_6: number[]
  spell_slots_7: number[]
  spell_slots_8: number[]
  spell_slots_9: number[]
  cantrips_known: number[]
  spells_known: number[]
  bardic_inspiration_uses: number[]
  bardic_inspiration_die: string[]
  show_spells_known: boolean
  // Data-driven spellcasting metadata
  spellcasting_ability?: string | null
  is_prepared_caster?: boolean
  caster_type?: 'full' | 'half' | 'third' | 'pact' | null
  slots_replenish_on?: 'short_rest' | 'long_rest'
  invocations_known?: number[] | null
  infusions_known?: number[] | null
}

export const calculateSpellSlotsFromClass = (classData: ClassSpellData | null, level: number): SpellSlot[] => {
  if (!classData || level < 1 || level > 20) {
    return []
  }

  const levelIndex = level - 1 // Arrays are 0-indexed, levels are 1-indexed
  const spellSlots: SpellSlot[] = []

  // Check each spell level (1-9) and add slots if the class has them at this level
  const spellLevels = [
    classData.spell_slots_1,
    classData.spell_slots_2,
    classData.spell_slots_3,
    classData.spell_slots_4,
    classData.spell_slots_5,
    classData.spell_slots_6,
    classData.spell_slots_7,
    classData.spell_slots_8,
    classData.spell_slots_9,
  ]

  spellLevels.forEach((slots, spellLevel) => {
    // Ensure slots array exists and has the right length
    if (slots && Array.isArray(slots) && slots.length >= level) {
      const totalSlots = slots[levelIndex] || 0
      if (totalSlots > 0) {
        spellSlots.push({
          level: spellLevel + 1, // Spell levels are 1-indexed
          total: totalSlots,
          used: 0, // Start with all slots available
        })
      }
    }
  })

  return spellSlots
}

export const getCantripsKnownFromClass = (classData: ClassSpellData | null, level: number): number => {
  if (!classData || level < 1 || level > 20) {
    return 0
  }

  const levelIndex = level - 1
  
  // Ensure cantrips_known array exists and has the right length
  if (classData.cantrips_known && Array.isArray(classData.cantrips_known) && classData.cantrips_known.length >= level) {
    const result = classData.cantrips_known[levelIndex] || 0
    return result
  }
  
  return 0
}

export const getSpellsKnownFromClass = (classData: ClassSpellData | null, level: number): number => {
  if (!classData || level < 1 || level > 20) {
    return 0
  }

  const levelIndex = level - 1
  
  // Ensure spells_known array exists and has the right length
  if (classData.spells_known && Array.isArray(classData.spells_known) && classData.spells_known.length >= level) {
    return classData.spells_known[levelIndex] || 0
  }
  
  return 0
}

export const getBardicInspirationFromClass = (classData: ClassSpellData | null, level: number) => {
  // Multiple safeguards to ensure only Bard classes get bardic inspiration
  if (!classData || level < 1 || level > 20) {
    return null
  }

  // Primary check: class name must be "bard"
  if (classData.name.toLowerCase() !== "bard") {
    return null
  }

  const levelIndex = level - 1
  const uses = classData.bardic_inspiration_uses[levelIndex] || 0
  const die = classData.bardic_inspiration_die[levelIndex] || "d6"

  // Additional safeguard: if uses is 0, return null (even for Bard)
  if (uses === 0) return null

  return {
    dieType: die,
    usesPerRest: uses,
    currentUses: uses, // Start with full uses
  }
}

// Calculate cantrips known for multiclassed characters using class spell slots matrix
export const getMulticlassCantripsKnownFromClasses = async (character: any): Promise<{ total: number; breakdown: string; isMulticlass: boolean }> => {
  if (!character.classes || character.classes.length === 0) {
    return { total: 0, breakdown: "0", isMulticlass: false }
  }

  const { getSpellcastingClasses } = require('./character-data')
  const spellcastingClasses = getSpellcastingClasses(character.classes)
  let totalCantripsKnown = 0
  const classBreakdowns: string[] = []
  
  for (const charClass of spellcastingClasses) {
    try {
      // Fetch base class data (no subclass) for spell slots matrix
      const classData = await fetchClassData(charClass.name, undefined)
      if (classData) {
        // Only include cantrips from classes that show spells known
        if (classData.show_spells_known) {
          const cantrips = getCantripsKnownFromClass(classData, charClass.level)
          if (cantrips > 0) {
            totalCantripsKnown += cantrips
            classBreakdowns.push(`${cantrips}`)
          }
        }
      }
    } catch (error) {
      console.error(`Error loading class data for ${charClass.name}:`, error)
    }
  }
  
  const isMulticlass = classBreakdowns.length > 1
  const breakdown = isMulticlass ? classBreakdowns.join(" + ") : classBreakdowns[0] || "0"
  
  return { total: totalCantripsKnown, breakdown, isMulticlass }
}

// Calculate spells known for multiclassed characters using class spell slots matrix
export const getMulticlassSpellsKnownFromClasses = async (character: any): Promise<{ total: number; breakdown: string; isMulticlass: boolean }> => {
  if (!character.classes || character.classes.length === 0) {
    return { total: 0, breakdown: "0", isMulticlass: false }
  }

  const { getSpellcastingClasses } = require('./character-data')
  const spellcastingClasses = getSpellcastingClasses(character.classes)
  let totalSpellsKnown = 0
  const classBreakdowns: string[] = []
  
  for (const charClass of spellcastingClasses) {
    try {
      // Fetch base class data (no subclass) for spell slots matrix
      const classData = await fetchClassData(charClass.name, undefined)
      if (classData) {
        // Only include spells from classes that show spells known
        if (classData.show_spells_known) {
          const spells = getSpellsKnownFromClass(classData, charClass.level)
          if (spells > 0) {
            totalSpellsKnown += spells
            classBreakdowns.push(`${spells}`)
          }
        }
      }
    } catch (error) {
      console.error(`Error loading class data for ${charClass.name}:`, error)
    }
  }
  
  const isMulticlass = classBreakdowns.length > 1
  const breakdown = isMulticlass ? classBreakdowns.join(" + ") : classBreakdowns[0] || "0"
  
  return { total: totalSpellsKnown, breakdown, isMulticlass }
}

// Check if any class has show_spells_known enabled
export const hasAnyClassShowSpellsKnown = async (character: any): Promise<boolean> => {
  // For single-class characters, check the specific class
  if (!character.classes || character.classes.length === 0) {
    try {
      const classData = await fetchClassData(character.class, undefined)
      return classData?.show_spells_known || false
    } catch (error) {
      console.error(`Error loading class data for ${character.class}:`, error)
      return false
    }
  }

  const { getSpellcastingClasses } = require('./character-data')
  const spellcastingClasses = getSpellcastingClasses(character.classes)
  
  for (const charClass of spellcastingClasses) {
    try {
      // Fetch base class data (no subclass) for spell slots matrix
      const classData = await fetchClassData(charClass.name, undefined)
      if (classData && classData.show_spells_known) {
        return true
      }
    } catch (error) {
      console.error(`Error loading class data for ${charClass.name}:`, error)
    }
  }
  
  return false
}

export const fetchClassDataById = async (classId: string): Promise<ClassSpellData | null> => {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle()

    if (error) {
      console.error("Error fetching class data:", error)
      return null
    }

    if (!data) {
      return null
    }

    const parseSpellSlotArray = (arr: any): number[] => {
      if (!Array.isArray(arr)) return []
      return arr.map((val) => Number.parseInt(val) || 0)
    }

    const classData: ClassSpellData = {
      id: data.id,
      name: data.name,
      subclass: data.subclass || "",
      spell_slots_1: parseSpellSlotArray(data.spell_slots_1),
      spell_slots_2: parseSpellSlotArray(data.spell_slots_2),
      spell_slots_3: parseSpellSlotArray(data.spell_slots_3),
      spell_slots_4: parseSpellSlotArray(data.spell_slots_4),
      spell_slots_5: parseSpellSlotArray(data.spell_slots_5),
      spell_slots_6: parseSpellSlotArray(data.spell_slots_6),
      spell_slots_7: parseSpellSlotArray(data.spell_slots_7),
      spell_slots_8: parseSpellSlotArray(data.spell_slots_8),
      spell_slots_9: parseSpellSlotArray(data.spell_slots_9),
      cantrips_known: parseSpellSlotArray(data.cantrips_known),
      spells_known: parseSpellSlotArray(data.spells_known),
      bardic_inspiration_uses: parseSpellSlotArray(data.bardic_inspiration_uses),
      bardic_inspiration_die: data.bardic_inspiration_die || [],
      show_spells_known: data.show_spells_known || false,
      spellcasting_ability: data.spellcasting_ability || null,
      is_prepared_caster: data.is_prepared_caster || false,
      caster_type: data.caster_type || null,
      slots_replenish_on: data.slots_replenish_on || 'long_rest',
      invocations_known: data.invocations_known || null,
      infusions_known: data.infusions_known || null,
    }

    return classData
  } catch (error) {
    console.error("Error in fetchClassDataById:", error)
    return null
  }
}

export const fetchClassData = async (className: string, subclass?: string): Promise<ClassSpellData | null> => {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    let query = supabase.from("classes").select("*").eq("name", className)

    if (subclass) {
      query = query.eq("subclass", subclass)
    } else {
      // When no subclass is provided, fetch the base class entry (subclass is null or empty)
      query = query.is("subclass", null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error("Error fetching class data:", error)
      return null
    }

    if (!data) {
      return null
    }

    const parseSpellSlotArray = (arr: any): number[] => {
      if (!Array.isArray(arr)) return []
      return arr.map((val) => Number.parseInt(val) || 0)
    }

    const classData: ClassSpellData = {
      id: data.id,
      name: data.name,
      subclass: data.subclass || "",
      spell_slots_1: parseSpellSlotArray(data.spell_slots_1),
      spell_slots_2: parseSpellSlotArray(data.spell_slots_2),
      spell_slots_3: parseSpellSlotArray(data.spell_slots_3),
      spell_slots_4: parseSpellSlotArray(data.spell_slots_4),
      spell_slots_5: parseSpellSlotArray(data.spell_slots_5),
      spell_slots_6: parseSpellSlotArray(data.spell_slots_6),
      spell_slots_7: parseSpellSlotArray(data.spell_slots_7),
      spell_slots_8: parseSpellSlotArray(data.spell_slots_8),
      spell_slots_9: parseSpellSlotArray(data.spell_slots_9),
      cantrips_known: parseSpellSlotArray(data.cantrips_known),
      spells_known: parseSpellSlotArray(data.spells_known),
      bardic_inspiration_uses: parseSpellSlotArray(data.bardic_inspiration_uses),
      bardic_inspiration_die: data.bardic_inspiration_die || [],
      show_spells_known: data.show_spells_known || false,
      spellcasting_ability: data.spellcasting_ability || null,
      is_prepared_caster: data.is_prepared_caster || false,
      caster_type: data.caster_type || null,
      slots_replenish_on: data.slots_replenish_on || 'long_rest',
      invocations_known: data.invocations_known || null,
      infusions_known: data.infusions_known || null,
    }

    return classData
  } catch (error) {
    console.error("Error in fetchClassData:", error)
    return null
  }
}

