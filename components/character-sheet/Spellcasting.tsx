"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData, InnateSpell } from "@/lib/character-data"
import { getCombatColor, getClassFeatureColors } from "@/lib/color-mapping"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage, getFeatureCustomDescription, getFeatureMaxUses } from "@/lib/feature-usage-tracker"
import { calculateUsesFromFormula, resolveDescriptionSegments } from "@/lib/class-feature-templates"
import type { DescriptionSegment } from "@/lib/class-feature-templates"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"
import { loadClassFeatureSkills, loadClassData } from "@/lib/database"
import { useState, useEffect } from "react"
import { SectionCardSkeleton } from "./character-sheet-skeletons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SpellcastingProps {
  character: CharacterData
  strengthMod: number
  dexterityMod: number
  constitutionMod: number
  intelligenceMod: number
  wisdomMod: number
  charismaMod: number
  proficiencyBonus: number
  onEdit: () => void
  onOpenSpellList: () => void
  onToggleSpellSlot: (level: number, slotIndex: number) => void
  onToggleFeatSpellSlot: (featIndex: number, slotIndex: number) => void
  hasSpellcastingAbilities: (character: CharacterData) => boolean
  onUpdateFeatureUsage?: (featureId: string, updates: any) => void
  onInnateSpellsEdit?: () => void
  canEdit?: boolean
  isLoading?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// Helper function to check if character is a monk
const isMonk = (character: CharacterData): boolean => {
  if (character.classes && character.classes.length > 0) {
    return character.classes.some(cls => cls.name.toLowerCase() === 'monk')
  }
  return character.class.toLowerCase() === 'monk'
}

// Helper function to check if character is a barbarian
const isBarbarian = (character: CharacterData): boolean => {
  if (character.classes && character.classes.length > 0) {
    return character.classes.some(cls => cls.name.toLowerCase() === 'barbarian')
  }
  return character.class.toLowerCase() === 'barbarian'
}

// Spells Known classes - hardcoded fallback (used when classData is not available)
const SPELLS_KNOWN_CLASSES = ['bard', 'sorcerer', 'warlock', 'ranger', 'paladin']
// Spells Prepared classes - hardcoded fallback
const SPELLS_PREPARED_CLASSES = ['cleric', 'druid', 'wizard', 'artificer']

/**
 * Check if a class is a prepared caster using classData first, then fallback.
 */
function isPreparedCaster(charClass: { name: string; classData?: any }): boolean {
  if (charClass.classData?.is_prepared_caster !== undefined) {
    return charClass.classData.is_prepared_caster
  }
  return SPELLS_PREPARED_CLASSES.includes(charClass.name.toLowerCase())
}

/**
 * Get the spellcasting ability modifier for a prepared caster.
 * Uses classData.spellcasting_ability when available, falls back to hardcoded.
 */
function getModifierForPreparedClass(
  className: string,
  intelligenceMod: number,
  wisdomMod: number,
  charismaMod?: number,
  classData?: any
): number {
  // Data-driven: read spellcasting_ability from classData
  if (classData?.spellcasting_ability) {
    const ability = classData.spellcasting_ability.toLowerCase()
    if (ability === 'intelligence') return intelligenceMod
    if (ability === 'wisdom') return wisdomMod
    if (ability === 'charisma') return charismaMod ?? 0
    return 0
  }
  // Hardcoded fallback
  const c = className.toLowerCase()
  if (c === 'wizard' || c === 'artificer') return intelligenceMod
  if (c === 'cleric' || c === 'druid') return wisdomMod
  return 0
}


