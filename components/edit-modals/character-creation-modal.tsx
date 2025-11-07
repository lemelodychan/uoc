"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Icon } from "@iconify/react"
import { loadAllClasses, loadAllRaces, loadRaceDetails, loadClassesWithDetails, loadClassFeatures, loadBackgroundsWithDetails, loadBackgroundDetails, type BackgroundData } from "@/lib/database"
import { useUser } from "@/lib/user-context"
import type { CharacterData } from "@/lib/character-data"
import { createDefaultSkills, calculateModifier, calculateSkillBonus, createClassBasedSavingThrowProficiencies, createDefaultSavingThrowProficiencies, calculateProficiencyBonus, getMulticlassEquipmentProficiencies } from "@/lib/character-data"
import type { RaceData } from "@/lib/database"
import type { ClassData } from "@/lib/class-utils"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { FeatEditModal } from "./feat-edit-modal"
import { SKILL_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import { getAbilityModifierColor } from "@/lib/color-mapping"

interface ClassOption {
  id: string
  name: string
  subclass: string
}

interface CharacterCreationData {
  name: string
  class: string // Legacy field for backward compatibility
  subclass: string // Legacy field
  classId: string // Legacy field
  level: number
  classes?: Array<{name: string, subclass?: string, class_id?: string, level: number, selectedSkillProficiencies?: string[]}> // Multiclass support
  background: string
  backgroundId?: string // New field for background ID
  backgroundData?: {
    defining_events?: Array<{ number: number; text: string }>
    personality_traits?: Array<{ number: number; text: string }>
    ideals?: Array<{ number: number; text: string }>
    bonds?: Array<{ number: number; text: string }>
    flaws?: Array<{ number: number; text: string }>
  }
  race: string // Legacy field
  raceIds?: Array<{id: string, isMain: boolean}> // Array of up to 2 race objects with main status
  alignment: string
  isNPC?: boolean
  campaignId?: string
  selectedFeatures?: string[] // Selected class feature IDs
  // Character stats
  abilityScores?: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  skills?: Array<{name: string, ability: string, proficiency: 'none' | 'proficient' | 'expertise'}>
  savingThrowProficiencies?: Array<{ability: string, proficient: boolean}>
  maxHitPoints?: number
  currentHitPoints?: number
  speed?: number
  armorClass?: number
  initiative?: number
  features?: Array<{name: string, description: string, usesPerLongRest?: number | string, currentUses?: number, refuelingDie?: string}>
  imageUrl?: string
  feats?: Array<{name: string, description: string}>
  languages?: string
  toolsProficiencies?: Array<{name: string, proficiency: 'none' | 'proficient' | 'expertise'}>
  equipment?: string
  money?: { gold: number; silver: number; copper: number }
  equipmentProficiencies?: {
    lightArmor: boolean
    mediumArmor: boolean
    heavyArmor: boolean
    shields: boolean
    simpleWeapons: boolean
    martialWeapons: boolean
    firearms: boolean
    handCrossbows: boolean
    longswords: boolean
    rapiers: boolean
    shortswords: boolean
    scimitars: boolean
    lightCrossbows: boolean
    darts: boolean
    slings: boolean
    quarterstaffs: boolean
  }
}

interface CharacterCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCharacter: (characterData: CharacterCreationData) => void
  currentUserId?: string
  dungeonMasterId?: string
  campaignId?: string
}

interface AbilityScoreChoice {
  ability: string
  increase: number
}

interface SelectedProficiencies {
  skills: string[]
  equipment: string[]
  tools: string[]
}

