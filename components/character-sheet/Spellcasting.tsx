"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getTotalAdditionalSpells } from "@/lib/character-data"
import { getCombatColor, getClassFeatureColors } from "@/lib/color-mapping"
import { hasClassFeature, getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage, getFeatureCustomDescription, getFeatureMaxUses } from "@/lib/feature-usage-tracker"
import { calculateUsesFromFormula } from "@/lib/class-feature-templates"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"
import { loadClassFeatureSkills, loadClassData } from "@/lib/database"
import { useState, useEffect } from "react"

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
  onToggleFeatSpellSlot,
  hasSpellcastingAbilities,
  onUpdateFeatureUsage
}: SpellcastingProps) {
  const [classFeatureSkills, setClassFeatureSkills] = useState<ClassFeatureSkill[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)
  const [monkClassData, setMonkClassData] = useState<any>(null)
  const [barbarianClassData, setBarbarianClassData] = useState<any>(null)

  // Load class feature skills
  useEffect(() => {
    const loadFeatures = async () => {
      setIsLoadingFeatures(true)
      try {
        const { featureSkills } = await loadClassFeatureSkills(character)
        setClassFeatureSkills(featureSkills || [])
      } catch (error) {
        console.error('Error loading class feature skills:', error)
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
          console.error('Error loading monk class data:', error)
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
          console.error('Error loading barbarian class data:', error)
        }
      }
      loadBarbarianData()
    }
  }, [character.id, character.classes])

  // Show component for monks/barbarians (even without spellcasting) or characters with spellcasting abilities
  if (!isMonk(character) && !isBarbarian(character) && !hasSpellcastingAbilities(character)) {
    return null
  }

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
    // Determine which class this feature belongs to based on the feature ID and character's classes
    const getFeatureClassName = (featureId: string): string => {
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

    switch (featureId) {
      case 'genies-wrath':
        return {
          id: 'genies-wrath',
          version: 1,
          title: 'Genie\'s Wrath',
          subtitle: 'Add damage to one attack per turn',
          featureType: 'availability_toggle',
          enabledAtLevel: 1,
          enabledBySubclass: 'The Genie',
          className: className,
          config: {
            defaultAvailable: true,
            replenishOn: 'long_rest',
            displayStyle: 'badge',
            availableText: 'Available',
            usedText: 'Used'
          }
        }
      
      case 'elemental-gift':
        return {
          id: 'elemental-gift',
          version: 1,
          title: 'Elemental Gift',
          subtitle: 'Resistance and flight',
          featureType: 'slots',
          enabledAtLevel: 6,
          enabledBySubclass: 'The Genie',
          className: className,
          config: {
            usesFormula: 'proficiency_bonus',
            replenishOn: 'long_rest',
            displayStyle: 'circles'
          }
        }
      
      case 'song-of-rest':
        return {
          id: 'song-of-rest',
          version: 1,
          title: 'Song of Rest',
          subtitle: 'Enhanced short rest healing',
          featureType: 'availability_toggle',
          enabledAtLevel: 2,
          enabledBySubclass: null,
          className: className,
          config: {
            defaultAvailable: true,
            replenishOn: 'short_rest',
            displayStyle: 'badge',
            availableText: 'Available',
            usedText: 'Used'
          }
        }
      
      case 'bardic-inspiration':
        return {
          id: 'bardic-inspiration',
          version: 1,
          title: 'Bardic Inspiration',
          subtitle: 'Grant allies inspiration dice',
          featureType: 'slots',
          enabledAtLevel: 1,
          enabledBySubclass: null,
          className: className,
          config: {
            usesFormula: 'charisma_modifier',
            dieType: ['d6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd6', 'd8', 'd8', 'd8', 'd8', 'd10', 'd10', 'd10', 'd10', 'd12', 'd12', 'd12', 'd12'],
            replenishOn: 'short_rest',
            displayStyle: 'circles'
          }
        }
      
      case 'flash-of-genius':
        return {
          id: 'flash-of-genius',
          version: 1,
          title: 'Flash of Genius',
          subtitle: 'Add Intelligence modifier to checks',
          featureType: 'slots',
          enabledAtLevel: 7,
          enabledBySubclass: null,
          className: className,
          config: {
            usesFormula: 'intelligence_modifier',
            replenishOn: 'long_rest',
            displayStyle: 'checkboxes'
          }
        }
      
      case 'divine-sense':
        return {
          id: 'divine-sense',
          version: 1,
          title: 'Divine Sense',
          subtitle: 'Detect celestials, fiends, and undead',
          featureType: 'slots',
          enabledAtLevel: 1,
          enabledBySubclass: null,
          className: className,
          config: {
            usesFormula: '1 + charisma_modifier',
            replenishOn: 'long_rest',
            displayStyle: 'circles'
          }
        }
      
      case 'lay-on-hands':
        return {
          id: 'lay-on-hands',
          version: 1,
          title: 'Lay on Hands',
          subtitle: 'Healing pool',
          featureType: 'points_pool',
          enabledAtLevel: 1,
          enabledBySubclass: null,
          className: className,
          config: {
            totalFormula: 'level * 5',
            canSpendPartial: true,
            replenishOn: 'long_rest',
            displayStyle: 'input'
          }
        }
      
      case 'channel-divinity':
        return {
          id: 'channel-divinity',
          version: 1,
          title: 'Channel Divinity',
          subtitle: 'Sacred Oath features',
          featureType: 'slots',
          enabledAtLevel: 2,
          enabledBySubclass: null,
          className: className,
          config: {
            usesFormula: '1',
            replenishOn: 'short_rest',
            displayStyle: 'circles'
          }
        }
      
      default:
        console.log('🔍 Debug - Unknown feature ID:', featureId)
        return null
    }
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
        console.log('🔍 Debug - Correcting Song of Rest feature type from database:', feature.featureType, 'to availability_toggle')
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
        // Determine which class this feature belongs to based on the feature ID
        if (['song-of-rest', 'bardic-inspiration'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'bard')?.name || 'Bard'
        } else if (['genies-wrath', 'elemental-gift', 'mystic-arcanum', 'genies-vessel', 'limited-wish'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'warlock')?.name || 'Warlock'
        } else if (['flash-of-genius', 'infusions'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'artificer')?.name || 'Artificer'
        } else if (['divine-sense', 'lay-on-hands', 'channel-divinity', 'cleansing-touch'].includes(feature.id)) {
          feature.className = character.classes?.find(c => c.name.toLowerCase() === 'paladin')?.name || 'Paladin'
        } else {
          // Default to the first class if no match found
          feature.className = character.classes?.[0]?.name || character.class
        }
        console.log('🔍 Debug - Added className to feature from database:', feature.id, '->', feature.className)
      }
    })
    
    console.log('🔍 Debug - Initial classFeatureSkills:', classFeatureSkills?.length || 0)
    console.log('🔍 Debug - Character classFeatureSkillsUsage:', character.classFeatureSkillsUsage)
    console.log('🔍 Debug - Character classes:', character.classes?.map(c => ({ name: c.name, level: c.level, subclass: c.subclass })))
    console.log('🔍 Debug - Has bardic-inspiration in usage?', character.classFeatureSkillsUsage?.['bardic-inspiration'])
    
    // Add features from character's existing usage data that aren't already loaded
    // These features exist in usage data but not in the database class features
    if (character.classFeatureSkillsUsage) {
      Object.entries(character.classFeatureSkillsUsage).forEach(([featureId, usageData]: [string, any]) => {
        console.log('🔍 Debug - Processing usage data:', featureId, usageData)
        // Skip if already loaded from database
        if (allFeatures.some(f => f.id === featureId)) {
          console.log('🔍 Debug - Skipping', featureId, 'already loaded from database')
          return
        }
        
        // Create feature skill with proper configuration based on feature ID
        // Character usage data should only contain usage state, not feature configuration
        const featureSkill = createFeatureSkillFromId(featureId, usageData)
        
        if (featureSkill) {
          console.log('🔍 Debug - Adding feature from usage data:', featureSkill)
          allFeatures.push(featureSkill)
        }
      })
    }

    // Features are now loaded automatically from database via loadClassFeatureSkills
    // No need to manually add base class features


    // Group features by class
    const featuresByClass = new Map<string, ClassFeatureSkill[]>()
    
    console.log('🔍 Debug - Total features before filtering:', allFeatures.length)
    allFeatures.forEach(skill => {
      console.log('🔍 Debug - Processing feature:', skill.id, skill.title, skill.featureType)
      
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
      
      console.log('🔍 Debug - Should exclude', skill.id, ':', shouldExclude)
      if (shouldExclude) {
        console.log('🔍 Debug - Excluding feature:', skill.id)
        return
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
      
      console.log('🔍 Debug - Feature grouping:', {
        featureId: skill.id,
        featureTitle: skill.title,
        featureClassName: skill.className,
        assignedClassName: className,
        characterClasses: character.classes?.map(c => c.name)
      })

      if (!featuresByClass.has(className)) {
        featuresByClass.set(className, [])
      }
      featuresByClass.get(className)!.push(skill)
    })

    console.log('🔍 Debug - Final featuresByClass:', featuresByClass.size, 'classes')
    console.log('🔍 Debug - Features by class:', Array.from(featuresByClass.entries()))
    
    // Debug each feature's className assignment
    allFeatures.forEach(feature => {
      console.log('🔍 Debug - Feature className assignment:', {
        id: feature.id,
        title: feature.title,
        className: feature.className,
        characterClasses: character.classes?.map(c => c.name)
      })
    })
    
    if (allFeatures.length === 0 || featuresByClass.size === 0) {
      console.log('🔍 Debug - No features to render')
      return null
    }

    return Array.from(featuresByClass.entries())
      .filter(([className, features]) => features.length > 0) // Only show classes that have features
      .map(([className, features]) => (
      <div key={className} className="flex flex-col gap-2">
        <div className="text-sm font-medium">{className} Skills</div>
        {features.map((skill) => renderFeatureSkill(skill, className))}
      </div>
    ))
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

  // Render slots-based features
  const renderSlotsFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string, className?: string) => {
    if (!skill.id) return null
    
    // Calculate max uses using class-specific level for multiclassed characters
    const slotConfig = skill.config as any
    const maxUses = slotConfig?.usesFormula 
      ? calculateUsesFromFormula(slotConfig.usesFormula, character, skill.className)
      : getFeatureMaxUses(character, skill.id) || usage?.maxUses || 0
    const currentUses = usage?.currentUses || maxUses

    if (maxUses === 0) return null

    // Get class-specific colors
    const classColors = className ? getClassFeatureColors(className) : {
      available: getCombatColor('spellSlotAvailable'),
      used: getCombatColor('spellSlotUsed')
    }

    return (
      <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
        <div className="flex gap-1 flex-col">
          <span className="text-sm font-medium">{skill.title}</span>
          <span className="text-xs text-muted-foreground">
            {customDescription || skill.subtitle || skill.customDescription}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxUses }, (_, i) => {
            const isAvailable = i < currentUses
            return (
              <button
                key={i}
                onClick={() => {
                  if (onUpdateFeatureUsage && skill.id) {
                    onUpdateFeatureUsage(skill.id, { 
                      type: isAvailable ? 'use_slot' : 'restore_slot', 
                      amount: 1 
                    })
                  }
                }}
                className={`w-4 h-4 rounded border-2 transition-colors ${
                  isAvailable
                    ? `${classColors.available} cursor-pointer`
                    : `${classColors.used} hover:border-border/80 cursor-pointer`
                }`}
                title={isAvailable ? "Available" : "Used"}
              />
            )
          })}
          <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
            {currentUses}/{maxUses}
          </span>
        </div>
      </div>
    )
  }

  // Render points pool features
  const renderPointsPoolFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    // Calculate max points using class-specific level for multiclassed characters
    const pointsConfig = skill.config as any
    const maxPoints = pointsConfig?.totalFormula 
      ? calculateUsesFromFormula(pointsConfig.totalFormula, character, skill.className)
      : usage?.maxPoints || 0
    const currentPoints = usage?.currentPoints || maxPoints

    if (maxPoints === 0) return null

    return (
      <div className="flex items-center justify-between p-2 border rounded bg-background">
        <div className="flex gap-1 flex-col">
          <span className="text-sm font-medium">{skill.title}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {customDescription || skill.subtitle || skill.customDescription}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max={maxPoints}
            value={currentPoints}
            onChange={(e) => {
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
            className="w-16 px-2 py-1 text-sm border rounded text-center bg-card"
            title={`Remaining ${skill.title} points`}
          />
          <span className="text-sm text-muted-foreground">
            / {maxPoints}
          </span>
        </div>
      </div>
    )
  }

  // Render availability toggle features
  const renderAvailabilityToggleFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    if (!skill.id) return null
    
    const available = usage?.isAvailable ?? true

    return (
      <div 
        className="p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors bg-background" 
        onClick={() => {
          if (onUpdateFeatureUsage && skill.id) {
            onUpdateFeatureUsage(skill.id, { 
              type: 'toggle_availability'
            })
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm flex flex-col gap-1">
            <span className="font-medium">{skill.title}</span>
            <span className="text-xs text-muted-foreground">
              {customDescription || skill.subtitle || skill.customDescription}
            </span>
          </span>
          <Badge variant={available ? "default" : "secondary"}>
            {available ? "Available" : "Used"}
          </Badge>
        </div>
      </div>
    )
  }

  // Render options list features (simplified display)
  const renderOptionsListFeature = (skill: ClassFeatureSkill, usage: any, customDescription: string) => {
    const selectedOptions = usage?.selectedOptions || []
    const maxSelections = usage?.maxSelections || 0

    if (maxSelections === 0) return null

    return (
      <div className="p-2 border rounded bg-background">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-col">
            <span className="text-sm font-medium">{skill.title}</span>
            <span className="text-xs text-muted-foreground">
              {customDescription || skill.subtitle || skill.customDescription}
            </span>
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
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 items-start">
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spell Attack</div>
              <div className="text-xl font-bold font-mono">
                {formatModifier(character.spellData.spellAttackBonus)}
              </div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spell Save DC</div>
              <div className="text-xl font-bold font-mono">{character.spellData.spellSaveDC}</div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Cantrips</div>
              <div className="text-xl font-bold font-mono">{character.spellData.cantripsKnown}</div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spells</div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-xl font-bold font-mono">{character.spellData.spellsKnown}</div>
                {getTotalAdditionalSpells(character) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{getTotalAdditionalSpells(character)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button className="w-full" variant="outline" size="sm" onClick={onOpenSpellList}>
            <Icon icon="lucide:book-open" className="w-4 h-4" />
            Spell List
          </Button>
          </div>
        )}

        {/* Unified Class Features */}
        {renderUnifiedClassFeatures()}


        {/* Spell Slots */}
        {hasSpellcastingAbilities(character) && character.spellData.spellSlots && character.spellData.spellSlots.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Spell Slots</div>
            <div className="grid grid-cols-1 gap-2">
              {character.spellData.spellSlots.map((slot) => (
                <div key={slot.level} className="p-2 border rounded flex items-center justify-between bg-background">
                  <div className="text-sm font-medium mb-1">
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
                          onClick={() => onToggleSpellSlot(slot.level, i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('spellSlotAvailable')} cursor-pointer`
                              : `${getCombatColor('spellSlotUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-2">
                      {slot.total - slot.used}/{slot.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feat Spell Slots */}
        {character.spellData.featSpellSlots && character.spellData.featSpellSlots.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Feat Spell Slots</div>
            <div className="flex flex-col gap-2">
              {character.spellData.featSpellSlots.map((featSlot, featIndex) => (
                <div key={featIndex} className="p-2 border rounded bg-background">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium mb-1">{featSlot.spellName || `Feat ${featIndex + 1}`}</div>
                    <div className="flex items-center gap-1">
                    {Array.from({ length: featSlot.usesPerLongRest }, (_, i) => {
                      const isAvailable = i < (featSlot.usesPerLongRest - featSlot.currentUses)
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleFeatSpellSlot(featIndex, i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('featSpellSlotAvailable')} cursor-pointer`
                              : `${getCombatColor('featSpellSlotUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-2">
                      {featSlot.usesPerLongRest - featSlot.currentUses}/{featSlot.usesPerLongRest}
                    </span>
                  </div>
                  </div>
                  <div className="text-xs text-muted-foreground">From {featSlot.featName}</div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Spell Notes */}
        {character.spellData.spellNotes && character.spellData.spellNotes.trim() !== "" && (
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium">Spell Notes</div>
            <RichTextDisplay
              content={character.spellData.spellNotes || "No spell notes"}
              className={
                !character.spellData.spellNotes
                  ? "text-muted-foreground text-center py-2 text-sm"
                  : "text-sm"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