export function Spellcasting({
  character,
  strengthMod,
  dexterityMod,
  constitutionMod,
  intelligenceMod,
  wisdomMod,
  charismaMod,
  proficiencyBonus,
  onEdit,
  onOpenSpellList,
  onToggleSpellSlot,
  canEdit = true,
  onToggleFeatSpellSlot,
  hasSpellcastingAbilities,
  onUpdateFeatureUsage,
  onInnateSpellsEdit,
  isLoading = false
}: SpellcastingProps) {
  const [classFeatureSkills, setClassFeatureSkills] = useState<ClassFeatureSkill[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)
  const [monkClassData, setMonkClassData] = useState<any>(null)
  const [barbarianClassData, setBarbarianClassData] = useState<any>(null)
  // Calculate cantrips and spells known from classes table data
  const [cantripsKnown, setCantripsKnown] = useState<{
    total: number
    breakdown: string
    byClass: { className: string; value: number }[]
  }>({ total: 0, breakdown: "0", byClass: [] })
  const [spellsKnownByClass, setSpellsKnownByClass] = useState<{ className: string; value: number }[]>([])
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)
  // Partition innate spells by source so each section filters correctly
  const INNATE_LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
  const allInnate = (character.innateSpells || []).map((spell, origIdx) => ({ spell, origIdx }))
  const raceInnateSpells = allInnate.filter(({ spell }) => !spell.source || spell.source === 'race' || spell.source === 'class_feature')
  const featInnateSpells = allInnate.filter(({ spell }) => spell.source === 'feat')
  const otherInnateSpells = allInnate.filter(({ spell }) => spell.source === 'other')

  // Load class feature skills
  useEffect(() => {
    const loadFeatures = async () => {
      setIsLoadingFeatures(true)
      try {
        const { featureSkills } = await loadClassFeatureSkills(character)
        setClassFeatureSkills(featureSkills || [])
      } catch (error) {
        setClassFeatureSkills([])
      } finally {
        setIsLoadingFeatures(false)
      }
    }

    loadFeatures()
  }, [character.id, character.level, character.classes])

  // Load monk class data if character is a monk
  useEffect(() => {
    if (isMonk(character)) {
      const loadMonkData = async () => {
        try {
          // Get the monk class from character.classes to find subclass
          const monkClass = character.classes?.find(cls => cls.name.toLowerCase() === 'monk')
          const subclass = monkClass?.subclass
          const { classData } = await loadClassData('Monk', subclass)
          setMonkClassData(classData)
        } catch (error) {
          // Silent error handling
        }
      }
      loadMonkData()
    }
  }, [character.id, character.classes])

  // Load barbarian class data if character is a barbarian
  useEffect(() => {
    if (isBarbarian(character)) {
      const loadBarbarianData = async () => {
        try {
          // Get the barbarian class from character.classes to find subclass
          const barbarianClass = character.classes?.find(cls => cls.name.toLowerCase() === 'barbarian')
          const subclass = barbarianClass?.subclass
          const { classData } = await loadClassData('Barbarian', subclass)
          setBarbarianClassData(classData)
        } catch (error) {
          // Silent error handling
        }
      }
      loadBarbarianData()
    }
  }, [character.id, character.classes])

  // Calculate cantrips and spells known (per class for "Spells Known" classes only)
  useEffect(() => {
    const calculateCounts = async () => {
      if (!hasSpellcastingAbilities(character)) {
        return
      }

      setIsLoadingCounts(true)
      try {
        const classes = character.classes?.length
          ? character.classes
          : character.class
            ? [{ name: character.class, level: character.level, subclass: character.subclass }]
            : []

        let totalCantrips = 0
        const cantripBreakdowns: string[] = []
        const cantripsByClass: { className: string; value: number }[] = []
        const knownList: { className: string; value: number }[] = []

        for (const charClass of classes) {
          const { fetchClassData, getCantripsKnownFromClass, getSpellsKnownFromClass } = await import('@/lib/spell-slot-calculator')
          const classData = await fetchClassData(charClass.name, undefined)

          if (classData) {
            const classCantrips = getCantripsKnownFromClass(classData, charClass.level)
            totalCantrips += classCantrips
            if (classCantrips > 0) {
              cantripBreakdowns.push(classCantrips.toString())
              cantripsByClass.push({ className: charClass.name, value: classCantrips })
            }

            // Spells Known: for non-prepared casters that have spells_known data
            const isPrepared = isPreparedCaster(charClass)
            if (!isPrepared && SPELLS_KNOWN_CLASSES.includes(charClass.name.toLowerCase())) {
              const value = getSpellsKnownFromClass(classData, charClass.level)
              knownList.push({ className: charClass.name, value })
            }
          }
        }

        const cantripBreakdown = cantripBreakdowns.length > 1 ? cantripBreakdowns.join("+") : cantripBreakdowns[0] || "0"
        setCantripsKnown({ total: totalCantrips, breakdown: cantripBreakdown, byClass: cantripsByClass })
        setSpellsKnownByClass(knownList)
      } catch (error) {
        console.error('Error calculating spell counts:', error)
        setCantripsKnown({ total: character.spellData.cantripsKnown, breakdown: character.spellData.cantripsKnown.toString(), byClass: [] })
        setSpellsKnownByClass([])
      } finally {
        setIsLoadingCounts(false)
      }
    }

    calculateCounts()
  }, [character.id, character.level, character.class, character.classes])

  if (isLoading) return <SectionCardSkeleton contentLines={8} />

  // Show component for monks/barbarians (even without spellcasting) or characters with spellcasting abilities
  if (!isMonk(character) && !isBarbarian(character) && !hasSpellcastingAbilities(character)) {
    return null
  }

  // Spells Prepared per class (Cleric, Druid, Wizard, Artificer): modifier + class level, minimum 1
  const classesForPrepared = character.classes?.length
    ? character.classes
    : character.class
      ? [{ name: character.class, level: character.level }]
      : []
  const spellsPreparedByClass = classesForPrepared
    .filter((c: any) => isPreparedCaster(c))
    .map((c: any) => {
      const mod = getModifierForPreparedClass(c.name, intelligenceMod, wisdomMod, charismaMod, c.classData)
      // Determine modifier label from classData or hardcoded
      const ability = c.classData?.spellcasting_ability?.toLowerCase()
      let modLabel = "INT"
      if (ability === 'wisdom') modLabel = "WIS"
      else if (ability === 'charisma') modLabel = "CHA"
      else if (!ability) {
        const cLower = c.name.toLowerCase()
        modLabel = cLower === "wizard" || cLower === "artificer" ? "INT" : "WIS"
      }
      return {
        className: c.name,
        value: Math.max(1, mod + c.level),
        level: c.level,
        modLabel,
        modValue: mod,
      }
    })

  const hasSpellsRow = cantripsKnown.total > 0 || spellsKnownByClass.length > 0 || spellsPreparedByClass.length > 0

  // Determine spellcasting ability modifier based on class
  const getSpellcastingModifier = () => {
    const className = character.class.toLowerCase()
    if (className === "warlock" || className === "sorcerer" || className === "paladin") {
      return charismaMod
    } else if (className === "wizard" || className === "artificer") {
      return intelligenceMod
    } else if (className === "cleric" || className === "druid" || className === "ranger") {
      return wisdomMod
    } else if (className === "bard") {
      return charismaMod
    }
    return intelligenceMod // fallback
  }

  const spellcastingModifier = getSpellcastingModifier()

  // Helper functions for monk abilities
  const getMonkLevel = (): number => {
    if (character.classes && character.classes.length > 0) {
      const monkClass = character.classes.find(cls => cls.name.toLowerCase() === 'monk')
      return monkClass ? monkClass.level : 0
    }
    return character.class.toLowerCase() === 'monk' ? character.level : 0
  }

  const getDieNotation = (dieSize: number): string => {
    return `d${dieSize}`
  }

  const getMartialArtsDie = (): string => {
    if (!monkClassData?.martial_arts_dice || !Array.isArray(monkClassData.martial_arts_dice)) {
      // Fallback progression if no database data
      const fallbackProgression = [4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10]
      const dieSize = fallbackProgression[Math.min(getMonkLevel() - 1, 19)] || 4
      return getDieNotation(dieSize)
    }
    
    const dieSize = monkClassData.martial_arts_dice[Math.min(getMonkLevel() - 1, 19)] || 4
    return getDieNotation(dieSize)
  }

  const getKiPoints = (): number => {
    if (!monkClassData?.ki_points || !Array.isArray(monkClassData.ki_points)) {
      // Fallback progression if no database data
      const fallbackProgression = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      return fallbackProgression[Math.min(getMonkLevel() - 1, 19)] || 0
    }
    
    return monkClassData.ki_points[Math.min(getMonkLevel() - 1, 19)] || 0
  }

  const getUnarmoredMovement = (): number => {
    if (!monkClassData?.unarmored_movement || !Array.isArray(monkClassData.unarmored_movement)) {
      // Fallback progression if no database data
      const fallbackProgression = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      return fallbackProgression[Math.min(getMonkLevel() - 1, 19)] || 0
    }
    
    return monkClassData.unarmored_movement[Math.min(getMonkLevel() - 1, 19)] || 0
  }

  // Helper functions for barbarian abilities
  const getBarbarianLevel = (): number => {
    if (character.classes && character.classes.length > 0) {
      const barbarianClass = character.classes.find(cls => cls.name.toLowerCase() === 'barbarian')
      return barbarianClass ? barbarianClass.level : 0
    }
    return character.class.toLowerCase() === 'barbarian' ? character.level : 0
  }

  const getRageUses = (): string => {
    const level = getBarbarianLevel()
    
    // Check if we have database data first
    if (barbarianClassData?.rage_uses && Array.isArray(barbarianClassData.rage_uses)) {
      const rageUses = barbarianClassData.rage_uses[Math.min(level - 1, 19)] || 0
      return rageUses === 0 ? "Unlimited" : rageUses.toString()
    }
    
    // Fallback progression if no database data
    if (level >= 20) return "Unlimited"
    if (level >= 17) return "6"
    if (level >= 12) return "5"
    if (level >= 6) return "4"
    if (level >= 3) return "3"
    return "2"
  }

  const getRageDamage = (): number => {
    const level = getBarbarianLevel()
    if (level >= 16) return 4
    if (level >= 9) return 3
    return 2
  }

  // Note: Features are now loaded automatically from database via loadClassFeatureSkills
  // No need for hardcoded getBaseClassFeatures function

  // Create feature skill configuration from feature ID
  // This ensures feature configuration comes from the system, not character data
  const createFeatureSkillFromId = (featureId: string, usageData: any): ClassFeatureSkill | null => {
    // Handle feat features - they have isFeatFeature flag and full config stored
    if (usageData?.isFeatFeature) {
      return {
        id: featureId,
        version: 1,
        title: usageData.featureName || 'Unknown Feature',
        subtitle: usageData.featSource ? `From ${usageData.featSource}` : '',
        featureType: usageData.featureType || 'trait',
        enabledAtLevel: 1,
        enabledBySubclass: null,
        className: 'Feats', // Group feat features under "Feats"
        config: usageData.config || {}
      }
    }

    // Determine which class this feature belongs to based on usage data or feature ID
    const getFeatureClassName = (featureId: string): string => {
      // Check if usage data has className stored (set by loadClassFeatureSkills)
      const usage = character.classFeatureSkillsUsage?.[featureId]
      if (usage && (usage as any)?.className) {
        return (usage as any).className
      }

      // Hardcoded fallback mapping
      // Warlock features
      if (['genies-wrath', 'elemental-gift', 'mystic-arcanum', 'genies-vessel', 'limited-wish'].includes(featureId)) {
        return character.classes?.find(c => c.name.toLowerCase() === 'warlock')?.name || 'Warlock'
      }
      // Bard features
      if (['song-of-rest', 'bardic-inspiration'].includes(featureId)) {
        return character.classes?.find(c => c.name.toLowerCase() === 'bard')?.name || 'Bard'
      }
      // Artificer features
      if (['flash-of-genius', 'infusions'].includes(featureId)) {
        return character.classes?.find(c => c.name.toLowerCase() === 'artificer')?.name || 'Artificer'
      }
      // Paladin features
      if (['divine-sense', 'lay-on-hands', 'channel-divinity', 'cleansing-touch'].includes(featureId)) {
        return character.classes?.find(c => c.name.toLowerCase() === 'paladin')?.name || 'Paladin'
      }
      // Default to first class if no match found
      return character.classes?.[0]?.name || character.class
    }

    const className = getFeatureClassName(featureId)

    // LEGACY HARDCODED FEATURE DEFINITIONS - COMMENTED OUT
    // These features are now managed by the database-driven class_features system.
    // The database versions use IDs like "feature-divine-sense" instead of "divine-sense".
    // Keeping this function for backward compatibility with features not yet migrated.
    // ALL LEGACY HARDCODED FEATURE DEFINITIONS - COMMENTED OUT
    // All class features are now managed by the database-driven class_features system.
    // The database versions use IDs like "feature-divine-sense" instead of "divine-sense".
    // switch (featureId) {
    //   case 'genies-wrath':
    //   case 'elemental-gift':
    //   case 'divine-sense':
    //   case 'lay-on-hands':
    //   case 'channel-divinity':
    //   case 'song-of-rest':
    //   case 'bardic-inspiration':
    //   case 'flash-of-genius':
    // }
    return null
  }

  // Render unified class features (excluding special UX)
  const renderUnifiedClassFeatures = () => {
    if (isLoadingFeatures) {
      return (
        <div className="flex items-center justify-center p-4 text-muted-foreground">
          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
          Loading class features...
        </div>
      )
    }

    // Combine features from database and character's existing usage data
    const allFeatures: ClassFeatureSkill[] = [...(classFeatureSkills || [])]
    
    // Correct feature types and add className for features loaded from database
    // Some features in the database may have incorrect feature types or missing className
    allFeatures.forEach(feature => {
      if (feature.id === 'song-of-rest' && feature.featureType === 'special_ux') {
        feature.featureType = 'availability_toggle'
        feature.config = {
          defaultAvailable: true,
          replenishOn: 'short_rest',
          displayStyle: 'badge',
          availableText: 'Available',
          usedText: 'Used'
        }
      }
      
      // Ensure className is set for features from database
      if (!feature.className) {
        // Check usage data for className first (data-driven)
        const usage = character.classFeatureSkillsUsage?.[feature.id]
        if (usage && (usage as any)?.className) {
          feature.className = (usage as any).className
        }
        // Hardcoded fallback mapping
        else if (['song-of-rest', 'bardic-inspiration'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'bard')?.name || 'Bard'
        } else if (['genies-wrath', 'elemental-gift', 'mystic-arcanum', 'genies-vessel', 'limited-wish'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'warlock')?.name || 'Warlock'
        } else if (['flash-of-genius', 'infusions'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'artificer')?.name || 'Artificer'
        } else if (['divine-sense', 'lay-on-hands', 'channel-divinity', 'cleansing-touch'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'paladin')?.name || 'Paladin'
        } else {
          feature.className = character.classes?.[0]?.name || character.class
        }
      }
    })
    
    // Add features from character's existing usage data that aren't already loaded
    // These features exist in usage data but not in the database class features
    if (character.classFeatureSkillsUsage) {
      Object.entries(character.classFeatureSkillsUsage).forEach(([featureId, usageData]: [string, any]) => {
        // Skip if already loaded from database
        if (allFeatures.some(f => f.id === featureId)) {
          return
        }
        
        // Skip legacy usage entries (e.g. "divine-sense") when a database version 
        // (e.g. "feature-divine-sense") already exists in allFeatures
        const hasDBVersion = allFeatures.some(f => f.id === `feature-${featureId}`)
        if (hasDBVersion) {
          return
        }
        
        // Also skip "feature-*" usage entries that don't have a matching database feature
        // (these are just usage tracking data, the feature definition comes from the database)
        if (featureId.startsWith('feature-') && !allFeatures.some(f => f.id === featureId)) {
          // This usage entry is for a database feature that should already be in allFeatures
          // If it's not there, it means the feature was removed or is not loaded - skip it
          return
        }

        // Skip feat features - they render in their own "Feat Spells" section below spell slots
        if ((usageData as any)?.isFeatFeature) {
          return
        }

        // Create feature skill with proper configuration based on feature ID
        // Character usage data should only contain usage state, not feature configuration
        const featureSkill = createFeatureSkillFromId(featureId, usageData)
        
        if (featureSkill) {
          allFeatures.push(featureSkill)
        }
      })
    }

    // Features are now loaded automatically from database via loadClassFeatureSkills
    // No need to manually add base class features


    // Group features by class
    const featuresByClass = new Map<string, ClassFeatureSkill[]>()
    
    allFeatures.forEach(skill => {
      // Skip features that have their own special UX components
      const specialUXFeatures = [
        'infusions', // Has its own Infusions component
        'eldritch-cannon', // Has its own EldritchCannon component
        'eldritch-invocations', // Has its own EldritchInvocations component
        'metamagic', // Would have its own component if implemented
        'wild-shape', // Would have its own component if implemented
      ]
      
      // Check if this feature should be excluded
      // Only exclude if it's explicitly special_ux AND has a dedicated component
      const shouldExclude = (skill.featureType === 'special_ux' && 
      specialUXFeatures.some(special => 
        skill.id?.toLowerCase().includes(special) ||
        skill.title?.toLowerCase().includes(special)
      )) ||
      // Also exclude features that have dedicated components regardless of type
      specialUXFeatures.some(special => 
        skill.id?.toLowerCase().includes(special) ||
        skill.title?.toLowerCase().includes(special)
      )
      
      if (shouldExclude) {
        return
      }

      // Filter by displayLocation: only show features that have 'spellcasting' in displayLocation
      // If displayLocation is undefined/null, show for backward compatibility
      if (skill.displayLocation !== undefined && skill.displayLocation !== null) {
        // Debug logging for Bottled Respite
        if (skill.title?.toLowerCase().includes('bottled') || skill.title?.toLowerCase().includes('respite')) {
          console.log('Checking displayLocation for feature:', {
            title: skill.title,
            displayLocation: skill.displayLocation,
            includesSpellcasting: skill.displayLocation.includes('spellcasting')
          })
        }
        
        if (!skill.displayLocation.includes('spellcasting')) {
          return // Skip features that don't have 'spellcasting' in their displayLocation
        }
      }

      // Find the class this feature belongs to
      // Use the className property from the feature if available, otherwise fall back to matching logic
      let className = skill.className || character.class
      
      // If no className property, try to match by feature title or ID
      if (!className) {
        className = character.classes?.find(c => 
          c.name.toLowerCase() === skill.title.toLowerCase() || 
          skill.title.toLowerCase().includes(c.name.toLowerCase()) ||
          skill.id?.toLowerCase().includes(c.name.toLowerCase())
        )?.name || character.class
      }

      if (!featuresByClass.has(className)) {
        featuresByClass.set(className, [])
      }
      featuresByClass.get(className)!.push(skill)
    })
    
    if (allFeatures.length === 0 || featuresByClass.size === 0) {
      return null
    }

    return Array.from(featuresByClass.entries())
      .filter(([className, features]) => features.length > 0) // Only show classes that have features
      .map(([className, features]) => (
      <div key={className} className="flex flex-col gap-2">
        <div className="text-sm font-medium">{className} Skills</div>
        {features.map((skill, index) => (
          <div key={skill.id || `${className}-${index}`}>
            {renderFeatureSkill(skill, className)}
          </div>
        ))}
      </div>
    ))
  }

  // Shared renderer for a single InnateSpell row (used in race, feat, and other sections)
  const renderInnateSpellRow = (spell: InnateSpell, origIdx: number, showSourceLabel = false) => {
    const isPlaceholder = /^\d+(?:st|nd|rd|th)-level spell$/i.test(spell.name?.trim() ?? '')
    return (
      <div key={`innate-${origIdx}`} className="p-2 border rounded bg-background pr-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-grow">
            <span className={`text-sm font-medium ${isPlaceholder ? 'text-primary' : ''}`}>
              {spell.name}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {INNATE_LEVEL_LABELS[spell.spellLevel ?? (spell as any).level ?? 0] ?? 'Cantrip'}
            </Badge>
            {spell.concentration && (
              <Badge variant="outline" className="text-xs shrink-0">C</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {spell.usesPerDay === 'at_will' ? (
              <span className="text-xs text-muted-foreground">At Will</span>
            ) : (
              <>
                {Array.from({ length: typeof spell.usesPerDay === 'number' ? spell.usesPerDay : 0 }, (_, i) => {
                  const currentUses = spell.currentUses ?? (typeof spell.usesPerDay === 'number' ? spell.usesPerDay : 0)
                  const isAvailable = i < currentUses
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!canEdit) return
                        const updated = (character.innateSpells ?? []).map((s, si) => {
                          if (si === origIdx) {
                            const cur = s.currentUses ?? (typeof s.usesPerDay === 'number' ? s.usesPerDay : 0)
                            return { ...s, currentUses: isAvailable ? cur - 1 : cur + 1 }
                          }
                          return s
                        })
                        onUpdateFeatureUsage?.('__innate_spells__', { type: 'direct_update', innateSpells: updated })
                      }}
                      disabled={!canEdit}
                      className={`w-4 h-4 rounded border-2 transition-colors ${
                        isAvailable
                          ? `${getCombatColor('featSpellSlotAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                          : `${getCombatColor('featSpellSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                      }`}
                      title={isAvailable ? 'Available' : 'Used'}
                    />
                  )
                })}
                <span className="text-xs text-muted-foreground ml-2 font-mono">
                  {spell.currentUses ?? (typeof spell.usesPerDay === 'number' ? spell.usesPerDay : 0)}/{typeof spell.usesPerDay === 'number' ? spell.usesPerDay : 0}
                </span>
              </>
            )}
          </div>
        </div>
        {showSourceLabel && spell.sourceName && (
          <div className="text-xs text-muted-foreground">From {spell.sourceName}</div>
        )}
      </div>
    )
  }

  // Render feat spell entries (automated isFeatFeature entries + feat innate spells)
  const renderFeatFeatures = () => {
    const featEntries = Object.entries(character.classFeatureSkillsUsage || {})
      .filter(([, usageData]: [string, any]) => usageData?.isFeatFeature && usageData?.category !== 'combat' && usageData?.category !== 'trait')

    if (featEntries.length === 0 && featInnateSpells.length === 0) return null

    return (
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-sm font-medium">Feat Spells</div>
        {featEntries.map(([featureId, usageData]) => {
          const featureSkill = createFeatureSkillFromId(featureId, usageData as any)
          if (!featureSkill) return null
          return (
            <div key={featureId}>
              {renderFeatureSkill(featureSkill, undefined)}
            </div>
          )
        })}
        {featInnateSpells.map(({ spell, origIdx }) =>
          renderInnateSpellRow(spell, origIdx, true)
        )}
      </div>
    )
  }

  // Render individual feature skill
  const renderFeatureSkill = (skill: ClassFeatureSkill, className?: string) => {
    if (!skill.id) return null
    
    const usage = getFeatureUsage(character, skill.id)
    const customDescription = getFeatureCustomDescription(character, skill.id) || ''

    switch (skill.featureType) {
      case 'slots':
        return renderSlotsFeature(skill, usage, customDescription, className)
      case 'points_pool':
        return renderPointsPoolFeature(skill, usage, customDescription)
      case 'availability_toggle':
        return renderAvailabilityToggleFeature(skill, usage, customDescription)
      case 'options_list':
        return renderOptionsListFeature(skill, usage, customDescription)
      default:
        return null
    }
  }

  // Render a description with resolved variables styled as badges
  const renderDescription = (segments: DescriptionSegment[]) => {
    if (segments.length === 0) return null
    // If there are no variable segments, render plain text
    if (segments.every(s => s.type === 'text')) {
      const text = segments.map(s => s.value).join('')
      return text || null
    }
    return (
      <>
        {segments.map((seg, i) =>
          seg.type === 'variable' ? (
            <Badge key={i} variant="secondary" className="text-[11px] leading-none h-[18px] px-1.5 py-0 font-mono font-semibold align-middle">
              {seg.value}
            </Badge>
          ) : (
            <span key={i}>{seg.value}</span>
          )
        )}
      </>
    )
  }

  // Render slots-based features
  const renderSlotsFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string, className?: string) => {
    if (!skill.id) return null
    
    // Get effective config with level-based scaling applied
    const slotConfig = skill.config as any
    const classLevel = className ? getClassLevel(character, className) || character.level : character.level
    
    // Apply level-based scaling if override.levelScaling exists
    let effectiveConfig = { ...slotConfig }
    if (slotConfig.override && slotConfig.override.levelScaling) {
      const levelScaling = slotConfig.override.levelScaling
      const levels = Object.keys(levelScaling)
        .map(Number)
        .sort((a, b) => b - a) // Sort descending to find highest applicable level
      
      // Find the highest level that applies
      for (const level of levels) {
        if (classLevel >= level) {
          const scalingConfig = levelScaling[level.toString()]
          // Merge scaling config into effective config
          effectiveConfig = { ...effectiveConfig, ...scalingConfig }
          break
        }
      }
    }
    
    // Calculate maxUses: ALWAYS use formula if available (formulas are dynamic based on stats)
    // The saved usage.maxUses may be stale from initialization
    let maxUses = 0
    
    if (effectiveConfig.usesFormula) {
      // Calculate from formula - this is the source of truth for features with formulas
      maxUses = calculateUsesFromFormula(effectiveConfig.usesFormula, character, skill.className)
      
      // Debug logging for database-loaded features
      if ((skill as any)._isDatabaseLoaded) {
        console.log('Calculating max uses for DATABASE feature:', {
          title: skill.title,
          id: skill.id,
          classLevel: classLevel,
          characterLevel: character.level,
          baseFormula: slotConfig.usesFormula,
          effectiveFormula: effectiveConfig.usesFormula,
          calculated: maxUses,
          proficiencyBonus: proficiencyBonus,
          charisma: character.charisma,
          charismaMod: charismaMod,
          savedMaxUses: usage?.maxUses,
          config: effectiveConfig,
          hasLevelScaling: !!(slotConfig.override && slotConfig.override.levelScaling)
        })
      }
    } else if (usage?.maxUses !== undefined) {
      maxUses = usage.maxUses
    } else {
      maxUses = getFeatureMaxUses(character, skill.id) || 0
    }
    
    // For currentUses: use saved value but cap it at maxUses (in case max decreased)
    const currentUses = usage?.currentUses !== undefined ? Math.min(usage.currentUses, maxUses) : maxUses

    if (maxUses === 0) return null

    // Get class-specific colors
    const classColors = className ? getClassFeatureColors(className) : {
      available: getCombatColor('spellSlotAvailable'),
      used: getCombatColor('spellSlotUsed')
    }

    return (
      <div className="flex flex-col items-start justify-between gap-1 p-2 pr-3 border rounded gap-1 bg-background">
        <div className="w-full flex gap-2 items-center justify-between">
          <div className="flex items-center gap-2 flex-grow min-w-0">
            <span className="text-sm font-medium">{skill.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxUses }, (_, i) => {
              const isAvailable = i < currentUses
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!canEdit) return
                    if (onUpdateFeatureUsage && skill.id) {
                      onUpdateFeatureUsage(skill.id, { 
                        type: isAvailable ? 'use_slot' : 'restore_slot', 
                        amount: 1 
                      })
                    }
                  }}
                  disabled={!canEdit}
                  className={`w-4 h-4 rounded border-2 transition-colors ${
                    isAvailable
                      ? `${classColors.available} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                      : `${classColors.used} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                  }`}
                  title={isAvailable ? "Available" : "Used"}
                />
              )
            })}
            <span className="text-xs text-muted-foreground ml-2 w-5 text-right font-mono">
              {currentUses}/{maxUses}
            </span>
          </div>
        </div>
        {(customDescription || skill.subtitle || (skill as any).customDescription) && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              {renderDescription(resolveDescriptionSegments(
                customDescription || skill.subtitle || (skill as any).customDescription || '',
                character,
                effectiveConfig,
                skill.className,
                { maxUses }
              ))}
          </span>
        )}
      </div>
    )
  }

  // Render points pool features
  const renderPointsPoolFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    // Get effective config with level-based scaling applied
    const pointsConfig = skill.config as any
    const classLevel = skill.className ? getClassLevel(character, skill.className) || character.level : character.level
    
    // Apply level-based scaling if override.levelScaling exists
    let effectiveConfig = { ...pointsConfig }
    if (pointsConfig.override && pointsConfig.override.levelScaling) {
      const levelScaling = pointsConfig.override.levelScaling
      const levels = Object.keys(levelScaling)
        .map(Number)
        .sort((a, b) => b - a) // Sort descending to find highest applicable level
      
      // Find the highest level that applies
      for (const level of levels) {
        if (classLevel >= level) {
          const scalingConfig = levelScaling[level.toString()]
          // Merge scaling config into effective config
          effectiveConfig = { ...effectiveConfig, ...scalingConfig }
          break
        }
      }
    }
    
    // Calculate max points: ALWAYS use formula if available (formulas are dynamic based on stats)
    let maxPoints = 0
    if (effectiveConfig?.totalFormula) {
      maxPoints = calculateUsesFromFormula(effectiveConfig.totalFormula, character, skill.className)
      
      if ((skill as any)._isDatabaseLoaded) {
        console.log('Calculating max points for DATABASE feature:', {
          title: skill.title,
          id: skill.id,
          totalFormula: effectiveConfig.totalFormula,
          calculated: maxPoints,
          savedMaxPoints: usage?.maxPoints,
        })
      }
    } else if (usage?.maxPoints !== undefined) {
      maxPoints = usage.maxPoints
    }
    const currentPoints = usage?.currentPoints !== undefined ? Math.min(usage.currentPoints, maxPoints) : maxPoints

    if (maxPoints === 0) return null

    return (
      <div className="flex items-center justify-between p-2 pr-3 border rounded bg-background">
        <div className="flex gap-1 flex-col">
          <span className="text-sm font-medium">{skill.title}</span>
          {(customDescription || skill.subtitle || skill.customDescription) && (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
                {renderDescription(resolveDescriptionSegments(
                  customDescription || skill.subtitle || skill.customDescription || '',
                  character,
                  effectiveConfig,
                  skill.className,
                  { maxPoints }
                ))}
              </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max={maxPoints}
            value={currentPoints}
            onChange={(e) => {
              if (!canEdit) return
              const newValue = Math.max(0, Math.min(maxPoints, parseInt(e.target.value) || 0))
              if (onUpdateFeatureUsage && skill.id) {
                onUpdateFeatureUsage(skill.id, { 
                  type: 'direct_update',
                  updates: {
                    currentPoints: newValue,
                    maxPoints: maxPoints
                  }
                })
              }
            }}
            disabled={!canEdit}
            className="w-16 px-2 py-1 text-sm border rounded text-center bg-card"
            title={`Remaining ${skill.title} points`}
          />
          <span className="text-sm text-muted-foreground font-mono">
            / {maxPoints}
          </span>
        </div>
      </div>
    )
  }

  // Render availability toggle features
  const renderAvailabilityToggleFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    const available = (usage?.isAvailable ?? (usage?.customState?.available as boolean | undefined)) ?? true

    return (
      <div 
        className={`p-2 border flex flex-col gap-1 rounded transition-colors bg-background ${canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-50'}`}
        onClick={() => {
          if (!canEdit) return
          if (onUpdateFeatureUsage && skill.id) {
            onUpdateFeatureUsage(skill.id, { 
              type: 'toggle_availability'
            })
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm flex flex-col gap-1">
            <span className="font-medium">{skill.title}</span>
          </span>
          <Badge variant={available ? "default" : "secondary"}>
            {available ? "Available" : "Used"}
          </Badge>
        </div>
        {(customDescription || skill.subtitle || skill.customDescription) && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
            {renderDescription(resolveDescriptionSegments(
              customDescription || skill.subtitle || skill.customDescription || '',
              character,
              skill.config,
              skill.className
            ))}
          </span>
        )}
      </div>
    )
  }

  // Render options list features (simplified display)
  const renderOptionsListFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    const selectedOptions = usage?.selectedOptions || []
    const maxSelections = usage?.maxSelections || 0

    if (maxSelections === 0) return null

    return (
      <div className="p-2 pr-3 border rounded bg-background">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-col">
            <span className="text-sm font-medium">{skill.title}</span>
            {(customDescription || skill.subtitle || skill.customDescription) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                {renderDescription(resolveDescriptionSegments(
                  customDescription || skill.subtitle || skill.customDescription || '',
                  character,
                  skill.config,
                  skill.className
                ))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedOptions.length}/{maxSelections} selected
            </span>
            {selectedOptions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedOptions.length}
              </Badge>
            )}
          </div>
        </div>
        {selectedOptions.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {selectedOptions.slice(0, 3).join(', ')}
            {selectedOptions.length > 3 && ` +${selectedOptions.length - 3} more`}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon={
              (isMonk(character) && !hasSpellcastingAbilities(character)) ? "lucide:zap" :
              (isBarbarian(character) && !hasSpellcastingAbilities(character)) ? "lucide:sword" :
              "lucide:sparkles"
            } className="w-5 h-5" />
            {(isMonk(character) && !hasSpellcastingAbilities(character)) ? "Monk Abilities" :
             (isBarbarian(character) && !hasSpellcastingAbilities(character)) ? "Barbarian Abilities" :
             "Spellcasting"}
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {/* Monk Abilities Section */}
        {isMonk(character) && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 items-start">
              <div className="text-center border py-2 px-1 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                <div className="text-sm text-muted-foreground">Martial Arts</div>
                <div className="text-xl font-bold font-mono">
                  {getMartialArtsDie()}
                </div>
              </div>
              <div className="text-center border py-2 px-1 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                <div className="text-sm text-muted-foreground">Unarmored Mvmt</div>
                <div className="text-xl font-bold font-mono">
                  +{getUnarmoredMovement()} ft.
                </div>
              </div>
            </div>
          </div>
        )}

        {isBarbarian(character) && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 items-start">
              <div className="text-center border py-2 px-1 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                <div className="text-sm text-muted-foreground">Rage</div>
                <div className="text-xl font-bold font-mono">
                  {getRageUses()}
                </div>
              </div>
              <div className="text-center border py-2 px-1 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                <div className="text-sm text-muted-foreground">Rage Damage</div>
                <div className="text-xl font-bold font-mono">
                  +{getRageDamage()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Spell Stats */}
        {hasSpellcastingAbilities(character) && (
          <>
            <div className="flex flex-col gap-2">
              {/* Spell Attack and Spell Save DC always on same row */}
              <div className="grid grid-cols-2 gap-2 items-start">
                <div className="text-center border p-2 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                  <div className="text-sm text-muted-foreground">Spell Attack</div>
                  <div className="text-xl font-bold font-mono">
                    {formatModifier(character.spellData.spellAttackBonus)}
                  </div>
                </div>
                <div className="text-center border p-2 rounded-lg mb-0 flex flex-col items-center gap-1 bg-background">
                  <div className="text-sm text-muted-foreground">Spell Save DC</div>
                  <div className="text-xl font-bold font-mono">{character.spellData.spellSaveDC}</div>
                </div>
              </div>
              
              {/* Cantrips and Spells row: Cantrips | Spells Known (per class) | Spells Prepared (per class) - equal-width grid */}
              {hasSpellsRow && (() => {
                const columnCount = 1 + spellsKnownByClass.length + spellsPreparedByClass.length
                return (
                <div
                  className="grid gap-2 items-stretch"
                  style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
                >
                  {/* Cantrips */}
                  {cantripsKnown.byClass.length >= 2 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center border p-2 rounded-lg flex flex-col items-center justify-start gap-1 bg-background cursor-default">
                          <div className="text-xs text-muted-foreground">Cantrips</div>
                          <div className="text-xl font-bold font-mono">
                            {isLoadingCounts ? (
                              <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            ) : (
                              cantripsKnown.breakdown
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs flex flex-col gap-1 items-center">
                        <div className="font-medium">Cantrips</div>
                        <div className="text-[11px] opacity-80 flex flex-col gap-0.5 items-center text-center">
                          {cantripsKnown.byClass.map(({ className, value }) => (
                            <span key={className} className="capitalize">{className}: {value}</span>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="text-center border p-2 rounded-lg flex flex-col items-center justify-start gap-1 bg-background">
                      <div className="text-xs text-muted-foreground">Cantrips</div>
                      <div className="text-xl font-bold font-mono">
                        {isLoadingCounts ? (
                          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                        ) : (
                          cantripsKnown.breakdown
                        )}
                      </div>
                    </div>
                  )}
                  {/* Spells Known (Bard, Sorcerer, Warlock, Ranger, Paladin) - one block per class */}
                  {spellsKnownByClass.map(({ className, value }) => (
                    <Tooltip key={`known-${className}`}>
                      <TooltipTrigger asChild>
                        <div className="text-center border p-2 rounded-lg flex flex-col items-center justify-center gap-1 bg-background cursor-default">
                          <div className="text-xs text-muted-foreground capitalize">{className} Spells</div>
                          <div className="text-xl font-bold font-mono">
                            {isLoadingCounts ? (
                              <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            ) : (
                              value
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs flex flex-col gap-1 items-center">
                        <div className="font-medium">Spells Known</div>
                        <div className="text-[11px] opacity-80">From {className} level progression</div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {/* Spells Prepared (Cleric, Druid, Wizard, Artificer) - one block per class */}
                  {spellsPreparedByClass.map(({ className, value, level, modLabel, modValue }) => (
                    <Tooltip key={`prepared-${className}`}>
                      <TooltipTrigger asChild>
                        <div className="text-center border p-2 rounded-lg flex flex-col items-center justify-center gap-1 bg-background cursor-default">
                          <div className="text-xs text-muted-foreground capitalize">{className} Spells</div>
                          <div className="text-xl font-bold font-mono">{value}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs flex flex-col gap-1 items-center">
                        <div className="font-medium">Spells Prepared</div>
                        <div className="text-[11px] opacity-80">
                          {modLabel} modifier ({modValue >= 0 ? "+" : ""}{modValue}) + {className} level ({level}) = {value}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                )
              })()}
            </div>
            <Button className="w-full" variant="outline" size="sm" onClick={onOpenSpellList}>
              <Icon icon="lucide:book-open" className="w-4 h-4" />
              Spell List
            </Button>
          </>
        )}

        {/* Unified Class Features */}
        {(() => {
          const content = renderUnifiedClassFeatures()
          if (!content) return null
          return <div className="mt-3 border-t pt-3 flex flex-col gap-3">{content}</div>
        })()}


        {/* Spell Slots */}
        {hasSpellcastingAbilities(character) && character.spellData.spellSlots && character.spellData.spellSlots.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            <div className="text-sm font-medium">Spell Slots</div>
            <div className="grid grid-cols-1 gap-2">
              {character.spellData.spellSlots.map((slot) => (
                <div key={slot.level} className="p-2 pr-3 border rounded flex items-center justify-between bg-background">
                  <div className="text-sm font-medium">
                    {(slot as any).isWarlockSlot 
                      ? `Warlock Level ${slot.level}` 
                      : `Level ${slot.level}`}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: slot.total }, (_, i) => {
                      const isAvailable = i < (slot.total - slot.used)
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!canEdit) return
                            onToggleSpellSlot(slot.level, i)
                          }}
                          disabled={!canEdit}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('spellSlotAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                              : `${getCombatColor('spellSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {slot.total - slot.used}/{slot.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Innate Spellcasting — race & class_feature spells only */}
        {raceInnateSpells.length > 0 && (() => {
          const grouped = new Map<string, Array<{ spell: InnateSpell; origIdx: number }>>()
          for (const item of raceInnateSpells) {
            const key = item.spell.sourceName || 'Other'
            if (!grouped.has(key)) grouped.set(key, [])
            grouped.get(key)!.push(item)
          }
          return (
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Innate Spells</div>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from(grouped.entries()).map(([src, items]) => (
                  <div key={src} className="flex flex-col gap-1">
                    {grouped.size > 1 && (
                      <div className="text-xs text-muted-foreground font-medium">{src}</div>
                    )}
                    {items.map(({ spell, origIdx }) =>
                      renderInnateSpellRow(spell, origIdx, grouped.size === 1)
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Feat Spells — spells from feats (isFeatFeature + featSpellSlots + feat innate) */}
        {renderFeatFeatures()}

        {/* Other Spells — items/custom spells (featSpellSlots + source='other' innate) */}
        {(otherInnateSpells.length > 0 || (character.spellData?.featSpellSlots?.length ?? 0) > 0) && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="text-sm font-medium">Other Spells</div>
            <div className="flex flex-col gap-2">
              {(character.spellData?.featSpellSlots ?? []).map((featSlot, featIndex) => (
                <div key={`feat-slot-${featIndex}`} className="p-2 border rounded bg-background pr-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {featSlot.spellName || `Spell ${featIndex + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: featSlot.usesPerLongRest }, (_, i) => {
                        const isAvailable = i < (featSlot.usesPerLongRest - featSlot.currentUses)
                        return (
                          <button
                            key={i}
                            onClick={() => { if (!canEdit) return; onToggleFeatSpellSlot(featIndex, i) }}
                            disabled={!canEdit}
                            className={`w-4 h-4 rounded border-2 transition-colors ${
                              isAvailable
                                ? `${getCombatColor('featSpellSlotAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                                : `${getCombatColor('featSpellSlotUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                            }`}
                            title={isAvailable ? "Available" : "Used"}
                          />
                        )
                      })}
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {featSlot.usesPerLongRest - featSlot.currentUses}/{featSlot.usesPerLongRest}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">From {featSlot.featName}</div>
                </div>
              ))}
              {otherInnateSpells.map(({ spell, origIdx }) =>
                renderInnateSpellRow(spell, origIdx, true)
              )}
            </div>
          </div>
        )}


        {/* Spell Notes */}
        {character.spellData.spellNotes && character.spellData.spellNotes.trim() !== "" && (
          <div className="flex flex-col gap-3 pt-3 border-t mt-3">
            <div className="text-sm font-medium">Spell Notes</div>
            <RichTextDisplay
              content={character.spellData.spellNotes || "No spell notes"}
              className={
                !character.spellData.spellNotes
                  ? "text-muted-foreground text-center py-2 text-sm"
                  : "text-sm text-muted-foreground"
              }
              maxLines={5}
            />
          </div>
        )}

      </CardContent>
    </Card>
  )
}