export function CharacterCreationModal({ isOpen, onClose, onCreateCharacter, currentUserId, dungeonMasterId, campaignId }: CharacterCreationModalProps) {
  const { isSuperadmin } = useUser()
  
  // Step management
  const [step, setStep] = useState<'basic_info' | 'race_selection' | 'background_selection' | 'class_selection' | 'class_features' | 'hp_roll' | 'summary'>('basic_info')
  
  // Point buy system constants (defined early so they're accessible throughout)
  const POINT_BUY_TOTAL = 27
  const POINT_BUY_BASE = 8
  const POINT_BUY_MIN = 8
  const POINT_BUY_MAX = 15
  
  // Basic info
  const [name, setName] = useState("")
  const [raceIds, setRaceIds] = useState<Array<{id: string, isMain: boolean}>>([])
  const [mainRaceData, setMainRaceData] = useState<RaceData | null>(null)
  const [lastMainRaceId, setLastMainRaceId] = useState<string | null>(null)
  const [abilityScoreChoices, setAbilityScoreChoices] = useState<AbilityScoreChoice[]>([])
  const [selectedASIPattern, setSelectedASIPattern] = useState<string | null>(null)
  const [selectedProficiencies, setSelectedProficiencies] = useState<SelectedProficiencies>({ skills: [], equipment: [], tools: [] })
  // Track all choice feature selections (generic for any choice feature)
  const [raceChoiceSelections, setRaceChoiceSelections] = useState<Map<string, {
    optionName: string
    option: any
    selectedSkills?: string[] // For Skill Versatility option
  }>>(new Map())
  // Keep Half-Elf Versatility for backward compatibility (but also store in raceChoiceSelections)
  const [halfElfVersatilityChoice, setHalfElfVersatilityChoice] = useState<{
    optionName: string
    option: any
    selectedSkills?: string[] // For Skill Versatility option
  } | null>(null)
  const [customLineageChoices, setCustomLineageChoices] = useState<{
    size?: 'Small' | 'Medium'
    feat?: { name: string; description: string } | null
    variableTrait?: 'darkvision' | 'skill_proficiency' | null
    selectedSkill?: string | null // For skill proficiency option
    selectedLanguage?: string | null
  } | null>(null)
  // Track tool proficiency choices for choice-based tool features
  const [toolProficiencyChoices, setToolProficiencyChoices] = useState<Map<string, string[]>>(new Map())
  const [background, setBackground] = useState("")
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null)
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<BackgroundData | null>(null)
  const [backgroundSkillChoices, setBackgroundSkillChoices] = useState<string[]>([]) // Selected skills when background has choice
  const [backgroundToolChoices, setBackgroundToolChoices] = useState<string[]>([]) // Selected tools when background has choice
  const [backgroundLanguageChoices, setBackgroundLanguageChoices] = useState<string[]>([]) // Selected languages when background has choice
  // Track selected/rolled items for numbered arrays
  const [backgroundDefiningEvents, setBackgroundDefiningEvents] = useState<Array<{ number: number; text: string }>>([])
  const [backgroundPersonalityTraits, setBackgroundPersonalityTraits] = useState<Array<{ number: number; text: string }>>([])
  const [backgroundIdeals, setBackgroundIdeals] = useState<Array<{ number: number; text: string }>>([])
  const [backgroundBonds, setBackgroundBonds] = useState<Array<{ number: number; text: string }>>([])
  const [backgroundFlaws, setBackgroundFlaws] = useState<Array<{ number: number; text: string }>>([])
  const [alignment, setAlignment] = useState("True Neutral")
  const [isNPC, setIsNPC] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  
  // Class selection (multiclass support)
  const [characterClasses, setCharacterClasses] = useState<Array<{
    name: string
    subclass?: string
    class_id?: string
    level: number
    selectedSkillProficiencies?: string[] // Selected skill proficiencies for this class
  }>>([])
  // Store full class data for each class (for skill proficiencies, saving throws, etc.)
  const [classDataMap, setClassDataMap] = useState<Map<string, ClassData>>(new Map())
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedSubclass, setSelectedSubclass] = useState<string>("")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [newClassLevel, setNewClassLevel] = useState<number>(1)
  const [level, setLevel] = useState(1) // Total level across all classes
  
  // HP Roll
  const [hpRollResult, setHpRollResult] = useState<{
    roll: number
    constitutionModifier: number
    total: number
    classRolls?: Array<{className: string, level: number, roll: number, hp: number}>
  } | null>(null)
  
  // ASI Choices per feature (since there can be multiple ASI features in multiclass)
  const [asiChoices, setAsiChoices] = useState<Map<string, {
    type: 'ability_scores' | 'feat'
    abilityScores?: {
      first: string
      second: string
    }
    feat?: {
      name: string
      description: string
    } | null
  }>>(new Map())
  const [featEditModalOpen, setFeatEditModalOpen] = useState(false)
  const [editingFeatIndex, setEditingFeatIndex] = useState<number | null>(null)
  const [editingFeatForFeatureId, setEditingFeatForFeatureId] = useState<string | null>(null)
  const [needsASI, setNeedsASI] = useState(false)
  const [isLoadingASI, setIsLoadingASI] = useState(false)
  
  // Class features
  const [classFeatures, setClassFeatures] = useState<Array<{
    id: string
    class_id: string
    level: number
    title: string
    description: string
    feature_type: string
    name: string
    source: string
    className: string
  }>>([])
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)
  
  // Character preview (editable character for sidebar)
  const [editableCharacter, setEditableCharacter] = useState<Partial<CharacterData>>({
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
    speed: 30,
    skills: createDefaultSkills(),
    savingThrowProficiencies: [],
    toolsProficiencies: [],
    equipmentProficiencies: {
      lightArmor: false,
      mediumArmor: false,
      heavyArmor: false,
      shields: false,
      simpleWeapons: false,
      martialWeapons: false,
      firearms: false,
      handCrossbows: false,
      longswords: false,
      rapiers: false,
      shortswords: false,
      scimitars: false,
      lightCrossbows: false,
      darts: false,
      slings: false,
      quarterstaffs: false,
    },
    languages: "",
    maxHitPoints: 8,
    currentHitPoints: 8,
  })
  
  // Data loading
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesData, setClassesData] = useState<Array<{id: string, name: string, subclass: string | null, subclass_selection_level?: number}>>([])
  const [races, setRaces] = useState<Array<{id: string, name: string}>>([])
  const [backgrounds, setBackgrounds] = useState<Array<{id: string, name: string}>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingRaceDetails, setLoadingRaceDetails] = useState(false)
  const [loadingBackgroundDetails, setLoadingBackgroundDetails] = useState(false)

  // Reset all state when modal opens/closes
  const resetAllState = () => {
    setStep('basic_info')
    setName("")
    setRaceIds([])
    setMainRaceData(null)
    setLastMainRaceId(null)
    setAbilityScoreChoices([])
    setSelectedASIPattern(null)
    setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
    setHalfElfVersatilityChoice(null)
    setCustomLineageChoices(null)
    setBackground("")
    setSelectedBackgroundId(null)
    setSelectedBackgroundData(null)
    setBackgroundSkillChoices([])
    setBackgroundToolChoices([])
    setBackgroundLanguageChoices([])
    setBackgroundDefiningEvents([])
    setBackgroundPersonalityTraits([])
    setBackgroundIdeals([])
    setBackgroundBonds([])
    setBackgroundFlaws([])
    setAlignment("True Neutral")
    setIsNPC(false)
    setCharacterClasses([])
    setSelectedClass("")
    setSelectedSubclass("")
    setSelectedClassId("")
    setNewClassLevel(1)
    setLevel(1)
    setHpRollResult(null)
    setAsiChoices(new Map())
    setNeedsASI(false)
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
    setClassFeatures([])
    setSelectedFeatures(new Set())
    setIsLoadingFeatures(false)
    setEditableCharacter({
      strength: 8,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
      speed: 30,
      skills: createDefaultSkills(),
      savingThrowProficiencies: [],
      toolsProficiencies: [],
      equipmentProficiencies: {
        lightArmor: false,
        mediumArmor: false,
        heavyArmor: false,
        shields: false,
        simpleWeapons: false,
        martialWeapons: false,
        firearms: false,
        handCrossbows: false,
        longswords: false,
        rapiers: false,
        shortswords: false,
        scimitars: false,
        lightCrossbows: false,
        darts: false,
        slings: false,
        quarterstaffs: false,
      },
      languages: "",
      maxHitPoints: 8,
      currentHitPoints: 8,
    })
    setError(null)
  }

  useEffect(() => {
    if (isOpen) {
      resetAllState()
      loadClasses()
      loadRaces()
      loadBackgrounds()
    }
  }, [isOpen])

  // Sync campaignId when it changes
  useEffect(() => {
    // Campaign ID is handled in onCreateCharacter
  }, [campaignId])

  // Ensure first race is always main, second race is always not main
  useEffect(() => {
    if (raceIds.length > 0) {
      const needsUpdate = 
        (raceIds[0] && !raceIds[0].isMain) || 
        (raceIds[1] && raceIds[1].isMain)
      
      if (needsUpdate) {
        const updated = raceIds.map((r, i) => ({
          ...r,
          isMain: i === 0 // First race is always main, second is always not main
        }))
        setRaceIds(updated)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceIds.length, raceIds[0]?.id, raceIds[1]?.id, raceIds[0]?.isMain, raceIds[1]?.isMain])

  // Load main race details when first race changes (first race is always main)
  // Only depend on raceIds[0]?.id to avoid reloading when secondary race changes
  useEffect(() => {
    const mainRace = raceIds[0] // First race is always main
    if (mainRace?.id) {
      loadMainRaceDetails(mainRace.id)
    } else {
      setMainRaceData(null)
      setAbilityScoreChoices([])
      setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceIds[0]?.id])

  // Store previous race data to properly revert modifications
  const previousRaceDataRef = useRef<RaceData | null>(null)

  // Apply ability score increases and proficiencies when main race ID changes (not when data object changes)
  useEffect(() => {
    if (mainRaceData && mainRaceData.id !== lastMainRaceId) {
      // Only apply modifications when the main race ID actually changes
      setLastMainRaceId(mainRaceData.id)
      
      // SIMPLE APPROACH: Reset all ability scores to base (8) when switching races
      // This ensures we start fresh and don't have any stacking issues
      setEditableCharacter(prev => ({
        ...prev,
        strength: POINT_BUY_BASE,
        dexterity: POINT_BUY_BASE,
        constitution: POINT_BUY_BASE,
        intelligence: POINT_BUY_BASE,
        wisdom: POINT_BUY_BASE,
        charisma: POINT_BUY_BASE,
      }))
      
      // Reset all race-related state
      setAbilityScoreChoices([])
      setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
      setToolProficiencyChoices(new Map())
      setRaceChoiceSelections(new Map())
      setHalfElfVersatilityChoice(null)
      
      // Also revert proficiencies - preserve only class skills
      setEditableCharacter(prev => {
        const classSkillProficiencies = new Set<string>()
        characterClasses.forEach(charClass => {
          if (charClass.selectedSkillProficiencies) {
            charClass.selectedSkillProficiencies.forEach(skill => {
              classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
            })
          }
          const classData = classDataMap.get(charClass.name)
          if (classData?.skill_proficiencies) {
            if (Array.isArray(classData.skill_proficiencies)) {
              classData.skill_proficiencies.forEach((skill: any) => {
                if (typeof skill === 'string') {
                  classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
                } else if (skill.name) {
                  classSkillProficiencies.add(skill.name.toLowerCase().replace(/\s+/g, '_'))
                }
              })
            }
          }
        })
        
        // Reset all skills to non-proficient, except class skills
        const updatedSkills = prev.skills?.map(skill => {
          const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
          const isClassSkill = classSkillProficiencies.has(skillInDbFormat)
          return { ...skill, proficiency: isClassSkill ? skill.proficiency : 'none' as const }
        }) || createDefaultSkills()
        
        // Reset equipment proficiencies
        const defaultEquipment = {
          lightArmor: false,
          mediumArmor: false,
          heavyArmor: false,
          shields: false,
          simpleWeapons: false,
          martialWeapons: false,
          firearms: false,
          handCrossbows: false,
          longswords: false,
          rapiers: false,
          shortswords: false,
          scimitars: false,
          lightCrossbows: false,
          darts: false,
          slings: false,
          quarterstaffs: false,
        }
        
        // Reset tools
        const updatedTools: any[] = []
        
        // Reset speed to default
        return {
          ...prev,
          skills: updatedSkills,
          equipmentProficiencies: defaultEquipment,
          toolsProficiencies: updatedTools,
          speed: 30,
        }
      })
      
      // Use setTimeout to ensure state updates complete before applying new race
      setTimeout(() => {
        // Then apply new race modifications
        applyRaceModifications(mainRaceData)
      }, 0)
      
      // Store current race as previous for next time
      previousRaceDataRef.current = mainRaceData
      
      // Reset Custom Lineage choices if race is not Custom Lineage
      if (mainRaceData.name !== 'Custom Lineage') {
        // Revert Custom Lineage skill proficiency if it exists
        if (customLineageChoices?.selectedSkill) {
          const skillInDbFormat = customLineageChoices.selectedSkill.toLowerCase().replace(/\s+/g, '_')
          setSelectedProficiencies(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skillInDbFormat)
          }))
          // Remove proficiency from editableCharacter skills (only if not from class)
          setEditableCharacter(prev => ({
            ...prev,
            skills: prev.skills?.map(skill => {
              const skillNameInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
              if (skillNameInDbFormat === skillInDbFormat) {
                const isClassSkill = characterClasses.some(charClass => 
                  charClass.selectedSkillProficiencies?.some(s => 
                    s.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat
                  )
                )
                if (!isClassSkill) {
                  return { ...skill, proficiency: 'none' as const }
                }
              }
              return skill
            }) || []
          }))
        }
        // Clear Custom Lineage feat from editableCharacter if it exists
        if (customLineageChoices?.feat) {
          setEditableCharacter(prev => ({
            ...prev,
            feats: prev.feats?.filter(f => f.name !== customLineageChoices?.feat?.name) || []
          }))
        }
        setCustomLineageChoices(null)
      }
    } else if (!mainRaceData) {
      // Reset all ability scores to base when clearing race selection
      setEditableCharacter(prev => ({
        ...prev,
        strength: POINT_BUY_BASE,
        dexterity: POINT_BUY_BASE,
        constitution: POINT_BUY_BASE,
        intelligence: POINT_BUY_BASE,
        wisdom: POINT_BUY_BASE,
        charisma: POINT_BUY_BASE,
      }))
      
      setLastMainRaceId(null)
      setAbilityScoreChoices([])
      setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
      setToolProficiencyChoices(new Map())
      setRaceChoiceSelections(new Map())
      setHalfElfVersatilityChoice(null)
      previousRaceDataRef.current = null
      // Clear Custom Lineage choices and revert related changes
      if (customLineageChoices) {
        // Revert Custom Lineage skill proficiency if it exists
        if (customLineageChoices.selectedSkill) {
          const skillInDbFormat = customLineageChoices.selectedSkill.toLowerCase().replace(/\s+/g, '_')
          setSelectedProficiencies(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skillInDbFormat)
          }))
          // Remove proficiency from editableCharacter skills (only if not from class)
          setEditableCharacter(prev => ({
            ...prev,
            skills: prev.skills?.map(skill => {
              const skillNameInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
              if (skillNameInDbFormat === skillInDbFormat) {
                const isClassSkill = characterClasses.some(charClass => 
                  charClass.selectedSkillProficiencies?.some(s => 
                    s.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat
                  )
                )
                if (!isClassSkill) {
                  return { ...skill, proficiency: 'none' as const }
                }
              }
              return skill
            }) || []
          }))
        }
        // Clear Custom Lineage feat from editableCharacter if it exists
        if (customLineageChoices.feat) {
          setEditableCharacter(prev => ({
            ...prev,
            feats: prev.feats?.filter(f => f.name !== customLineageChoices?.feat?.name) || []
          }))
        }
      }
      setCustomLineageChoices(null)
    } else {
      // Race data exists but ID hasn't changed - just handle race-specific choice checks
      if (mainRaceData.name !== 'Half-Elf') {
        setHalfElfVersatilityChoice(null)
      }
      if (mainRaceData.name !== 'Custom Lineage') {
        setCustomLineageChoices(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainRaceData?.id])

  // Initialize with one empty class when entering class_selection step
  useEffect(() => {
    if (step === 'class_selection' && characterClasses.length === 0) {
      setCharacterClasses([{
        name: "",
        level: 1,
        class_id: undefined,
        subclass: undefined,
        selectedSkillProficiencies: []
      }])
      setLevel(1)
    }
  }, [step])

  // Load class features when entering class_features step or when classes/levels change
  useEffect(() => {
    if (step === 'class_features' && characterClasses.length > 0) {
      loadAllClassFeatures()
      // Check for ASI if not already checked
      if (!needsASI && characterClasses.length > 0) {
        const firstClass = characterClasses[0]
        if (firstClass.class_id && level) {
          checkForASI()
        }
      }
    }
  }, [step, characterClasses, level]) // Added level to dependencies to ensure reload when levels change

  const loadAllClassFeatures = async () => {
    if (characterClasses.length === 0) return
    
    setIsLoadingFeatures(true)
    try {
      const allFeatures: any[] = []
      
      for (const charClass of characterClasses) {
        // Get the base class_id (where subclass IS NULL) - loadClassFeatures needs this
        // It will handle loading subclass features when subclass name is provided
        const { loadClassData } = await import('@/lib/database')
        const { classData: baseClassData } = await loadClassData(charClass.name)
        
        if (baseClassData?.id) {
          console.log(`Loading features for ${charClass.name} level ${charClass.level} (base_class_id: ${baseClassData.id}, subclass: ${charClass.subclass || 'none'})`)
          
          // CRITICAL: Always pass includeHidden=true to ensure ASI features are included
          // ASI features are marked as hidden in the database but must be available during character creation
          // Pass base class_id - loadClassFeatures will handle loading subclass features if subclass is provided
          const { features, error: loadError } = await loadClassFeatures(
            baseClassData.id, 
            charClass.level, 
            charClass.subclass,
            true // includeHidden = true to include ASI features during character creation
          )
          
          if (loadError) {
            console.error(`Error loading features for ${charClass.name}:`, loadError)
          }
          
          if (features) {
            console.log(`Loaded ${features.length} features for ${charClass.name} level ${charClass.level}`)
            console.log('Feature titles:', features.map(f => `${f.title || f.name} (Level ${f.level}, Hidden: ${(f as any).is_hidden ?? 'unknown'})`))
            
            // Filter features to only include those for the selected subclass (or base class features if no subclass)
            // loadClassFeatures loads base class features and subclass features when subclass is provided
            // We need to filter to only show:
            // 1. Base class features (source === 'Class')
            // 2. Features that belong to the selected subclass
            const filteredFeatures = features.filter((feature: any) => {
              const featureSource = (feature.source || '').toLowerCase().trim()
              const featureType = (feature.feature_type || '').toLowerCase().trim()
              
              // Base class features: source is 'Class' or feature_type is not 'subclass'
              const isBaseClassFeature = featureSource === 'class' || (featureType !== 'subclass' && featureSource !== 'subclass')
              
              // If no subclass is selected, only show base class features
              if (!charClass.subclass) {
                return isBaseClassFeature
              }
              
              // If subclass is selected, show:
              // 1. Base class features (always show these)
              if (isBaseClassFeature) {
                return true
              }
              
              // 2. Features that belong to the selected subclass
              // When loadClassFeatures is called with a subclass name, it loads subclass features
              // where class_id = subclass's class_id. We need to get the subclass's class_id to match.
              const isSubclassFeature = featureSource === 'subclass' || featureType === 'subclass'
              if (isSubclassFeature) {
                // Get the subclass's class_id to match against
                // charClass.class_id should be the subclass's class_id when a subclass is selected
                const selectedSubclassClassId = charClass.class_id
                
                // Check if this feature belongs to the selected subclass
                // The feature's class_id should match the selected subclass's class_id
                const matchesSubclass = feature.class_id === selectedSubclassClassId || 
                                       feature.subclass_id === selectedSubclassClassId
                
                if (!matchesSubclass) {
                  console.log(`Filtering out subclass feature: ${feature.title || feature.name}`, {
                    feature_class_id: feature.class_id,
                    feature_subclass_id: feature.subclass_id,
                    selected_subclass_class_id: selectedSubclassClassId,
                    selected_subclass_name: charClass.subclass
                  })
                }
                
                return matchesSubclass
              }
              
              // Exclude everything else
              return false
            })
            
            // Debug: Log feature sources to help diagnose filtering issues
            if (filteredFeatures.length === 0 && features.length > 0) {
              console.warn(`⚠️ All features filtered out for ${charClass.name}${charClass.subclass ? ` (${charClass.subclass})` : ''}`)
              console.log('Feature sources:', features.map((f: any) => ({
                title: f.title || f.name,
                source: f.source || '(no source)',
                level: f.level
              })))
              console.log(`Looking for subclass: "${charClass.subclass}" (normalized: "${charClass.subclass ? (charClass.subclass || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/^(the|a|an)\s+/i, '') : 'N/A'}")`)
            }
            
            console.log(`Filtered to ${filteredFeatures.length} features for ${charClass.name}${charClass.subclass ? ` (${charClass.subclass})` : ''} level ${charClass.level}`)
            
            // loadClassFeatures with includeHidden=true already includes hidden features (like ASI)
            // Filtered to only show features for the selected subclass
            allFeatures.push(...filteredFeatures)
          } else {
            console.warn(`No features returned for ${charClass.name} level ${charClass.level}`)
          }
        } else {
          console.warn(`No class_id for ${charClass.name}, skipping feature load`)
        }
      }
      
      // Verify ASI features are present for debugging
      const asiFeaturesFound = allFeatures.filter(f => isASIFeature(f))
      console.log(`Total features loaded: ${allFeatures.length}`)
      console.log(`ASI features found: ${asiFeaturesFound.length}`, asiFeaturesFound.map(f => ({
        title: f.title || f.name,
        level: f.level,
        is_hidden: (f as any).is_hidden,
        class_id: f.class_id
      })))
      
      if (asiFeaturesFound.length > 0) {
        console.log(`✅ Loaded ${asiFeaturesFound.length} ASI feature(s) for character creation:`, 
          asiFeaturesFound.map(f => `${f.name || f.title} (Level ${f.level})`))
      } else {
        // Check if we should have ASI features
        const shouldHaveASI = characterClasses.some(c => [4, 8, 12, 16, 19].includes(c.level))
        if (shouldHaveASI) {
          console.warn(`⚠️ No ASI features found but character should have ASI at level(s):`, 
            characterClasses.filter(c => [4, 8, 12, 16, 19].includes(c.level)).map(c => `${c.name} level ${c.level}`))
        }
      }
      
      setClassFeatures(allFeatures)
      // Auto-select all features by default (including ASI features)
      const featureIds = allFeatures.map(f => f.id)
      setSelectedFeatures(new Set(featureIds))
      
      // Auto-initialize ASI choices for ASI features
      const newAsiChoices = new Map(asiChoices)
      allFeatures.forEach(feature => {
        if (isASIFeature(feature) && !newAsiChoices.has(feature.id)) {
          newAsiChoices.set(feature.id, {
            type: 'ability_scores',
            abilityScores: { first: '', second: '' },
            feat: null
          })
        }
      })
      setAsiChoices(newAsiChoices)
    } catch (error) {
      console.error('Error loading class features:', error)
      setError('Failed to load class features')
    } finally {
      setIsLoadingFeatures(false)
    }
  }

  const loadClasses = async () => {
    setLoading(true)
    setError(null)
    try {
      const { classes: loadedClasses, error: loadError } = await loadAllClasses()
      if (loadError) {
        setError(loadError)
      } else {
        setClasses(loadedClasses || [])
        setClassesData(loadedClasses || [])
      }
      
      // Also load full class details with proficiencies
      const { classes: fullClassesData } = await loadClassesWithDetails()
      if (fullClassesData) {
        const newMap = new Map<string, ClassData>()
        fullClassesData.forEach(cls => {
          // Store by class name (base class only, no subclass)
          if (!cls.subclass) {
            newMap.set(cls.name, cls as unknown as ClassData)
          }
          // Also store by class_id for lookups
          newMap.set(cls.id, cls as unknown as ClassData)
        })
        setClassDataMap(newMap)
      }
    } catch (err) {
      setError("Failed to load classes")
    } finally {
      setLoading(false)
    }
  }

  const loadRaces = async () => {
    try {
      const { races: loadedRaces, error: loadError } = await loadAllRaces()
      if (loadError) {
        console.error("Error loading races:", loadError)
      } else {
        setRaces(loadedRaces || [])
      }
    } catch (err) {
      console.error("Failed to load races:", err)
    }
  }

  const loadBackgrounds = async () => {
    try {
      const { backgrounds: loadedBackgrounds, error: loadError } = await loadBackgroundsWithDetails()
      if (loadError) {
        console.error("Error loading backgrounds:", loadError)
      } else {
        setBackgrounds(loadedBackgrounds?.map(bg => ({ id: bg.id, name: bg.name })) || [])
      }
    } catch (err) {
      console.error("Failed to load backgrounds:", err)
    }
  }

  const loadSelectedBackgroundDetails = async (backgroundId: string) => {
    setLoadingBackgroundDetails(true)
    try {
      const { background, error: loadError } = await loadBackgroundDetails(backgroundId)
      if (loadError) {
        console.error("Error loading background details:", loadError)
        setSelectedBackgroundData(null)
      } else if (background) {
        setSelectedBackgroundData(background)
        setBackground(background.name)
        // Don't call applyBackgroundModifications here - let the useEffect handle it
        // This prevents duplicate application of equipment, money, and languages
      }
    } catch (err) {
      console.error("Failed to load background details:", err)
      setSelectedBackgroundData(null)
    } finally {
      setLoadingBackgroundDetails(false)
    }
  }

  const loadMainRaceDetails = async (raceId: string) => {
    setLoadingRaceDetails(true)
    try {
      const { race, error: loadError } = await loadRaceDetails(raceId)
      if (loadError) {
        console.error("Error loading race details:", loadError)
      } else if (race) {
        setMainRaceData(race)
      }
    } catch (err) {
      console.error("Failed to load race details:", err)
    } finally {
      setLoadingRaceDetails(false)
    }
  }

  // Helper function to calculate what bonuses a race would apply (without actually applying them)
  const calculateRaceBonuses = (race: RaceData, currentAbilityScoreChoices: AbilityScoreChoice[]): Record<string, number> => {
    const bonuses: Record<string, number> = {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    }
    
    if (!race.ability_score_increases) return bonuses
    
    const asi = race.ability_score_increases
    
    // Handle different ASI formats
    if (Array.isArray(asi)) {
      // Simple array format: [{"ability": "Dexterity", "increase": 2}]
      asi.forEach((item: any) => {
        const abilityKey = (item.ability || '').toLowerCase()
        if (abilityKey in bonuses) {
          bonuses[abilityKey] = (bonuses[abilityKey] || 0) + (item.increase || 0)
        }
      })
    } else if (asi.type === 'fixed_multi') {
      // Fixed multi-ability format: { type: 'fixed_multi', abilities: { strength: 1, dexterity: 1, ... } }
      const abilities = asi.abilities || {}
      Object.entries(abilities).forEach(([ability, increase]: [string, any]) => {
        const abilityKey = ability.toLowerCase()
        if (abilityKey in bonuses && increase > 0) {
          bonuses[abilityKey] = (bonuses[abilityKey] || 0) + (parseInt(increase) || 0)
        }
      })
    } else if (asi.type === 'custom') {
      // Custom pattern (e.g., Half-Elf)
      if (asi.fixed) {
        const abilityKey = (asi.fixed.ability || '').toLowerCase()
        if (abilityKey in bonuses) {
          bonuses[abilityKey] = (bonuses[abilityKey] || 0) + (asi.fixed.increase || 0)
        }
      }
      // Add bonuses from choices (user selections stored in abilityScoreChoices)
      if (currentAbilityScoreChoices) {
        currentAbilityScoreChoices.forEach(choice => {
          const abilityKey = choice.ability.toLowerCase()
          if (abilityKey in bonuses) {
            bonuses[abilityKey] = (bonuses[abilityKey] || 0) + (choice.increase || 0)
          }
        })
      }
    } else if (asi.type === 'choice') {
      // Choice-based ASI - bonuses are stored in abilityScoreChoices
      if (currentAbilityScoreChoices) {
        currentAbilityScoreChoices.forEach(choice => {
          const abilityKey = choice.ability.toLowerCase()
          if (abilityKey in bonuses) {
            bonuses[abilityKey] = (bonuses[abilityKey] || 0) + (choice.increase || 0)
          }
        })
      }
    }
    
    return bonuses
  }

  // Function to revert all modifications from a previous race
  const revertRaceModifications = (
    previousRace: RaceData,
    previousAbilityScoreChoices: AbilityScoreChoice[],
    previousSelectedProficiencies: SelectedProficiencies,
    previousToolProficiencyChoices: Map<string, string[]>,
    previousRaceChoiceSelections: Map<string, { optionName: string; option: any; selectedSkills?: string[] }>,
    previousHalfElfVersatilityChoice: { optionName: string; option: any; selectedSkills?: string[] } | null
  ) => {
    // Calculate what bonuses the previous race applied based on its data structure and PREVIOUS choices (not current)
    const previousRaceBonuses = calculateRaceBonuses(previousRace, previousAbilityScoreChoices)
    
    // Calculate base scores by removing all race bonuses
    const baseScores = {
      strength: Math.max(POINT_BUY_BASE, (editableCharacter.strength || POINT_BUY_BASE) - (previousRaceBonuses['strength'] || 0)),
      dexterity: Math.max(POINT_BUY_BASE, (editableCharacter.dexterity || POINT_BUY_BASE) - (previousRaceBonuses['dexterity'] || 0)),
      constitution: Math.max(POINT_BUY_BASE, (editableCharacter.constitution || POINT_BUY_BASE) - (previousRaceBonuses['constitution'] || 0)),
      intelligence: Math.max(POINT_BUY_BASE, (editableCharacter.intelligence || POINT_BUY_BASE) - (previousRaceBonuses['intelligence'] || 0)),
      wisdom: Math.max(POINT_BUY_BASE, (editableCharacter.wisdom || POINT_BUY_BASE) - (previousRaceBonuses['wisdom'] || 0)),
      charisma: Math.max(POINT_BUY_BASE, (editableCharacter.charisma || POINT_BUY_BASE) - (previousRaceBonuses['charisma'] || 0))
    }
    
    // Track skills that came from classes (to preserve them)
    const classSkillProficiencies = new Set<string>()
    characterClasses.forEach(charClass => {
      if (charClass.selectedSkillProficiencies) {
        charClass.selectedSkillProficiencies.forEach(skill => {
          classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
        })
      }
      const classData = classDataMap.get(charClass.name)
      if (classData?.skill_proficiencies) {
        if (Array.isArray(classData.skill_proficiencies)) {
          classData.skill_proficiencies.forEach((skill: any) => {
            if (typeof skill === 'string') {
              classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
            } else if (skill.name) {
              classSkillProficiencies.add(skill.name.toLowerCase().replace(/\s+/g, '_'))
            }
          })
        }
      }
    })
    
    // Collect all skills from previous race (including choice features) - use PREVIOUS state
    const previousRaceSkillSet = new Set<string>()
    previousSelectedProficiencies.skills.forEach(skill => previousRaceSkillSet.add(skill))
    
    // Also collect skills from choice feature selections (Half-Elf Versatility, etc.) - use PREVIOUS state
    previousRaceChoiceSelections.forEach((selection) => {
      if (selection.selectedSkills) {
        selection.selectedSkills.forEach(skill => previousRaceSkillSet.add(skill))
      }
    })
    if (previousHalfElfVersatilityChoice?.selectedSkills) {
      previousHalfElfVersatilityChoice.selectedSkills.forEach(skill => previousRaceSkillSet.add(skill))
    }
    
    // Revert all skills that came from the previous race (but preserve class skills)
    const updatedSkillsWithoutRace = editableCharacter.skills?.map(skill => {
      const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
      const wasRaceSkill = previousRaceSkillSet.has(skillInDbFormat)
      const isClassSkill = classSkillProficiencies.has(skillInDbFormat)
      
      // Remove proficiency if it came from race and not from class
      if (wasRaceSkill && !isClassSkill) {
        return { ...skill, proficiency: 'none' as const }
      }
      return skill
    }) || createDefaultSkills()
    
    // Collect all equipment from previous race (including choice features) - use PREVIOUS state
    const previousRaceEquipmentSet = new Set<string>()
    previousSelectedProficiencies.equipment.forEach(equip => previousRaceEquipmentSet.add(equip))
    
    // Also collect equipment from choice feature selections - use PREVIOUS state
    previousRaceChoiceSelections.forEach((selection) => {
      if (selection.option?.type === 'weapon_proficiency' && selection.option.weapons) {
        selection.option.weapons.forEach((weapon: string) => {
          const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
          previousRaceEquipmentSet.add(weaponKey)
        })
      }
    })
    if (previousHalfElfVersatilityChoice?.option?.type === 'weapon_proficiency' && previousHalfElfVersatilityChoice.option.weapons) {
      previousHalfElfVersatilityChoice.option.weapons.forEach((weapon: string) => {
        const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
        previousRaceEquipmentSet.add(weaponKey)
      })
    }
    
    // Revert all equipment proficiencies from previous race
    const updatedEquipmentProficiencies = editableCharacter.equipmentProficiencies ? {
      ...editableCharacter.equipmentProficiencies
    } : {
      lightArmor: false,
      mediumArmor: false,
      heavyArmor: false,
      shields: false,
      simpleWeapons: false,
      martialWeapons: false,
      firearms: false,
      handCrossbows: false,
      longswords: false,
      rapiers: false,
      shortswords: false,
      scimitars: false,
      lightCrossbows: false,
      darts: false,
      slings: false,
      quarterstaffs: false,
    }
    previousRaceEquipmentSet.forEach(weaponKey => {
      if (updatedEquipmentProficiencies && weaponKey in updatedEquipmentProficiencies) {
        (updatedEquipmentProficiencies as any)[weaponKey] = false
      }
    })
    
    // Collect all tools from previous race - use PREVIOUS state
    const previousRaceToolSet = new Set<string>()
    previousSelectedProficiencies.tools.forEach(tool => previousRaceToolSet.add(tool))
    previousToolProficiencyChoices.forEach((tools) => {
      tools.forEach(tool => previousRaceToolSet.add(tool))
    })
    
    // Revert all tool proficiencies from previous race
    const updatedToolsProficiencies = (editableCharacter.toolsProficiencies || []).filter(tool => {
      if (typeof tool === 'string') {
        return !previousRaceToolSet.has(tool)
      }
      return !previousRaceToolSet.has(tool.name)
    })
    
    // Revert speed bonuses from choice features - use PREVIOUS state
    let speedToRevert = 0
    previousRaceChoiceSelections.forEach((selection) => {
      if (selection.option?.type === 'trait' && selection.option.speed_bonus) {
        speedToRevert += selection.option.speed_bonus
      }
    })
    if (previousHalfElfVersatilityChoice?.option?.type === 'trait' && previousHalfElfVersatilityChoice.option.speed_bonus) {
      speedToRevert += previousHalfElfVersatilityChoice.option.speed_bonus
    }
    
    // Revert all modifications
    setEditableCharacter(prev => ({
      ...prev,
      ...baseScores,
      skills: updatedSkillsWithoutRace,
      equipmentProficiencies: updatedEquipmentProficiencies,
      toolsProficiencies: updatedToolsProficiencies,
      speed: Math.max(30, (prev.speed || 30) - speedToRevert) // Revert speed bonuses
    }))
    
    // Clear all race-related state
    setAbilityScoreChoices([])
    setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
    setToolProficiencyChoices(new Map())
  }

  const applyRaceModifications = (race: RaceData) => {
    // Always use POINT_BUY_BASE (8) as the base for ability scores
    // Don't rely on prev.strength which might have stale values from async state updates
    const baseScores = {
      strength: POINT_BUY_BASE,
      dexterity: POINT_BUY_BASE,
      constitution: POINT_BUY_BASE,
      intelligence: POINT_BUY_BASE,
      wisdom: POINT_BUY_BASE,
      charisma: POINT_BUY_BASE
    }
    
    // Apply ability score increases FIRST using the guaranteed base (8)
    if (race.ability_score_increases) {
      handleAbilityScoreIncreases(race.ability_score_increases, baseScores)
    }
    
    // Use functional update to get the latest state for applying proficiencies
    setEditableCharacter(prev => {
      // Track skills that came from classes (to preserve them)
      const classSkillProficiencies = new Set<string>()
      characterClasses.forEach(charClass => {
        if (charClass.selectedSkillProficiencies) {
          charClass.selectedSkillProficiencies.forEach(skill => {
            classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
          })
        }
        const classData = classDataMap.get(charClass.name)
        if (classData?.skill_proficiencies) {
          if (Array.isArray(classData.skill_proficiencies)) {
            classData.skill_proficiencies.forEach((skill: any) => {
              if (typeof skill === 'string') {
                classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
              } else if (skill.name) {
                classSkillProficiencies.add(skill.name.toLowerCase().replace(/\s+/g, '_'))
              }
            })
          }
        }
      })
      
      // Start with current skills (already reverted if this is a race change)
      const updatedSkillsWithoutRace = prev.skills || createDefaultSkills()
      
      // Start with current equipment proficiencies (already reverted if this is a race change)
      const updatedEquipmentProficiencies = prev.equipmentProficiencies || {
        lightArmor: false,
        mediumArmor: false,
        heavyArmor: false,
        shields: false,
        simpleWeapons: false,
        martialWeapons: false,
        firearms: false,
        handCrossbows: false,
        longswords: false,
        rapiers: false,
        shortswords: false,
        scimitars: false,
        lightCrossbows: false,
        darts: false,
        slings: false,
        quarterstaffs: false,
      }
      
      // Start with current tool proficiencies (already reverted if this is a race change)
      const updatedToolsProficiencies = prev.toolsProficiencies || []
      
      // Note: Ability scores are already updated by handleAbilityScoreIncreases above
      // We just need to handle proficiencies here
      
      // Apply features (skills, equipment, tools)
      const newProficiencies: SelectedProficiencies = { skills: [], equipment: [], tools: [] }
      
      if (race.features && Array.isArray(race.features)) {
        race.features.forEach((feature: any) => {
          if (feature.feature_type === 'skill_proficiency') {
            if (feature.feature_skill_type === 'choice' && feature.skill_options) {
              // Choice-based skill proficiency - don't auto-select, store options
              // Will be handled in UI
            } else if (Array.isArray(feature.skill_options) && feature.skill_options.length > 0) {
              // Fixed multiple skill proficiencies
              feature.skill_options.forEach((opt: string) => {
                const skillName = (opt || '').toLowerCase().replace(/\s+/g, '_')
                if (skillName) newProficiencies.skills.push(skillName)
              })
            } else if (feature.feature_skill_type) {
              // Fixed single skill proficiency (backward compatibility)
              const skillName = feature.feature_skill_type.toLowerCase().replace(/\s+/g, '_')
              newProficiencies.skills.push(skillName)
            }
          } else if (feature.feature_type === 'weapon_proficiency' && feature.weapons) {
            feature.weapons.forEach((weapon: string) => {
              const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
              newProficiencies.equipment.push(weaponKey)
            })
          } else if (feature.feature_type === 'tool_proficiency') {
            if (feature.tool_choice_type === 'choice' && feature.tool_options) {
              // Choice-based tool proficiency - don't auto-select, store options
              // Will be handled in UI
            } else if (feature.tools) {
              // Fixed tool proficiency
              feature.tools.forEach((tool: string) => {
                newProficiencies.tools.push(tool)
              })
            }
          }
        })
      }
      
      setSelectedProficiencies(newProficiencies)
      
      // Update editable character skills - add new race proficiencies
      const updatedSkills = prev.skills?.map((skill: any) => {
        const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
        if (newProficiencies.skills.includes(skillInDbFormat)) {
          return { ...skill, proficiency: 'proficient' as const }
        }
        return skill
      }) || createDefaultSkills()
      
      // Update equipment proficiencies - add new race proficiencies
      const updatedEquipmentProfs = {
        ...prev.equipmentProficiencies,
        ...Object.fromEntries(
          newProficiencies.equipment.map(key => [key, true])
        )
      } as any
      
      // Update tool proficiencies - add new race proficiencies
      const updatedToolsProfs = newProficiencies.tools.length > 0
        ? [
            ...(prev.toolsProficiencies || []),
            ...newProficiencies.tools.map(tool => typeof tool === 'string' ? { name: tool, proficiency: 'proficient' as const } : tool)
          ]
        : prev.toolsProficiencies || []
      
      // Apply speed
      const newSpeed = race.speed || prev.speed || 30
      
      return {
        ...prev,
        skills: updatedSkills,
        equipmentProficiencies: updatedEquipmentProfs,
        toolsProficiencies: updatedToolsProfs,
        speed: newSpeed
      }
    })
  }

  // Function to revert all modifications from a previous background
  const revertBackgroundModifications = (previousBackground: BackgroundData | null, previousSkillChoices: string[] = [], previousToolChoices: string[] = [], previousLanguageChoices: string[] = []) => {
    if (!previousBackground) return

    // Track skills that came from classes and race (to preserve them)
    const classSkillProficiencies = new Set<string>()
    characterClasses.forEach(charClass => {
      if (charClass.selectedSkillProficiencies) {
        charClass.selectedSkillProficiencies.forEach(skill => {
          classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
        })
      }
      const classData = classDataMap.get(charClass.name)
      if (classData?.skill_proficiencies) {
        if (Array.isArray(classData.skill_proficiencies)) {
          classData.skill_proficiencies.forEach((skill: any) => {
            if (typeof skill === 'string') {
              classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
            } else if (skill.name) {
              classSkillProficiencies.add(skill.name.toLowerCase().replace(/\s+/g, '_'))
            }
          })
        }
      }
    })

    // Collect race skills
    const raceSkillSet = new Set<string>()
    selectedProficiencies.skills.forEach(skill => raceSkillSet.add(skill))
    raceChoiceSelections.forEach((selection) => {
      if (selection.selectedSkills) {
        selection.selectedSkills.forEach(skill => raceSkillSet.add(skill))
      }
    })
    if (halfElfVersatilityChoice?.selectedSkills) {
      halfElfVersatilityChoice.selectedSkills.forEach(skill => raceSkillSet.add(skill))
    }
    if (customLineageChoices?.variableTrait === 'skill_proficiency' && customLineageChoices.selectedSkill) {
      raceSkillSet.add(customLineageChoices.selectedSkill.toLowerCase().replace(/\s+/g, '_'))
    }

    // Collect background skills from previous background
    const previousBackgroundSkillSet = new Set<string>()
    if (previousBackground.skill_proficiencies) {
      if (Array.isArray(previousBackground.skill_proficiencies)) {
        previousBackground.skill_proficiencies.forEach(skill => {
          previousBackgroundSkillSet.add(skill.toLowerCase().replace(/\s+/g, '_'))
        })
      } else if (typeof previousBackground.skill_proficiencies === 'object' && !Array.isArray(previousBackground.skill_proficiencies)) {
        const skillsObj = previousBackground.skill_proficiencies as any
        if (skillsObj.fixed) {
          skillsObj.fixed.forEach((skill: string) => {
            previousBackgroundSkillSet.add(skill.toLowerCase().replace(/\s+/g, '_'))
          })
        }
        // Don't include choice skills in the revert - they're handled separately
      }
    }
    // Add selected background skill choices from previous background
    previousSkillChoices.forEach(skill => {
      previousBackgroundSkillSet.add(skill.toLowerCase().replace(/\s+/g, '_'))
    })

    // Revert all skills that came from the previous background (but preserve class and race skills)
    const updatedSkills = editableCharacter.skills?.map(skill => {
      const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
      const wasBackgroundSkill = previousBackgroundSkillSet.has(skillInDbFormat)
      const isClassSkill = classSkillProficiencies.has(skillInDbFormat)
      const isRaceSkill = raceSkillSet.has(skillInDbFormat)
      
      // Remove proficiency if it came from background and not from class or race
      if (wasBackgroundSkill && !isClassSkill && !isRaceSkill) {
        return { ...skill, proficiency: 'none' as const }
      }
      return skill
    }) || createDefaultSkills()

    // Collect background tools from previous background
    const previousBackgroundToolSet = new Set<string>()
    if (previousBackground.tool_proficiencies) {
      if (Array.isArray(previousBackground.tool_proficiencies)) {
        previousBackground.tool_proficiencies.forEach(tool => {
          previousBackgroundToolSet.add(tool.toLowerCase().replace(/\s+/g, '_'))
        })
      } else if (typeof previousBackground.tool_proficiencies === 'object' && !Array.isArray(previousBackground.tool_proficiencies)) {
        const toolsObj = previousBackground.tool_proficiencies as any
        if (toolsObj.fixed) {
          toolsObj.fixed.forEach((tool: string) => {
            previousBackgroundToolSet.add(tool.toLowerCase().replace(/\s+/g, '_'))
          })
        }
      }
    }
    previousToolChoices.forEach(tool => {
      previousBackgroundToolSet.add(tool.toLowerCase().replace(/\s+/g, '_'))
    })

    // Revert all tool proficiencies from previous background
    const updatedToolsProficiencies = (editableCharacter.toolsProficiencies || []).filter((tool: any) => {
      if (typeof tool === 'string') {
        return !previousBackgroundToolSet.has(tool.toLowerCase().replace(/\s+/g, '_'))
      }
      return !previousBackgroundToolSet.has(tool.name.toLowerCase().replace(/\s+/g, '_'))
    })

    // Collect background languages from previous background
    const previousBackgroundLanguageSet = new Set<string>()
    if (previousBackground.languages) {
      if (Array.isArray(previousBackground.languages)) {
        previousBackground.languages.forEach(lang => {
          previousBackgroundLanguageSet.add(lang.toLowerCase())
        })
      } else if (typeof previousBackground.languages === 'object' && !Array.isArray(previousBackground.languages)) {
        const langsObj = previousBackground.languages as any
        if (langsObj.fixed) {
          langsObj.fixed.forEach((lang: string) => {
            previousBackgroundLanguageSet.add(lang.toLowerCase())
          })
        }
      }
    }
    previousLanguageChoices.forEach(lang => {
      previousBackgroundLanguageSet.add(lang.toLowerCase())
    })

    // Revert languages (remove background languages, keep race languages)
    const currentLanguages = editableCharacter.languages || ""
    const languagesArray = currentLanguages.split(',').map(l => l.trim()).filter(Boolean)
    const updatedLanguages = languagesArray
      .filter(lang => !previousBackgroundLanguageSet.has(lang.toLowerCase()))
      .join(', ')

    // Revert equipment and money
    const previousEquipment = previousBackground.equipment || ""
    const currentEquipment = editableCharacter.equipment || ""
    // Simple approach: if equipment matches background equipment, clear it
    const updatedEquipment = currentEquipment === previousEquipment ? "" : currentEquipment

    const previousMoney = previousBackground.money || { gold: 0, silver: 0, copper: 0 }
    const currentMoney = editableCharacter.money || { gold: 0, silver: 0, copper: 0 }
    const updatedMoney = {
      gold: Math.max(0, currentMoney.gold - (previousMoney.gold || 0)),
      silver: Math.max(0, currentMoney.silver - (previousMoney.silver || 0)),
      copper: Math.max(0, currentMoney.copper - (previousMoney.copper || 0))
    }

    // Revert all modifications
    setEditableCharacter(prev => ({
      ...prev,
      skills: updatedSkills,
      toolsProficiencies: updatedToolsProficiencies,
      languages: updatedLanguages || "Common",
      equipment: updatedEquipment,
      money: updatedMoney
    }))
  }

  const applyBackgroundModifications = (background: BackgroundData, skipEquipmentAndMoney: boolean = false) => {
    // Use functional update to get the latest state for applying proficiencies
    setEditableCharacter(prev => {
      // Track skills that came from classes and race (to preserve them)
      const classSkillProficiencies = new Set<string>()
      characterClasses.forEach(charClass => {
        if (charClass.selectedSkillProficiencies) {
          charClass.selectedSkillProficiencies.forEach(skill => {
            classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
          })
        }
        const classData = classDataMap.get(charClass.name)
        if (classData?.skill_proficiencies) {
          if (Array.isArray(classData.skill_proficiencies)) {
            classData.skill_proficiencies.forEach((skill: any) => {
              if (typeof skill === 'string') {
                classSkillProficiencies.add(skill.toLowerCase().replace(/\s+/g, '_'))
              } else if (skill.name) {
                classSkillProficiencies.add(skill.name.toLowerCase().replace(/\s+/g, '_'))
              }
            })
          }
        }
      })

      // Collect race skills
      const raceSkillSet = new Set<string>()
      selectedProficiencies.skills.forEach(skill => raceSkillSet.add(skill))
      raceChoiceSelections.forEach((selection) => {
        if (selection.selectedSkills) {
          selection.selectedSkills.forEach(skill => raceSkillSet.add(skill))
        }
      })
      if (halfElfVersatilityChoice?.selectedSkills) {
        halfElfVersatilityChoice.selectedSkills.forEach(skill => raceSkillSet.add(skill))
      }
      if (customLineageChoices?.variableTrait === 'skill_proficiency' && customLineageChoices.selectedSkill) {
        raceSkillSet.add(customLineageChoices.selectedSkill.toLowerCase().replace(/\s+/g, '_'))
      }

      // Start with current skills (already reverted if this is a background change)
      const updatedSkills = prev.skills || createDefaultSkills()

      // Start with current tool proficiencies (already reverted if this is a background change)
      const updatedToolsProficiencies = prev.toolsProficiencies || []

      // Apply skill proficiencies from background
      const backgroundSkills: string[] = []
      if (background.skill_proficiencies) {
        if (Array.isArray(background.skill_proficiencies)) {
          // Legacy format - simple array
          background.skill_proficiencies.forEach(skill => {
            backgroundSkills.push(skill.toLowerCase().replace(/\s+/g, '_'))
          })
        } else if (typeof background.skill_proficiencies === 'object' && !Array.isArray(background.skill_proficiencies)) {
          const skillsObj = background.skill_proficiencies as any
          const choice = skillsObj.choice || {}
          const fromSelected = choice.from_selected || false
          const availableSkills = skillsObj.available || []
          
          // If from_selected is true and there's no available array, 
          // the fixed array contains the choice options (not actual fixed skills)
          // Example: Haunted One - fixed: [4 skills], choice: {count: 2, from_selected: true}, no available
          // In this case, don't add fixed as proficiencies - they're choice options
          const fixedIsActuallyAvailable = fromSelected && availableSkills.length === 0
          
          // Add fixed skills ONLY if they're not being used as choice options
          if (skillsObj.fixed && Array.isArray(skillsObj.fixed) && !fixedIsActuallyAvailable) {
            skillsObj.fixed.forEach((skill: string) => {
              // Only add if it's not in the available array (safeguard)
              const skillInDbFormat = skill.toLowerCase().replace(/\s+/g, '_')
              const isInAvailable = availableSkills.some((availSkill: string) => 
                availSkill.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat
              )
              // Only add fixed skills that are not in the available list
              if (!isInAvailable) {
                backgroundSkills.push(skillInDbFormat)
              }
            })
          }
          // Choice skills are handled separately via backgroundSkillChoices
          // NOTE: available skills are NEVER added here - they are only options to choose from
        }
      }
      // Add selected choice skills (only the ones the user actually selected)
      backgroundSkillChoices.forEach(skill => {
        const skillInDbFormat = skill.toLowerCase().replace(/\s+/g, '_')
        if (!backgroundSkills.includes(skillInDbFormat)) {
          backgroundSkills.push(skillInDbFormat)
        }
      })

      // Update editable character skills - add new background proficiencies
      const updatedSkillsWithBackground = updatedSkills.map((skill: any) => {
        const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
        if (backgroundSkills.includes(skillInDbFormat)) {
          // Only add proficiency if not already proficient from class or race
          const isClassSkill = classSkillProficiencies.has(skillInDbFormat)
          const isRaceSkill = raceSkillSet.has(skillInDbFormat)
          if (!isClassSkill && !isRaceSkill) {
            return { ...skill, proficiency: 'proficient' as const }
          }
        }
        return skill
      })

      // Apply tool proficiencies from background
      const backgroundTools: string[] = []
      if (background.tool_proficiencies) {
        if (Array.isArray(background.tool_proficiencies)) {
          // Legacy format - simple array
          background.tool_proficiencies.forEach(tool => {
            backgroundTools.push(tool)
          })
        } else if (typeof background.tool_proficiencies === 'object' && !Array.isArray(background.tool_proficiencies)) {
          const toolsObj = background.tool_proficiencies as any
          const choice = toolsObj.choice || {}
          const fromSelected = choice.from_selected || false
          const availableTools = toolsObj.available || []
          
          // If from_selected is true and there's no available array, 
          // the fixed array contains the choice options (not actual fixed tools)
          const fixedIsActuallyAvailable = fromSelected && availableTools.length === 0
          
          // Add fixed tools ONLY if they're not being used as choice options
          if (toolsObj.fixed && Array.isArray(toolsObj.fixed) && !fixedIsActuallyAvailable) {
            toolsObj.fixed.forEach((tool: string) => {
              // Only add if it's not in the available array (safeguard)
              const isInAvailable = availableTools.some((availTool: string) => 
                availTool === tool
              )
              // Only add fixed tools that are not in the available list
              if (!isInAvailable) {
                backgroundTools.push(tool)
              }
            })
          }
          // Choice tools are handled separately via backgroundToolChoices
          // NOTE: available tools are NEVER added here - they are only options to choose from
        }
      }
      // Add selected choice tools (only the ones the user actually selected)
      backgroundToolChoices.forEach(tool => {
        if (!backgroundTools.includes(tool)) {
          backgroundTools.push(tool)
        }
      })

      // Update tool proficiencies - add new background proficiencies
      const newTools = backgroundTools
        .filter(tool => !updatedToolsProficiencies.some((t: any) => 
          (typeof t === 'string' ? t : t.name) === tool
        ))
        .map(tool => ({ name: tool, proficiency: 'proficient' as const }))
      const updatedToolsProfs = [...updatedToolsProficiencies, ...newTools]

      // Apply languages from background
      const backgroundLanguages: string[] = []
      if (background.languages) {
        if (Array.isArray(background.languages)) {
          // Legacy format - simple array
          background.languages.forEach(lang => {
            backgroundLanguages.push(lang)
          })
        } else if (typeof background.languages === 'object' && !Array.isArray(background.languages)) {
          const langsObj = background.languages as any
          // Add fixed languages
          if (langsObj.fixed) {
            langsObj.fixed.forEach((lang: string) => {
              backgroundLanguages.push(lang)
            })
          }
          // Choice languages are handled separately via backgroundLanguageChoices
        }
      }
      // Add selected choice languages
      backgroundLanguageChoices.forEach(lang => {
        backgroundLanguages.push(lang)
      })

      // Update languages - add background languages
      const currentLanguages = prev.languages || "Common"
      const languagesArray = currentLanguages.split(',').map(l => l.trim()).filter(Boolean)
      const newLanguages = backgroundLanguages.filter(lang => 
        !languagesArray.some(l => l.toLowerCase() === lang.toLowerCase())
      )
      const updatedLanguages = newLanguages.length > 0
        ? `${currentLanguages}${currentLanguages ? ', ' : ''}${newLanguages.join(', ')}`
        : currentLanguages

      // Apply equipment and money (only if not skipping - skip when re-applying due to choice changes)
      const currentEquipment = prev.equipment || ""
      const backgroundEquipment = background.equipment || ""
      // Check if background equipment is already in the current equipment to prevent duplicates
      const equipmentAlreadyApplied = backgroundEquipment && currentEquipment.includes(backgroundEquipment)
      const updatedEquipment = !skipEquipmentAndMoney && backgroundEquipment && !equipmentAlreadyApplied
        ? `${currentEquipment}${currentEquipment ? '\n\n' : ''}${backgroundEquipment}`
        : currentEquipment

      const currentMoney = prev.money || { gold: 0, silver: 0, copper: 0 }
      const backgroundMoney = background.money || { gold: 0, silver: 0, copper: 0 }
      // Check if background money has already been added by checking if current money contains the background money
      // This is a simple heuristic - if current money is exactly the background money or more, it might have been added
      // But we can't be 100% sure, so we use a ref to track if we've applied this background's money
      const moneyAlreadyApplied = backgroundMoney.gold > 0 && currentMoney.gold >= backgroundMoney.gold &&
                                   backgroundMoney.silver > 0 && currentMoney.silver >= backgroundMoney.silver &&
                                   backgroundMoney.copper > 0 && currentMoney.copper >= backgroundMoney.copper &&
                                   // Only consider it applied if all three match (to avoid false positives)
                                   (currentMoney.gold === backgroundMoney.gold || currentMoney.silver === backgroundMoney.silver || currentMoney.copper === backgroundMoney.copper)
      const updatedMoney = !skipEquipmentAndMoney && !moneyAlreadyApplied ? {
        gold: currentMoney.gold + (backgroundMoney.gold || 0),
        silver: currentMoney.silver + (backgroundMoney.silver || 0),
        copper: currentMoney.copper + (backgroundMoney.copper || 0)
      } : currentMoney

      return {
        ...prev,
        skills: updatedSkillsWithBackground,
        toolsProficiencies: updatedToolsProfs,
        languages: updatedLanguages,
        equipment: updatedEquipment,
        money: updatedMoney
      }
    })
  }

  // Store previous background data to properly revert modifications
  const previousBackgroundDataRef = useRef<BackgroundData | null>(null)
  const previousBackgroundChoicesRef = useRef<{
    skills: string[]
    tools: string[]
    languages: string[]
  }>({ skills: [], tools: [], languages: [] })

  // Handle background changes - revert previous and apply new
  useEffect(() => {
    if (selectedBackgroundId && selectedBackgroundData) {
      // If background ID changed, revert previous and apply new
      if (previousBackgroundDataRef.current && previousBackgroundDataRef.current.id !== selectedBackgroundData.id) {
        // Revert using the previous background's choices (stored in ref)
        revertBackgroundModifications(
          previousBackgroundDataRef.current,
          previousBackgroundChoicesRef.current.skills,
          previousBackgroundChoicesRef.current.tools,
          previousBackgroundChoicesRef.current.languages
        )
        // Clear previous background's choices (ensure they're cleared even if already cleared in onValueChange)
        setBackgroundSkillChoices([])
        setBackgroundToolChoices([])
        setBackgroundLanguageChoices([])
        setBackgroundDefiningEvents([])
        setBackgroundPersonalityTraits([])
        setBackgroundIdeals([])
        setBackgroundBonds([])
        setBackgroundFlaws([])
        // Use setTimeout to ensure state updates complete before applying new background
        setTimeout(() => {
          applyBackgroundModifications(selectedBackgroundData)
        }, 0)
      } else if (!previousBackgroundDataRef.current) {
        // First time selecting a background - just apply
        applyBackgroundModifications(selectedBackgroundData)
      }
      
      previousBackgroundDataRef.current = selectedBackgroundData
      // Update choices ref with current choices (for next background change)
      previousBackgroundChoicesRef.current = {
        skills: backgroundSkillChoices,
        tools: backgroundToolChoices,
        languages: backgroundLanguageChoices
      }
    } else if (!selectedBackgroundId && previousBackgroundDataRef.current) {
      // Background was cleared - revert
      revertBackgroundModifications(
        previousBackgroundDataRef.current,
        previousBackgroundChoicesRef.current.skills,
        previousBackgroundChoicesRef.current.tools,
        previousBackgroundChoicesRef.current.languages
      )
      previousBackgroundDataRef.current = null
      previousBackgroundChoicesRef.current = { skills: [], tools: [], languages: [] }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBackgroundId, selectedBackgroundData?.id])

  // Update choices ref when they change
  useEffect(() => {
    if (selectedBackgroundData) {
      previousBackgroundChoicesRef.current = {
        skills: backgroundSkillChoices,
        tools: backgroundToolChoices,
        languages: backgroundLanguageChoices
      }
    }
  }, [backgroundSkillChoices, backgroundToolChoices, backgroundLanguageChoices, selectedBackgroundData])

  // Re-apply background modifications when skill/tool/language choices change
  // Skip equipment and money since those should only be applied once when background is first selected
  useEffect(() => {
    if (selectedBackgroundData) {
      applyBackgroundModifications(selectedBackgroundData, true) // Skip equipment and money
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundSkillChoices, backgroundToolChoices, backgroundLanguageChoices])

  const handleAbilityScoreIncreases = (asi: any, baseScores: any = null) => {
    // Use provided baseScores, or fall back to POINT_BUY_BASE (never use editableCharacter as it might be stale)
    const base = baseScores || {
      strength: POINT_BUY_BASE,
      dexterity: POINT_BUY_BASE,
      constitution: POINT_BUY_BASE,
      intelligence: POINT_BUY_BASE,
      wisdom: POINT_BUY_BASE,
      charisma: POINT_BUY_BASE
    }
    
    // Handle different ASI formats
    if (Array.isArray(asi)) {
      // Simple array format: [{"ability": "Dexterity", "increase": 2}]
      const choices: AbilityScoreChoice[] = asi.map((item: any) => ({
        ability: item.ability.toLowerCase(),
        increase: item.increase || 1
      }))
      setAbilityScoreChoices(choices)
      
      // Apply to editable character
      let updatedCharacter: Partial<CharacterData> = {
        ...editableCharacter,
        strength: base.strength,
        dexterity: base.dexterity,
        constitution: base.constitution,
        intelligence: base.intelligence,
        wisdom: base.wisdom,
        charisma: base.charisma,
      }
      choices.forEach(choice => {
        const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
        updatedCharacter[abilityKey] = (base[abilityKey] || POINT_BUY_BASE) + choice.increase
      })
      setEditableCharacter(updatedCharacter)
    } else if (asi.type === 'fixed_multi') {
      // Fixed multi-ability format: { type: 'fixed_multi', abilities: { strength: 1, dexterity: 1, ... } }
      const abilities = asi.abilities || {}
      const choices: AbilityScoreChoice[] = []
      
      Object.entries(abilities).forEach(([ability, increase]: [string, any]) => {
        if (increase > 0) {
          choices.push({
            ability: ability.toLowerCase(),
            increase: parseInt(increase) || 0
          })
        }
      })
      
      setAbilityScoreChoices(choices)
      
      // Apply to editable character
      let updatedCharacter: Partial<CharacterData> = {
        ...editableCharacter,
        strength: base.strength,
        dexterity: base.dexterity,
        constitution: base.constitution,
        intelligence: base.intelligence,
        wisdom: base.wisdom,
        charisma: base.charisma,
      }
      choices.forEach(choice => {
        const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
        updatedCharacter[abilityKey] = (base[abilityKey] || POINT_BUY_BASE) + choice.increase
      })
      setEditableCharacter(updatedCharacter)
    } else if (asi.type === 'choice') {
      // Choice-based ASI - handled in UI
      setAbilityScoreChoices([])
      // Reset to base scores
      setEditableCharacter(prev => ({
        ...prev,
        ...base
      }))
    } else if (asi.type === 'custom') {
      // Custom pattern (e.g., Half-Elf)
      // DON'T add fixed ASI to choices array - it's applied separately and shouldn't be in user selections
      const choices: AbilityScoreChoice[] = []
      
      // Always reset all six abilities to base first
      setEditableCharacter(prev => ({
        ...prev,
        strength: base.strength,
        dexterity: base.dexterity,
        constitution: base.constitution,
        intelligence: base.intelligence,
        wisdom: base.wisdom,
        charisma: base.charisma,
      }))
      
      if (asi.fixed) {
        // Apply fixed increase - use base value from parameter, or POINT_BUY_BASE if not provided
        const fixedAbilityKey = asi.fixed.ability.toLowerCase() as keyof CharacterData
        const baseValue = base[fixedAbilityKey] || POINT_BUY_BASE
        setEditableCharacter(prev => ({
          ...prev,
          [fixedAbilityKey]: baseValue + asi.fixed.increase
        }))
      }
      
      // Only store user-selectable choices, not the fixed one
      setAbilityScoreChoices(choices)
      // Choices are handled in UI
    }
  }

  const handleAbilityScoreSelection = (ability: string, increase: number, allowMultiple: boolean = false) => {
    // Calculate base score (point buy allocation) - should be POINT_BUY_BASE (8) not 10
    const baseScore = POINT_BUY_BASE
    
    setAbilityScoreChoices(prev => {
      // If allowMultiple is true (for pattern-based selections), allow multiple entries for same ability
      if (!allowMultiple) {
        const existing = prev.find(c => c.ability === ability)
        
        // If changing the increase amount for the same ability, update it
        if (existing && existing.increase !== increase) {
          const updated = prev.map(c => c.ability === ability ? { ...c, increase } : c)
          
          // Recalculate all ability scores from base (start fresh, don't use stale ability scores)
          let updatedCharacter: Partial<CharacterData> = {
            ...editableCharacter, // Preserve other fields first
            strength: baseScore, // Then override ability scores with base
            dexterity: baseScore,
            constitution: baseScore,
            intelligence: baseScore,
            wisdom: baseScore,
            charisma: baseScore,
          }
          // Apply fixed ASI first if exists
          const fixedAbilityKey = mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed
            ? mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
            : null
          
          if (fixedAbilityKey && mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
            updatedCharacter[fixedAbilityKey as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
          }
          
          // Then apply all choices (excluding the fixed ASI choice if it exists in the choices array)
          updated.forEach(choice => {
            const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
            // Skip if this is the fixed ASI ability (it's already been applied above)
            if (fixedAbilityKey && abilityKey === fixedAbilityKey) {
              return
            }
            // For other abilities, apply the choice increase
            updatedCharacter[abilityKey] = (baseScore + choice.increase) as any
          })
          setEditableCharacter(updatedCharacter)
          
          return updated
        }
        
        // If ability already exists with same increase, don't add again
        if (existing && existing.increase === increase) {
          return prev
        }
        
        // Remove any existing choice for this ability (if changing from one increase to another)
        const withoutExisting = prev.filter(c => c.ability !== ability)
        
        // Add new choice
        const updated = [...withoutExisting, { ability, increase }]
        
        // Recalculate all ability scores from base (start fresh, don't use editableCharacter)
        let updatedCharacter: Partial<CharacterData> = {
          ...editableCharacter, // Preserve other fields first
          strength: baseScore,
          dexterity: baseScore,
          constitution: baseScore,
          intelligence: baseScore,
          wisdom: baseScore,
          charisma: baseScore,
        }
        // Apply fixed ASI first if exists
        const fixedAbilityKey = mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed
          ? mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
          : null
        
        if (fixedAbilityKey && mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
          updatedCharacter[fixedAbilityKey as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
        }
        
        // Then apply all choices (sum increases for same ability, but exclude fixed ASI ability)
        const abilityTotals = updated
          .filter(choice => {
            // Filter out the fixed ASI ability if it's in the choices
            const abilityKey = choice.ability.toLowerCase()
            return !fixedAbilityKey || abilityKey !== fixedAbilityKey
          })
          .reduce((acc, choice) => {
            const key = choice.ability.toLowerCase()
            acc[key] = (acc[key] || 0) + choice.increase
            return acc
          }, {} as Record<string, number>)
        
        Object.entries(abilityTotals).forEach(([abilityKey, totalIncrease]) => {
          updatedCharacter[abilityKey as keyof CharacterData] = (baseScore + totalIncrease) as any
        })
        setEditableCharacter(updatedCharacter)
        
        return updated
      } else {
        // Allow multiple entries for same ability - just add it
        const updated = [...prev, { ability, increase }]
        
        // Recalculate all ability scores from base (start fresh, don't use editableCharacter)
        let updatedCharacter: Partial<CharacterData> = {
          ...editableCharacter, // Preserve other fields first
          strength: baseScore,
          dexterity: baseScore,
          constitution: baseScore,
          intelligence: baseScore,
          wisdom: baseScore,
          charisma: baseScore,
        }
        // Apply fixed ASI first if exists
        const fixedAbilityKey = mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed
          ? mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
          : null
        
        if (fixedAbilityKey && mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
          updatedCharacter[fixedAbilityKey as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
        }
        
        // Sum all increases for each ability (but exclude fixed ASI ability)
        const abilityTotals = updated
          .filter(choice => {
            // Filter out the fixed ASI ability if it's in the choices
            const abilityKey = choice.ability.toLowerCase()
            return !fixedAbilityKey || abilityKey !== fixedAbilityKey
          })
          .reduce((acc, choice) => {
            const key = choice.ability.toLowerCase()
            acc[key] = (acc[key] || 0) + choice.increase
            return acc
          }, {} as Record<string, number>)
        
        Object.entries(abilityTotals).forEach(([abilityKey, totalIncrease]) => {
          updatedCharacter[abilityKey as keyof CharacterData] = (baseScore + totalIncrease) as any
        })
        setEditableCharacter(updatedCharacter)
        
        return updated
      }
    })
  }
  
  const removeAbilityScoreChoice = (ability: string) => {
    setAbilityScoreChoices(prev => {
      const updated = prev.filter(c => c.ability !== ability)
      
      // Recalculate all ability scores from base (point buy)
      const baseScore = POINT_BUY_BASE
      let updatedCharacter: Partial<CharacterData> = { ...editableCharacter }
      
      // Calculate base scores by removing all race bonuses
      const baseScores = {
        strength: Math.max(POINT_BUY_BASE, (editableCharacter.strength || POINT_BUY_BASE) - (prev.find(c => c.ability === 'strength')?.increase || 0)),
        dexterity: Math.max(POINT_BUY_BASE, (editableCharacter.dexterity || POINT_BUY_BASE) - (prev.find(c => c.ability === 'dexterity')?.increase || 0)),
        constitution: Math.max(POINT_BUY_BASE, (editableCharacter.constitution || POINT_BUY_BASE) - (prev.find(c => c.ability === 'constitution')?.increase || 0)),
        intelligence: Math.max(POINT_BUY_BASE, (editableCharacter.intelligence || POINT_BUY_BASE) - (prev.find(c => c.ability === 'intelligence')?.increase || 0)),
        wisdom: Math.max(POINT_BUY_BASE, (editableCharacter.wisdom || POINT_BUY_BASE) - (prev.find(c => c.ability === 'wisdom')?.increase || 0)),
        charisma: Math.max(POINT_BUY_BASE, (editableCharacter.charisma || POINT_BUY_BASE) - (prev.find(c => c.ability === 'charisma')?.increase || 0))
      }
      
      // Apply remaining choices
      updated.forEach(choice => {
        const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
        updatedCharacter[abilityKey] = ((baseScores[abilityKey as keyof typeof baseScores] || baseScore) + choice.increase) as any
      })
      
      // Set the removed ability back to its base
      const abilityKey = ability.toLowerCase() as keyof CharacterData
      updatedCharacter[abilityKey] = (baseScores[abilityKey as keyof typeof baseScores] || baseScore) as any
      
      setEditableCharacter(updatedCharacter)
      
      return updated
    })
  }

  const handleSkillProficiencySelection = (skillName: string, selected: boolean, maxSelections: number = 1, featureOptions: string[] = []) => {
    const skillInDbFormat = skillName.toLowerCase().replace(/\s+/g, '_')
    setSelectedProficiencies(prev => {
      // Count only skills from this specific feature
      const featureSkills = featureOptions.length > 0 
        ? prev.skills.filter(s => 
            featureOptions.some((opt: string) => opt.toLowerCase().replace(/\s+/g, '_') === s)
          )
        : prev.skills
      
      // Check if we're already at max selections for this feature
      if (selected && featureSkills.length >= maxSelections && !featureSkills.includes(skillInDbFormat)) {
        return prev // Don't add if at max for this feature
      }
      
      const skills = selected 
        ? [...prev.skills, skillInDbFormat]
        : prev.skills.filter(s => s !== skillInDbFormat)
      return { ...prev, skills }
    })
    
    // Update editable character skills
    const updatedSkills = editableCharacter.skills?.map(skill => {
      const skillInDbFormatCheck = skill.name.toLowerCase().replace(/\s+/g, '_')
      if (skillInDbFormatCheck === skillInDbFormat) {
        return { ...skill, proficiency: selected ? 'proficient' as const : 'none' as const }
      }
      return skill
    }) || []
    
    setEditableCharacter(prev => ({
      ...prev,
      skills: updatedSkills
    }))
  }

  const handleToolProficiencySelection = (toolName: string, selected: boolean, maxSelections: number = 1, featureKey: string, toolOptions: string[] = []) => {
    setToolProficiencyChoices(prev => {
      const currentChoices = prev.get(featureKey) || []
      
      // Check if we're already at max selections for this feature
      if (selected && currentChoices.length >= maxSelections && !currentChoices.includes(toolName)) {
        return prev // Don't add if at max for this feature
      }
      
      const updatedChoices = selected
        ? [...currentChoices, toolName]
        : currentChoices.filter(t => t !== toolName)
      
      const newMap = new Map(prev)
      newMap.set(featureKey, updatedChoices)
      return newMap
    })
    
    // Update selected proficiencies and editable character
    setSelectedProficiencies(prev => {
      // Remove tools from this feature's options, then add selected ones
      const toolsWithoutThisFeature = prev.tools.filter(t => !toolOptions.includes(t))
      const tools = selected
        ? [...toolsWithoutThisFeature, toolName]
        : toolsWithoutThisFeature.filter(t => t !== toolName)
      return { ...prev, tools }
    })
    
    // Update editable character tool proficiencies
    setEditableCharacter(prev => {
      const currentTools = prev.toolsProficiencies || []
      
      if (selected) {
        // Add tool if not already present
        const toolExists = currentTools.some((t: any) => 
          (typeof t === 'string' ? t : t.name) === toolName
        )
        if (!toolExists) {
          // Ensure we always use the object format
          const newTools = [
            ...currentTools.map((t: any) => typeof t === 'string' ? { name: t, proficiency: 'proficient' as const } : t),
            { name: toolName, proficiency: 'proficient' as const }
          ]
          return {
            ...prev,
            toolsProficiencies: newTools
          }
        }
      } else {
        // Remove tool
        const filteredTools = currentTools.filter((t: any) => 
          (typeof t === 'string' ? t : t.name) !== toolName
        ).map((t: any) => typeof t === 'string' ? { name: t, proficiency: 'proficient' as const } : t)
        return {
          ...prev,
          toolsProficiencies: filteredTools
        }
      }
      return prev
    })
  }

  const handleClassChange = (className: string) => {
    const selectedClassOption = classes.find(c => c.name === className)
    setSelectedClass(className)
    setSelectedSubclass("")
    setSelectedClassId(selectedClassOption?.id || "")
    setNewClassLevel(1) // Reset to 1 when changing class
  }

  const handleSubclassChange = (subclass: string) => {
    const selectedClassOption = classes.find(c => c.name === selectedClass && c.subclass === subclass)
    setSelectedSubclass(subclass)
    setSelectedClassId(selectedClassOption?.id || "")
  }

  const getSubclassSelectionLevel = (className: string): number => {
    // Helper to coerce values
    const toNum = (val: any): number | null => {
      if (typeof val === 'number' && Number.isFinite(val)) return val
      if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) return Number(val)
      return null
    }
    // Prefer detailed class data when available (often includes subclass_selection_level)
    const baseFromDetails = classDataMap.get(className)
    const detailedLevel = baseFromDetails ? toNum((baseFromDetails as any).subclass_selection_level) : null
    if (detailedLevel !== null) return detailedLevel
    // Try to find by selected class_id when available to avoid name mismatches
    const selected = characterClasses.find(c => c.name === className)
    if (selected?.class_id) {
      const rowById = classesData.find(r => r.id === selected.class_id)
      if (rowById) {
        // If this row is a subclass row, try to find the base row for the same class name
        if (rowById.subclass) {
          const baseRow = classesData.find(r => r.name === rowById.name && (!r.subclass || r.subclass === null))
          const baseLevel = toNum(baseRow?.subclass_selection_level)
          if (baseLevel !== null) return baseLevel
        } else {
          const baseLevel = toNum(rowById.subclass_selection_level)
          if (baseLevel !== null) return baseLevel
        }
      }
    }
    // Fallback: derive from all rows that share the class name
    const rowsForClass = classesData.filter(cls => cls.name === className)
    if (rowsForClass.length === 0) return 3
    const numericLevels = rowsForClass
      .map(r => toNum((r as any).subclass_selection_level))
      .filter((v): v is number => v !== null)
    if (numericLevels.length > 0) return Math.min(...numericLevels)
    return 3
  }

  // Update saving throw proficiencies when main class (first class) changes
  useEffect(() => {
    if (characterClasses.length > 0 && classDataMap.size > 0) {
      const mainClass = characterClasses[0]
      const mainClassData = classDataMap.get(mainClass.name)
      if (mainClassData?.saving_throw_proficiencies && mainClassData.saving_throw_proficiencies.length > 0) {
        const savingThrows = createClassBasedSavingThrowProficiencies(mainClass.name)
        setEditableCharacter(prev => ({
          ...prev,
          savingThrowProficiencies: savingThrows
        }))
      }
    } else if (characterClasses.length === 0) {
      // Reset to default if no classes
      setEditableCharacter(prev => ({
        ...prev,
        savingThrowProficiencies: createDefaultSavingThrowProficiencies()
      }))
    }
  }, [characterClasses, classDataMap])

  // Helper function to check if a feature is an ASI feature
  const isASIFeature = (feature: { name?: string; title?: string }): boolean => {
    const name = (feature.name || feature.title || '').toLowerCase()
    return name.includes('ability score improvement') || name.includes('asi')
  }

  const checkForASI = async () => {
    if (characterClasses.length === 0) return false
    
    setIsLoadingASI(true)
    try {
      // Check if any class has ASI at its level (ASI levels are 4, 8, 12, 16, 19)
      // CRITICAL: Always pass includeHidden=true to ensure ASI features are detected
      for (const charClass of characterClasses) {
        if (charClass.class_id && [4, 8, 12, 16, 19].includes(charClass.level)) {
          const { features } = await loadClassFeatures(
            charClass.class_id, 
            charClass.level, 
            charClass.subclass, 
            true // includeHidden = true - ASI features are hidden but must be included
          )
          const hasASI = features?.some(feature => isASIFeature(feature)) || false
          if (hasASI) {
            setNeedsASI(true)
            return true
          }
        }
      }
      setNeedsASI(false)
      return false
    } catch (error) {
      console.error('Error checking for ASI:', error)
      return false
    } finally {
      setIsLoadingASI(false)
    }
  }

  const rollHitDie = () => {
    if (characterClasses.length === 0) return

    // Ensure point buy allocation is complete before rolling HP
    const pointsSpent = getTotalPointsSpent()
    if (pointsSpent !== POINT_BUY_TOTAL) {
      setError(`Please finish point buy first: ${pointsSpent}/${POINT_BUY_TOTAL} points allocated.`)
      return
    }

    const hitDieTypes: Record<string, number> = {
      'barbarian': 12,
      'fighter': 10,
      'paladin': 10,
      'ranger': 10,
      'artificer': 8,
      'bard': 8,
      'cleric': 8,
      'druid': 8,
      'monk': 8,
      'rogue': 8,
      'warlock': 8,
      'wizard': 6,
      'sorcerer': 6
    }

    const constitutionModifier = calculateModifier(editableCharacter.constitution || 10)
    
    // Roll for each class: (class level × hit dice rolls) + (CON modifier × class level)
    let totalRoll = 0
    let totalHP = 0
    const classRolls: Array<{className: string, level: number, roll: number, hp: number}> = []
    
    for (const charClass of characterClasses) {
      const dieSize = hitDieTypes[charClass.name.toLowerCase()] || 8
      let classRoll = 0
      let classHP = 0
      
      // For first level of each class: max hit die + CON modifier
      // For subsequent levels: roll hit die + CON modifier
      for (let i = 0; i < charClass.level; i++) {
        if (i === 0) {
          // First level: max of hit die + CON modifier
          const firstLevelHP = dieSize + constitutionModifier
          classRoll += dieSize // Track as "max" for display
          classHP += firstLevelHP
        } else {
          // Subsequent levels: roll + CON modifier
          const roll = Math.floor(Math.random() * dieSize) + 1
          classRoll += roll
          classHP += roll + constitutionModifier
        }
      }
      
      // Ensure minimum 1 HP per class level
      classHP = Math.max(charClass.level, classHP)
      totalRoll += classRoll
      totalHP += classHP
      
      classRolls.push({
        className: charClass.name,
        level: charClass.level,
        roll: classRoll,
        hp: classHP
      })
    }

    // Calculate level-based HP bonus from race features (e.g., Dwarven Toughness)
    const levelBasedHpBonus = mainRaceData && mainRaceData.features && Array.isArray(mainRaceData.features)
      ? mainRaceData.features.reduce((bonus: number, feature: any) => {
          if (feature.hp_bonus_per_level) {
            return bonus + level
          }
          return bonus
        }, 0)
      : 0
    
    const totalHPWithBonus = totalHP + levelBasedHpBonus

    setHpRollResult({
      roll: totalRoll,
      constitutionModifier,
      total: totalHP,
      classRolls: classRolls.length > 1 ? classRolls : undefined
    })
    
    setEditableCharacter(prev => ({
      ...prev,
      maxHitPoints: totalHPWithBonus,
      currentHitPoints: totalHPWithBonus
    }))
  }

  // Recalculate HP automatically when CON or race HP bonuses change after a roll (without causing loops)
  useEffect(() => {
    if (!hpRollResult) return

    const conMod = calculateModifier(editableCharacter.constitution || 10)

    // Compute total HP from stored rolls and current CON mod
    let totalHP = 0
    if (hpRollResult.classRolls && hpRollResult.classRolls.length > 0) {
      totalHP = hpRollResult.classRolls.reduce((sum, cr) => {
        const rollSum = cr.roll || 0
        const levels = cr.level || 0
        const hpFromCon = conMod * levels
        const classHp = Math.max(levels, rollSum + hpFromCon)
        return sum + classHp
      }, 0)
    } else {
      // Fallback: use aggregate roll and total level (use overall level state)
      const base = (hpRollResult.roll || 0) + (conMod * level)
      totalHP = Math.max(level, base)
    }

    // Recompute level-based HP bonus from race features and selected options
    let levelBasedHpBonus = 0
    if (mainRaceData?.features && Array.isArray(mainRaceData.features)) {
      mainRaceData.features.forEach((feature: any) => {
        if (feature.hp_bonus_per_level) levelBasedHpBonus += level
        if (feature.feature_type === 'choice' && feature.options && Array.isArray(feature.options)) {
          const featureKey = feature.name || 'unknown-choice'
          const selection = raceChoiceSelections.get(featureKey) || 
            (feature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
          feature.options.forEach((option: any) => {
            if (option.hp_bonus_per_level && selection && selection.optionName === option.name) {
              levelBasedHpBonus += level
            }
          })
        }
      })
    }

    const totalHPWithBonus = totalHP + levelBasedHpBonus

    // Only update state if values actually changed to avoid effect loops
    if (hpRollResult.constitutionModifier !== conMod || hpRollResult.total !== totalHP) {
      setHpRollResult(prev => prev ? ({ ...prev, constitutionModifier: conMod, total: totalHP }) : prev)
    }
    if ((editableCharacter.maxHitPoints || 0) !== totalHPWithBonus || (editableCharacter.currentHitPoints || 0) !== totalHPWithBonus) {
      setEditableCharacter(prev => ({
        ...prev,
        maxHitPoints: totalHPWithBonus,
        currentHitPoints: totalHPWithBonus
      }))
    }
  }, [editableCharacter.constitution, hpRollResult?.roll, hpRollResult?.classRolls, level, mainRaceData, raceChoiceSelections, halfElfVersatilityChoice])
  
  const handleASISelection = (featureId: string, type: 'ability_scores' | 'feat') => {
    const currentChoice = asiChoices.get(featureId)
    const newChoices = new Map(asiChoices)
    
    // If switching from ability_scores to feat, revert ability score changes
    // IMPORTANT: Preserve race-based bonuses when reverting ASI changes
    if (currentChoice?.type === 'ability_scores' && type === 'feat' && currentChoice.abilityScores) {
      const firstAbility = currentChoice.abilityScores.first?.toLowerCase()
      const secondAbility = currentChoice.abilityScores.second?.toLowerCase()
      
      // Revert ability score increases while preserving race bonuses
      if (firstAbility) {
        const abilityKey = firstAbility as keyof CharacterData
        const currentValue = editableCharacter[abilityKey] as number || 10
        
        // Calculate base value including race bonuses (but excluding ASI)
        const raceBonus = abilityScoreChoices.find(c => c.ability === abilityKey)?.increase || 0
        const baseWithRace = 10 + raceBonus
        
        // Calculate how much ASI increased this ability
        const decrease = secondAbility ? 1 : 2 // If there was a second, first got +1, otherwise +2
        
        // Revert to base + race bonus (preserve race bonus, remove ASI)
        const newValue = currentValue - decrease
        // Ensure we don't go below base + race bonus
        updateEditableCharacter({ [abilityKey]: Math.max(baseWithRace, newValue) })
      }
      
      if (secondAbility) {
        const abilityKey = secondAbility as keyof CharacterData
        const currentValue = editableCharacter[abilityKey] as number || 10
        
        // Calculate base value including race bonuses (but excluding ASI)
        const raceBonus = abilityScoreChoices.find(c => c.ability === abilityKey)?.increase || 0
        const baseWithRace = 10 + raceBonus
        
        // Revert ASI (+1 for second ability)
        const newValue = currentValue - 1
        // Ensure we don't go below base + race bonus
        updateEditableCharacter({ [abilityKey]: Math.max(baseWithRace, newValue) })
      }
    }
    
    if (type === 'ability_scores') {
      newChoices.set(featureId, {
        type: 'ability_scores',
        abilityScores: {
          first: '',
          second: ''
        },
        feat: null
      })
    } else {
      newChoices.set(featureId, {
        type: 'feat',
        abilityScores: {
          first: '',
          second: ''
        },
        feat: null
      })
    }
    setAsiChoices(newChoices)
  }
  
  const handleASIScoreSelection = (featureId: string, which: 'first' | 'second', ability: string) => {
    const currentChoice = asiChoices.get(featureId)
    if (!currentChoice?.abilityScores) return
    
    // Update the choice first
    const newChoices = new Map(asiChoices)
    newChoices.set(featureId, {
      ...currentChoice,
      abilityScores: {
        ...currentChoice.abilityScores,
        [which]: ability
      }
    })
    setAsiChoices(newChoices)
    
    // Recalculate all ability scores from scratch
    // Start with base scores (8)
    const baseScore = POINT_BUY_BASE
    let updatedCharacter: Partial<CharacterData> = {
      ...editableCharacter,
      strength: baseScore,
      dexterity: baseScore,
      constitution: baseScore,
      intelligence: baseScore,
      wisdom: baseScore,
      charisma: baseScore,
    }
    
    // Apply race bonuses first (including fixed ASI patterns)
    if (mainRaceData?.ability_score_increases) {
      const asi = mainRaceData.ability_score_increases
      
      // Handle array format (simple bonuses)
      if (Array.isArray(asi)) {
        asi.forEach((item: any) => {
          const abilityKey = (item.ability || '').toLowerCase() as keyof CharacterData
          if (abilityKey in updatedCharacter) {
            updatedCharacter[abilityKey] = (baseScore + (item.increase || 0)) as any
          }
        })
      }
      // Handle fixed_multi format (Human +1 to all)
      else if (asi.type === 'fixed_multi' && asi.abilities) {
        Object.entries(asi.abilities).forEach(([ability, increase]: [string, any]) => {
          const abilityKey = ability.toLowerCase() as keyof CharacterData
          if (abilityKey in updatedCharacter && increase > 0) {
            updatedCharacter[abilityKey] = (baseScore + parseInt(increase)) as any
          }
        })
      }
      // Handle custom format (Half-Elf fixed +2 CHA, plus user selections)
      else if (asi.type === 'custom') {
        // Apply fixed bonus if exists
        if (asi.fixed) {
          const fixedAbility = asi.fixed.ability.toLowerCase() as keyof CharacterData
          if (fixedAbility in updatedCharacter) {
            updatedCharacter[fixedAbility] = (baseScore + asi.fixed.increase) as any
          }
        }
        // Apply user-selected bonuses from abilityScoreChoices
        abilityScoreChoices.forEach(choice => {
          const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
          if (abilityKey in updatedCharacter) {
            updatedCharacter[abilityKey] = (baseScore + choice.increase) as any
          }
        })
      }
      // Handle choice format (user-selected race bonuses stored in abilityScoreChoices)
      else if (asi.type === 'choice') {
        abilityScoreChoices.forEach(choice => {
          const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
          if (abilityKey in updatedCharacter) {
            updatedCharacter[abilityKey] = (baseScore + choice.increase) as any
          }
        })
      }
    }
    
    // Now apply all ASI feature bonuses from all selected features
    Array.from(newChoices.entries()).forEach(([id, choice]) => {
      if (selectedFeatures.has(id) && choice.type === 'ability_scores' && choice.abilityScores) {
        const first = choice.abilityScores.first?.toLowerCase()
        const second = choice.abilityScores.second?.toLowerCase()
        
        if (first) {
          const firstKey = first as keyof CharacterData
          const firstValue = (updatedCharacter[firstKey] as number) || baseScore
          const firstIncrease = (second && second !== first) ? 1 : 2
          updatedCharacter[firstKey] = (firstValue + firstIncrease) as any
        }
        
        if (second && second !== first) {
          const secondKey = second as keyof CharacterData
          const secondValue = (updatedCharacter[secondKey] as number) || baseScore
          updatedCharacter[secondKey] = (secondValue + 1) as any
        }
      }
    })
    
    setEditableCharacter(updatedCharacter)
  }
  
  const getAbilityOptions = () => [
    { value: 'strength', label: 'Strength' },
    { value: 'dexterity', label: 'Dexterity' },
    { value: 'constitution', label: 'Constitution' },
    { value: 'intelligence', label: 'Intelligence' },
    { value: 'wisdom', label: 'Wisdom' },
    { value: 'charisma', label: 'Charisma' }
  ]
  
  const handleAddFeat = () => {
    setEditingFeatIndex(null)
    setFeatEditModalOpen(true)
  }
  
  const handleEditFeat = (index: number) => {
    setEditingFeatIndex(index)
    setFeatEditModalOpen(true)
  }
  
  const handleDeleteFeat = (index: number) => {
    const updatedFeats = [...(editableCharacter.feats || [])]
    const deletedFeat = updatedFeats[index]
    updatedFeats.splice(index, 1)
    updateEditableCharacter({ feats: updatedFeats })
    
    // Remove feat from any ASI choice that references it
    const newChoices = new Map(asiChoices)
    for (const [featureId, choice] of newChoices.entries()) {
      if (choice.feat === deletedFeat) {
        newChoices.set(featureId, { ...choice, feat: null })
      }
    }
    setAsiChoices(newChoices)
  }
  
  const handleFeatEditClose = () => {
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
    setEditingFeatForFeatureId(null)
  }
  
  const handleFeatSave = (updates: Partial<CharacterData>) => {
    updateEditableCharacter(updates)
    
    // If we're adding a feat for a specific ASI feature
    if (editingFeatIndex === null && updates.feats && editingFeatForFeatureId && editingFeatForFeatureId !== 'custom-lineage-feat') {
      const newFeat = updates.feats[updates.feats.length - 1]
      const newChoices = new Map(asiChoices)
      const currentChoice = newChoices.get(editingFeatForFeatureId)
      if (currentChoice) {
        newChoices.set(editingFeatForFeatureId, {
          ...currentChoice,
          feat: newFeat
        })
        setAsiChoices(newChoices)
      }
    }
    
    // If we're adding a feat for Custom Lineage
    if (editingFeatIndex === null && updates.feats && editingFeatForFeatureId === 'custom-lineage-feat') {
      const newFeat = updates.feats[updates.feats.length - 1]
      setCustomLineageChoices(prev => ({
        ...prev || {},
        feat: newFeat
      }))
    }
    
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
    setEditingFeatForFeatureId(null)
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'character-images')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to upload image'
        throw new Error(errorMessage)
      }

      setImageUrl(result.url)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Character name is required")
      return
    }
    if (raceIds.length === 0) {
      setError("At least one race is required")
      return
    }
    if (!raceIds.some(r => r.isMain)) {
      setError("Please mark one race as main")
      return
    }
    
    // Validate all choice features
    if (mainRaceData?.features && Array.isArray(mainRaceData.features)) {
      const choiceFeatures = mainRaceData.features.filter((f: any) => {
        const featureType = f.feature_type || f.type
        // Exclude Custom Lineage Variable Trait as it's validated separately
        if (mainRaceData.name === 'Custom Lineage' && f.name === 'Variable Trait') {
          return false
        }
        return featureType === 'choice' && f.options && Array.isArray(f.options) && f.options.length > 0
      })
      
      for (const choiceFeature of choiceFeatures) {
        const featureKey = choiceFeature.name || 'unknown-choice'
        const selection = raceChoiceSelections.get(featureKey) || 
          (choiceFeature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
        
        if (!selection) {
          setError(`Please select an option for ${choiceFeature.name}`)
          return
        }
        
        // Validate skill selection for Skill Versatility option
        if (selection.option.type === 'skill_proficiency' && 
            selection.option.skill_choice === 'any') {
          const requiredCount = selection.option.skill_count || 2
          if (!selection.selectedSkills || selection.selectedSkills.length < requiredCount) {
            setError(`Please select ${requiredCount} skills for ${choiceFeature.name}`)
            return
          }
        }
      }
    }
    
    // Validate Custom Lineage choices
    if (mainRaceData?.name === 'Custom Lineage') {
      if (!customLineageChoices?.size) {
        setError("Please select a size (Small or Medium) for Custom Lineage")
        return
      }
      if (!customLineageChoices?.feat) {
        setError("Please select a feat for Custom Lineage")
        return
      }
      if (!customLineageChoices?.variableTrait) {
        setError("Please select a Variable Trait (Darkvision or Skill Proficiency) for Custom Lineage")
        return
      }
      if (customLineageChoices.variableTrait === 'skill_proficiency' && !customLineageChoices.selectedSkill) {
        setError("Please select a skill for the Skill Proficiency option")
        return
      }
      if (!customLineageChoices?.selectedLanguage) {
        setError("Please select an additional language for Custom Lineage")
        return
      }
    }
    
    if (!background.trim()) {
      setError("Background is required")
      return
    }
    if (characterClasses.length === 0) {
      setError("At least one class is required")
      return
    }
    
    // Validate subclass requirements for each class
    for (const charClass of characterClasses) {
      const requiredLevel = getSubclassSelectionLevel(charClass.name)
      const classSubclasses = classes.filter(c => c.name === charClass.name).map(c => c.subclass)
      if (classSubclasses.length > 0 && charClass.level >= requiredLevel && !charClass.subclass) {
        setError(`Subclass is required for ${charClass.name} at level ${requiredLevel} and above`)
        return
      }
    }
    
    // Validate skill proficiencies for each class
    for (const charClass of characterClasses) {
      const classData = classDataMap.get(charClass.name)
      const availableSkills = classData?.skill_proficiencies 
        ? (Array.isArray(classData.skill_proficiencies) 
            ? classData.skill_proficiencies 
            : (classData.skill_proficiencies?.options || classData.skill_proficiencies?.proficiencies || []))
        : []
      
      if (availableSkills.length > 0) {
        const selectedSkills = charClass.selectedSkillProficiencies || []
        const maxSkillChoices = 2 // Most classes get 2 skill proficiencies
        if (selectedSkills.length < maxSkillChoices) {
          setError(`Please select ${maxSkillChoices} skill proficiencies for ${charClass.name}`)
          return
        }
      }
    }
    
    if (!hpRollResult) {
      setError("Please roll for hit points")
      return
    }

    // Apply skill proficiencies and saving throw proficiencies
    // First, get all selected skill proficiencies from all classes
    const allSelectedSkills = new Set<string>()
    characterClasses.forEach(charClass => {
      (charClass.selectedSkillProficiencies || []).forEach(skill => {
        allSelectedSkills.add(skill)
      })
    })
    
    // Also add Half-Elf Skill Versatility skills if selected
    if (halfElfVersatilityChoice?.option.type === 'skill_proficiency' && 
        halfElfVersatilityChoice.selectedSkills) {
      halfElfVersatilityChoice.selectedSkills.forEach(skill => {
        allSelectedSkills.add(skill)
      })
    }
    
    // Add Custom Lineage skill proficiency if selected
    if (customLineageChoices?.variableTrait === 'skill_proficiency' && customLineageChoices.selectedSkill) {
      allSelectedSkills.add(customLineageChoices.selectedSkill.toLowerCase().replace(/\s+/g, '_'))
    }
    
    // Update editable character with selected skill proficiencies
    const updatedSkills = editableCharacter.skills?.map(skill => {
      const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
      if (allSelectedSkills.has(skillInDbFormat)) {
        return { ...skill, proficiency: 'proficient' as const }
      }
      return skill
    }) || createDefaultSkills()
    
    // Apply saving throw proficiencies from main class (first in list)
    let savingThrowProficiencies = createDefaultSavingThrowProficiencies()
    if (characterClasses.length > 0) {
      const mainClass = characterClasses[0]
      const mainClassData = classDataMap.get(mainClass.name)
      if (mainClassData?.saving_throw_proficiencies) {
        savingThrowProficiencies = createClassBasedSavingThrowProficiencies(mainClass.name)
      }
    }
    
    // Collect tool proficiencies from choice feature options (tool_proficiency type)
    const toolsFromChoiceFeatures: string[] = []
    if (mainRaceData?.features && Array.isArray(mainRaceData.features)) {
      mainRaceData.features.forEach((feature: any) => {
        if (feature.feature_type === 'choice') {
          const featureKey = feature.name || 'unknown-choice'
          const selection = raceChoiceSelections.get(featureKey) || 
            (feature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
          
          if (selection && selection.option && selection.option.type === 'tool_proficiency') {
            // If the option has fixed tools, add them all
            if (selection.option.tools && Array.isArray(selection.option.tools)) {
              toolsFromChoiceFeatures.push(...selection.option.tools)
            }
            // If the option allows choice of tools, we would need to track selected tools
            // For now, we'll handle fixed tools from choice options
          }
        }
      })
    }
    
    // Update editable character with saving throw proficiencies and tools from choice features
    const updatedToolsProficiencies = editableCharacter.toolsProficiencies || []
    const toolsFromChoiceFeaturesFormatted = toolsFromChoiceFeatures
      .filter(tool => !updatedToolsProficiencies.some((t: any) => 
        (typeof t === 'string' ? t : t.name) === tool
      ))
      .map(tool => ({ name: tool, proficiency: 'proficient' as const }))
    
    const updatedCharacter = {
      ...editableCharacter,
      skills: updatedSkills,
      savingThrowProficiencies,
      toolsProficiencies: [...updatedToolsProficiencies, ...toolsFromChoiceFeaturesFormatted]
    }

    // Calculate base AC and initiative
    const dexModifier = calculateModifier(editableCharacter.dexterity || 10)
    const baseAC = 10 + dexModifier
    const initiativeValue = dexModifier

    // Helper function to calculate max uses from usesPerLongRest
    const calculateMaxUses = (usesPerLongRest: number | string | undefined, character: Partial<CharacterData>): number => {
      if (!usesPerLongRest) return 0
      
      if (typeof usesPerLongRest === 'number') {
        return Math.max(0, usesPerLongRest)
      }
      
      if (typeof usesPerLongRest === 'string') {
        // Handle proficiency bonus
        if (usesPerLongRest.toLowerCase() === 'prof' || usesPerLongRest.toLowerCase() === 'proficiency') {
          const profBonus = character.proficiencyBonus ?? calculateProficiencyBonus(level)
          return Math.max(0, profBonus)
        }
        
        // Handle ability modifiers (str, dex, con, int, wis, cha)
        const abilityMap: Record<string, keyof CharacterData> = {
          'str': 'strength',
          'dex': 'dexterity',
          'con': 'constitution',
          'int': 'intelligence',
          'wis': 'wisdom',
          'cha': 'charisma'
        }
        const abilityKey = abilityMap[usesPerLongRest.toLowerCase()]
        if (abilityKey && character[abilityKey]) {
          const abilityScore = character[abilityKey] as number
          const modifier = calculateModifier(abilityScore)
          return Math.max(0, modifier) // Ensure non-negative
        }
      }
      
      return 0
    }

    // Helper function to calculate level-based HP bonus from race features
    const calculateLevelBasedHpBonus = (race: RaceData | null, characterLevel: number): number => {
      if (!race?.features || !Array.isArray(race.features)) return 0
      
      let bonus = 0
      race.features.forEach((feature: any) => {
        // Check if feature has hp_bonus_per_level flag
        if (feature.hp_bonus_per_level) {
          bonus += characterLevel
        }
        
        // Also check choice feature options for hp_bonus_per_level
        if (feature.feature_type === 'choice' && feature.options && Array.isArray(feature.options)) {
          const featureKey = feature.name || 'unknown-choice'
          const selection = raceChoiceSelections.get(featureKey) || 
            (feature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
          
          feature.options.forEach((option: any) => {
            if (option.hp_bonus_per_level && selection && selection.optionName === option.name) {
              bonus += characterLevel
            }
          })
        }
      })
      
      return bonus
    }

    // Collect race features (excluding skill/weapon/tool proficiencies which are handled separately)
    const raceFeatures: Array<{name: string, description: string, usesPerLongRest?: number | string, currentUses?: number, refuelingDie?: string, hpBonusPerLevel?: boolean}> = []
    if (mainRaceData?.features && Array.isArray(mainRaceData.features)) {
      mainRaceData.features.forEach((feature: any) => {
        // Skip proficiencies - they're handled via skills/equipment/tools
        if (feature.feature_type === 'skill_proficiency' || 
            feature.feature_type === 'weapon_proficiency' || 
            feature.feature_type === 'tool_proficiency') {
          return
        }
        
        // Handle Custom Lineage Variable Trait separately (it's a choice feature but has special handling)
        if (feature.feature_type === 'choice' && feature.name === 'Variable Trait' && mainRaceData.name === 'Custom Lineage') {
          if (customLineageChoices?.variableTrait === 'darkvision') {
            raceFeatures.push({
              name: 'Darkvision',
              description: 'You have darkvision with a range of 60 feet.',
            })
          }
          // skill_proficiency is already handled in proficiencies
          return
        }
        
        // Skip ALL choice features - we only add the user's selected option, never the choice feature itself
        if (feature.feature_type === 'choice') {
          const featureKey = feature.name || 'unknown-choice'
          // Check both raceChoiceSelections and halfElfVersatilityChoice for backward compatibility
          const selection = raceChoiceSelections.get(featureKey) || 
            (feature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
          
          // Only add the selected option if user made a selection
          if (selection && selection.option) {
            const selectedOption = selection.option
            
            // Add as feature for trait, darkvision, spell, and tool_proficiency types
            // skill_proficiency and weapon_proficiency are handled separately in proficiencies
            if (selectedOption.type === 'trait' || selectedOption.type === 'darkvision' || selectedOption.type === 'spell' || selectedOption.type === 'tool_proficiency') {
              // Add only the selected option as a feature, not the choice feature itself
              const featureData: any = {
                name: selectedOption.name,
                description: selectedOption.description || '',
                hpBonusPerLevel: selectedOption.hp_bonus_per_level || false,
              }
              
              // Add spell-specific fields (uses per long rest, refueling die) if this is a spell option
              if (selectedOption.type === 'spell') {
                if (selectedOption.uses_per_long_rest !== undefined) {
                  featureData.usesPerLongRest = selectedOption.uses_per_long_rest
                }
                if (selectedOption.refueling_die) {
                  featureData.refuelingDie = selectedOption.refueling_die
                }
              }
              
              raceFeatures.push(featureData)
            }
            // Note: skill_proficiency and weapon_proficiency options are handled in proficiencies, not as features
            // tool_proficiency options are added as features AND their tools are added to toolsProficiencies below
          }
          // Always skip the choice feature itself - return early
          return
        }
        
        // Skip Custom Lineage Feat feature - handled separately
        if (feature.feature_type === 'feat' && feature.name === 'Feat') {
          // Feat is added to character.feats separately
          return
        }
        
        // Get usesPerLongRest from race feature (handle both snake_case and camelCase)
        const usesPerLongRest = feature.uses_per_long_rest || feature.usesPerLongRest
        const refuelingDie = feature.refueling_die || feature.refuelingDie
        const hpBonusPerLevel = feature.hp_bonus_per_level || false
        
        // Calculate initial currentUses (start at max, which is full)
        const maxUses = calculateMaxUses(usesPerLongRest, {
          ...editableCharacter,
          proficiencyBonus: calculateProficiencyBonus(level)
        })
        
        // Convert race feature to character feature format
        raceFeatures.push({
          name: feature.name || 'Unknown Feature',
          description: feature.description || '',
          usesPerLongRest: usesPerLongRest,
          currentUses: maxUses, // Initialize to max (full uses)
          refuelingDie: refuelingDie,
          hpBonusPerLevel: hpBonusPerLevel,
        })
      })
    }
    
    // Note: Secondary race (raceIds[1]) is purely cosmetic and does not contribute features, bonuses, or other mechanical effects
    // Only the main race (raceIds[0]) provides mechanical benefits

    // Add Custom Lineage feat if selected
    const customLineageFeat = customLineageChoices?.feat ? [customLineageChoices.feat] : []
    const allFeats = [...(editableCharacter.feats || []), ...customLineageFeat]
    
    // Prepare languages - combine Custom Lineage language if applicable
    let finalLanguages = editableCharacter.languages || "Common"
    if (customLineageChoices?.selectedLanguage) {
      finalLanguages = `Common, ${customLineageChoices.selectedLanguage}`
    }
    
    // Calculate equipment proficiencies from classes
    const classEquipmentProficiencies = characterClasses.length > 0 
      ? getMulticlassEquipmentProficiencies(characterClasses)
      : {
          lightArmor: false,
          mediumArmor: false,
          heavyArmor: false,
          shields: false,
          simpleWeapons: false,
          martialWeapons: false,
          firearms: false,
          handCrossbows: false,
          longswords: false,
          rapiers: false,
          shortswords: false,
          scimitars: false,
          lightCrossbows: false,
          darts: false,
          slings: false,
          quarterstaffs: false,
        }
    
    // Combine class equipment proficiencies with race equipment proficiencies
    const raceEquipmentProficiencies = editableCharacter.equipmentProficiencies || {
      lightArmor: false,
      mediumArmor: false,
      heavyArmor: false,
      shields: false,
      simpleWeapons: false,
      martialWeapons: false,
      firearms: false,
      handCrossbows: false,
      longswords: false,
      rapiers: false,
      shortswords: false,
      scimitars: false,
      lightCrossbows: false,
      darts: false,
      slings: false,
      quarterstaffs: false,
    }
    
    // Merge: class proficiencies take precedence, but race can add additional ones
    const finalEquipmentProficiencies = {
      ...raceEquipmentProficiencies,
      ...classEquipmentProficiencies,
    }
    
    const firstClass = characterClasses[0]
    onCreateCharacter({
      name,
      class: firstClass.name, // Legacy field
      subclass: firstClass.subclass || "", // Legacy field
      classId: firstClass.class_id || "", // Legacy field
      level,
      classes: characterClasses, // Multiclass support (includes selectedSkillProficiencies)
      background: selectedBackgroundData?.name || background || "", // Use selected background name or fallback to legacy
      backgroundId: selectedBackgroundId || undefined, // New field for background ID
      backgroundData: selectedBackgroundId ? {
        defining_events: backgroundDefiningEvents.length > 0 ? backgroundDefiningEvents : undefined,
        personality_traits: backgroundPersonalityTraits.length > 0 ? backgroundPersonalityTraits : undefined,
        ideals: backgroundIdeals.length > 0 ? backgroundIdeals : undefined,
        bonds: backgroundBonds.length > 0 ? backgroundBonds : undefined,
        flaws: backgroundFlaws.length > 0 ? backgroundFlaws : undefined,
      } : undefined,
      race: raceIds.find(r => r.isMain)?.id || raceIds[0]?.id || "", // Legacy field - use main race
      raceIds: raceIds.length > 0 ? raceIds : undefined,
      alignment,
      isNPC,
      campaignId: campaignId,
      selectedFeatures: Array.from(selectedFeatures), // Selected class feature IDs
      // Pass all character stats
      abilityScores: {
        strength: editableCharacter.strength || 10,
        dexterity: editableCharacter.dexterity || 10,
        constitution: editableCharacter.constitution || 10,
        intelligence: editableCharacter.intelligence || 10,
        wisdom: editableCharacter.wisdom || 10,
        charisma: editableCharacter.charisma || 10,
      },
      skills: updatedSkills,
      savingThrowProficiencies: savingThrowProficiencies,
      maxHitPoints: hpRollResult?.total || updatedCharacter.maxHitPoints || 8,
      currentHitPoints: hpRollResult?.total || updatedCharacter.currentHitPoints || 8,
      speed: updatedCharacter.speed || 30,
      armorClass: baseAC,
      initiative: initiativeValue,
      features: raceFeatures, // Race-based features
      imageUrl: imageUrl || undefined,
      feats: allFeats.length > 0 ? allFeats : undefined,
      languages: finalLanguages,
      toolsProficiencies: updatedCharacter.toolsProficiencies || [],
      equipment: editableCharacter.equipment || "",
      money: editableCharacter.money || { gold: 0, silver: 0, copper: 0 },
      equipmentProficiencies: finalEquipmentProficiencies,
    })
    onClose()
  }

  const handleClose = () => {
    resetAllState()
    onClose()
  }

  const availableSubclasses = selectedClass 
    ? classes.filter(c => c.name === selectedClass).map(c => c.subclass)
    : []

  const isSubclassRequired = selectedClass && availableSubclasses.length > 0 && level >= getSubclassSelectionLevel(selectedClass)

  // Format skill name from database format to display format
  const formatSkillName = (skillName: string): string => {
    return skillName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get skill ability
  const getSkillAbility = (skillName: string): 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' => {
    const skillAbilityMap: Record<string, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = {
      'acrobatics': 'dexterity',
      'animal_handling': 'wisdom',
      'arcana': 'intelligence',
      'athletics': 'strength',
      'deception': 'charisma',
      'history': 'intelligence',
      'insight': 'wisdom',
      'intimidation': 'charisma',
      'investigation': 'intelligence',
      'medicine': 'wisdom',
      'nature': 'intelligence',
      'perception': 'wisdom',
      'performance': 'charisma',
      'persuasion': 'charisma',
      'religion': 'intelligence',
      'sleight_of_hand': 'dexterity',
      'stealth': 'dexterity',
      'survival': 'wisdom'
    }
    return skillAbilityMap[skillName] || 'intelligence'
  }

  // Check if race has choice-based ability score increases
  const hasChoiceASI = mainRaceData?.ability_score_increases && 
    typeof mainRaceData.ability_score_increases === 'object' && 
    !Array.isArray(mainRaceData.ability_score_increases) &&
    mainRaceData.ability_score_increases.type === 'choice'

  // Get choice-based skill options from race features
  const getChoiceSkillOptions = (): string[] => {
    if (!mainRaceData?.features) return []
    const choiceFeature = mainRaceData.features.find((f: any) => 
      f.feature_type === 'skill_proficiency' && 
      f.feature_skill_type === 'choice' &&
      f.skill_options
    )
    return choiceFeature?.skill_options || []
  }

  const updateEditableCharacter = useCallback((updates: Partial<CharacterData>) => {
    setEditableCharacter(prev => ({ ...prev, ...updates }))
  }, [])

  const formatModifier = (mod: number): string => {
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  // Point buy system: Calculate cost for a given ability score (base 8)
  // Cost is 1 point per point for scores 8-13, then 2 points per point for 14-15
  const getPointBuyCost = (score: number): number => {
    if (score < 8) return 0
    if (score <= 13) return score - 8
    if (score <= 15) return 5 + (score - 13) * 2 // 5 points for 8-13, then 2 per point
    return Infinity // Can't go above 15 with point buy
  }

  // Calculate total points spent on ability scores (excluding race/ASI bonuses)
  const getTotalPointsSpent = (): number => {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
    return abilities.reduce((total, ability) => {
      const score = editableCharacter[ability] || POINT_BUY_BASE
      // Get base score (before race/ASI bonuses)
      let raceBonus = abilityScoreChoices
        .filter(c => c.ability === ability)
        .reduce((sum, c) => sum + (c.increase || 0), 0)
      
      // Check for fixed ASI bonus in custom patterns (e.g., Half-Elf +2 CHA)
      if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
        const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
        if (fixedAbility === ability) {
          raceBonus = mainRaceData.ability_score_increases.fixed.increase
        }
      }
      
      // Check for fixed_multi pattern (e.g., Human +1 to all abilities)
      if (mainRaceData?.ability_score_increases?.type === 'fixed_multi' && mainRaceData.ability_score_increases.abilities) {
        const abilities = mainRaceData.ability_score_increases.abilities as Record<string, number>
        if (abilities[ability] && abilities[ability] > 0) {
          raceBonus = abilities[ability]
        }
      }
      
      // Calculate ASI bonuses from selected ASI features
      let asiBonus = 0
      Array.from(asiChoices.entries()).forEach(([featureId, choice]) => {
        if (selectedFeatures.has(featureId) && choice.type === 'ability_scores' && choice.abilityScores) {
          const firstAbility = choice.abilityScores.first?.toLowerCase().trim()
          const secondAbility = choice.abilityScores.second?.toLowerCase().trim()
          
          if (firstAbility === ability) {
            asiBonus += (secondAbility && secondAbility !== firstAbility) ? 1 : 2
          } else if (secondAbility === ability && secondAbility !== firstAbility) {
            asiBonus += 1
          }
        }
      })
      
      const baseScore = Math.max(8, score - raceBonus - asiBonus)
      return total + getPointBuyCost(baseScore)
    }, 0)
  }

  // Character Sidebar Preview
  const CharacterSidebar = useMemo(() => (
    <div className="w-80 border-l bg-card p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      {/* Ability Scores - Display only (editing happens in main step 5) */}
      <Card className="flex flex-col gap-1 bg-card shadow-none">
        <CardHeader>
          <CardTitle className="text-md">Ability Scores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {[
            { key: 'strength', label: 'STR', abbr: 'STR' },
            { key: 'dexterity', label: 'DEX', abbr: 'DEX' },
            { key: 'constitution', label: 'CON', abbr: 'CON' },
            { key: 'intelligence', label: 'INT', abbr: 'INT' },
            { key: 'wisdom', label: 'WIS', abbr: 'WIS' },
            { key: 'charisma', label: 'CHA', abbr: 'CHA' }
          ].map(({ key, label, abbr }) => {
            const value = editableCharacter[key as keyof CharacterData] as number || POINT_BUY_BASE
            const modifier = calculateModifier(value)
            
            // Calculate base score (before race/ASI bonuses)
            let raceBonus = abilityScoreChoices
              .filter(c => c.ability === key)
              .reduce((sum, c) => sum + (c.increase || 0), 0)
            
            // Check for fixed ASI bonus in custom patterns (e.g., Half-Elf +2 CHA)
            if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
              const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
              if (fixedAbility === key) {
                raceBonus = mainRaceData.ability_score_increases.fixed.increase
              }
            }
            
            // Check for fixed_multi pattern (e.g., Human +1 to all abilities)
            if (mainRaceData?.ability_score_increases?.type === 'fixed_multi' && mainRaceData.ability_score_increases.abilities) {
              const abilities = mainRaceData.ability_score_increases.abilities as Record<string, number>
              if (abilities[key] && abilities[key] > 0) {
                raceBonus = abilities[key]
              }
            }
            
            // Calculate ASI bonuses from selected ASI features
            let asiBonus = 0
            Array.from(asiChoices.entries()).forEach(([featureId, choice]) => {
              if (selectedFeatures.has(featureId) && choice.type === 'ability_scores' && choice.abilityScores) {
                const firstAbility = choice.abilityScores.first?.toLowerCase().trim()
                const secondAbility = choice.abilityScores.second?.toLowerCase().trim()
                
                if (firstAbility === key) {
                  asiBonus += (secondAbility && secondAbility !== firstAbility) ? 1 : 2
                } else if (secondAbility === key && secondAbility !== firstAbility) {
                  asiBonus += 1
                }
              }
            })
            
            // Check if this ability has race or ASI modifications
            const hasRaceModification = raceBonus > 0
            const hasASIModification = asiBonus > 0
            const hasAnyModification = hasRaceModification || hasASIModification
            
            return (
              <div key={key} className="flex items-center justify-between gap-2 w-full">
                <Label className="text-sm font-medium w-10 flex justify-start">{label}</Label>
                <div className="flex items-center gap-2 w-full justify-end">
                  <div className={`w-14 h-6 text-xs px-2 text-center flex items-center justify-center border rounded ${hasAnyModification ? 'border-primary border-2 bg-primary/5' : 'border-border'}`}>
                    {value}
                  </div>
                  <Badge 
                    variant={hasAnyModification ? "default" : "secondary"} 
                    className={`text-xs border-0 ${getAbilityModifierColor(abbr)}`}
                  >
                    {formatModifier(modifier)}
                  </Badge>
                </div>
              </div>
            )
          })}
          {/* Show point buy info only on hp_roll step */}
          {step === 'hp_roll' && (
            <div className="pt-2 border-t mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Points Spent:</span>
                <span className={`font-medium ${getTotalPointsSpent() > POINT_BUY_TOTAL ? 'text-destructive' : getTotalPointsSpent() === POINT_BUY_TOTAL ? 'text-green-600' : ''}`}>
                  {getTotalPointsSpent()} / {POINT_BUY_TOTAL}
                </span>
              </div>
              {getTotalPointsSpent() < POINT_BUY_TOTAL && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-green-600">
                    {POINT_BUY_TOTAL - getTotalPointsSpent()} points
                  </span>
                </div>
              )}
              {abilityScoreChoices.length > 0 && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Race Bonus:</span>
                  <span className="font-medium text-primary">
                    +{abilityScoreChoices.reduce((sum, c) => sum + c.increase, 0)}
                  </span>
                </div>
              )}
              {Array.from(asiChoices.values()).map((asiChoice, idx) => (
                <div key={idx}>
                  {asiChoice.type === 'ability_scores' && asiChoice.abilityScores && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">ASI:</span>
                      <span className="font-medium text-primary">
                        +{asiChoice.abilityScores.second ? 2 : 2} ({asiChoice.abilityScores.second ? '+1 to 2 abilities' : '+2 to 1 ability'})
                      </span>
                    </div>
                  )}
                  {asiChoice.type === 'feat' && asiChoice.feat && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Feat:</span>
                      <span className="font-medium text-primary">
                        {asiChoice.feat.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hit Points */}
      <Card className="flex flex-col gap-1 shadow-none">
        <CardHeader>
          <CardTitle className="text-md">Hit Points</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-2">
            <Label className="text-sm font-medium w-full">Max HP</Label>
            <Input
              type="number"
              value={editableCharacter.maxHitPoints || 8}
              onChange={(e) => updateEditableCharacter({ maxHitPoints: parseInt(e.target.value) || 8, currentHitPoints: parseInt(e.target.value) || 8 })}
              className={`w-20 h-6 !text-xs text-center px-2 ${hpRollResult ? 'border-primary' : ''}`}
              min="1"
            />
            {hpRollResult && (
              <Badge variant="default" className="text-xs">
                +{hpRollResult.total}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="flex flex-col gap-2 shadow-none">
        <CardHeader>
          <CardTitle className="text-md">Skills</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(() => {
            const abilityOrder = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
            const sortedSkills = [...(editableCharacter.skills || [])].sort((a, b) => {
              const abilityCompare = abilityOrder.indexOf(a.ability as typeof abilityOrder[number]) - abilityOrder.indexOf(b.ability as typeof abilityOrder[number])
              if (abilityCompare !== 0) return abilityCompare
              return a.name.localeCompare(b.name)
            })

            return abilityOrder.map((abilityKey) => {
              const group = sortedSkills.filter(s => s.ability === abilityKey)
              if (group.length === 0) return null
              const headerName = abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1)
              const abbr = abilityKey.slice(0, 3).toUpperCase()
              return (
                <div key={abilityKey} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="text-xs font-semibold text-muted-foreground">{headerName} ({abbr})</div>
                  {group.map((skill) => {
                    const isProficient = skill.proficiency === 'proficient' || skill.proficiency === 'expertise'
                    return (
                      <div key={skill.name} className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className={isProficient ? "font-medium" : ""}>{skill.name}</span>
                          <span className="text-muted-foreground ml-1">
                            ({skill.ability.slice(0, 3).toUpperCase()})
                          </span>
                        </div>
                        <Badge 
                          variant={isProficient ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {formatModifier(calculateSkillBonus({
                            ...editableCharacter,
                            class: selectedClass || '',
                            level: level || 1,
                            classes: selectedClass ? [{ name: selectedClass, level: level || 1, class_id: selectedClassId || '' }] : []
                          } as CharacterData, skill))}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}
        </CardContent>
      </Card>
    </div>
  ), [editableCharacter, hpRollResult, abilityScoreChoices, asiChoices, updateEditableCharacter])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:user-plus" className="w-5 h-5" />
            Create New Character
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Step {
              step === 'basic_info' ? '1' : 
              step === 'race_selection' ? '2' : 
              step === 'background_selection' ? '3' : 
              step === 'class_selection' ? '4' : 
              step === 'class_features' ? '5' : 
              step === 'hp_roll' ? '6' : 
              '7'
            } of 7
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
            {/* Step 1: Basic Info */}
            {step === 'basic_info' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your character's basic details
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}

                <Card>
                  <CardContent className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter character name"
                      />
                    </div>

                    {/* Alignment */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="alignment">Alignment</Label>
                      <Select value={alignment} onValueChange={setAlignment}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lawful Good">Lawful Good</SelectItem>
                          <SelectItem value="Neutral Good">Neutral Good</SelectItem>
                          <SelectItem value="Chaotic Good">Chaotic Good</SelectItem>
                          <SelectItem value="Lawful Neutral">Lawful Neutral</SelectItem>
                          <SelectItem value="True Neutral">True Neutral</SelectItem>
                          <SelectItem value="Chaotic Neutral">Chaotic Neutral</SelectItem>
                          <SelectItem value="Lawful Evil">Lawful Evil</SelectItem>
                          <SelectItem value="Neutral Evil">Neutral Evil</SelectItem>
                          <SelectItem value="Chaotic Evil">Chaotic Evil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Profile Image */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="imageUrl">Profile Image</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            id="imageUrl"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="flex-1"
                            placeholder="https://... or upload an image"
                          />
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                            id="imageFileInput"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="h-[38px] whitespace-nowrap"
                          >
                            {uploadingImage ? (
                              <>
                                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                        {imageUrl && (
                          <div className="relative w-full h-32 border rounded-md overflow-hidden bg-muted">
                            <img
                              src={imageUrl}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NPC Checkbox */}
                    {((currentUserId === dungeonMasterId && campaignId) || isSuperadmin) && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isNPC"
                          checked={isNPC}
                          onCheckedChange={(checked) => setIsNPC(checked as boolean)}
                        />
                        <Label htmlFor="isNPC" className="text-sm font-normal cursor-pointer">
                          Mark as NPC (will be private and owned by DM)
                        </Label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Race Selection */}
            {step === 'race_selection' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Race Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your character's race and configure race features
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}

                <Card>
                  <CardContent className="flex flex-col gap-4">
                    {/* Race Selection */}
                    <div className="flex flex-col gap-2">
                      <Label>Main Race *</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={raceIds[0]?.id || ""}
                            onValueChange={(value) => {
                              if (value) {
                                const newRaceIds: Array<{id: string, isMain: boolean}> = [
                                  {id: value, isMain: true}, // First race is always main
                                  raceIds[1]
                                ].filter(Boolean) as Array<{id: string, isMain: boolean}>
                                setRaceIds(newRaceIds)
                              } else {
                                // If clearing first race, clear all races
                                // This will trigger the useEffect above to clear Custom Lineage choices and revert changes
                                setRaceIds([])
                              }
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select your character's main race" />
                            </SelectTrigger>
                            <SelectContent>
                              {races.map((race) => (
                                <SelectItem 
                                  key={race.id} 
                                  value={race.id}
                                  disabled={raceIds[1]?.id === race.id}
                                >
                                  {race.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                    {mainRaceData && (
                      <div className="flex flex-col gap-5 px-3 py-3 border rounded-lg bg-background relative">
                        {/* Ability Score Increases */}
                        {mainRaceData.ability_score_increases && (
                          <div className="flex flex-row gap-4 justify-start p-0">
                            {mainRaceData.image_url && (
                              <div className="flex flex-col gap-2 p-0">
                                  <img 
                                    src={mainRaceData.image_url} 
                                    alt={mainRaceData.name}
                                    className="w-20 h-24 rounded-lg object-cover border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                              </div>
                            )} 
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <Label className="text-md font-medium">Ability Score Bonuses</Label>
                              </div>
                              {loadingRaceDetails ? (
                                <div className="text-sm text-muted-foreground">Loading race details...</div>
                              ) : mainRaceData.name === 'Custom Lineage' && Array.isArray(mainRaceData.ability_score_increases?.choices) ? (
                                // Custom Lineage: single +2 choice (handle first to avoid being caught by hasChoiceASI)
                                (() => {
                                  const increaseAmount = mainRaceData.ability_score_increases.choices[0]?.increase || 2
                                  const availableAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
                                  const currentChoice = abilityScoreChoices[0]
                                  
                                  return (
                                    <div className="flex flex-col gap-2">
                                      <Label className="text-sm font-medium">
                                        Choose one ability score to increase by +2
                                      </Label>
                                      <Select
                                        value={currentChoice?.ability || ""}
                                        onValueChange={(value) => {
                                          if (value) {
                                            if (currentChoice) {
                                              removeAbilityScoreChoice(currentChoice.ability)
                                            }
                                            setTimeout(() => {
                                              handleAbilityScoreSelection(value, increaseAmount)
                                            }, 0)
                                          } else {
                                            if (currentChoice) {
                                              removeAbilityScoreChoice(currentChoice.ability)
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[212px] h-8">
                                          <SelectValue placeholder="Select ability (+2)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableAbilities.map((ability) => (
                                            <SelectItem key={ability} value={ability}>
                                              {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )
                                })()
                              ) : hasChoiceASI ? (
                                (() => {
                                  // Check if pattern is defined on choices object (e.g., three_ones, one_plus_two)
                                  const choices = mainRaceData.ability_score_increases.choices || {}
                                  const pattern = choices.pattern || (Array.isArray(mainRaceData.ability_score_increases.options) && mainRaceData.ability_score_increases.options.length > 0 && typeof mainRaceData.ability_score_increases.options[0] === 'object' ? mainRaceData.ability_score_increases.options[0].pattern : null)
                                  
                                  if (pattern) {
                                    // Handle pattern-based choice ASI (like Kender with one_plus_two or three_ones patterns)
                                    const requiredCount = choices.count || 3
                                    const increaseAmount = choices.increase || 1
                                    const description = choices.description || mainRaceData.ability_score_increases.description || `Choose ${requiredCount} ability score increases (an ability can be selected up to 2 times)`
                                    
                                    return (
                                      <div className="flex flex-col gap-2">
                                        <p className="text-sm text-muted-foreground">
                                          {description}
                                        </p>
                                        <div className="flex flex-row gap-4 mt-1">
                                          {Array.from({ length: requiredCount }, (_, i) => i + 1).map((index) => {
                                            // Get all choices with increase matching the pattern's increase amount
                                            const currentChoices = abilityScoreChoices.filter(c => c.increase === increaseAmount)
                                            
                                            // Get the choice for this specific slot (by position in array)
                                            // We maintain order: slot 1 = index 0, slot 2 = index 1, slot 3 = index 2
                                            const currentChoice = currentChoices[index - 1]
                                            
                                            // Get all currently selected abilities in OTHER slots (excluding the current slot)
                                            // This helps us count how many times an ability is selected in other slots
                                            const otherSelectedAbilities = currentChoices
                                              .filter((_, i) => i !== index - 1)
                                              .map(c => c.ability)
                                            
                                            return (
                                              <div key={index} className="flex flex-col gap-2">
                                                <Label className="text-sm font-medium">
                                                  Ability #{index} (+{increaseAmount})
                                                </Label>
                                                <Select
                                                  value={currentChoice?.ability || ""}
                                                  onValueChange={(value) => {
                                                    if (value) {
                                                      // Check if this ability is already selected twice in OTHER slots (not counting current slot)
                                                      const countWithoutCurrent = otherSelectedAbilities.filter(a => a === value).length
                                                      if (countWithoutCurrent >= 2) {
                                                        // Cannot select - already at max (2 times in other slots)
                                                        return
                                                      }
                                                      
                                                      // Remove current choice if exists (at this specific index)
                                                      setAbilityScoreChoices(prev => {
                                                        const choicesToKeep = prev.filter(c => c.increase === increaseAmount)
                                                        const otherChoices = prev.filter(c => c.increase !== increaseAmount)
                                                        const updated = currentChoice
                                                          ? [
                                                              ...choicesToKeep.slice(0, index - 1),
                                                              ...choicesToKeep.slice(index)
                                                            ]
                                                          : choicesToKeep
                                                        
                                                        // Add new choice at the correct position
                                                        updated.splice(index - 1, 0, { ability: value, increase: increaseAmount })
                                                        
                                                        // Recalculate ability scores
                                                        // Reset all abilities to base before applying fixed and choice increases
                                                        const baseScore = POINT_BUY_BASE
                                                        let updatedCharacter: Partial<CharacterData> = {
                                                          ...editableCharacter,
                                                          strength: baseScore,
                                                          dexterity: baseScore,
                                                          constitution: baseScore,
                                                          intelligence: baseScore,
                                                          wisdom: baseScore,
                                                          charisma: baseScore,
                                                        }
                                                        
                                                        if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
                                                          const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
                                                          updatedCharacter[fixedAbility as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
                                                        }
                                                        
                                                        const abilityTotals = [...updated, ...otherChoices].reduce((acc, choice) => {
                                                          const key = choice.ability.toLowerCase()
                                                          acc[key] = (acc[key] || 0) + choice.increase
                                                          return acc
                                                        }, {} as Record<string, number>)
                                                        
                                                        Object.entries(abilityTotals).forEach(([abilityKey, totalIncrease]) => {
                                                          const baseForAbility = (mainRaceData?.ability_score_increases?.type === 'custom' && 
                                                            mainRaceData.ability_score_increases.fixed?.ability.toLowerCase() === abilityKey) 
                                                            ? (baseScore + mainRaceData.ability_score_increases.fixed.increase) 
                                                            : baseScore
                                                          updatedCharacter[abilityKey as keyof CharacterData] = (baseForAbility + totalIncrease) as any
                                                        })
                                                        
                                                        setEditableCharacter(updatedCharacter)
                                                        
                                                        return [...updated, ...otherChoices]
                                                      })
                                                    }
                                                  }}
                                                >
                                                  <SelectTrigger className="w-[212px] h-8">
                                                    <SelectValue placeholder={`Select ability #${index} (+${increaseAmount})`} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                                                      // Count how many times this ability is selected in OTHER slots (excluding current slot)
                                                      const countWithoutCurrent = otherSelectedAbilities.filter(a => a === ability).length
                                                      // Disable if already selected twice in other slots (allow up to 2 times total)
                                                      // Exception: if this ability is already selected in current slot, allow keeping it
                                                      const isDisabled = countWithoutCurrent >= 2 && ability !== currentChoice?.ability
                                                      
                                                      return (
                                                        <SelectItem 
                                                          key={ability} 
                                                          value={ability}
                                                          disabled={isDisabled}
                                                        >
                                                          {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                          {countWithoutCurrent >= 1 && ability !== currentChoice?.ability && ` (${countWithoutCurrent}/2)`}
                                                        </SelectItem>
                                                      )
                                                    })}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  }
                                  
                                  // Generic fallback for choice-based ASI without a pattern
                                  // Supports: count, increase, options (abilities list) or defaults to any ability
                                  const asiConfig = mainRaceData.ability_score_increases
                                  const requiredCount = (typeof asiConfig?.choices?.count === 'number' && asiConfig.choices.count > 0)
                                    ? asiConfig.choices.count
                                    : (typeof asiConfig?.count === 'number' && asiConfig.count > 0 ? asiConfig.count : 1)
                                  const increaseAmount = (typeof asiConfig?.choices?.increase === 'number' && asiConfig.choices.increase > 0)
                                    ? asiConfig.choices.increase
                                    : (typeof asiConfig?.increase === 'number' && asiConfig.increase > 0 ? asiConfig.increase : 1)
                                  const availableAbilities: string[] = Array.isArray(asiConfig?.choices?.options) && asiConfig.choices.options.length > 0
                                    ? asiConfig.choices.options.map((a: any) => String(a).toLowerCase())
                                    : (Array.isArray(asiConfig?.options) && asiConfig.options.length > 0
                                        ? asiConfig.options.map((a: any) => String(a).toLowerCase())
                                        : ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
                                  // Allow selecting the same ability up to twice for +1 patterns
                                  const maxPerAbility = increaseAmount === 1 ? 2 : 1

                                  // Current choices (exclude any fixed ability from custom patterns – not applicable here but safe)
                                  const currentChoices = abilityScoreChoices
                                  const selectedAbilities = currentChoices.map(c => c.ability)

                                  return (
                                    <div className="flex flex-row gap-4 justify-start p-0">
                                      {Array.from({ length: requiredCount }, (_, i) => i).map((index) => {
                                        const currentChoice = currentChoices[index]
                                        const otherSelectedAbilities = currentChoices
                                          .map(c => c?.ability)
                                          .filter((a, idx) => idx !== index && !!a) as string[]
                                        return (
                                          <div key={index} className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium">
                                              Ability #{index + 1} {increaseAmount ? `(+${increaseAmount})` : ''}
                                            </Label>
                                            <Select
                                              value={currentChoice?.ability || ''}
                                              onValueChange={(value) => {
                                                // Replace the choice at this index with the new selection
                                                setAbilityScoreChoices(prev => {
                                                  // Build a copy of prev where slot index holds the selection
                                                  const prevCopy = [...prev]
                                                  // Remove any existing entry at this slot by rebuilding slots sequentially
                                                  const withoutSlots = prevCopy.filter((_, idx) => idx >= requiredCount)
                                                  const slots = prevCopy.slice(0, requiredCount)
                                                  // Ensure slots array has proper length
                                                  while (slots.length < requiredCount) slots.push({ ability: '', increase: increaseAmount })
                                                  // Enforce max-per-ability across slots
                                                  const usedCountElsewhere = slots.filter((c, sIdx) => sIdx !== index && c?.ability === value).length
                                                  if (usedCountElsewhere >= maxPerAbility) {
                                                    return prev // do not apply if this would exceed limit
                                                  }
                                                  const choice = { ability: value, increase: increaseAmount }
                                                  slots[index] = choice
                                                  // Recompute editableCharacter from base with these choices
                                                  const baseScore = POINT_BUY_BASE
                                                  let updatedCharacter: Partial<CharacterData> = {
                                                    ...editableCharacter,
                                                    strength: baseScore,
                                                    dexterity: baseScore,
                                                    constitution: baseScore,
                                                    intelligence: baseScore,
                                                    wisdom: baseScore,
                                                    charisma: baseScore,
                                                  }
                                                  // Apply totals from slots
                                                  const abilityTotals = slots
                                                    .filter(c => c && c.ability)
                                                    .reduce((acc: Record<string, number>, c) => {
                                                      const key = c.ability.toLowerCase()
                                                      acc[key] = (acc[key] || 0) + (c.increase || increaseAmount)
                                                      return acc
                                                    }, {})
                                                  Object.entries(abilityTotals).forEach(([abilityKey, totalIncrease]) => {
                                                    updatedCharacter[abilityKey as keyof CharacterData] = (baseScore + (totalIncrease as number)) as any
                                                  })
                                                  setEditableCharacter(updatedCharacter)
                                                  // Return combined array: slots first (enforcing order), then any extra previous entries after requiredCount
                                                  return [...slots, ...withoutSlots]
                                                })
                                              }}
                                            >
                                              <SelectTrigger className="w-[212px] h-8">
                                                <SelectValue placeholder={`Select ability ${increaseAmount ? `(+${increaseAmount})` : ''}`} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {availableAbilities.map((ability) => {
                                                  const countWithoutCurrent = otherSelectedAbilities.filter(a => a === ability).length
                                                  const disabled = countWithoutCurrent >= maxPerAbility && ability !== currentChoice?.ability
                                                  return (
                                                    <SelectItem key={ability} value={ability} disabled={disabled}>
                                                      {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                    </SelectItem>
                                                  )
                                                })}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })()
                              ) : mainRaceData.ability_score_increases.type === 'custom' ? (
                                <div className="flex flex-row gap-4">
                                  {mainRaceData.ability_score_increases.fixed && (
                                    <div className="text-sm">
                                      <Badge variant="default" className="mr-2">
                                        +{mainRaceData.ability_score_increases.fixed.increase} {mainRaceData.ability_score_increases.fixed.ability}
                                      </Badge>
                                    </div>
                                  )}
                                  {mainRaceData.ability_score_increases.choices && (
                                    <div className="flex flex-col gap-2 pl-4 border-l">
                                      <p className="text-sm text-muted-foreground">
                                        {mainRaceData.ability_score_increases.choices.description || "Choose additional ability score increases:"}
                                      </p>
                                      {mainRaceData.ability_score_increases.choices.pattern ? (
                                        // Handle pattern-based choices (e.g., "one_plus_two", "three_ones")
                                        (() => {
                                          const pattern = mainRaceData.ability_score_increases.choices.pattern
                                          const currentChoices = abilityScoreChoices.filter(c => 
                                            !mainRaceData.ability_score_increases.fixed || 
                                            c.ability !== mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
                                          )
                                          
                                          return (
                                            <div className="flex flex-col gap-3">
                                              {pattern === 'one_plus_two' && (
                                                <>
                                                  <div className="flex flex-col gap-2">
                                                    <Label className="text-sm font-medium">Choose one ability score to increase by +2</Label>
                                                    <Select
                                                      value={currentChoices.find(c => c.increase === 2)?.ability || ""}
                                                      onValueChange={(value) => {
                                                        if (value) {
                                                          const plusTwo = currentChoices.find(c => c.increase === 2)
                                                          if (plusTwo) removeAbilityScoreChoice(plusTwo.ability)
                                                          const existingOne = currentChoices.find(c => c.ability === value && c.increase === 1)
                                                          if (existingOne) {
                                                            removeAbilityScoreChoice(value)
                                                            setTimeout(() => handleAbilityScoreSelection(value, 2), 0)
                                                          } else {
                                                            handleAbilityScoreSelection(value, 2)
                                                          }
                                                        } else {
                                                          const plusTwo = currentChoices.find(c => c.increase === 2)
                                                          if (plusTwo) removeAbilityScoreChoice(plusTwo.ability)
                                                        }
                                                      }}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="Select ability (+2)" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => (
                                                          <SelectItem key={ability} value={ability}>
                                                            {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  <div className="flex flex-col gap-2">
                                                    <Label className="text-sm font-medium">Choose a different ability score to increase by +1</Label>
                                                    <Select
                                                      value={currentChoices.find(c => c.increase === 1)?.ability || ""}
                                                      onValueChange={(value) => {
                                                        if (value) {
                                                          const plusTwo = currentChoices.find(c => c.increase === 2)
                                                          if (plusTwo && plusTwo.ability === value) {
                                                            return
                                                          }
                                                          const plusOne = currentChoices.find(c => c.increase === 1)
                                                          if (plusOne) removeAbilityScoreChoice(plusOne.ability)
                                                          handleAbilityScoreSelection(value, 1)
                                                        } else {
                                                          const plusOne = currentChoices.find(c => c.increase === 1)
                                                          if (plusOne) removeAbilityScoreChoice(plusOne.ability)
                                                        }
                                                      }}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="Select ability (+1)" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
                                                          .filter(ability => {
                                                            const plusTwo = currentChoices.find(c => c.increase === 2)
                                                            return !plusTwo || plusTwo.ability !== ability
                                                          })
                                                          .map((ability) => (
                                                            <SelectItem key={ability} value={ability}>
                                                              {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                            </SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                </>
                                              )}
                                              {pattern === 'three_ones' && (
                                                <>
                                                  {[1, 2, 3].map((index) => {
                                                    const currentChoice = currentChoices[index - 1]
                                                    const selectedAbilities = currentChoices.map(c => c.ability)
                                                    
                                                    return (
                                                      <div key={index} className="flex flex-col gap-2">
                                                        <Label className="text-sm font-medium">Choose ability #{index} to increase by +1</Label>
                                                        <Select
                                                          value={currentChoice?.ability || ""}
                                                          onValueChange={(value) => {
                                                            if (value) {
                                                              if (currentChoice) {
                                                                removeAbilityScoreChoice(currentChoice.ability)
                                                              }
                                                              setTimeout(() => {
                                                                handleAbilityScoreSelection(value, 1)
                                                              }, 0)
                                                            } else {
                                                              if (currentChoice) removeAbilityScoreChoice(currentChoice.ability)
                                                            }
                                                          }}
                                                        >
                                                          <SelectTrigger>
                                                            <SelectValue placeholder={`Select ability #${index} (+1)`} />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
                                                              .filter(ability => !selectedAbilities.includes(ability) || ability === currentChoice?.ability)
                                                              .map((ability) => (
                                                                <SelectItem key={ability} value={ability}>
                                                                  {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                                </SelectItem>
                                                              ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>
                                                    )
                                                  })}
                                                </>
                                              )}
                                              {!pattern && (
                                                <div className="grid grid-cols-2 gap-2">
                                                  {mainRaceData.ability_score_increases.choices.options?.map((ability: string) => {
                                                    const currentChoice = abilityScoreChoices.find(c => c.ability === ability.toLowerCase())
                                                    return (
                                                      <div key={ability} className="flex items-center gap-2">
                                                        <Checkbox
                                                          id={`asi-${ability}`}
                                                          checked={!!currentChoice}
                                                          onCheckedChange={(checked) => {
                                                            if (checked) {
                                                              handleAbilityScoreSelection(ability.toLowerCase(), mainRaceData.ability_score_increases.choices.increase || 1)
                                                            } else {
                                                              removeAbilityScoreChoice(ability.toLowerCase())
                                                            }
                                                          }}
                                                        />
                                                        <Label htmlFor={`asi-${ability}`} className="text-sm cursor-pointer capitalize">
                                                          {ability} +{mainRaceData.ability_score_increases.choices.increase || 1}
                                                        </Label>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })()
                                      ) : mainRaceData.ability_score_increases.choices.options ? (
                                        <div className="grid grid-cols-2 gap-2">
                                          {mainRaceData.ability_score_increases.choices.options.map((ability: string) => {
                                            const currentChoice = abilityScoreChoices.find(c => c.ability === ability.toLowerCase())
                                            return (
                                              <div key={ability} className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`asi-${ability}`}
                                                  checked={!!currentChoice}
                                                  onCheckedChange={(checked) => {
                                                    if (checked) {
                                                      handleAbilityScoreSelection(ability.toLowerCase(), mainRaceData.ability_score_increases.choices.increase || 1)
                                                    } else {
                                                      removeAbilityScoreChoice(ability.toLowerCase())
                                                    }
                                                  }}
                                                />
                                                <Label htmlFor={`asi-${ability}`} className="text-sm cursor-pointer capitalize">
                                                  {ability} +{mainRaceData.ability_score_increases.choices.increase || 1}
                                                </Label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (mainRaceData.ability_score_increases.choices.count || 
                                          (Array.isArray(mainRaceData.ability_score_increases.choices) && 
                                            mainRaceData.ability_score_increases.choices.length > 0)) ? (
                                        // Handle "choose X abilities" pattern (e.g., Half-Elf: choose 2 abilities for +1 each)
                                        (() => {
                                          // Check if choices is an array (new format) or has count property (old format)
                                          let requiredCount: number
                                          let increaseAmount: number
                                          
                                          if (Array.isArray(mainRaceData.ability_score_increases.choices)) {
                                            // New format: choices is an array like [{ ability: "choice", increase: 1 }, ...]
                                            requiredCount = mainRaceData.ability_score_increases.choices.length
                                            increaseAmount = mainRaceData.ability_score_increases.choices[0]?.increase || 1
                                          } else {
                                            // Old format: choices.count and choices.increase
                                            requiredCount = mainRaceData.ability_score_increases.choices.count || 2
                                            increaseAmount = mainRaceData.ability_score_increases.choices.increase || 1
                                          }
                                          
                                          const fixedAbility = mainRaceData.ability_score_increases.fixed?.ability.toLowerCase()
                                          const availableAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
                                            .filter(ability => !fixedAbility || ability !== fixedAbility)
                                          
                                          const currentChoices = abilityScoreChoices.filter(c => 
                                            !fixedAbility || c.ability !== fixedAbility
                                          )
                                          const selectedCount = currentChoices.length
                                          
                                          return (
                                            <div className="flex flex-row gap-4">
                                              {Array.from({ length: requiredCount }, (_, i) => i + 1).map((index) => {
                                                const currentChoice = currentChoices[index - 1]
                                                const selectedAbilities = currentChoices.map(c => c.ability)
                                                
                                                return (
                                                  <div key={index} className="flex flex-col gap-2">
                                                    <Label className="text-sm font-medium">
                                                      Ability #{index}
                                                    </Label>
                                                    <Select
                                                      value={currentChoice?.ability || ""}
                                                      onValueChange={(value) => {
                                                        if (value) {
                                                          if (currentChoice) {
                                                            removeAbilityScoreChoice(currentChoice.ability)
                                                          }
                                                          setTimeout(() => {
                                                            handleAbilityScoreSelection(value, increaseAmount)
                                                          }, 0)
                                                        } else {
                                                          if (currentChoice) {
                                                            removeAbilityScoreChoice(currentChoice.ability)
                                                          }
                                                        }
                                                      }}
                                                    >
                                                      <SelectTrigger className="w-[212px] h-8">
                                                        <SelectValue placeholder={`Select ability`} />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {availableAbilities
                                                          .filter(ability => !selectedAbilities.includes(ability) || ability === currentChoice?.ability)
                                                          .map((ability) => (
                                                            <SelectItem key={ability} value={ability}>
                                                              {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                                            </SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )
                                        })()
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              ) : Array.isArray(mainRaceData.ability_score_increases) ? (
                                <div className="flex flex-row gap-1">
                                  {mainRaceData.ability_score_increases.map((asi: any, index: number) => (
                                    <div key={index} className="text-sm">
                                      <Badge variant="default">
                                        +{asi.increase} {asi.ability}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : mainRaceData.ability_score_increases.type === 'fixed_multi' ? (
                                // Fixed multi-ability format (e.g., Human +1 to all abilities)
                                <div className="flex flex-row gap-1 flex-wrap">
                                  {mainRaceData.ability_score_increases.abilities && Object.entries(mainRaceData.ability_score_increases.abilities).map(([ability, increase]: [string, any]) => {
                                    if (increase > 0) {
                                      return (
                                        <div key={ability} className="text-sm">
                                          <Badge variant="default">
                                            +{increase} {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                          </Badge>
                                        </div>
                                      )
                                    }
                                    return null
                                  })}
                                </div>
                              ) : null}
                            </div>
                        </div>
                      )}

                      {/* Race Features & Proficiencies */}
                      {mainRaceData && mainRaceData.features && (() => {
                        const skillProficiencyFeatures = mainRaceData.features
                          .filter((f: any) => {
                            const featureType = f.feature_type || f.type
                            return featureType === 'skill_proficiency'
                          })
                          .filter((f: any) => {
                            // Only include features that have something to render
                            return (f.feature_skill_type === 'choice' && f.skill_options) || f.feature_skill_type || (Array.isArray(f.skill_options) && f.skill_options.length > 0)
                          })
                        
                        // Get all non-proficiency features (traits, spells, etc.)
                        const otherFeatures = mainRaceData.features
                          .filter((f: any) => {
                            // For Custom Lineage, skip Feat and Variable Trait features (handled separately)
                            if (mainRaceData.name === 'Custom Lineage') {
                              if ((f.type === 'feat' || f.feature_type === 'feat') && f.name === 'Feat') {
                                return false
                              }
                              if ((f.type === 'choice' || f.feature_type === 'choice') && f.name === 'Variable Trait') {
                                return false
                              }
                            }
                            
                            // Skip proficiency features (handled separately)
                            const featureType = f.feature_type || f.type
                            if (featureType === 'skill_proficiency' || 
                                featureType === 'weapon_proficiency' || 
                                featureType === 'tool_proficiency') {
                              return false
                            }
                            // Skip ALL choice features (handled separately in choice section)
                            if (featureType === 'choice') {
                              return false
                            }
                            // Skip Custom Lineage Feat feature (handled separately)
                            if (featureType === 'feat' && f.name === 'Feat') {
                              return false
                            }
                            return true
                          })
                        
                        // Get weapon and tool proficiencies for display
                        const weaponProficiencyFeatures = mainRaceData.features
                          .filter((f: any) => {
                            const featureType = f.feature_type || f.type
                            return featureType === 'weapon_proficiency' && f.weapons && f.weapons.length > 0
                          })
                        
                        const toolProficiencyFeatures = mainRaceData.features
                          .filter((f: any) => {
                            const featureType = f.feature_type || f.type
                            return featureType === 'tool_proficiency' && (
                              (f.tools && f.tools.length > 0) || 
                              (f.tool_choice_type === 'choice' && f.tool_options && f.tool_options.length > 0)
                            )
                          })
                        
                        // Only render if there's something to show
                        if (skillProficiencyFeatures.length === 0 && 
                            otherFeatures.length === 0 && 
                            weaponProficiencyFeatures.length === 0 && 
                            toolProficiencyFeatures.length === 0) {
                          return null
                        }
                        
                        return (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Race Features & Proficiencies</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {/* Other Features (traits, spells, etc.) */}
                              {otherFeatures.map((feature: any, index: number) => (
                                <div key={`feature-${index}`} className="py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 order-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{feature.name}</span>
                                    {feature.feature_type && feature.feature_type !== 'trait' && (
                                      <Badge variant="outline" className="text-xs">{feature.feature_type}</Badge>
                                    )}
                                  </div>
                                  {feature.description && (
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                  )}
                                </div>
                              ))}
                              
                              {/* Weapon Proficiencies */}
                              {weaponProficiencyFeatures.map((feature: any, index: number) => (
                                <div key={`weapon-${index}`} className="py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 order-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Weapon Proficiency</span>
                                  </div>
                                  {feature.description && (
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {feature.weapons.map((weapon: string, weaponIndex: number) => (
                                      <Badge key={weaponIndex} variant="secondary">{weapon}</Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Tool Proficiencies */}
                              {toolProficiencyFeatures.map((feature: any, index: number) => {
                                const featureKey = `tool-feature-${index}`
                                const isChoiceType = feature.tool_choice_type === 'choice'
                                const maxSelections = feature.max_selections || 1
                                const toolOptions = isChoiceType ? (feature.tool_options || []) : (feature.tools || [])
                                const selectedTools = isChoiceType 
                                  ? (toolProficiencyChoices.get(featureKey) || [])
                                  : toolOptions
                                
                                if (isChoiceType) {
                                  const selectedCount = toolProficiencyChoices.get(featureKey)?.length || 0
                                  return (
                                    <div key={`tool-choice-${index}`} className="col-span-2 py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 !order-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Tool Proficiency</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                                      {maxSelections > 1 && (
                                        <p className="text-sm text-muted-foreground">
                                          Select {maxSelections} tool{maxSelections > 1 ? 's' : ''} ({selectedCount}/{maxSelections})
                                        </p>
                                      )}
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        {toolOptions.map((tool: string) => {
                                          const isSelected = selectedTools.includes(tool)
                                          const canSelect = isSelected || selectedCount < maxSelections
                                          
                                          return (
                                            <div key={tool} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                              <Checkbox
                                                id={`tool-${tool}-${index}`}
                                                checked={isSelected}
                                                disabled={!canSelect && !isSelected}
                                                onCheckedChange={(checked) => 
                                                  handleToolProficiencySelection(tool, checked as boolean, maxSelections, featureKey, toolOptions)
                                                }
                                              />
                                              <Label htmlFor={`tool-${tool}-${index}`} className="text-sm cursor-pointer">
                                                {tool}
                                              </Label>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                }
                                
                                return (
                                <div key={`tool-${index}`} className="py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 order-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Tool Proficiency</span>
                                  </div>
                                  {feature.description && (
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {feature.tools.map((tool: string, toolIndex: number) => (
                                      <Badge key={toolIndex} variant="secondary">{tool}</Badge>
                                    ))}
                                  </div>
                                </div>
                                )
                              })}
                              
                              {/* Skill Proficiencies */}
                              {skillProficiencyFeatures.map((feature: any, index: number) => {
                                if (feature.feature_skill_type === 'choice' && feature.skill_options) {
                                  const maxSelections = feature.max_selections || 1
                                  const selectedCount = selectedProficiencies.skills.filter(s => 
                                    feature.skill_options.some((opt: string) => opt.toLowerCase().replace(/\s+/g, '_') === s)
                                  ).length
                                  
                                  return (
                                    <div key={`skill-choice-${index}`} className="col-span-2 py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 !order-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Skill Proficiency</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                                      {maxSelections > 1 && (
                                        <p className="text-sm text-muted-foreground">
                                          Select {maxSelections} skill{maxSelections > 1 ? 's' : ''} ({selectedCount}/{maxSelections})
                                        </p>
                                      )}
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        {feature.skill_options.map((skill: string) => {
                                          const skillInDbFormat = skill.toLowerCase().replace(/\s+/g, '_')
                                          const isSelected = selectedProficiencies.skills.includes(skillInDbFormat)
                                          const canSelect = isSelected || selectedCount < maxSelections
                                          
                                          return (
                                            <div key={skill} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                              <Checkbox
                                                id={`skill-${skill}`}
                                                checked={isSelected}
                                                disabled={!canSelect && !isSelected}
                                                onCheckedChange={(checked) => 
                                                  handleSkillProficiencySelection(skill, checked as boolean, maxSelections, feature.skill_options)
                                                }
                                              />
                                              <Label htmlFor={`skill-${skill}`} className="text-sm cursor-pointer">
                                                {skill}
                                              </Label>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                } else if (Array.isArray(feature.skill_options) && feature.feature_skill_type !== 'choice' && feature.skill_options.length > 0) {
                                  return (
                                    <div key={`skill-fixed-multi-${index}`} className="py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 order-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Skill Proficiency</span>
                                      </div>
                                      {feature.description && (
                                        <p className="text-sm text-muted-foreground mb-1">{feature.description}</p>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {feature.skill_options.map((skill: string, sIdx: number) => (
                                          <Badge key={sIdx} variant="secondary">{skill}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                } else if (feature.feature_skill_type) {
                                  return (
                                    <div key={`skill-fixed-${index}`} className="py-3 px-4 border rounded-lg bg-card flex flex-col gap-2 order-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Skill Proficiency</span>
                                      </div>
                                      {feature.description && (
                                        <p className="text-sm text-muted-foreground mb-1">{feature.description}</p>
                                      )}
                                      <Badge variant="secondary">{feature.feature_skill_type}</Badge>
                                    </div>
                                  )
                                }
                                return null
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Race Choice Features (Generic Handler) */}
                      {mainRaceData && mainRaceData.features && (() => {
                        // Find all choice features (excluding Custom Lineage which is handled separately)
                        const choiceFeatures = mainRaceData.features.filter((f: any) => {
                          const featureType = f.feature_type || f.type
                          // Exclude Custom Lineage Variable Trait as it's handled in Custom Lineage section
                          if (mainRaceData.name === 'Custom Lineage' && f.name === 'Variable Trait') {
                            return false
                          }
                          return featureType === 'choice' && f.options && Array.isArray(f.options) && f.options.length > 0
                        })
                        
                        if (choiceFeatures.length === 0) {
                          return null
                        }
                        
                        return choiceFeatures.map((choiceFeature: any, featureIndex: number) => {
                          const featureKey = choiceFeature.name || `choice-feature-${featureIndex}`
                          const currentSelection = raceChoiceSelections.get(featureKey) || 
                            (choiceFeature.name === 'Half-Elf Versatility' ? halfElfVersatilityChoice : null)
                          
                          return (
                          <div key={featureKey} className="flex flex-col gap-2">
                            <Label className="text-md font-medium">
                              {choiceFeature.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {choiceFeature.description}
                            </p>
                            <Select
                              value={currentSelection?.optionName || ""}
                              onValueChange={(value) => {
                                if (value && choiceFeature.options) {
                                  const selectedOption = choiceFeature.options.find((opt: any) => opt.name === value)
                                  if (selectedOption) {
                                    const newSelection = {
                                      optionName: selectedOption.name,
                                      option: selectedOption,
                                      selectedSkills: selectedOption.type === 'skill_proficiency' && selectedOption.skill_choice === 'any' 
                                        ? [] 
                                        : undefined
                                    }
                                    
                                    // Update raceChoiceSelections
                                    setRaceChoiceSelections(prev => {
                                      const newMap = new Map(prev)
                                      newMap.set(featureKey, newSelection)
                                      return newMap
                                    })
                                    
                                    // Also update Half-Elf Versatility for backward compatibility
                                    if (choiceFeature.name === 'Half-Elf Versatility') {
                                      setHalfElfVersatilityChoice(newSelection)
                                    }
                                    
                                    // Apply immediate effects based on option type
                                    if (selectedOption.type === 'weapon_proficiency' && selectedOption.weapons) {
                                      // Apply weapon proficiencies
                                      const updatedProficiencies = { ...selectedProficiencies }
                                      selectedOption.weapons.forEach((weapon: string) => {
                                        const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                        if (!updatedProficiencies.equipment.includes(weaponKey)) {
                                          updatedProficiencies.equipment.push(weaponKey)
                                        }
                                      })
                                      setSelectedProficiencies(updatedProficiencies)
                                      
                                      // Update editable character equipment proficiencies
                                      setEditableCharacter(prev => ({
                                        ...prev,
                                        equipmentProficiencies: {
                                          ...prev.equipmentProficiencies,
                                          ...Object.fromEntries(
                                            selectedOption.weapons.map((weapon: string) => {
                                              const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                              return [weaponKey, true]
                                            })
                                          )
                                        } as any
                                      }))
                                    } else if (selectedOption.type === 'trait' && selectedOption.speed_bonus) {
                                      // Apply speed bonus
                                      setEditableCharacter(prev => ({
                                        ...prev,
                                        speed: (prev.speed || 30) + selectedOption.speed_bonus
                                      }))
                                    }
                                  }
                                } else {
                                  // Clear selection and revert changes
                                  if (currentSelection?.option.type === 'weapon_proficiency') {
                                    // Remove weapon proficiencies
                                    const updatedProficiencies = { ...selectedProficiencies }
                                    currentSelection.option.weapons?.forEach((weapon: string) => {
                                      const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                      updatedProficiencies.equipment = updatedProficiencies.equipment.filter(w => w !== weaponKey)
                                    })
                                    setSelectedProficiencies(updatedProficiencies)
                                    
                                    setEditableCharacter(prev => ({
                                      ...prev,
                                      equipmentProficiencies: {
                                        ...prev.equipmentProficiencies,
                                        ...Object.fromEntries(
                                          currentSelection.option.weapons?.map((weapon: string) => {
                                            const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                            return [weaponKey, false]
                                          }) || []
                                        )
                                      } as any
                                    }))
                                  } else if (currentSelection?.option.type === 'trait' && currentSelection.option.speed_bonus) {
                                    // Revert speed bonus
                                    setEditableCharacter(prev => ({
                                      ...prev,
                                      speed: (prev.speed || 35) - currentSelection.option.speed_bonus
                                    }))
                                  }
                                  
                                  // Clear from raceChoiceSelections
                                  setRaceChoiceSelections(prev => {
                                    const newMap = new Map(prev)
                                    newMap.delete(featureKey)
                                    return newMap
                                  })
                                  
                                  // Also clear Half-Elf Versatility for backward compatibility
                                  if (choiceFeature.name === 'Half-Elf Versatility') {
                                    setHalfElfVersatilityChoice(null)
                                  }
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select a ${choiceFeature.name} option`} />
                              </SelectTrigger>
                              <SelectContent>
                                {choiceFeature.options.map((option: any) => (
                                  <SelectItem key={option.name} value={option.name}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>

                            {/* Show selected option description */}
                            {currentSelection && (
                              <div className="text-sm py-3 px-4 flex flex-col gap-2 border rounded-lg bg-card">
                                <div className="font-medium">{currentSelection.option.name}</div>
                                <p className="text-sm text-muted-foreground">{currentSelection.option.description}</p>
                                {/* Skill Selection for Skill Versatility option */}
                                {currentSelection?.option.type === 'skill_proficiency' && 
                                currentSelection.option.skill_choice === 'any' && (
                                  <div className="flex flex-col gap-3 mt-1">
                                    <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                                      {SKILL_OPTIONS.map((skill) => {
                                        const isSelected = currentSelection.selectedSkills?.includes(skill.value) || false
                                        const canSelect = isSelected || (currentSelection.selectedSkills?.length || 0) < (currentSelection.option.skill_count || 2)
                                        
                                        return (
                                          <div key={skill.value} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                              id={`${featureKey}-skill-${skill.value}`}
                                              checked={isSelected}
                                              disabled={!canSelect && !isSelected}
                                              onCheckedChange={(checked) => {
                                                if (!currentSelection) return
                                                
                                                const currentSkills = currentSelection.selectedSkills || []
                                                const newSkills = checked
                                                  ? [...currentSkills, skill.value]
                                                  : currentSkills.filter(s => s !== skill.value)
                                                
                                                const updatedSelection = {
                                                  ...currentSelection,
                                                  selectedSkills: newSkills
                                                }
                                                
                                                setRaceChoiceSelections(prev => {
                                                  const newMap = new Map(prev)
                                                  newMap.set(featureKey, updatedSelection)
                                                  return newMap
                                                })
                                                
                                                // Also update Half-Elf Versatility for backward compatibility
                                                if (choiceFeature.name === 'Half-Elf Versatility') {
                                                  setHalfElfVersatilityChoice(updatedSelection)
                                                }
                                                
                                                // Also update selected proficiencies and editable character skills
                                                const updatedProficiencies = { ...selectedProficiencies }
                                                if (checked) {
                                                  if (!updatedProficiencies.skills.includes(skill.value)) {
                                                    updatedProficiencies.skills.push(skill.value)
                                                  }
                                                } else {
                                                  updatedProficiencies.skills = updatedProficiencies.skills.filter(s => s !== skill.value)
                                                }
                                                setSelectedProficiencies(updatedProficiencies)
                                                
                                                // Update editable character skills
                                                const updatedSkills = editableCharacter.skills?.map(s => {
                                                  const skillInDbFormat = s.name.toLowerCase().replace(/\s+/g, '_')
                                                  if (skillInDbFormat === skill.value) {
                                                    return { ...s, proficiency: checked ? 'proficient' as const : 'none' as const }
                                                  }
                                                  return s
                                                }) || createDefaultSkills()
                                                setEditableCharacter(prev => ({ ...prev, skills: updatedSkills }))
                                              }}
                                            />
                                            <Label htmlFor={`${featureKey}-skill-${skill.value}`} className="text-sm font-normal cursor-pointer">
                                              {skill.label}
                                            </Label>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                          </div>
                          )
                        })
                      })()}

                      {/* Custom Lineage Choices */}
                      {mainRaceData?.name === 'Custom Lineage' && (
                        <div className="flex flex-col gap-4">
                          {/* Size Selection */}
                          <div className="flex flex-col gap-1">
                            <Label className="text-md font-medium">Size</Label>
                            <p className="text-xs text-muted-foreground">
                              You are Small or Medium (your choice).
                            </p>
                            <div className="flex flex-row gap-2 mt-1">
                              <Select
                                value={customLineageChoices?.size || ""}
                                onValueChange={(value) => {
                                  setCustomLineageChoices(prev => ({
                                    ...prev || {},
                                    size: value as 'Small' | 'Medium'
                                  }))
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Small">Small</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Feat Selection */}
                          <div className="flex flex-col gap-1">
                            <Label className="text-md font-medium">Feat</Label>
                            <p className="text-xs text-muted-foreground">
                              You gain one feat of your choice for which you qualify.
                            </p>
                            {customLineageChoices?.feat ? (
                              <div className="bg-card flex items-start justify-between p-3 border rounded-lg mt-1">
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="font-medium text-sm">{customLineageChoices.feat.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {customLineageChoices.feat.description || "No description"}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingFeatIndex(null)
                                    setEditingFeatForFeatureId('custom-lineage-feat')
                                    setFeatEditModalOpen(true)
                                  }}
                                  className="w-8 h-8 p-0 ml-2"
                                >
                                  <Icon icon="lucide:edit" className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setEditingFeatIndex(null)
                                  setEditingFeatForFeatureId('custom-lineage-feat')
                                  setFeatEditModalOpen(true)
                                }}
                                size="sm"
                                variant="outline"
                                className="w-fit mt-1"
                              >
                                <Icon icon="lucide:plus" className="w-4 h-4" />
                                Add Feat
                              </Button>
                            )}
                          </div>

                          {/* Variable Trait Selection */}
                          <div className="flex flex-col gap-1">
                            <Label className="text-md font-medium">Variable Trait</Label>
                            <p className="text-xs text-muted-foreground">
                              You gain one of the following options of your choice: Darkvision with a range of 60 feet, or Proficiency in one skill of your choice.
                            </p>

                            <div className="flex flex-row gap-2 mt-1">
                            <Select
                              value={customLineageChoices?.variableTrait || ""}
                              onValueChange={(value) => {
                                setCustomLineageChoices(prev => ({
                                  ...prev || {},
                                  variableTrait: value as 'darkvision' | 'skill_proficiency' | null,
                                  selectedSkill: value === 'skill_proficiency' ? prev?.selectedSkill || null : null
                                }))
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select variable trait" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="darkvision">Darkvision (60 feet)</SelectItem>
                                <SelectItem value="skill_proficiency">Skill Proficiency</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Skill Selection if Skill Proficiency chosen */}
                            {customLineageChoices?.variableTrait === 'skill_proficiency' && (
                              <div className="flex flex-col gap-2">
                                <Select
                                  value={customLineageChoices.selectedSkill || ""}
                                  onValueChange={(value) => {
                                    const previousSkill = customLineageChoices?.selectedSkill
                                    
                                    // Remove previous skill from proficiencies if it exists
                                    if (previousSkill) {
                                      const skillInDbFormat = previousSkill.toLowerCase().replace(/\s+/g, '_')
                                      // Remove from selectedProficiencies
                                      setSelectedProficiencies(prev => ({
                                        ...prev,
                                        skills: prev.skills.filter(s => s !== skillInDbFormat)
                                      }))
                                      // Remove proficiency from editableCharacter skills
                                      setEditableCharacter(prev => ({
                                        ...prev,
                                        skills: prev.skills?.map(skill => {
                                          const skillNameInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
                                          if (skillNameInDbFormat === skillInDbFormat) {
                                            // Only remove if it's not from a class
                                            const isClassSkill = characterClasses.some(charClass => 
                                              charClass.selectedSkillProficiencies?.some(s => 
                                                s.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat
                                              )
                                            )
                                            if (!isClassSkill) {
                                              return { ...skill, proficiency: 'none' as const }
                                            }
                                          }
                                          return skill
                                        }) || []
                                      }))
                                    }
                                    
                                    // Add new skill to proficiencies
                                    if (value) {
                                      const skillInDbFormat = value.toLowerCase().replace(/\s+/g, '_')
                                      // Add to selectedProficiencies
                                      setSelectedProficiencies(prev => ({
                                        ...prev,
                                        skills: [...prev.skills.filter(s => s !== skillInDbFormat), skillInDbFormat]
                                      }))
                                      
                                      // Add/update proficiency in editableCharacter skills
                                      setEditableCharacter(prev => {
                                        const currentSkills = prev.skills || createDefaultSkills()
                                        const skillName = SKILL_OPTIONS.find(s => s.value === value)?.label || value
                                        const skillAbility = getSkillAbility(value)
                                        const existingSkill = currentSkills.find(s => 
                                          s.name.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat
                                        )
                                        
                                        if (existingSkill) {
                                          // Update existing skill proficiency (upgrade to proficient or expertise if already proficient)
                                          const updatedSkills = currentSkills.map(skill => {
                                            if (skill.name.toLowerCase().replace(/\s+/g, '_') === skillInDbFormat) {
                                              if (skill.proficiency === 'proficient') {
                                                return { ...skill, proficiency: 'expertise' as const }
                                              } else {
                                                return { ...skill, proficiency: 'proficient' as const }
                                              }
                                            }
                                            return skill
                                          })
                                          return { ...prev, skills: updatedSkills }
                                        } else {
                                          // Add new skill
                                          return {
                                            ...prev,
                                            skills: [...currentSkills, {
                                              name: skillName,
                                              ability: skillAbility,
                                              proficiency: 'proficient' as const
                                            }]
                                          }
                                        }
                                      })
                                    }
                                    
                                    setCustomLineageChoices(prev => ({
                                      ...prev || {},
                                      selectedSkill: value || null
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select a skill" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SKILL_OPTIONS.map((skill) => (
                                      <SelectItem key={skill.value} value={skill.value}>
                                        {skill.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            </div>
                          </div>

                          {/* Language Selection */}
                          <div className="flex flex-col gap-1">
                            <Label className="text-md font-medium">Additional Language</Label>
                            <p className="text-xs text-muted-foreground">
                              You can speak, read, and write Common and one other language that you and your DM agree is appropriate for your character.
                            </p>
                            <Input
                              className="mt-1"
                              value={customLineageChoices?.selectedLanguage || ""}
                              onChange={(e) => {
                                setCustomLineageChoices(prev => ({
                                  ...prev || {},
                                  selectedLanguage: e.target.value || null
                                }))
                              }}
                              placeholder="Enter language name (e.g., Elvish, Dwarvish)"
                            />
                          </div>
                        </div>
                      )}
                      </div>
                    )}

                    {/* Secondary Race Selection */}
                    {raceIds.length > 0 && (
                      <div className="flex flex-col gap-2 mt-4">
                        <Label>Secondary Race</Label>
                        <p className="text-xs text-muted-foreground">Select a secondary race for your character. This will not have any effects on your character's abilities or skills, but will be used for lore and flavor.</p>
                        <Select
                          value={raceIds[1]?.id || undefined}
                          onValueChange={(value) => {
                            if (value && value !== "__clear__") {
                              // Second race is always not main (just for lore)
                              const newRaceIds: Array<{id: string, isMain: boolean}> = [
                                {id: raceIds[0]?.id || "", isMain: true}, // First race is always main
                                {id: value, isMain: false} // Second race is always not main
                              ]
                              setRaceIds(newRaceIds)
                            } else if (value === "__clear__") {
                              // If clearing second race, keep first race as main
                              setRaceIds(raceIds[0] ? [{...raceIds[0], isMain: true}] : [])
                            }
                          }}
                          disabled={loading}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select secondary race (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__clear__">None</SelectItem>
                            {races.map((race) => (
                              <SelectItem 
                                key={race.id} 
                                value={race.id}
                                disabled={raceIds[0]?.id === race.id}
                              >
                                {race.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

            {/* Step 3: Background Selection */}
            {step === 'background_selection' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Background Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your character's background and configure background features
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}

                <Card>
                  <CardContent className="flex flex-col gap-4">
                    {/* Background Selection */}
                    <div className="flex flex-col gap-2">
                      <Label>Background *</Label>
                      <Select
                        value={selectedBackgroundId || ""}
                        onValueChange={(value) => {
                          if (value) {
                            // Clear all previous background choices when changing background
                            setBackgroundSkillChoices([])
                            setBackgroundToolChoices([])
                            setBackgroundLanguageChoices([])
                            setBackgroundDefiningEvents([])
                            setBackgroundPersonalityTraits([])
                            setBackgroundIdeals([])
                            setBackgroundBonds([])
                            setBackgroundFlaws([])
                            // Set new background
                            setSelectedBackgroundId(value)
                            loadSelectedBackgroundDetails(value)
                          } else {
                            setSelectedBackgroundId(null)
                            setSelectedBackgroundData(null)
                            setBackground("")
                            setBackgroundSkillChoices([])
                            setBackgroundToolChoices([])
                            setBackgroundLanguageChoices([])
                            setBackgroundDefiningEvents([])
                            setBackgroundPersonalityTraits([])
                            setBackgroundIdeals([])
                            setBackgroundBonds([])
                            setBackgroundFlaws([])
                          }
                        }}
                        disabled={loading || loadingBackgroundDetails}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingBackgroundDetails ? "Loading background details..." : "Select a background"} />
                        </SelectTrigger>
                        <SelectContent>
                          {backgrounds.map((bg) => (
                            <SelectItem key={bg.id} value={bg.id}>
                              {bg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Background Details */}
                    {selectedBackgroundData && (
                      <div className="flex flex-col gap-4 px-3 py-3 border rounded-lg bg-background">
                        {/* Description */}
                        {selectedBackgroundData.description && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Description</Label>
                            <div className="text-sm text-muted-foreground">
                              <RichTextDisplay content={selectedBackgroundData.description} />
                            </div>
                          </div>
                        )}

                        {/* Skill Proficiencies */}
                        {selectedBackgroundData.skill_proficiencies && (() => {
                          const skillsData = (() => {
                            if (Array.isArray(selectedBackgroundData.skill_proficiencies)) {
                              return { fixed: selectedBackgroundData.skill_proficiencies, choice: undefined, available: [] }
                            }
                            if (selectedBackgroundData.skill_proficiencies && typeof selectedBackgroundData.skill_proficiencies === 'object' && !Array.isArray(selectedBackgroundData.skill_proficiencies)) {
                              const skillsObj = selectedBackgroundData.skill_proficiencies as any
                              const fixed = skillsObj.fixed || []
                              const available = skillsObj.available || []
                              const choice = skillsObj.choice || undefined
                              const fromSelected = choice?.from_selected || false
                              
                              // If from_selected is true and there's no available array,
                              // the fixed array contains the choice options (not actual fixed skills)
                              // Example: Haunted One - fixed: [4 skills], choice: {count: 2, from_selected: true}, no available
                              if (fromSelected && available.length === 0 && fixed.length > 0) {
                                return {
                                  fixed: [], // No actual fixed skills
                                  available: fixed, // Fixed array is actually the available options
                                  choice: choice
                                }
                              }
                              
                              return {
                                fixed: fixed,
                                available: available,
                                choice: choice
                              }
                            }
                            return { fixed: [], available: [], choice: undefined }
                          })()

                          const fixedSkills = skillsData.fixed || []
                          const availableSkills = skillsData.available || []
                          const hasChoice = !!skillsData.choice
                          const choiceCount = skillsData.choice?.count || 1
                          const fromSelected = skillsData.choice?.from_selected || false

                          return (
                            <div className="flex flex-col gap-2">
                              <Label className="text-md font-medium">Skill Proficiencies</Label>
                              {fixedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {fixedSkills.map((skill: string) => (
                                    <Badge key={skill} variant="secondary">{SKILL_OPTIONS.find(s => s.value === skill)?.label || skill}</Badge>
                                  ))}
                                </div>
                              )}
                              {hasChoice && (
                                <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
                                  <p className="text-sm text-muted-foreground">
                                    Choose {choiceCount} skill{choiceCount > 1 ? 's' : ''} {fromSelected && availableSkills.length > 0 ? `from the ${availableSkills.length} skill${availableSkills.length > 1 ? 's' : ''} below` : 'from all available skills'}
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(fromSelected && availableSkills.length > 0 ? availableSkills : SKILL_OPTIONS.map(s => s.value))
                                      .filter((skill: string) => !fixedSkills.includes(skill))
                                      .map((skill: string) => {
                                        const skillOption = SKILL_OPTIONS.find(s => s.value === skill)
                                        if (!skillOption) return null
                                        const isSelected = backgroundSkillChoices.includes(skill)
                                        const canSelect = isSelected || backgroundSkillChoices.length < choiceCount
                                        
                                        return (
                                          <div key={skill} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                              id={`bg-skill-${skill}`}
                                              checked={isSelected}
                                              disabled={!canSelect && !isSelected}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  if (backgroundSkillChoices.length < choiceCount) {
                                                    setBackgroundSkillChoices([...backgroundSkillChoices, skill])
                                                  }
                                                } else {
                                                  setBackgroundSkillChoices(backgroundSkillChoices.filter(s => s !== skill))
                                                }
                                              }}
                                            />
                                            <Label htmlFor={`bg-skill-${skill}`} className="text-sm cursor-pointer">
                                              {skillOption.label}
                                            </Label>
                                          </div>
                                        )
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* Tool Proficiencies */}
                        {selectedBackgroundData.tool_proficiencies && (() => {
                          const toolsData = (() => {
                            if (Array.isArray(selectedBackgroundData.tool_proficiencies)) {
                              return { fixed: selectedBackgroundData.tool_proficiencies, choice: undefined, available: [] }
                            }
                            if (selectedBackgroundData.tool_proficiencies && typeof selectedBackgroundData.tool_proficiencies === 'object' && !Array.isArray(selectedBackgroundData.tool_proficiencies)) {
                              const toolsObj = selectedBackgroundData.tool_proficiencies as any
                              const fixed = toolsObj.fixed || []
                              const available = toolsObj.available || []
                              const choice = toolsObj.choice || undefined
                              const fromSelected = choice?.from_selected || false
                              
                              // If from_selected is true and there's no available array,
                              // the fixed array contains the choice options (not actual fixed tools)
                              if (fromSelected && available.length === 0 && fixed.length > 0) {
                                return {
                                  fixed: [], // No actual fixed tools
                                  available: fixed, // Fixed array is actually the available options
                                  choice: choice
                                }
                              }
                              
                              return {
                                fixed: fixed,
                                available: available,
                                choice: choice
                              }
                            }
                            return { fixed: [], available: [], choice: undefined }
                          })()

                          const fixedTools = toolsData.fixed || []
                          const availableTools = toolsData.available || []
                          const hasChoice = !!toolsData.choice
                          const choiceCount = toolsData.choice?.count || 1
                          const fromSelected = toolsData.choice?.from_selected || false

                          const TOOL_OPTIONS = [
                            { value: 'thieves_tools', label: 'Thieves\' Tools' },
                            { value: 'artisans_tools', label: 'Artisan\'s Tools' },
                            { value: 'tinkers_tools', label: 'Tinker\'s Tools' },
                            { value: 'alchemists_supplies', label: 'Alchemist\'s Supplies' },
                            { value: 'herbalism_kit', label: 'Herbalism Kit' },
                            { value: 'poisoners_kit', label: 'Poisoner\'s Kit' },
                            { value: 'disguise_kit', label: 'Disguise Kit' },
                            { value: 'forgery_kit', label: 'Forgery Kit' },
                            { value: 'navigators_tools', label: 'Navigator\'s Tools' },
                            { value: 'musical_instruments', label: 'Musical Instruments' },
                            { value: 'gaming_set', label: 'Gaming Set' },
                            { value: 'vehicles_land', label: 'Vehicles (Land)' },
                            { value: 'vehicles_water', label: 'Vehicles (Water)' }
                          ]

                          return (
                            <div className="flex flex-col gap-2">
                              <Label className="text-md font-medium">Tool Proficiencies</Label>
                              {fixedTools.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {fixedTools.map((tool: string) => (
                                    <Badge key={tool} variant="secondary">{TOOL_OPTIONS.find(t => t.value === tool)?.label || tool}</Badge>
                                  ))}
                                </div>
                              )}
                              {hasChoice && (
                                <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
                                  <p className="text-sm text-muted-foreground">
                                    Choose {choiceCount} tool{choiceCount > 1 ? 's' : ''} {fromSelected && availableTools.length > 0 ? `from the ${availableTools.length} tool${availableTools.length > 1 ? 's' : ''} below` : 'from all available tools'}
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(fromSelected && availableTools.length > 0 ? availableTools : TOOL_OPTIONS.map(t => t.value))
                                      .filter((tool: string) => !fixedTools.includes(tool))
                                      .map((tool: string) => {
                                        const toolOption = TOOL_OPTIONS.find(t => t.value === tool)
                                        if (!toolOption) return null
                                        const isSelected = backgroundToolChoices.includes(tool)
                                        const canSelect = isSelected || backgroundToolChoices.length < choiceCount
                                        
                                        return (
                                          <div key={tool} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                              id={`bg-tool-${tool}`}
                                              checked={isSelected}
                                              disabled={!canSelect && !isSelected}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  if (backgroundToolChoices.length < choiceCount) {
                                                    setBackgroundToolChoices([...backgroundToolChoices, tool])
                                                  }
                                                } else {
                                                  setBackgroundToolChoices(backgroundToolChoices.filter(t => t !== tool))
                                                }
                                              }}
                                            />
                                            <Label htmlFor={`bg-tool-${tool}`} className="text-sm cursor-pointer">
                                              {toolOption.label}
                                            </Label>
                                          </div>
                                        )
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* Languages */}
                        {selectedBackgroundData.languages && (() => {
                          const langsData = (() => {
                            if (Array.isArray(selectedBackgroundData.languages)) {
                              return { fixed: selectedBackgroundData.languages, choice: undefined }
                            }
                            if (selectedBackgroundData.languages && typeof selectedBackgroundData.languages === 'object' && !Array.isArray(selectedBackgroundData.languages)) {
                              const langsObj = selectedBackgroundData.languages as any
                              return {
                                fixed: langsObj.fixed || [],
                                choice: langsObj.choice || undefined
                              }
                            }
                            return { fixed: [], choice: undefined }
                          })()

                          const fixedLangs = langsData.fixed || []
                          const hasChoice = !!langsData.choice
                          const choiceCount = langsData.choice?.count || 1

                          return (
                            <div className="flex flex-col gap-2">
                              <Label className="text-md font-medium">Languages</Label>
                              {fixedLangs.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {fixedLangs.map((lang: string) => (
                                    <Badge key={lang} variant="secondary">{lang}</Badge>
                                  ))}
                                </div>
                              )}
                              {hasChoice && (
                                <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
                                  <p className="text-sm text-muted-foreground">
                                    Choose {choiceCount} additional language{choiceCount > 1 ? 's' : ''}
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    {Array.from({ length: choiceCount }, (_, i) => i).map((index) => (
                                      <Input
                                        key={index}
                                        value={backgroundLanguageChoices[index] || ""}
                                        onChange={(e) => {
                                          const newChoices = [...backgroundLanguageChoices]
                                          newChoices[index] = e.target.value
                                          setBackgroundLanguageChoices(newChoices.filter(l => l.trim() !== ""))
                                        }}
                                        placeholder={`Language ${index + 1}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* Equipment */}
                        {selectedBackgroundData.equipment && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Equipment</Label>
                            <div className="text-sm text-muted-foreground">
                              <RichTextDisplay content={selectedBackgroundData.equipment} />
                            </div>
                          </div>
                        )}

                        {/* Money */}
                        {selectedBackgroundData.money && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Starting Money</Label>
                            <div className="flex gap-4 text-sm">
                              {selectedBackgroundData.money.gold > 0 && (
                                <span>{selectedBackgroundData.money.gold} gp</span>
                              )}
                              {selectedBackgroundData.money.silver > 0 && (
                                <span>{selectedBackgroundData.money.silver} sp</span>
                              )}
                              {selectedBackgroundData.money.copper > 0 && (
                                <span>{selectedBackgroundData.money.copper} cp</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Numbered Items - Defining Events */}
                        {selectedBackgroundData.defining_events && selectedBackgroundData.defining_events.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">
                              {selectedBackgroundData.defining_events_title || 'Background Setup'}
                            </Label>
                            <p className="text-xs text-muted-foreground">Choose or roll for 1 defining event</p>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const selectedEvent = backgroundDefiningEvents[0]
                                return (
                                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Badge variant="outline">Event</Badge>
                                    <div className="flex-1">
                                      {selectedEvent ? (
                                        <span className="text-sm">{selectedEvent.text}</span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Not selected</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedEvent?.number.toString() || ""}
                                        onValueChange={(value) => {
                                          const event = selectedBackgroundData.defining_events?.find((e: any) => e.number === parseInt(value))
                                          if (event) {
                                            setBackgroundDefiningEvents([{ number: event.number, text: event.text }])
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[200px]">
                                          <SelectValue placeholder="Select event" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(selectedBackgroundData.defining_events || []).map((event: any) => (
                                            <SelectItem key={event.number} value={event.number.toString()}>
                                              {event.number}: {event.text.substring(0, 50)}{event.text.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const maxNumber = selectedBackgroundData.defining_events?.length || 0
                                          if (maxNumber > 0) {
                                            const roll = Math.floor(Math.random() * maxNumber) + 1
                                            const rolledEvent = selectedBackgroundData.defining_events?.find((e: any) => e.number === roll)
                                            if (rolledEvent) {
                                              setBackgroundDefiningEvents([{ number: rolledEvent.number, text: rolledEvent.text }])
                                            }
                                          }
                                        }}
                                      >
                                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                                        Roll d{selectedBackgroundData.defining_events?.length || 0}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Numbered Items - Personality Traits */}
                        {selectedBackgroundData.personality_traits && selectedBackgroundData.personality_traits.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Personality Traits</Label>
                            <p className="text-xs text-muted-foreground">Choose or roll for 1 personality trait</p>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const selectedTrait = backgroundPersonalityTraits[0] || null
                                return (
                                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Badge variant="outline">Personality Trait</Badge>
                                    <div className="flex-1">
                                      {selectedTrait ? (
                                        <span className="text-sm">{selectedTrait.text}</span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Not selected</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedTrait?.number.toString() || ""}
                                        onValueChange={(value) => {
                                          const trait = selectedBackgroundData.personality_traits?.find((t: any) => t.number === parseInt(value))
                                          if (trait) {
                                            setBackgroundPersonalityTraits([{ number: trait.number, text: trait.text }])
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[200px]">
                                          <SelectValue placeholder="Select trait" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(selectedBackgroundData.personality_traits || []).map((trait: any) => (
                                            <SelectItem key={trait.number} value={trait.number.toString()}>
                                              {trait.number}: {trait.text.substring(0, 50)}{trait.text.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const traits = selectedBackgroundData.personality_traits || []
                                          if (traits.length > 0) {
                                            // Roll based on array index (0 to length-1)
                                            const rollIndex = Math.floor(Math.random() * traits.length)
                                            const rolledTrait = traits[rollIndex]
                                            if (rolledTrait) {
                                              setBackgroundPersonalityTraits([{ number: rolledTrait.number, text: rolledTrait.text }])
                                            }
                                          }
                                        }}
                                      >
                                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                                        Roll d{selectedBackgroundData.personality_traits?.length || 0}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Numbered Items - Ideals */}
                        {selectedBackgroundData.ideals && selectedBackgroundData.ideals.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Ideals</Label>
                            <p className="text-xs text-muted-foreground">Choose or roll for 1 ideal</p>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const selectedIdeal = backgroundIdeals[0]
                                return (
                                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Badge variant="outline">Ideal</Badge>
                                    <div className="flex-1">
                                      {selectedIdeal ? (
                                        <span className="text-sm">{selectedIdeal.text}</span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Not selected</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedIdeal?.number.toString() || ""}
                                        onValueChange={(value) => {
                                          const ideal = selectedBackgroundData.ideals?.find((i: any) => i.number === parseInt(value))
                                          if (ideal) {
                                            setBackgroundIdeals([{ number: ideal.number, text: ideal.text }])
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[200px]">
                                          <SelectValue placeholder="Select ideal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(selectedBackgroundData.ideals || []).map((ideal: any) => (
                                            <SelectItem key={ideal.number} value={ideal.number.toString()}>
                                              {ideal.number}: {ideal.text.substring(0, 50)}{ideal.text.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const maxNumber = selectedBackgroundData.ideals?.length || 0
                                          if (maxNumber > 0) {
                                            const roll = Math.floor(Math.random() * maxNumber) + 1
                                            const rolledIdeal = selectedBackgroundData.ideals?.find((i: any) => i.number === roll)
                                            if (rolledIdeal) {
                                              setBackgroundIdeals([{ number: rolledIdeal.number, text: rolledIdeal.text }])
                                            }
                                          }
                                        }}
                                      >
                                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                                        Roll d{selectedBackgroundData.ideals?.length || 0}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Numbered Items - Bonds */}
                        {selectedBackgroundData.bonds && selectedBackgroundData.bonds.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Bonds</Label>
                            <p className="text-xs text-muted-foreground">Choose or roll for 1 bond</p>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const selectedBond = backgroundBonds[0]
                                return (
                                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Badge variant="outline">Bond</Badge>
                                    <div className="flex-1">
                                      {selectedBond ? (
                                        <span className="text-sm">{selectedBond.text}</span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Not selected</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedBond?.number.toString() || ""}
                                        onValueChange={(value) => {
                                          const bond = selectedBackgroundData.bonds?.find((b: any) => b.number === parseInt(value))
                                          if (bond) {
                                            setBackgroundBonds([{ number: bond.number, text: bond.text }])
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[200px]">
                                          <SelectValue placeholder="Select bond" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(selectedBackgroundData.bonds || []).map((bond: any) => (
                                            <SelectItem key={bond.number} value={bond.number.toString()}>
                                              {bond.number}: {bond.text.substring(0, 50)}{bond.text.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const maxNumber = selectedBackgroundData.bonds?.length || 0
                                          if (maxNumber > 0) {
                                            const roll = Math.floor(Math.random() * maxNumber) + 1
                                            const rolledBond = selectedBackgroundData.bonds?.find((b: any) => b.number === roll)
                                            if (rolledBond) {
                                              setBackgroundBonds([{ number: rolledBond.number, text: rolledBond.text }])
                                            }
                                          }
                                        }}
                                      >
                                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                                        Roll d{selectedBackgroundData.bonds?.length || 0}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Numbered Items - Flaws */}
                        {selectedBackgroundData.flaws && selectedBackgroundData.flaws.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-md font-medium">Flaws</Label>
                            <p className="text-xs text-muted-foreground">Choose or roll for 1 flaw</p>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const selectedFlaw = backgroundFlaws[0]
                                return (
                                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                                    <Badge variant="outline">Flaw</Badge>
                                    <div className="flex-1">
                                      {selectedFlaw ? (
                                        <span className="text-sm">{selectedFlaw.text}</span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Not selected</span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedFlaw?.number.toString() || ""}
                                        onValueChange={(value) => {
                                          const flaw = selectedBackgroundData.flaws?.find((f: any) => f.number === parseInt(value))
                                          if (flaw) {
                                            setBackgroundFlaws([{ number: flaw.number, text: flaw.text }])
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[200px]">
                                          <SelectValue placeholder="Select flaw" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(selectedBackgroundData.flaws || []).map((flaw: any) => (
                                            <SelectItem key={flaw.number} value={flaw.number.toString()}>
                                              {flaw.number}: {flaw.text.substring(0, 50)}{flaw.text.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const maxNumber = selectedBackgroundData.flaws?.length || 0
                                          if (maxNumber > 0) {
                                            const roll = Math.floor(Math.random() * maxNumber) + 1
                                            const rolledFlaw = selectedBackgroundData.flaws?.find((f: any) => f.number === roll)
                                            if (rolledFlaw) {
                                              setBackgroundFlaws([{ number: rolledFlaw.number, text: rolledFlaw.text }])
                                            }
                                          }
                                        }}
                                      >
                                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                                        Roll d{selectedBackgroundData.flaws?.length || 0}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Class Selection */}
            {step === 'class_selection' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Class Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your character's classes, levels, and subclasses (multiclassing supported)
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}


                <Card>
                  <CardContent className="flex flex-col gap-4">
                    {/* Current Classes */}
                    {characterClasses.length > 0 && (
                      <div className="flex flex-col gap-2">

                        <div className="flex flex-col gap-2">
                          {characterClasses.map((charClass, index) => {
                            const totalLevel = characterClasses.reduce((sum, c) => sum + c.level, 0)
                            const classSubclasses = charClass.name ? classes.filter(c => c.name === charClass.name).map(c => c.subclass).filter(Boolean) : []
                            
                            // Class selection dropdown for each card
                            return (
                              <div key={index} className="flex flex-col gap-4 p-4 border rounded-lg bg-background relative">
                                <div className="flex items-end gap-2">
                                  <div className="flex flex-col gap-2">
                                    <div className="text-md font-medium">Class #{index + 1}</div>
                                    <Select
                                      value={charClass.name || ""}
                                      onValueChange={(value) => {
                                        const selectedClassOption = classes.find(c => c.name === value)
                                        const updated = characterClasses.map((c, i) => 
                                          i === index 
                                            ? { ...c, name: value, class_id: selectedClassOption?.id || "", subclass: undefined }
                                            : c
                                        )
                                        setCharacterClasses(updated)
                                      }}
                                      disabled={loading}
                                    >
                                      <SelectTrigger className="h-8 w-[212px]">
                                        <SelectValue placeholder={loading ? "Loading classes..." : "Select a class"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[...new Set(classes.map(c => c.name))].map((className) => (
                                          <SelectItem 
                                            key={className} 
                                            value={className}
                                            disabled={characterClasses.some((c, i) => c.name === className && i !== index)}
                                          >
                                            {className}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`class-level-${index}`} className="text-xs">Level</Label>
                                    <Input
                                      id={`class-level-${index}`}
                                      type="number"
                                      min="1"
                                      max="20"
                                      className="w-16 h-9 text-md"
                                      value={charClass.level}
                                    onChange={(e) => {
                                      const inputValue = e.target.value
                                      if (inputValue === '') return
                                      const parsedValue = Number.parseInt(inputValue, 10)
                                      if (isNaN(parsedValue)) return
                                      const clampedValue = Math.min(Math.max(parsedValue, 1), 20)
                                      const currentTotal = characterClasses.reduce((sum, c) => sum + c.level, 0)
                                      const newTotal = currentTotal - charClass.level + clampedValue
                                      if (newTotal > 20) {
                                        setError(`Total level cannot exceed 20 (currently ${currentTotal})`)
                                        return
                                      }
                                      
                                      // Clear subclass if level goes below the threshold
                                      const requiredLevel = getSubclassSelectionLevel(charClass.name)
                                      const classSubclassesList = classes.filter(c => c.name === charClass.name).map(c => c.subclass).filter(Boolean)
                                      
                                      let updatedCharacter = { ...charClass, level: clampedValue }
                                      
                                      // If level drops below threshold, clear subclass
                                      if (clampedValue < requiredLevel && charClass.subclass) {
                                        updatedCharacter.subclass = undefined
                                      }
                                      
                                      // Validate subclass requirement when level changes
                                      if (classSubclassesList.length > 0 && clampedValue >= requiredLevel && !updatedCharacter.subclass) {
                                        setError(`Subclass is required for ${charClass.name} at level ${requiredLevel} and above`)
                                      } else {
                                        setError(null)
                                      }
                                      
                                      const updated = characterClasses.map((c, i) => 
                                        i === index ? updatedCharacter : c
                                      )
                                      setCharacterClasses(updated)
                                      setLevel(newTotal)
                                    }}
                                    onBlur={(e) => {
                                      const parsedValue = Number.parseInt(e.target.value, 10)
                                      if (isNaN(parsedValue) || parsedValue < 1) {
                                        const currentTotal = characterClasses.reduce((sum, c) => sum + c.level, 0)
                                        const updated = characterClasses.map((c, i) => 
                                          i === index ? { ...c, level: 1 } : c
                                        )
                                        setCharacterClasses(updated)
                                        setLevel(currentTotal - charClass.level + 1)
                                      } else if (parsedValue > 20) {
                                        const currentTotal = characterClasses.reduce((sum, c) => sum + c.level, 0)
                                        const updated = characterClasses.map((c, i) => 
                                          i === index ? { ...c, level: 20 } : c
                                        )
                                        setCharacterClasses(updated)
                                        setLevel(currentTotal - charClass.level + 20)
                                      }
                                    }}
                                  />
                                  </div>
                                  {charClass.name && (() => {
                                    const requiredLevel = getSubclassSelectionLevel(charClass.name)
                                    const currentLevel = charClass.level || 1
                                    // Only show subclass select if level is at or above the threshold
                                    if (currentLevel >= requiredLevel) {
                                      return (
                                        <div className="flex flex-col gap-2">
                                          <Label htmlFor={`subclass-${index}`} className="text-xs">
                                            Subclass *
                                          </Label>
                                          <Select
                                          value={charClass.subclass || undefined}
                                          onValueChange={(value) => {
                                            const selectedClassOption = classes.find(c => c.name === charClass.name && c.subclass === value)
                                            const updated = characterClasses.map((c, i) => 
                                              i === index ? { ...c, subclass: value || undefined, class_id: selectedClassOption?.id || c.class_id } : c
                                            )
                                            setCharacterClasses(updated)
                                          }}
                                        >
                                          <SelectTrigger className="h-8 w-[212px]">
                                            <SelectValue placeholder="Select a subclass (required)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {classSubclasses.length > 0 ? (
                                              classSubclasses.map((subclass) => (
                                                <SelectItem key={subclass} value={subclass}>
                                                  {subclass}
                                                </SelectItem>
                                              ))
                                            ) : (
                                              <SelectItem value="__none__" disabled>
                                                No subclasses available
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                  {index > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="absolute top-4 right-4 w-8 h-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                                      onClick={() => {
                                        const updated = characterClasses.filter((_, i) => i !== index)
                                        setCharacterClasses(updated)
                                        const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                        setLevel(newTotal || 1)
                                      }}
                                    >
                                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Skill Proficiencies Selection for this class */}
                                {charClass.name && (() => {
                                  const classData = classDataMap.get(charClass.name)
                                  const availableSkills = classData?.skill_proficiencies 
                                    ? (Array.isArray(classData.skill_proficiencies) 
                                        ? classData.skill_proficiencies 
                                        : (classData.skill_proficiencies?.options || classData.skill_proficiencies?.proficiencies || []))
                                    : []
                                  
                                  // Most classes get 2 skill proficiencies
                                  const maxSkillChoices = 2
                                  
                                  // Collect skills that are already proficient from race or background (but not from this class)
                                  const alreadyProficientSkills = new Set<string>()
                                  editableCharacter.skills?.forEach(skill => {
                                    const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
                                    // Check if this skill is proficient but not from this class
                                    if (skill.proficiency === 'proficient' || skill.proficiency === 'expertise') {
                                      // Check if it's not from this class's selected skills
                                      const isFromThisClass = (charClass.selectedSkillProficiencies || []).includes(skillInDbFormat)
                                      if (!isFromThisClass) {
                                        alreadyProficientSkills.add(skillInDbFormat)
                                      }
                                    }
                                  })
                                  
                                  if (availableSkills.length > 0) {
                                    const selectedSkills = charClass.selectedSkillProficiencies || []
                                    
                                    return (
                                      <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-sm font-medium">
                                            Pick {maxSkillChoices} Skill Proficiencies:
                                          </Label>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          {SKILL_OPTIONS.filter(skill => {
                                            // Only show skills available for this class
                                            const skillName = skill.value
                                            const skillTitleCase = skill.label
                                            return availableSkills.some((available: string) => {
                                              const availableLower = available.toLowerCase().replace(/\s+/g, '_')
                                              const availableTitle = available
                                              return availableLower === skillName || availableTitle === skillTitleCase
                                            })
                                          }).map((skill) => {
                                            const isSelected = selectedSkills.includes(skill.value)
                                            const isAlreadyProficient = alreadyProficientSkills.has(skill.value)
                                            const canSelect = isSelected || (selectedSkills.length < maxSkillChoices && !isAlreadyProficient)
                                            
                                            return (
                                              <div key={skill.value} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                                <Checkbox
                                                  id={`skill-${index}-${skill.value}`}
                                                  checked={isSelected}
                                                  disabled={!canSelect && !isSelected}
                                                  onCheckedChange={(checked) => {
                                                    const updated = characterClasses.map((c, i) => {
                                                      if (i === index) {
                                                        const currentSelected = c.selectedSkillProficiencies || []
                                                        const newSelected = checked
                                                          ? [...currentSelected, skill.value]
                                                          : currentSelected.filter(s => s !== skill.value)
                                                        return { ...c, selectedSkillProficiencies: newSelected }
                                                      }
                                                      return c
                                                    })
                                                    setCharacterClasses(updated)
                                                    
                                                    // Update editable character skills in real-time
                                                    const updatedSkills = editableCharacter.skills?.map(s => {
                                                      const skillInDbFormat = s.name.toLowerCase().replace(/\s+/g, '_')
                                                      if (skillInDbFormat === skill.value) {
                                                        return { ...s, proficiency: checked ? 'proficient' as const : 'none' as const }
                                                      }
                                                      return s
                                                    }) || createDefaultSkills()
                                                    setEditableCharacter(prev => ({ ...prev, skills: updatedSkills }))
                                                  }}
                                                />
                                                <Label htmlFor={`skill-${index}-${skill.value}`} className={`text-sm font-normal flex-1 ${isAlreadyProficient ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>
                                                  {skill.label}
                                                  {isAlreadyProficient && (
                                                    <span className="ml-2 text-xs text-muted-foreground">(already proficient)</span>
                                                  )}
                                                </Label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add Another Class Button */}
                    {characterClasses.length > 0 && characterClasses.every(c => c.name) && characterClasses.reduce((sum, c) => sum + c.level, 0) < 20 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newClass = {
                            name: "",
                            level: 1,
                            class_id: undefined,
                            subclass: undefined,
                            selectedSkillProficiencies: [] as string[]
                          }
                          setCharacterClasses([...characterClasses, newClass])
                        }}
                        disabled={loading || characterClasses.reduce((sum, c) => sum + c.level, 0) >= 20}
                      >
                        <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                        Add Another Class
                      </Button>
                    )}

                    {/* Total Level Display */}
                    {characterClasses.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Level:</span>
                          <Badge variant="outline" className="font-medium">
                            {characterClasses.reduce((sum, c) => sum + c.level, 0)}/20
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Class Features */}
            {step === 'class_features' && characterClasses.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Unlocked Class Features</h3>
                  <p className="text-sm text-muted-foreground">
                    All features unlocked for your character listed below.
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}


                {/* Class Features Selection */}
                {isLoadingFeatures ? (
                  <Card>
                    <CardContent>
                      <div className="text-center text-muted-foreground">Loading class features...</div>
                    </CardContent>
                  </Card>
                ) : classFeatures.length > 0 && (
                  <Card>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4">
                        {(() => {
                          // Group features by class
                          const featuresByClass = new Map<string, typeof classFeatures>()
                          classFeatures.forEach(feature => {
                            const className = feature.className || 'Unknown'
                            if (!featuresByClass.has(className)) {
                              featuresByClass.set(className, [])
                            }
                            featuresByClass.get(className)!.push(feature)
                          })
                          
                          // Sort classes by their order in characterClasses
                          const sortedClassNames = Array.from(featuresByClass.keys()).sort((a, b) => {
                            const indexA = characterClasses.findIndex(c => c.name === a)
                            const indexB = characterClasses.findIndex(c => c.name === b)
                            if (indexA === -1 && indexB === -1) return a.localeCompare(b)
                            if (indexA === -1) return 1
                            if (indexB === -1) return -1
                            return indexA - indexB
                          })
                          
                          return sortedClassNames.map(className => {
                            const classFeaturesList = featuresByClass.get(className) || []
                            // Sort features by level within each class
                            const sortedFeatures = [...classFeaturesList].sort((a, b) => a.level - b.level)
                            
                            return (
                              <div key={className} className="flex flex-col gap-2 p-4 border rounded-lg bg-background">
                                <h5 className="text-lg font-semibold">
                                  {className} Features
                                </h5>
                                <div className="flex flex-col gap-2">
                                  {sortedFeatures.map((feature) => {
                                    const isASI = isASIFeature(feature)
                                    const isSelected = selectedFeatures.has(feature.id)
                                    const asiChoice = asiChoices.get(feature.id)
                                    
                                    return (
                                      <div key={feature.id} className="flex flex-col gap-2 p-4 border bg-card rounded-lg relative">
                                        <div className="flex items-start gap-2">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge variant="outline" className="text-xs">
                                                Level {feature.level}
                                              </Badge>
                                              <Badge variant="secondary" className="text-xs">
                                                {feature.source}
                                              </Badge>
                                            </div>
                                            <div className="font-medium flex items-center gap-2">
                                              {feature.name || feature.title}
                                            </div>
                                            {feature.description && !isASI && (
                                              <div className="text-sm text-muted-foreground line-clamp-2">
                                                <RichTextDisplay content={feature.description} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                              
                                        {/* ASI/Feat Choice UI - shown for all ASI features */}
                                        {isASI && (
                                          <div className="flex flex-col gap-3">
                                            <div className="text-sm text-muted-foreground">Choose one between the following options:</div>
                                            
                                            {/* Ability Score Improvement Option */}
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-center gap-0">
                                                <Button
                                                  variant={asiChoice?.type === 'ability_scores' ? 'default' : 'outline'}
                                                  size="sm"
                                                  className="shadow-none rounded-tr-none rounded-br-none"
                                                  onClick={() => handleASISelection(feature.id, 'ability_scores')}
                                                >
                                                  {asiChoice?.type === 'ability_scores' ? (
                                                    <>
                                                      <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                                                      Ability Score Improvement
                                                    </>
                                                  ) : (
                                                    'Ability Score Improvement'
                                                  )}
                                                </Button>
                                                <Button
                                                  variant={asiChoice?.type === 'feat' ? 'default' : 'outline'}
                                                  size="sm"
                                                  className="shadow-none rounded-tl-none rounded-bl-none"
                                                  onClick={() => handleASISelection(feature.id, 'feat')}
                                                >
                                                  {asiChoice?.type === 'feat' ? (
                                                    <>
                                                      <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                                                      Add a New Feat
                                                    </>
                                                  ) : (
                                                    'Add a New Feat'
                                                  )}
                                                </Button>
                                              </div>
                                              
                                              {asiChoice?.type === 'ability_scores' && (
                                                <div className="flex flex-row gap-4 items-end p-4 border bg-card rounded-lg">
                                                  <div className="flex flex-col gap-2">
                                                    <Label className="text-sm">Ability #1</Label>
                                                    <Select
                                                      value={asiChoice.abilityScores?.first || ''}
                                                      onValueChange={(value) => handleASIScoreSelection(feature.id, 'first', value)}
                                                    >
                                                      <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select ability" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {getAbilityOptions().map((ability) => (
                                                          <SelectItem key={ability.value} value={ability.value}>
                                                            {ability.label}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  <div className="flex flex-col gap-2">
                                                    <Label className="text-sm">Ability #2 <Badge variant="secondary" className="text-xs">Optional</Badge></Label>
                                                    <div className="flex gap-2">
                                                      <Select
                                                        value={asiChoice.abilityScores?.second || ''}
                                                        onValueChange={(value) => handleASIScoreSelection(feature.id, 'second', value)}
                                                      >
                                                        <SelectTrigger className="h-8">
                                                          <SelectValue placeholder="Select ability" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {getAbilityOptions().map((ability) => (
                                                            <SelectItem key={ability.value} value={ability.value}>
                                                              {ability.label}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                      {asiChoice.abilityScores?.second && (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => handleASIScoreSelection(feature.id, 'second', '')}
                                                          className="w-8 h-8 p-0"
                                                        >
                                                          <Icon icon="lucide:x" className="w-3 h-3" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            
                            {/* Feat Option */}                
                              {asiChoice?.type === 'feat' && (
                                <div className="flex flex-col gap-2">
                                  {asiChoice.feat ? (
                                    <div className="bg-card flex items-start justify-between p-3 border rounded-lg">
                                      <div className="flex flex-col gap-1 flex-1">
                                        <div className="font-medium text-sm">{asiChoice.feat.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          <RichTextDisplay content={asiChoice.feat.description || "No description"} />
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const newChoices = new Map(asiChoices)
                                          newChoices.set(feature.id, {
                                            ...asiChoice,
                                            feat: null
                                          })
                                          setAsiChoices(newChoices)
                                        }}
                                        className="w-8 h-8 p-0"
                                      >
                                        <Icon icon="lucide:x" className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      onClick={() => {
                                        setEditingFeatIndex(null)
                                        setEditingFeatForFeatureId(feature.id)
                                        setFeatEditModalOpen(true)
                                      }}
                                      size="sm"
                                      variant="outline"
                                    >
                                      <Icon icon="lucide:plus" className="w-4 h-4" />
                                      Add new Feat
                                    </Button>
                                  )}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
                          })
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>
            )}

            {/* Step 5: Ability Score Allocation & Hit Points Roll */}
            {step === 'hp_roll' && characterClasses.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Ability Scores & Hit Points</h3>
                  <p className="text-sm text-muted-foreground">
                    Allocate your ability scores using point buy, then roll for hit points. You can see all bonuses from your race and class features below.
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}


                {/* Ability Score Assignment */}
                <Card>
                  <CardHeader className="gap-2">
                    <CardTitle className="text-base font-text">Ability Scores Point Buy</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      All abilities start at 8. You have {POINT_BUY_TOTAL} points to distribute. 
                      Each ability can be between 8-15 (before race/ASI bonuses). 
                      Costs: 1 point per point for scores 8-13, then 2 points per point for 14-15.
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Points Spent:</span>
                      <Badge variant="outline" className={`text-xs font-bold ${getTotalPointsSpent() > POINT_BUY_TOTAL ? 'text-destructive' : getTotalPointsSpent() === POINT_BUY_TOTAL ? 'text-green-600' : ''}`}>
                        {getTotalPointsSpent()}/{POINT_BUY_TOTAL}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                        const value = editableCharacter[ability as keyof CharacterData] as number || POINT_BUY_BASE
                        const modifier = calculateModifier(value)
                        
                        // Calculate base score (before race/ASI bonuses)
                        let raceBonus = abilityScoreChoices
                          .filter(c => c.ability === ability)
                          .reduce((sum, c) => sum + (c.increase || 0), 0)
                        
                        // Check for fixed ASI bonus in custom patterns (e.g., Half-Elf +2 CHA)
                        if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
                          const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
                          if (fixedAbility === ability) {
                            raceBonus = mainRaceData.ability_score_increases.fixed.increase
                          }
                        }
                        
                        // Check for fixed_multi pattern (e.g., Human +1 to all abilities)
                        if (mainRaceData?.ability_score_increases?.type === 'fixed_multi' && mainRaceData.ability_score_increases.abilities) {
                          const abilities = mainRaceData.ability_score_increases.abilities as Record<string, number>
                          const abilityKey = ability.toLowerCase()
                          if (abilities[abilityKey] && abilities[abilityKey] > 0) {
                            raceBonus = abilities[abilityKey]
                          }
                        }
                        
                        // Calculate ASI bonuses from selected ASI features
                        let asiBonus = 0
                        Array.from(asiChoices.entries()).forEach(([featureId, choice]) => {
                          if (selectedFeatures.has(featureId) && choice.type === 'ability_scores' && choice.abilityScores) {
                            const firstAbility = choice.abilityScores.first?.toLowerCase().trim()
                            const secondAbility = choice.abilityScores.second?.toLowerCase().trim()
                            
                            if (firstAbility === ability) {
                              asiBonus += (secondAbility && secondAbility !== firstAbility) ? 1 : 2
                            } else if (secondAbility === ability && secondAbility !== firstAbility) {
                              asiBonus += 1
                            }
                          }
                        })
                        
                        const baseScore = value - raceBonus - asiBonus
                        const pointBuyCost = getPointBuyCost(baseScore)
                        const remainingPoints = POINT_BUY_TOTAL - getTotalPointsSpent()
                        const hasRaceModification = raceBonus > 0
                        const hasASIModification = asiBonus > 0
                        const hasAnyModification = hasRaceModification || hasASIModification
                        
                        // Determine min/max values
                        const minValue = POINT_BUY_MIN
                        const maxValue = POINT_BUY_MAX + raceBonus + asiBonus
                        
                        return (
                          <div key={ability} className={`flex flex-col gap-2 p-3 border rounded-lg ${hasAnyModification ? 'bg-primary/5 border-primary/50' : ''}`}>
                            <div className="flex flex-row gap-2 items-start justify-between">
                              <div className="flex flex-col gap-0">
                                <Label htmlFor={`ability-${ability}`} className="text-md font-medium capitalize">
                                  {ability}
                                </Label>
                                <div className="text-xs text-muted-foreground">Base: {baseScore} ({pointBuyCost} pts)</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`ability-${ability}`}
                                  type="number"
                                  value={value}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || POINT_BUY_BASE
                                    // Validate the base score (before race/ASI bonuses)
                                    const newBaseScore = newValue - raceBonus - asiBonus
                                    
                                    // Check point buy limits
                                    if (newBaseScore < POINT_BUY_MIN || newBaseScore > POINT_BUY_MAX) {
                                      return // Don't update if out of point buy range
                                    }
                                    
                                    // Check if we have enough points
                                    const newCost = getPointBuyCost(newBaseScore)
                                    const currentCost = getPointBuyCost(baseScore)
                                    const pointsNeeded = newCost - currentCost
                                    
                                    if (pointsNeeded > remainingPoints && newValue > value) {
                                      return // Don't allow if not enough points
                                    }
                                    
                                    updateEditableCharacter({ [ability]: newValue })
                                  }}
                                  className={`w-14 h-6 px-1 py-2 text-center ${hasAnyModification ? 'border-primary border-2' : ''}`}
                                  min={minValue}
                                  max={maxValue}
                                />
                                <Badge 
                                  variant={hasAnyModification ? "default" : "secondary"} 
                                  className={`text-xs border-0 ${getAbilityModifierColor(ability.toUpperCase().slice(0, 3))}`}
                                >
                                  {formatModifier(modifier)}
                                </Badge>
                              </div>
                            </div>
                            {hasAnyModification && (
                              <div className="text-xs text-primary flex flex-row gap-2">
                                {hasRaceModification && (
                                  <span className="font-medium">+{raceBonus} from race</span>
                                )}
                                {hasASIModification && (
                                  <span className="font-medium">+{asiBonus} from ASI</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* HP Roll Section */}
                <Card>
                  <CardContent className="flex flex-col gap-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <h4 className="font-medium">Hit Point Calculation</h4>
                        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
                          {characterClasses.length > 1 ? (
                            <>
                              <p>Multiple classes detected. Hit points will be calculated per class:</p>
                              <div className="flex flex-col gap-2">
                                {characterClasses.map((c, idx) => {
                                  const hitDieTypes: Record<string, number> = {
                                    'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                                    'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                                    'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                                  }
                                  const hitDie = hitDieTypes[c.name.toLowerCase()] || 8
                                  const conModifier = calculateModifier(editableCharacter.constitution || 10)
                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Badge variant="outline">{c.name}:</Badge>
                                      <span>d{hitDie} × {c.level} levels + ({formatModifier(conModifier)} CON × {c.level})</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          ) : characterClasses[0] ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Hit Die:</Badge>
                                <span>d{(() => {
                                  const hitDieTypes: Record<string, number> = {
                                    'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                                    'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                                    'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                                  }
                                  return hitDieTypes[characterClasses[0].name.toLowerCase()] || 8
                                })()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Levels:</Badge>
                                <span>{level}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`${getAbilityModifierColor('CON')} border-0`}>
                                  Constitution Modifier: {formatModifier(calculateModifier(editableCharacter.constitution || 10))}
                                </Badge>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        onClick={rollHitDie}
                        disabled={hpRollResult !== null || getTotalPointsSpent() !== POINT_BUY_TOTAL}
                        className="min-w-[120px] absolute top-0 right-4"
                        size="lg"
                        title={getTotalPointsSpent() !== POINT_BUY_TOTAL ? `Allocate all ${POINT_BUY_TOTAL} points to enable rolling HP` : undefined}
                      >
                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                        Roll Hit Dice
                      </Button>
                    </div>

                    {hpRollResult && (
                      <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="text-2xl font-bold text-primary mb-2 text-center">
                          {hpRollResult.total} HP
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {hpRollResult.classRolls && hpRollResult.classRolls.length > 1 ? (
                            <>
                              {hpRollResult.classRolls.map((classRoll, idx) => {
                                // Check if this class has level 1 - first level is max
                                const hitDieTypes: Record<string, number> = {
                                  'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                                  'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                                  'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                                }
                                const charClass = characterClasses.find(c => c.name === classRoll.className)
                                const hitDie = charClass ? hitDieTypes[charClass.name.toLowerCase()] || 8 : 8
                                const isFirstLevel = charClass?.level === 1
                                
                                return (
                                  <div key={idx} className="text-xs">
                                    {classRoll.className} (Lv {classRoll.level}): {isFirstLevel ? `${hitDie} (max of d${hitDie} for 1st level)` : `${classRoll.roll} (dice)`} + {formatModifier(hpRollResult.constitutionModifier)} × {classRoll.level} (CON) = {classRoll.hp} HP
                                  </div>
                                )
                              })}
                              <div className="text-xs pt-1 border-t mt-1 font-medium">
                                {(() => {
                                  // Calculate if any class is first level
                                  const hasFirstLevelClass = characterClasses.some(c => c.level === 1)
                                  if (hasFirstLevelClass && level === 1) {
                                    // Single level 1 class - show max
                                    const hitDieTypes: Record<string, number> = {
                                      'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                                      'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                                      'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                                    }
                                    const firstClass = characterClasses.find(c => c.level === 1)
                                    const hitDie = firstClass ? hitDieTypes[firstClass.name.toLowerCase()] || 8 : 8
                                    return `Total: ${hitDie} (max of d${hitDie} for 1st level) + ${formatModifier(hpRollResult.constitutionModifier)} (CON) = ${hpRollResult.total} HP`
                                  }
                                  return `Total: ${hpRollResult.roll} (dice) + ${formatModifier(hpRollResult.constitutionModifier)} × ${level} (CON) = ${hpRollResult.total} HP`
                                })()}
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              {(() => {
                                // Check if this is level 1 - if so, first level is max
                                const isLevel1 = level === 1
                                const hitDieTypes: Record<string, number> = {
                                  'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                                  'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                                  'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                                }
                                const hitDie = characterClasses[0] ? hitDieTypes[characterClasses[0].name.toLowerCase()] || 8 : 8
                                const levelBasedHpBonus1 = mainRaceData && mainRaceData.features && Array.isArray(mainRaceData.features)
                                  ? mainRaceData.features.reduce((bonus: number, feature: any) => {
                                      if (feature.hp_bonus_per_level) {
                                        return bonus + level
                                      }
                                      return bonus
                                    }, 0)
                                  : 0
                                const bonusText1 = levelBasedHpBonus1 > 0 ? ` + ${levelBasedHpBonus1} (race)` : ''
                                if (isLevel1) {
                                  return (
                                    <>
                                      {hitDie} (max of d{hitDie} for 1st level) + {formatModifier(hpRollResult.constitutionModifier)} (CON){bonusText1} = {hpRollResult.total + levelBasedHpBonus1} HP
                                    </>
                                  )
                                }
                                const levelBasedHpBonus2 = mainRaceData && mainRaceData.features && Array.isArray(mainRaceData.features)
                                  ? mainRaceData.features.reduce((bonus: number, feature: any) => {
                                      if (feature.hp_bonus_per_level) {
                                        return bonus + level
                                      }
                                      return bonus
                                    }, 0)
                                  : 0
                                const bonusText2 = levelBasedHpBonus2 > 0 ? ` + ${levelBasedHpBonus2} (race)` : ''
                                return (
                                  <>
                                    {hpRollResult.roll} (dice) + {formatModifier(hpRollResult.constitutionModifier)} × {level} (CON modifier × levels){bonusText2} = {hpRollResult.total + levelBasedHpBonus2} HP
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 6: Summary */}
            {step === 'summary' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    Review your character creation choices before confirming
                  </p>
                </div>

                {error && (
                  <div className="bg-[#ce6565] border-[#b04a4a] text-white px-4 py-3 rounded-lg text-sm font-medium flex-row flex gap-3">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 my-0.5" />
                    <span className="flex flex-col gap-0">
                      <span className="text-sm font-semibold">Error:</span>
                      <span className="text-sm font-normal">{error}</span>
                    </span>
                  </div>
                )}

                <Card className="flex flex-col gap-0 px-4">
                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Character Name</h5>
                    <p className="text-sm">{name}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Race</h5>
                    <div className="flex items-center gap-2">
                      {raceIds.map((race, index) => (
                        <div key={index} className="text-sm">
                          {races.find(r => r.id === race.id)?.name}
                          {race.isMain && " (Main)"}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-start justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Class{characterClasses.length > 1 ? 'es' : ''}</h5>
                    <div className="flex flex-col gap-1">
                      {characterClasses.map((charClass, idx) => (
                        <p key={idx} className="text-sm">
                          <span className="font-medium">{charClass.name}</span>
                          {charClass.subclass && ` (${charClass.subclass})`}, Level {charClass.level}
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground">Total Level: {level}</p>
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Background</h5>
                    <p className="text-sm">{background}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Alignment</h5>
                    <p className="text-sm">{alignment}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-start justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Ability Scores</h5>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                          const score = editableCharacter[ability as keyof CharacterData] as number || POINT_BUY_BASE
                          const modifier = calculateModifier(score)
                          
                          // Calculate race bonuses (including fixed ASI for custom patterns like Half-Elf)
                          let raceBonus = abilityScoreChoices
                            .filter(c => c.ability === ability)
                            .reduce((sum, c) => sum + (c.increase || 0), 0)
                          
                          // Check for fixed ASI bonus in custom patterns (e.g., Half-Elf +2 CHA)
                          if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
                            const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
                            if (fixedAbility === ability) {
                              raceBonus = mainRaceData.ability_score_increases.fixed.increase
                            }
                          }
                          
                          // Check for fixed_multi pattern (e.g., Human +1 to all abilities)
                          if (mainRaceData?.ability_score_increases?.type === 'fixed_multi' && mainRaceData.ability_score_increases.abilities) {
                            const abilities = mainRaceData.ability_score_increases.abilities as Record<string, number>
                            const abilityKey = ability.toLowerCase()
                            if (abilities[abilityKey] && abilities[abilityKey] > 0) {
                              raceBonus = abilities[abilityKey]
                            }
                          }
                          
                          // Check if this ability was modified by ASI features
                          // Only highlight if the ASI feature is selected and has ability score choices
                          // Sum up all ASI increases from multiple ASI features (multiclassing support)
                          let hasASIModification = false
                          let asiIncrease = 0
                          
                          // Check each ASI feature
                          Array.from(asiChoices.entries()).forEach(([featureId, choice]) => {
                            // Only count if feature is selected AND has ability_scores type with values
                            if (selectedFeatures.has(featureId) && choice.type === 'ability_scores' && choice.abilityScores) {
                              const firstAbility = choice.abilityScores.first?.toLowerCase().trim()
                              const secondAbility = choice.abilityScores.second?.toLowerCase().trim()
                              
                              // Check if this ability matches and is not empty
                              if (firstAbility && firstAbility === ability) {
                                hasASIModification = true
                                // If there's a second ability, first gets +1, otherwise +2
                                asiIncrease += (secondAbility && secondAbility !== firstAbility) ? 1 : 2
                              } else if (secondAbility && secondAbility === ability && secondAbility !== firstAbility) {
                                hasASIModification = true
                                // Second ability always gets +1
                                asiIncrease += 1
                              }
                            }
                          })
                          
                          // Check if ability has race or ASI modifications
                          const hasRaceModification = raceBonus > 0
                          const hasAnyModification = hasRaceModification || hasASIModification
                          
                          // Calculate total bonus for display
                          const totalBonus = raceBonus + asiIncrease
                          
                          return (
                            <div 
                              key={ability} 
                              className={`flex flex-col gap-1 p-2 border rounded-lg ${hasAnyModification ? 'bg-primary/10 border-primary border-2 ring-2 ring-primary/20' : 'border-border'}`}
                            >
                              <div className="text-sm font-medium capitalize">
                                {ability}
                              </div>
                              <div className={`text-lg font-bold ${hasAnyModification ? 'text-primary' : ''}`}>
                                <span className="font-mono flex items-center gap-2">
                                  {score}
                                  <Badge variant={hasAnyModification ? "default" : "secondary"} className={`text-xs p-1 py-0 font-medium border-0 ${getAbilityModifierColor(ability.toUpperCase().slice(0, 3))}`}>
                                    {formatModifier(modifier)}
                                  </Badge>
                                </span>
                                {hasAnyModification && totalBonus > 0 && (
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {hasRaceModification && hasASIModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">
                                        +{raceBonus} race bonus | +{asiIncrease} ASI bonus
                                      </span>
                                    )}
                                    {hasRaceModification && !hasASIModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">+{raceBonus} race bonus</span>
                                    )}
                                    {hasASIModification && !hasRaceModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">+{asiIncrease} ASI bonus</span>
                                    )}
                                  </span>
                                )}
                              </div>
                              
                            </div>
                          )
                        })}
                      </div>
                      {(abilityScoreChoices.length > 0 || Array.from(asiChoices.values()).some(c => c.type === 'ability_scores' && (c.abilityScores?.first || c.abilityScores?.second))) && (
                        <p className="text-xs text-muted-foreground">
                          <Badge variant="outline">Bonuses</Badge>
                          <span className="text-xs text-muted-foreground ml-2">Abilities highlighted were improved by race bonuses or ASI.</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-start justify-start pb-4 border-b mb-4">
                    <h5 className="text-sm font-medium w-[240px]">Hit Points</h5>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-lg font-bold font-mono text-primary">
                          {(() => {
                            const baseHP = hpRollResult?.total || 8
                            const levelBasedHpBonus = mainRaceData && mainRaceData.features && Array.isArray(mainRaceData.features)
                              ? mainRaceData.features.reduce((bonus: number, feature: any) => {
                                  if (feature.hp_bonus_per_level) {
                                    return bonus + level
                                  }
                                  return bonus
                                }, 0)
                              : 0
                            return baseHP + levelBasedHpBonus
                          })()}
                        </strong>
                        <span className="text-md font-medium flex items-center gap-2">max HP</span>
                      </div>
                      {hpRollResult && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span><strong>Roll:</strong> {hpRollResult.roll}</span>
                            <span className="flex items-center gap-1">
                             ({formatModifier(hpRollResult.constitutionModifier)} CON × {level})</span>
                            {(() => {
                              const levelBasedHpBonus = mainRaceData && mainRaceData.features && Array.isArray(mainRaceData.features)
                                ? mainRaceData.features.reduce((bonus: number, feature: any) => {
                                    if (feature.hp_bonus_per_level) {
                                      return bonus + level
                                    }
                                    return bonus
                                  }, 0)
                                : 0
                              if (levelBasedHpBonus > 0) {
                                return <span className="text-primary">+{levelBasedHpBonus} (level-based race bonus)</span>
                              }
                              return null
                            })()}
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Base Stats: AC, Initiative, Speed */}
                  <div className="flex flex-row gap-4 items-start justify-start">
                    <h5 className="text-sm font-medium w-[240px]">Base Statistics</h5>
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-[120px]">Armor Class</span>
                        <span className="text-sm">
                          {(() => {
                            const dexModifier = calculateModifier(editableCharacter.dexterity || 10)
                            const baseAC = 10 + dexModifier
                            return (
                              <>
                                <strong className="font-mono text-primary">{baseAC}</strong>
                                <span className="text-xs text-muted-foreground ml-2">(10 {formatModifier(dexModifier)} DEX)</span>
                              </>
                            )
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-[120px]">Initiative</span>
                        <span className="text-sm">
                          {(() => {
                            const dexModifier = calculateModifier(editableCharacter.dexterity || 10)
                            return (
                              <>
                                <strong className="font-mono text-primary">{formatModifier(dexModifier)}</strong>
                                <span className="text-xs text-muted-foreground ml-2">(DEX modifier)</span>
                              </>
                            )
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-[120px]">Speed</span>
                        <span className="text-sm">
                          <strong className="font-mono text-primary">{editableCharacter.speed || 30}</strong>
                          <span className="text-xs text-muted-foreground ml-1">ft.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
          
          {/* Character Sidebar */}
          {CharacterSidebar}
        </div>

        <DialogFooter className="p-4 border-t">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {step === 'basic_info' ? (
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (step === 'race_selection') {
                      setStep('basic_info')
                    } else if (step === 'background_selection') {
                      setStep('race_selection')
                    } else if (step === 'class_selection') {
                      setStep('background_selection')
                    } else if (step === 'class_features') {
                      setStep('class_selection')
                    } else if (step === 'hp_roll') {
                      setStep('class_features')
                    } else if (step === 'summary') {
                      setStep('hp_roll')
                    }
                  }}
                >
                  <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {step === 'basic_info' && (
                <Button
                  onClick={() => {
                    if (!name.trim()) {
                      setError("Character name is required")
                      return
                    }
                    setError(null)
                    setStep('race_selection')
                  }}
                >
                  Continue to Race Selection
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'race_selection' && (
                <Button
                  onClick={() => {
                    if (raceIds.length === 0) {
                      setError("At least one race is required")
                      return
                    }
                    if (!raceIds.some(r => r.isMain)) {
                      setError("Please mark one race as main")
                      return
                    }
                    setError(null)
                    setStep('background_selection')
                  }}
                >
                  Continue to Background Selection
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'background_selection' && (
                <Button
                  onClick={() => {
                    if (!selectedBackgroundId) {
                      setError("Please select a background")
                      return
                    }
                    // Validate skill/tool/language choices if background has choice options
                    if (selectedBackgroundData) {
                      const skillsData = (() => {
                        if (Array.isArray(selectedBackgroundData.skill_proficiencies)) {
                          return { fixed: selectedBackgroundData.skill_proficiencies, choice: undefined }
                        }
                        if (selectedBackgroundData.skill_proficiencies && typeof selectedBackgroundData.skill_proficiencies === 'object' && !Array.isArray(selectedBackgroundData.skill_proficiencies)) {
                          return {
                            fixed: (selectedBackgroundData.skill_proficiencies as any).fixed || [],
                            choice: (selectedBackgroundData.skill_proficiencies as any).choice || undefined
                          }
                        }
                        return { fixed: [], choice: undefined }
                      })()
                      if (skillsData.choice && backgroundSkillChoices.length < (skillsData.choice.count || 1)) {
                        setError(`Please select ${skillsData.choice.count || 1} skill${(skillsData.choice.count || 1) > 1 ? 's' : ''} for your background`)
                        return
                      }

                      const toolsData = (() => {
                        if (Array.isArray(selectedBackgroundData.tool_proficiencies)) {
                          return { fixed: selectedBackgroundData.tool_proficiencies, choice: undefined }
                        }
                        if (selectedBackgroundData.tool_proficiencies && typeof selectedBackgroundData.tool_proficiencies === 'object' && !Array.isArray(selectedBackgroundData.tool_proficiencies)) {
                          return {
                            fixed: (selectedBackgroundData.tool_proficiencies as any).fixed || [],
                            choice: (selectedBackgroundData.tool_proficiencies as any).choice || undefined
                          }
                        }
                        return { fixed: [], choice: undefined }
                      })()
                      if (toolsData.choice && backgroundToolChoices.length < (toolsData.choice.count || 1)) {
                        setError(`Please select ${toolsData.choice.count || 1} tool${(toolsData.choice.count || 1) > 1 ? 's' : ''} for your background`)
                        return
                      }

                      const langsData = (() => {
                        if (Array.isArray(selectedBackgroundData.languages)) {
                          return { fixed: selectedBackgroundData.languages, choice: undefined }
                        }
                        if (selectedBackgroundData.languages && typeof selectedBackgroundData.languages === 'object' && !Array.isArray(selectedBackgroundData.languages)) {
                          return {
                            fixed: (selectedBackgroundData.languages as any).fixed || [],
                            choice: (selectedBackgroundData.languages as any).choice || undefined
                          }
                        }
                        return { fixed: [], choice: undefined }
                      })()
                      if (langsData.choice && backgroundLanguageChoices.length < (langsData.choice.count || 1)) {
                        setError(`Please enter ${langsData.choice.count || 1} language${(langsData.choice.count || 1) > 1 ? 's' : ''} for your background`)
                        return
                      }
                    }
                    setError(null)
                    setStep('class_selection')
                  }}
                >
                  Continue to Class Selection
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'class_selection' && (
                <Button
                  onClick={() => {
                    if (characterClasses.length === 0) {
                      setError("At least one class is required")
                      return
                    }
                    // Validate subclass requirements for each class
                    for (const charClass of characterClasses) {
                      const requiredLevel = getSubclassSelectionLevel(charClass.name)
                      const classSubclasses = classes.filter(c => c.name === charClass.name).map(c => c.subclass)
                      if (classSubclasses.length > 0 && charClass.level >= requiredLevel && !charClass.subclass) {
                        setError(`Subclass is required for ${charClass.name} at level ${requiredLevel} and above`)
                        return
                      }
                    }
                    setError(null)
                    setStep('class_features')
                  }}
                >
                  Continue to Class Features
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'class_features' && (
                <Button
                  onClick={async () => {
                    // Validate all ASI choices for selected ASI features
                    const selectedASIFeatures = classFeatures.filter(f => 
                      isASIFeature(f) && selectedFeatures.has(f.id)
                    )
                    
                    for (const feature of selectedASIFeatures) {
                      const asiChoice = asiChoices.get(feature.id)
                      if (!asiChoice || 
                          (asiChoice.type === 'ability_scores' && !asiChoice.abilityScores?.first) ||
                          (asiChoice.type === 'feat' && !asiChoice.feat)) {
                        setError(`Please complete your ASI selection for ${feature.name || feature.title}`)
                        return
                      }
                    }
                    
                    setError(null)
                    // Check if character needs ASI if not already checked
                    if (!needsASI) {
                      await checkForASI()
                    }
                    setStep('hp_roll')
                  }}
                  disabled={isLoadingASI}
                >
                  {isLoadingASI ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Continue to Hit Points
                      <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}

              {step === 'hp_roll' && (
                <Button
                  onClick={() => {
                    // Validate point buy allocation
                    const pointsSpent = getTotalPointsSpent()
                    if (pointsSpent > POINT_BUY_TOTAL) {
                      setError(`You have spent ${pointsSpent} points, but only ${POINT_BUY_TOTAL} points are available. Please adjust your ability scores.`)
                      return
                    }
                    if (pointsSpent < POINT_BUY_TOTAL) {
                      setError(`You have only spent ${pointsSpent} of ${POINT_BUY_TOTAL} available points. Please assign all points before continuing.`)
                      return
                    }
                    if (!hpRollResult) {
                      setError("Please roll for hit points")
                      return
                    }
                    setError(null)
                    setStep('summary')
                  }}
                >
                  Continue to Summary
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'summary' && (
                <Button onClick={handleCreate}>
                  <Icon icon="lucide:check" className="w-4 h-4" />
                  Create Character
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* Feat Edit Modal */}
      <FeatEditModal
        isOpen={featEditModalOpen}
        onClose={handleFeatEditClose}
        character={{ ...editableCharacter, feats: editableCharacter.feats || [] } as CharacterData}
        featIndex={editingFeatIndex}
        onSave={handleFeatSave}
      />
    </Dialog>
  )
}
