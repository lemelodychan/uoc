"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { loadAllClasses, loadAllRaces, loadRaceDetails, loadClassesWithDetails, loadClassFeatures } from "@/lib/database"
import { useUser } from "@/lib/user-context"
import type { CharacterData } from "@/lib/character-data"
import { createDefaultSkills, calculateModifier, calculateSkillBonus, createClassBasedSavingThrowProficiencies, createDefaultSavingThrowProficiencies, calculateProficiencyBonus } from "@/lib/character-data"
import type { RaceData } from "@/lib/database"
import type { ClassData } from "@/lib/class-utils"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { FeatEditModal } from "./feat-edit-modal"
import { SKILL_OPTIONS } from "@/components/ui/proficiency-checkboxes"

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
  const [step, setStep] = useState<'basic_info' | 'race_selection' | 'class_selection' | 'class_features' | 'hp_roll' | 'summary'>('basic_info')
  
  // Basic info
  const [name, setName] = useState("")
  const [raceIds, setRaceIds] = useState<Array<{id: string, isMain: boolean}>>([])
  const [mainRaceData, setMainRaceData] = useState<RaceData | null>(null)
  const [abilityScoreChoices, setAbilityScoreChoices] = useState<AbilityScoreChoice[]>([])
  const [selectedASIPattern, setSelectedASIPattern] = useState<string | null>(null)
  const [selectedProficiencies, setSelectedProficiencies] = useState<SelectedProficiencies>({ skills: [], equipment: [], tools: [] })
  const [halfElfVersatilityChoice, setHalfElfVersatilityChoice] = useState<{
    optionName: string
    option: any
    selectedSkills?: string[] // For Skill Versatility option
  } | null>(null)
  const [background, setBackground] = useState("")
  const [alignment, setAlignment] = useState("True Neutral")
  const [isNPC, setIsNPC] = useState(false)
  
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingRaceDetails, setLoadingRaceDetails] = useState(false)

  // Reset all state when modal opens/closes
  const resetAllState = () => {
    setStep('basic_info')
    setName("")
    setRaceIds([])
    setMainRaceData(null)
    setAbilityScoreChoices([])
    setSelectedASIPattern(null)
    setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
    setHalfElfVersatilityChoice(null)
    setBackground("")
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
    }
  }, [isOpen])

  // Sync campaignId when it changes
  useEffect(() => {
    // Campaign ID is handled in onCreateCharacter
  }, [campaignId])

  // Set main race to first race when 2 races are selected and no main is set
  useEffect(() => {
    if (raceIds.length === 2 && !raceIds.some(r => r.isMain)) {
      setRaceIds([{...raceIds[0], isMain: true}, raceIds[1]])
    } else if (raceIds.length === 1 && !raceIds[0]?.isMain) {
      setRaceIds([{...raceIds[0], isMain: true}])
    }
  }, [raceIds.length, raceIds.some(r => r.isMain)])

  // Load main race details when main race changes
  useEffect(() => {
    const mainRace = raceIds.find(r => r.isMain)
    if (mainRace?.id) {
      loadMainRaceDetails(mainRace.id)
    } else {
      setMainRaceData(null)
      setAbilityScoreChoices([])
      setSelectedProficiencies({ skills: [], equipment: [], tools: [] })
    }
  }, [raceIds])

  // Apply ability score increases and proficiencies when race data changes
  useEffect(() => {
    if (mainRaceData) {
      applyRaceModifications(mainRaceData)
      
      // Reset Half-Elf versatility choice if race is not Half-Elf
      if (mainRaceData.name !== 'Half-Elf') {
        setHalfElfVersatilityChoice(null)
      }
    } else {
      setHalfElfVersatilityChoice(null)
    }
  }, [mainRaceData])

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
        if (charClass.class_id) {
          console.log(`Loading features for ${charClass.name} level ${charClass.level} (class_id: ${charClass.class_id}, subclass: ${charClass.subclass || 'none'})`)
          
          // CRITICAL: Always pass includeHidden=true to ensure ASI features are included
          // ASI features are marked as hidden in the database but must be available during character creation
          const { features, error: loadError } = await loadClassFeatures(
            charClass.class_id, 
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
            
            // loadClassFeatures with includeHidden=true already includes hidden features (like ASI)
            // No additional filtering needed - all features returned are valid for character creation
            allFeatures.push(...features)
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

  const applyRaceModifications = (race: RaceData) => {
    // Reset ability scores to base 8 before applying race modifications
    // (Race bonuses will be added on top of the point-buy allocated scores)
    // We don't reset here - we preserve the user's point buy allocation
    // Race bonuses are applied separately in handleAbilityScoreIncreases
    const currentScores = {
      strength: editableCharacter.strength || POINT_BUY_BASE,
      dexterity: editableCharacter.dexterity || POINT_BUY_BASE,
      constitution: editableCharacter.constitution || POINT_BUY_BASE,
      intelligence: editableCharacter.intelligence || POINT_BUY_BASE,
      wisdom: editableCharacter.wisdom || POINT_BUY_BASE,
      charisma: editableCharacter.charisma || POINT_BUY_BASE
    }
    
    // Apply ability score increases
    if (race.ability_score_increases) {
      handleAbilityScoreIncreases(race.ability_score_increases, currentScores)
    }
    // Don't reset to base if no ASI - preserve point buy allocation
    
    // Apply features (skills, equipment, tools)
    if (race.features && Array.isArray(race.features)) {
      const newProficiencies: SelectedProficiencies = { skills: [], equipment: [], tools: [] }
      
      race.features.forEach((feature: any) => {
        if (feature.feature_type === 'skill_proficiency') {
          if (feature.feature_skill_type === 'choice' && feature.skill_options) {
            // Choice-based skill proficiency - don't auto-select, store options
            // Will be handled in UI
          } else if (feature.feature_skill_type) {
            // Fixed skill proficiency
            const skillName = feature.feature_skill_type.toLowerCase().replace(/\s+/g, '_')
            newProficiencies.skills.push(skillName)
          }
        } else if (feature.feature_type === 'weapon_proficiency' && feature.weapons) {
          feature.weapons.forEach((weapon: string) => {
            const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
            if (editableCharacter.equipmentProficiencies && weaponKey in editableCharacter.equipmentProficiencies) {
              newProficiencies.equipment.push(weaponKey)
            }
          })
        } else if (feature.feature_type === 'tool_proficiency' && feature.tools) {
          feature.tools.forEach((tool: string) => {
            newProficiencies.tools.push(tool)
          })
        }
      })
      
      setSelectedProficiencies(newProficiencies)
      
      // Update editable character skills
      const updatedSkills = editableCharacter.skills?.map(skill => {
        const skillInDbFormat = skill.name.toLowerCase().replace(/\s+/g, '_')
        if (newProficiencies.skills.includes(skillInDbFormat)) {
          return { ...skill, proficiency: 'proficient' as const }
        }
        return skill
      }) || []
      
      setEditableCharacter(prev => ({
        ...prev,
        skills: updatedSkills
      }))
      
      // Update equipment proficiencies
      if (newProficiencies.equipment.length > 0) {
        setEditableCharacter(prev => ({
          ...prev,
          equipmentProficiencies: {
            ...prev.equipmentProficiencies,
            ...Object.fromEntries(
              newProficiencies.equipment.map(key => [key, true])
            )
          } as any
        }))
      }
      
      // Update tool proficiencies
      if (newProficiencies.tools.length > 0) {
        setEditableCharacter(prev => ({
          ...prev,
          toolsProficiencies: [
            ...(prev.toolsProficiencies || []),
            ...newProficiencies.tools.map(tool => typeof tool === 'string' ? { name: tool, proficiency: 'proficient' as const } : tool)
          ]
        }))
      }
    }
    
    // Apply speed
    if (race.speed) {
      setEditableCharacter(prev => ({
        ...prev,
        speed: race.speed || 30
      }))
    }
  }

  const handleAbilityScoreIncreases = (asi: any, baseScores: any = null) => {
    const base = baseScores || {
      strength: editableCharacter.strength || 10,
      dexterity: editableCharacter.dexterity || 10,
      constitution: editableCharacter.constitution || 10,
      intelligence: editableCharacter.intelligence || 10,
      wisdom: editableCharacter.wisdom || 10,
      charisma: editableCharacter.charisma || 10
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
      let updatedCharacter = { ...editableCharacter }
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
      const choices: AbilityScoreChoice[] = []
      if (asi.fixed) {
        const fixedChoice: AbilityScoreChoice = {
          ability: asi.fixed.ability.toLowerCase(),
          increase: asi.fixed.increase
        }
        choices.push(fixedChoice)
        
        // Apply fixed increase
        const abilityKey = fixedChoice.ability.toLowerCase() as keyof CharacterData
        setEditableCharacter(prev => ({
          ...prev,
          [abilityKey]: (base[abilityKey] || 10) + fixedChoice.increase
        }))
      }
      setAbilityScoreChoices(choices)
      // Choices are handled in UI
    }
  }

  const handleAbilityScoreSelection = (ability: string, increase: number) => {
    const baseScore = 10 // Start from base 10
    
    setAbilityScoreChoices(prev => {
      const existing = prev.find(c => c.ability === ability)
      
      // If changing the increase amount for the same ability, update it
      if (existing && existing.increase !== increase) {
        const updated = prev.map(c => c.ability === ability ? { ...c, increase } : c)
        
        // Recalculate all ability scores from base
        let updatedCharacter: Partial<CharacterData> = { ...editableCharacter }
        // Apply fixed ASI first if exists
        if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
          const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
          updatedCharacter[fixedAbility as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
        }
        // Then apply all choices
        updated.forEach(choice => {
          const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
          const currentValue = (updatedCharacter[abilityKey] as number) || baseScore
          // If there's a fixed ASI for this ability, use that as base, otherwise use baseScore
          const baseForAbility = (mainRaceData?.ability_score_increases?.type === 'custom' && 
            mainRaceData.ability_score_increases.fixed?.ability.toLowerCase() === ability) 
            ? (baseScore + mainRaceData.ability_score_increases.fixed.increase) 
            : baseScore
          updatedCharacter[abilityKey] = (baseForAbility + choice.increase) as any
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
      
      // Recalculate all ability scores from base
      let updatedCharacter: Partial<CharacterData> = { ...editableCharacter }
      // Apply fixed ASI first if exists
      if (mainRaceData?.ability_score_increases?.type === 'custom' && mainRaceData.ability_score_increases.fixed) {
        const fixedAbility = mainRaceData.ability_score_increases.fixed.ability.toLowerCase()
        updatedCharacter[fixedAbility as keyof CharacterData] = (baseScore + mainRaceData.ability_score_increases.fixed.increase) as any
      }
      // Then apply all choices
      updated.forEach(choice => {
        const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
        const baseForAbility = (mainRaceData?.ability_score_increases?.type === 'custom' && 
          mainRaceData.ability_score_increases.fixed?.ability.toLowerCase() === ability) 
          ? (baseScore + mainRaceData.ability_score_increases.fixed.increase) 
          : baseScore
        updatedCharacter[abilityKey] = (baseForAbility + choice.increase) as any
      })
      setEditableCharacter(updatedCharacter)
      
      return updated
    })
  }
  
  const removeAbilityScoreChoice = (ability: string) => {
    setAbilityScoreChoices(prev => {
      const updated = prev.filter(c => c.ability !== ability)
      
      // Recalculate all ability scores from base
      const baseScore = 10
      let updatedCharacter: Partial<CharacterData> = { ...editableCharacter }
      updated.forEach(choice => {
        const abilityKey = choice.ability.toLowerCase() as keyof CharacterData
        updatedCharacter[abilityKey] = (baseScore + choice.increase) as any
      })
      // Reset removed ability to base
      const abilityKey = ability.toLowerCase() as keyof CharacterData
      updatedCharacter[abilityKey] = baseScore as any
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
    const baseClass = classesData.find(cls => cls.name === className && cls.subclass === null)
    return baseClass?.subclass_selection_level || 3
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

    setHpRollResult({
      roll: totalRoll,
      constitutionModifier,
      total: totalHP,
      classRolls: classRolls.length > 1 ? classRolls : undefined
    })
    
    setEditableCharacter(prev => ({
      ...prev,
      maxHitPoints: totalHP,
      currentHitPoints: totalHP
    }))
  }
  
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
    
    const newChoices = new Map(asiChoices)
    newChoices.set(featureId, {
      ...currentChoice,
      abilityScores: {
        ...currentChoice.abilityScores,
        [which]: ability
      }
    })
    setAsiChoices(newChoices)
    
    // Apply to editable character preview
    const abilityKey = ability.toLowerCase() as keyof CharacterData
    const currentValue = editableCharacter[abilityKey] as number || 10
    
    if (which === 'first') {
      // Remove previous first if exists
      if (currentChoice.abilityScores.first) {
        const prevAbility = currentChoice.abilityScores.first.toLowerCase() as keyof CharacterData
        const prevValue = editableCharacter[prevAbility] as number || 10
        const prevIncrease = currentChoice.abilityScores.second ? 1 : 2
        
        // Preserve race bonus when removing ASI
        const raceBonus = abilityScoreChoices.find(c => c.ability === prevAbility)?.increase || 0
        const baseWithRace = 10 + raceBonus
        const newValue = prevValue - prevIncrease
        updateEditableCharacter({ [prevAbility]: Math.max(baseWithRace, newValue) })
      }
      // Add new first (2 if no second, 1 if second exists)
      const increase = currentChoice.abilityScores.second ? 1 : 2
      updateEditableCharacter({ [abilityKey]: currentValue + increase })
    } else {
      // Remove previous second if exists
      if (currentChoice.abilityScores.second) {
        const prevAbility = currentChoice.abilityScores.second.toLowerCase() as keyof CharacterData
        const prevValue = editableCharacter[prevAbility] as number || 10
        
        // Preserve race bonus when removing ASI
        const raceBonus = abilityScoreChoices.find(c => c.ability === prevAbility)?.increase || 0
        const baseWithRace = 10 + raceBonus
        const newValue = prevValue - 1
        updateEditableCharacter({ [prevAbility]: Math.max(baseWithRace, newValue) })
      }
      // Add new second (first gets reduced from 2 to 1)
      if (currentChoice.abilityScores.first) {
        const firstAbility = currentChoice.abilityScores.first.toLowerCase() as keyof CharacterData
        const firstValue = editableCharacter[firstAbility] as number || 10
        
        // Preserve race bonus when adjusting first ability
        const firstRaceBonus = abilityScoreChoices.find(c => c.ability === firstAbility)?.increase || 0
        const firstBaseWithRace = 10 + firstRaceBonus
        const firstNewValue = firstValue - 1
        
        updateEditableCharacter({ 
          [firstAbility]: Math.max(firstBaseWithRace, firstNewValue),
          [abilityKey]: currentValue + 1
        })
      } else {
        updateEditableCharacter({ [abilityKey]: currentValue + 1 })
      }
    }
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
    if (editingFeatIndex === null && updates.feats && editingFeatForFeatureId) {
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
    
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
    setEditingFeatForFeatureId(null)
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
    
    // Validate Half-Elf versatility choice if Half-Elf is selected
    if (mainRaceData?.name === 'Half-Elf' && !halfElfVersatilityChoice) {
      setError("Please select a Half-Elf Versatility option")
      return
    }
    
    // Validate skill selection for Skill Versatility option
    if (halfElfVersatilityChoice?.option.type === 'skill_proficiency' && 
        halfElfVersatilityChoice.option.skill_choice === 'any') {
      const requiredCount = halfElfVersatilityChoice.option.skill_count || 2
      if (!halfElfVersatilityChoice.selectedSkills || halfElfVersatilityChoice.selectedSkills.length < requiredCount) {
        setError(`Please select ${requiredCount} skills for Skill Versatility`)
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
    
    // Update editable character with saving throw proficiencies
    const updatedCharacter = {
      ...editableCharacter,
      skills: updatedSkills,
      savingThrowProficiencies
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

    // Collect race features (excluding skill/weapon/tool proficiencies which are handled separately)
    const raceFeatures: Array<{name: string, description: string, usesPerLongRest?: number | string, currentUses?: number, refuelingDie?: string}> = []
    if (mainRaceData?.features && Array.isArray(mainRaceData.features)) {
      mainRaceData.features.forEach((feature: any) => {
        // Skip proficiencies - they're handled via skills/equipment/tools
        if (feature.feature_type === 'skill_proficiency' || 
            feature.feature_type === 'weapon_proficiency' || 
            feature.feature_type === 'tool_proficiency') {
          return
        }
        
        // Skip Half-Elf Versatility choice feature - the selected option will be handled separately
        if (feature.feature_type === 'choice' && feature.name === 'Half-Elf Versatility') {
          // Add the selected versatility option as a feature instead
          if (halfElfVersatilityChoice) {
            const selectedOption = halfElfVersatilityChoice.option
            
            // Only add as feature if it's a trait type, not skill/weapon proficiencies
            if (selectedOption.type === 'trait') {
              // Handle Fleet of Foot and Mask of the Wild
              raceFeatures.push({
                name: selectedOption.name,
                description: selectedOption.description || '',
              })
            } else if (selectedOption.type === 'spell') {
              // Add spell-based features (cantrip, Drow Magic, etc.)
              raceFeatures.push({
                name: selectedOption.name,
                description: selectedOption.description || '',
              })
            }
            // skill_proficiency and weapon_proficiency are already handled in proficiencies
          }
          return
        }
        
        // Get usesPerLongRest from race feature (handle both snake_case and camelCase)
        const usesPerLongRest = feature.uses_per_long_rest || feature.usesPerLongRest
        const refuelingDie = feature.refueling_die || feature.refuelingDie
        
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
        })
      })
    }
    
    // Also collect features from secondary race if present
    if (raceIds.length > 1) {
      const secondaryRaceId = raceIds.find(r => !r.isMain)?.id
      if (secondaryRaceId) {
        try {
          const { race: secondaryRace } = await loadRaceDetails(secondaryRaceId)
          if (secondaryRace?.features && Array.isArray(secondaryRace.features)) {
            secondaryRace.features.forEach((feature: any) => {
              if (feature.feature_type === 'skill_proficiency' || 
                  feature.feature_type === 'weapon_proficiency' || 
                  feature.feature_type === 'tool_proficiency') {
                return
              }
              
              // Get usesPerLongRest from race feature (handle both snake_case and camelCase)
              const usesPerLongRest = feature.uses_per_long_rest || feature.usesPerLongRest
              const refuelingDie = feature.refueling_die || feature.refuelingDie
              
              // Calculate initial currentUses (start at max, which is full)
              const maxUses = calculateMaxUses(usesPerLongRest, {
                ...editableCharacter,
                proficiencyBonus: calculateProficiencyBonus(level)
              })
              
              raceFeatures.push({
                name: feature.name || 'Unknown Feature',
                description: feature.description || '',
                usesPerLongRest: usesPerLongRest,
                currentUses: maxUses, // Initialize to max (full uses)
                refuelingDie: refuelingDie,
              })
            })
          }
        } catch (err) {
          console.error("Error loading secondary race features:", err)
        }
      }
    }

    const firstClass = characterClasses[0]
    onCreateCharacter({
      name,
      class: firstClass.name, // Legacy field
      subclass: firstClass.subclass || "", // Legacy field
      classId: firstClass.class_id || "", // Legacy field
      level,
      classes: characterClasses, // Multiclass support (includes selectedSkillProficiencies)
      background,
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
      maxHitPoints: hpRollResult?.total || editableCharacter.maxHitPoints || 8,
      currentHitPoints: hpRollResult?.total || editableCharacter.currentHitPoints || 8,
      speed: editableCharacter.speed || 30,
      armorClass: baseAC,
      initiative: initiativeValue,
      features: raceFeatures, // Race-based features
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

  // Point buy system constants
  const POINT_BUY_TOTAL = 27
  const POINT_BUY_BASE = 8
  const POINT_BUY_MIN = 8
  const POINT_BUY_MAX = 15

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
      const raceBonus = abilityScoreChoices.find(c => c.ability === ability)?.increase || 0
      
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
    <div className="w-80 border-l bg-muted/20 p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      {/* Ability Scores - Display only (editing happens in main step 5) */}
      <Card className="flex flex-col gap-1">
        <CardHeader>
          <CardTitle className="text-md">Ability Scores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {[
            { key: 'strength', label: 'Strength' },
            { key: 'dexterity', label: 'Dexterity' },
            { key: 'constitution', label: 'Constitution' },
            { key: 'intelligence', label: 'Intelligence' },
            { key: 'wisdom', label: 'Wisdom' },
            { key: 'charisma', label: 'Charisma' }
          ].map(({ key, label }) => {
            const value = editableCharacter[key as keyof CharacterData] as number || POINT_BUY_BASE
            const modifier = calculateModifier(value)
            
            // Calculate base score (before race/ASI bonuses)
            const raceBonus = abilityScoreChoices.find(c => c.ability === key)?.increase || 0
            
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
                    className={`text-xs ${hasAnyModification ? 'bg-primary text-primary-foreground' : ''}`}
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
          {step !== 'hp_roll' && (
            <div className="pt-2 border-t mt-2">
              <p className="text-xs text-muted-foreground italic">
                Allocate ability scores in Step 5 (Ability Scores & Hit Points)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hit Points */}
      <Card className="flex flex-col gap-1">
        <CardHeader>
          <CardTitle className="text-md">Hit Points</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-2">
            <Label className="text-sm font-medium w-full">Max</Label>
            <Input
              type="number"
              value={editableCharacter.maxHitPoints || 8}
              onChange={(e) => updateEditableCharacter({ maxHitPoints: parseInt(e.target.value) || 8, currentHitPoints: parseInt(e.target.value) || 8 })}
              className={`w-20 h-6 text-xs px-2 ${hpRollResult ? 'border-primary' : ''}`}
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
      <Card className="flex flex-col gap-2">
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
              step === 'class_selection' ? '3' : 
              step === 'class_features' ? '4' : 
              step === 'hp_roll' ? '5' : 
              '6'
            } of 6
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

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

                <Card>
                  <CardContent className="px-4 py-4 flex flex-col gap-4">
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

                    {/* Background */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="background">Background *</Label>
                      <Input
                        id="background"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        placeholder="e.g., Folk Hero, Noble, Criminal"
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

                <Card>
                  <CardContent className="px-4 py-4 flex flex-col gap-4">
                    {/* Race Selection */}
                    <div className="flex flex-col gap-2">
                      <Label>Race *</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={raceIds[0]?.id || ""}
                            onValueChange={(value) => {
                              if (value) {
                                const newRaceIds: Array<{id: string, isMain: boolean}> = [
                                  {id: value, isMain: raceIds[0]?.isMain || true},
                                  raceIds[1]
                                ].filter(Boolean) as Array<{id: string, isMain: boolean}>
                                if (newRaceIds.length === 1) {
                                  newRaceIds[0].isMain = true
                                }
                                setRaceIds(newRaceIds)
                              } else {
                                setRaceIds([])
                              }
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select first race" />
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
                          {raceIds.length === 2 && raceIds[0] && (
                            <div className="flex items-center space-x-1">
                              <Checkbox
                                id="main-race-1"
                                checked={raceIds[0]?.isMain || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRaceIds([
                                      {...raceIds[0], isMain: true},
                                      {...raceIds[1], isMain: false}
                                    ])
                                  }
                                }}
                              />
                              <Label htmlFor="main-race-1" className="text-xs cursor-pointer whitespace-nowrap">
                                Main
                              </Label>
                            </div>
                          )}
                        </div>
                        {raceIds.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={raceIds[1]?.id || undefined}
                              onValueChange={(value) => {
                                if (value && value !== "__clear__") {
                                  const newRaceIds: Array<{id: string, isMain: boolean}> = [
                                    raceIds[0],
                                    {id: value, isMain: false}
                                  ]
                                  setRaceIds(newRaceIds)
                                } else if (value === "__clear__") {
                                  setRaceIds([{...raceIds[0], isMain: true}])
                                }
                              }}
                              disabled={loading}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select second race (optional)" />
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
                            {raceIds.length === 2 && raceIds[1] && (
                              <div className="flex items-center space-x-1">
                                <Checkbox
                                  id="main-race-2"
                                  checked={raceIds[1]?.isMain || false}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setRaceIds([
                                        {...raceIds[0], isMain: false},
                                        {...raceIds[1], isMain: true}
                                      ])
                                    }
                                  }}
                                />
                                <Label htmlFor="main-race-2" className="text-xs cursor-pointer whitespace-nowrap">
                                  Main
                                </Label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ability Score Increases */}
                    {mainRaceData && mainRaceData.ability_score_increases && (
                      <div className="flex flex-col gap-2">
                        <Label>Ability Score Increases</Label>
                        {loadingRaceDetails ? (
                          <div className="text-sm text-muted-foreground">Loading race details...</div>
                        ) : hasChoiceASI ? (
                          (() => {
                            // Check if options are pattern objects (like Kender)
                            const options = mainRaceData.ability_score_increases.options || []
                            const hasPatternOptions = Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0].pattern
                            
                            if (hasPatternOptions) {
                              // Handle pattern-based choice ASI (like Kender with one_plus_two or three_ones patterns)
                              // Detect pattern from current choices if not explicitly selected
                              const detectedPattern = selectedASIPattern || (abilityScoreChoices.length > 0 
                                ? (abilityScoreChoices.some(c => c.increase === 2) ? 'one_plus_two' : 'three_ones')
                                : null)
                              
                              return (
                                <div className="flex flex-col gap-2">
                                  <p className="text-sm text-muted-foreground">
                                    {mainRaceData.ability_score_increases.description || "Choose ability score increases"}
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-medium">Choose ASI Pattern</Label>
                                    <Select
                                      value={detectedPattern || ""}
                                      onValueChange={(value) => {
                                        setSelectedASIPattern(value)
                                        // Clear existing choices when pattern changes
                                        abilityScoreChoices.forEach(choice => {
                                          removeAbilityScoreChoice(choice.ability)
                                        })
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a pattern" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {options.map((opt: any, index: number) => (
                                          <SelectItem key={index} value={opt.pattern}>
                                            {opt.description || opt.pattern}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Show pattern-specific UI */}
                                  {detectedPattern === 'one_plus_two' && (
                                    <div className="flex flex-col gap-3 mt-2">
                                      <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-medium">Choose one ability score to increase by +2</Label>
                                        <Select
                                          value={abilityScoreChoices.find(c => c.increase === 2)?.ability || ""}
                                          onValueChange={(value) => {
                                            if (value) {
                                              // Remove any existing +2 choice
                                              const plusTwo = abilityScoreChoices.find(c => c.increase === 2)
                                              if (plusTwo) removeAbilityScoreChoice(plusTwo.ability)
                                              // Remove any +1 for same ability
                                              const plusOne = abilityScoreChoices.find(c => c.ability === value && c.increase === 1)
                                              if (plusOne) removeAbilityScoreChoice(value)
                                              setTimeout(() => handleAbilityScoreSelection(value, 2), 0)
                                            } else {
                                              const plusTwo = abilityScoreChoices.find(c => c.increase === 2)
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
                                          value={abilityScoreChoices.find(c => c.increase === 1)?.ability || ""}
                                          onValueChange={(value) => {
                                            if (value) {
                                              const plusTwo = abilityScoreChoices.find(c => c.increase === 2)
                                              if (plusTwo && plusTwo.ability === value) return
                                              const plusOne = abilityScoreChoices.find(c => c.increase === 1)
                                              if (plusOne) removeAbilityScoreChoice(plusOne.ability)
                                              setTimeout(() => handleAbilityScoreSelection(value, 1), 0)
                                            } else {
                                              const plusOne = abilityScoreChoices.find(c => c.increase === 1)
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
                                                const plusTwo = abilityScoreChoices.find(c => c.increase === 2)
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
                                    </div>
                                  )}
                                  
                                  {detectedPattern === 'three_ones' && (
                                    <div className="flex flex-col gap-3 mt-2">
                                      {[1, 2, 3].map((index) => {
                                        const currentChoice = abilityScoreChoices[index - 1]
                                        const selectedAbilities = abilityScoreChoices.map(c => c.ability)
                                        
                                        return (
                                          <div key={index} className="flex flex-col gap-2">
                                            <Label className="text-sm font-medium">Choose ability #{index} to increase by +1</Label>
                                            <Select
                                              value={currentChoice?.ability || ""}
                                              onValueChange={(value) => {
                                                if (value) {
                                                  if (currentChoice) removeAbilityScoreChoice(currentChoice.ability)
                                                  setTimeout(() => handleAbilityScoreSelection(value, 1), 0)
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
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            
                            // Fallback to number-based choice ASI
                            return (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-muted-foreground">
                                  {mainRaceData.ability_score_increases.description || "Choose ability score increases"}
                                </p>
                                {mainRaceData.ability_score_increases.total && (
                                  <p className="text-xs text-muted-foreground">
                                    Total: +{mainRaceData.ability_score_increases.total} points to distribute
                                  </p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                                    const currentChoice = abilityScoreChoices.find(c => c.ability === ability)
                                    const numberOptions = Array.isArray(options) && options.every((opt: any) => typeof opt === 'number') 
                                      ? options as number[]
                                      : [1, 2]
                                    const maxTotal = mainRaceData.ability_score_increases.total || 2
                                    const currentTotal = abilityScoreChoices.reduce((sum, c) => sum + c.increase, 0)
                                    
                                    return (
                                      <div key={ability} className="flex items-center gap-2">
                                        <Label className="text-sm w-24 capitalize">{ability}</Label>
                                        <Select
                                          value={currentChoice ? currentChoice.increase.toString() : "0"}
                                          onValueChange={(value) => {
                                            const increase = parseInt(value)
                                            if (increase === 0) {
                                              removeAbilityScoreChoice(ability)
                                            } else {
                                              const newTotal = currentTotal - (currentChoice?.increase || 0) + increase
                                              if (newTotal <= maxTotal) {
                                                handleAbilityScoreSelection(ability, increase)
                                              }
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="w-20 h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">+0</SelectItem>
                                            {numberOptions.map((opt: number) => {
                                              const newTotal = currentTotal - (currentChoice?.increase || 0) + opt
                                              const canSelect = newTotal <= maxTotal
                                              return (
                                                <SelectItem 
                                                  key={opt} 
                                                  value={opt.toString()}
                                                  disabled={!canSelect}
                                                >
                                                  +{opt}
                                                </SelectItem>
                                              )
                                            })}
                                          </SelectContent>
                                        </Select>
                                        {currentChoice && (
                                          <Badge variant="default" className="text-xs">
                                            +{currentChoice.increase}
                                          </Badge>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                {abilityScoreChoices.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Total allocated: {abilityScoreChoices.reduce((sum, c) => sum + c.increase, 0)}/{mainRaceData.ability_score_increases.total || 2}
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        ) : mainRaceData.ability_score_increases.type === 'custom' ? (
                          <div className="flex flex-col gap-2">
                            {mainRaceData.ability_score_increases.fixed && (
                              <div className="text-sm">
                                <Badge variant="default" className="mr-2">
                                  +{mainRaceData.ability_score_increases.fixed.increase} {mainRaceData.ability_score_increases.fixed.ability}
                                </Badge>
                              </div>
                            )}
                            {mainRaceData.ability_score_increases.choices && (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-muted-foreground">
                                  {mainRaceData.ability_score_increases.choices.description || "Choose additional ability score increases"}
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
                                ) : (
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
                            )}
                          </div>
                        ) : Array.isArray(mainRaceData.ability_score_increases) ? (
                          <div className="flex flex-col gap-1">
                            {mainRaceData.ability_score_increases.map((asi: any, index: number) => (
                              <div key={index} className="text-sm">
                                <Badge variant="default" className="mr-2">
                                  +{asi.increase} {asi.ability}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Skill Proficiencies from Race */}
                    {mainRaceData && mainRaceData.features && (
                      <div className="flex flex-col gap-2">
                        <Label>Race Skill Proficiencies</Label>
                        {mainRaceData.features
                          .filter((f: any) => f.feature_type === 'skill_proficiency')
                          .map((feature: any, index: number) => {
                            if (feature.feature_skill_type === 'choice' && feature.skill_options) {
                              const maxSelections = feature.max_selections || 1
                              const selectedCount = selectedProficiencies.skills.filter(s => 
                                feature.skill_options.some((opt: string) => opt.toLowerCase().replace(/\s+/g, '_') === s)
                              ).length
                              
                              return (
                                <div key={index} className="flex flex-col gap-2">
                                  <p className="text-sm">{feature.description}</p>
                                  {maxSelections > 1 && (
                                    <p className="text-xs text-muted-foreground">
                                      Select {maxSelections} skill{maxSelections > 1 ? 's' : ''} ({selectedCount}/{maxSelections})
                                    </p>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
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
                            } else if (feature.feature_skill_type) {
                              return (
                                <div key={index} className="text-sm">
                                  <Badge variant="secondary">{feature.feature_skill_type}</Badge>
                                </div>
                              )
                            }
                            return null
                          })}
                      </div>
                    )}

                    {/* Half-Elf Versatility Selection */}
                    {mainRaceData?.name === 'Half-Elf' && (() => {
                      const versatilityFeature = mainRaceData.features?.find((f: any) => 
                        f.name === 'Half-Elf Versatility' && f.feature_type === 'choice'
                      )
                      
                      if (!versatilityFeature || !versatilityFeature.options) {
                        return null
                      }
                      
                      return (
                        <div className="flex flex-col gap-2 pt-2 border-t">
                          <Label className="text-sm font-medium">
                            Half-Elf Versatility *
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {versatilityFeature.description}
                          </p>
                          <Select
                            value={halfElfVersatilityChoice?.optionName || ""}
                            onValueChange={(value) => {
                              if (value && versatilityFeature.options) {
                                const selectedOption = versatilityFeature.options.find((opt: any) => opt.name === value)
                                if (selectedOption) {
                                  setHalfElfVersatilityChoice({
                                    optionName: selectedOption.name,
                                    option: selectedOption,
                                    selectedSkills: selectedOption.type === 'skill_proficiency' && selectedOption.skill_choice === 'any' 
                                      ? [] 
                                      : undefined
                                  })
                                  
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
                                if (halfElfVersatilityChoice?.option.type === 'weapon_proficiency') {
                                  // Remove weapon proficiencies
                                  const updatedProficiencies = { ...selectedProficiencies }
                                  halfElfVersatilityChoice.option.weapons?.forEach((weapon: string) => {
                                    const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                    updatedProficiencies.equipment = updatedProficiencies.equipment.filter(w => w !== weaponKey)
                                  })
                                  setSelectedProficiencies(updatedProficiencies)
                                  
                                  setEditableCharacter(prev => ({
                                    ...prev,
                                    equipmentProficiencies: {
                                      ...prev.equipmentProficiencies,
                                      ...Object.fromEntries(
                                        halfElfVersatilityChoice.option.weapons?.map((weapon: string) => {
                                          const weaponKey = weapon.toLowerCase().replace(/\s+/g, '')
                                          return [weaponKey, false]
                                        }) || []
                                      )
                                    } as any
                                  }))
                                } else if (halfElfVersatilityChoice?.option.type === 'trait' && halfElfVersatilityChoice.option.speed_bonus) {
                                  // Revert speed bonus
                                  setEditableCharacter(prev => ({
                                    ...prev,
                                    speed: (prev.speed || 35) - halfElfVersatilityChoice.option.speed_bonus
                                  }))
                                }
                                
                                setHalfElfVersatilityChoice(null)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a Half-Elf versatility option" />
                            </SelectTrigger>
                            <SelectContent>
                              {versatilityFeature.options.map((option: any) => (
                                <SelectItem key={option.name} value={option.name}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Skill Selection for Skill Versatility option */}
                          {halfElfVersatilityChoice?.option.type === 'skill_proficiency' && 
                           halfElfVersatilityChoice.option.skill_choice === 'any' && (
                            <div className="flex flex-col gap-2 pt-2">
                              <Label className="text-xs font-medium">
                                Choose {halfElfVersatilityChoice.option.skill_count || 2} Skills
                                ({halfElfVersatilityChoice.selectedSkills?.length || 0}/{halfElfVersatilityChoice.option.skill_count || 2})
                              </Label>
                              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                                {SKILL_OPTIONS.map((skill) => {
                                  const isSelected = halfElfVersatilityChoice.selectedSkills?.includes(skill.value) || false
                                  const canSelect = isSelected || (halfElfVersatilityChoice.selectedSkills?.length || 0) < (halfElfVersatilityChoice.option.skill_count || 2)
                                  
                                  return (
                                    <div key={skill.value} className={`flex items-center space-x-2 ${!canSelect ? 'opacity-50' : ''}`}>
                                      <Checkbox
                                        id={`half-elf-skill-${skill.value}`}
                                        checked={isSelected}
                                        disabled={!canSelect && !isSelected}
                                        onCheckedChange={(checked) => {
                                          if (!halfElfVersatilityChoice) return
                                          
                                          const currentSkills = halfElfVersatilityChoice.selectedSkills || []
                                          const newSkills = checked
                                            ? [...currentSkills, skill.value]
                                            : currentSkills.filter(s => s !== skill.value)
                                          
                                          setHalfElfVersatilityChoice({
                                            ...halfElfVersatilityChoice,
                                            selectedSkills: newSkills
                                          })
                                          
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
                                      <Label htmlFor={`half-elf-skill-${skill.value}`} className="text-xs cursor-pointer">
                                        {skill.label}
                                      </Label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Show selected option description */}
                          {halfElfVersatilityChoice && (
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                              <strong>{halfElfVersatilityChoice.option.name}:</strong> {halfElfVersatilityChoice.option.description}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Class Selection */}
            {step === 'class_selection' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Class Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your character's classes, levels, and subclasses (multiclassing supported)
                  </p>
                </div>

                <Card>
                  <CardContent className="px-4 py-4 flex flex-col gap-4">
                    {/* Current Classes */}
                    {characterClasses.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <Label>Selected Classes</Label>
                        <div className="flex flex-col gap-2">
                          {characterClasses.map((charClass, index) => {
                            const totalLevel = characterClasses.reduce((sum, c) => sum + c.level, 0)
                            const classSubclasses = classes.filter(c => c.name === charClass.name).map(c => c.subclass).filter(Boolean)
                            return (
                              <div key={index} className="flex flex-col gap-2 p-2 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{charClass.name}</div>
                                    {charClass.subclass ? (
                                      <div className="text-sm text-muted-foreground">{charClass.subclass}</div>
                                    ) : classSubclasses.length > 0 && (
                                      <div className="text-xs text-muted-foreground italic">No subclass selected</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`class-level-${index}`} className="text-xs whitespace-nowrap">Level:</Label>
                                    <Input
                                      id={`class-level-${index}`}
                                      type="number"
                                      min="1"
                                      max="20"
                                      className="w-16 h-8"
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
                                      
                                      // Validate subclass requirement when level changes
                                      const requiredLevel = getSubclassSelectionLevel(charClass.name)
                                      const classSubclassesList = classes.filter(c => c.name === charClass.name).map(c => c.subclass).filter(Boolean)
                                      if (classSubclassesList.length > 0 && clampedValue >= requiredLevel && !charClass.subclass) {
                                        setError(`Subclass is required for ${charClass.name} at level ${requiredLevel} and above`)
                                      } else {
                                        setError(null)
                                      }
                                      
                                      const updated = characterClasses.map((c, i) => 
                                        i === index ? { ...c, level: clampedValue } : c
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
                                  <div className="text-xs text-muted-foreground">
                                    Total: {totalLevel}/20
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updated = characterClasses.filter((_, i) => i !== index)
                                      setCharacterClasses(updated)
                                      const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                      setLevel(newTotal || 1)
                                    }}
                                  >
                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                  </Button>
                                </div>
                                {classSubclasses.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`subclass-${index}`} className="text-xs">
                                      Subclass {(() => {
                                        const requiredLevel = getSubclassSelectionLevel(charClass.name)
                                        return charClass.level >= requiredLevel ? "*" : ""
                                      })()}
                                    </Label>
                                    <Select
                                      value={charClass.subclass || undefined}
                                      onValueChange={(value) => {
                                        // Handle "none" option
                                        if (value === "__none__") {
                                          const updated = characterClasses.map((c, i) => 
                                            i === index ? { ...c, subclass: undefined } : c
                                          )
                                          setCharacterClasses(updated)
                                          return
                                        }
                                        const selectedClassOption = classes.find(c => c.name === charClass.name && c.subclass === value)
                                        const updated = characterClasses.map((c, i) => 
                                          i === index ? { ...c, subclass: value || undefined, class_id: selectedClassOption?.id || c.class_id } : c
                                        )
                                        setCharacterClasses(updated)
                                      }}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder={(() => {
                                          const requiredLevel = getSubclassSelectionLevel(charClass.name)
                                          return charClass.level >= requiredLevel ? "Select a subclass (required)" : "Select a subclass (optional)"
                                        })()} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {charClass.level < getSubclassSelectionLevel(charClass.name) && (
                                          <SelectItem value="__none__">None</SelectItem>
                                        )}
                                        {classSubclasses.map((subclass) => (
                                          <SelectItem key={subclass} value={subclass}>
                                            {subclass}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                
                                {/* Skill Proficiencies Selection for this class */}
                                {(() => {
                                  const classData = classDataMap.get(charClass.name)
                                  const availableSkills = classData?.skill_proficiencies 
                                    ? (Array.isArray(classData.skill_proficiencies) 
                                        ? classData.skill_proficiencies 
                                        : (classData.skill_proficiencies?.options || classData.skill_proficiencies?.proficiencies || []))
                                    : []
                                  
                                  // Most classes get 2 skill proficiencies
                                  const maxSkillChoices = 2
                                  
                                  if (availableSkills.length > 0) {
                                    const selectedSkills = charClass.selectedSkillProficiencies || []
                                    
                                    return (
                                      <div className="flex flex-col gap-2 pt-2 border-t">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-xs font-medium">
                                            Skill Proficiencies ({selectedSkills.length}/{maxSkillChoices})
                                          </Label>
                                          {selectedSkills.length < maxSkillChoices && (
                                            <span className="text-xs text-muted-foreground">
                                              Choose {maxSkillChoices - selectedSkills.length} more
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
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
                                            const canSelect = isSelected || selectedSkills.length < maxSkillChoices
                                            
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
                                                <Label htmlFor={`skill-${index}-${skill.value}`} className="text-xs cursor-pointer flex-1">
                                                  {skill.label}
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

                    {/* Add New Class */}
                    <div className="flex flex-col gap-2">
                      <Label>Add Class</Label>
                      <div className="flex flex-col gap-2">
                        <Select 
                          value={selectedClass} 
                          onValueChange={handleClassChange}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading classes..." : "Select a class"} />
                          </SelectTrigger>
                          <SelectContent>
                            {[...new Set(classes.map(c => c.name))].map((className) => (
                              <SelectItem 
                                key={className} 
                                value={className}
                                disabled={characterClasses.some(c => c.name === className)}
                              >
                                {className}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedClass && (
                          <>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="class-level">Level for {selectedClass}</Label>
                              <Input
                                id="class-level"
                                type="number"
                                min="1"
                                max="20"
                                value={(() => {
                                  const existing = characterClasses.find(c => c.name === selectedClass)
                                  return existing ? existing.level : newClassLevel
                                })()}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  const existing = characterClasses.find(c => c.name === selectedClass)
                                  
                                  if (existing) {
                                    // Update existing class level
                                    if (inputValue === '') return
                                    const parsedValue = Number.parseInt(inputValue, 10)
                                    if (isNaN(parsedValue)) return
                                    
                                    const clampedValue = Math.min(Math.max(parsedValue, 1), 20)
                                    const updated = characterClasses.map(c => 
                                      c.name === selectedClass ? { ...c, level: clampedValue } : c
                                    )
                                    setCharacterClasses(updated)
                                    const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                    setLevel(newTotal)
                                  } else {
                                    // For new classes, update local state
                                    if (inputValue === '') {
                                      setNewClassLevel(1)
                                      return
                                    }
                                    const parsedValue = Number.parseInt(inputValue, 10)
                                    if (isNaN(parsedValue)) return
                                    const clampedValue = Math.min(Math.max(parsedValue, 1), 20)
                                    setNewClassLevel(clampedValue)
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputValue = e.target.value
                                  const existing = characterClasses.find(c => c.name === selectedClass)
                                  
                                  if (inputValue === '') {
                                    // Reset to 1 if empty on blur
                                    if (existing) {
                                      const updated = characterClasses.map(c => 
                                        c.name === selectedClass ? { ...c, level: 1 } : c
                                      )
                                      setCharacterClasses(updated)
                                      const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                      setLevel(newTotal || 1)
                                    } else {
                                      setNewClassLevel(1)
                                    }
                                    return
                                  }
                                  
                                  const parsedValue = Number.parseInt(inputValue, 10)
                                  if (isNaN(parsedValue) || parsedValue < 1) {
                                    if (existing) {
                                      const updated = characterClasses.map(c => 
                                        c.name === selectedClass ? { ...c, level: 1 } : c
                                      )
                                      setCharacterClasses(updated)
                                      const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                      setLevel(newTotal || 1)
                                    } else {
                                      setNewClassLevel(1)
                                    }
                                  } else if (parsedValue > 20) {
                                    if (existing) {
                                      const updated = characterClasses.map(c => 
                                        c.name === selectedClass ? { ...c, level: 20 } : c
                                      )
                                      setCharacterClasses(updated)
                                      const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                      setLevel(newTotal)
                                    } else {
                                      setNewClassLevel(20)
                                    }
                                  } else {
                                    // Valid value, ensure it's applied
                                    if (existing && existing.level !== parsedValue) {
                                      const updated = characterClasses.map(c => 
                                        c.name === selectedClass ? { ...c, level: parsedValue } : c
                                      )
                                      setCharacterClasses(updated)
                                      const newTotal = updated.reduce((sum, c) => sum + c.level, 0)
                                      setLevel(newTotal)
                                    } else if (!existing && newClassLevel !== parsedValue) {
                                      setNewClassLevel(parsedValue)
                                    }
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                New classes start at level 1.
                              </p>
                            </div>

                            {/* Subclass */}
                            {selectedClass && (
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="subclass">
                                  Subclass {isSubclassRequired ? "*" : ""}
                                </Label>
                                <Select
                                  value={selectedSubclass}
                                  onValueChange={handleSubclassChange}
                                  disabled={!selectedClass || loading}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      !selectedClass 
                                        ? "Select class first" 
                                        : availableSubclasses.length === 0 
                                          ? "No subclasses available" 
                                          : "Select a subclass"
                                    } />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableSubclasses.map((subclass) => (
                                      <SelectItem key={subclass} value={subclass}>
                                        {subclass}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <Button
                              onClick={() => {
                                if (!selectedClass || !selectedClassId) return
                                const totalLevel = characterClasses.reduce((sum, c) => sum + c.level, 0)
                                
                                // Use the newClassLevel state
                                const levelToUse = newClassLevel
                                
                                if (totalLevel + newClassLevel > 20) {
                                  setError("Total level cannot exceed 20")
                                  return
                                }
                                
                                const newClass = {
                                  name: selectedClass,
                                  subclass: selectedSubclass || undefined,
                                  class_id: selectedClassId,
                                  level: levelToUse
                                }
                                setCharacterClasses([...characterClasses, newClass])
                                setLevel(totalLevel + levelToUse)
                                setSelectedClass("")
                                setSelectedSubclass("")
                                setSelectedClassId("")
                                setNewClassLevel(1) // Reset for next class
                                setError(null)
                              }}
                              disabled={!selectedClass || !selectedClassId || characterClasses.some(c => c.name === selectedClass)}
                            >
                              <Icon icon="lucide:plus" className="w-4 h-4" />
                              Add Class
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Total Level Display */}
                    {characterClasses.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Level:</span>
                          <span className="font-medium">
                            {characterClasses.reduce((sum, c) => sum + c.level, 0)}/20
                          </span>
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
                  <h3 className="text-lg font-semibold">Class Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Select and configure class features for your character
                  </p>
                </div>

                {/* Class Features Selection */}
                {isLoadingFeatures ? (
                  <Card>
                    <CardContent className="px-4 py-4">
                      <div className="text-center text-muted-foreground">Loading class features...</div>
                    </CardContent>
                  </Card>
                ) : classFeatures.length > 0 && (
                  <Card>
                    <CardContent className="px-4 py-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-md font-semibold">Unlocked Class Features</h4>
                        <p className="text-sm text-muted-foreground">
                          Select which features to include for your character
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                        {classFeatures.map((feature) => {
                          const isASI = isASIFeature(feature)
                          const isSelected = selectedFeatures.has(feature.id)
                          const asiChoice = asiChoices.get(feature.id)
                          
                          return (
                            <div key={feature.id} className="flex flex-col gap-2 p-2 border rounded-lg">
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  id={`feature-${feature.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedFeatures)
                                    if (checked) {
                                      newSelected.add(feature.id)
                                      // Auto-initialize ASI choice if it's an ASI feature
                                      if (isASI && !asiChoices.has(feature.id)) {
                                        const newChoices = new Map(asiChoices)
                                        newChoices.set(feature.id, {
                                          type: 'ability_scores',
                                          abilityScores: { first: '', second: '' },
                                          feat: null
                                        })
                                        setAsiChoices(newChoices)
                                      }
                                    } else {
                                      newSelected.delete(feature.id)
                                      // Remove ASI choice if unchecked
                                      if (isASI) {
                                        const newChoices = new Map(asiChoices)
                                        newChoices.delete(feature.id)
                                        setAsiChoices(newChoices)
                                      }
                                    }
                                    setSelectedFeatures(newSelected)
                                  }}
                                />
                                <div className="flex-1">
                                  <Label htmlFor={`feature-${feature.id}`} className="cursor-pointer">
                                    <div className="font-medium">{feature.name || feature.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {feature.className} - Level {feature.level} - {feature.source}
                                    </div>
                                    {feature.description && !isASI && (
                                      <div className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                        <RichTextDisplay content={feature.description} />
                                      </div>
                                    )}
                                  </Label>
                                </div>
                              </div>
                              
                              {/* ASI/Feat Choice UI - shown when ASI feature is selected */}
                              {isASI && isSelected && (
                                <div className="ml-6 mt-2 pt-2 border-t flex flex-col gap-3">
                                  <div className="text-sm font-medium">Choose one:</div>
                                  
                                  {/* Ability Score Improvement Option */}
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant={asiChoice?.type === 'ability_scores' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleASISelection(feature.id, 'ability_scores')}
                                      >
                                        {asiChoice?.type === 'ability_scores' ? (
                                          <>
                                            <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                                            Ability Scores
                                          </>
                                        ) : (
                                          'Ability Scores'
                                        )}
                                      </Button>
                                      <span className="text-xs text-muted-foreground">
                                        Increase one ability by 2, or two abilities by 1 each
                                      </span>
                                    </div>
                                    
                                    {asiChoice?.type === 'ability_scores' && (
                                      <div className="flex flex-row gap-4 items-end pl-4">
                                        <div className="flex flex-col gap-2">
                                          <Label className="text-xs">First Ability</Label>
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
                                          <Label className="text-xs">Second Ability <Badge variant="secondary" className="text-xs">Optional</Badge></Label>
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
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant={asiChoice?.type === 'feat' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleASISelection(feature.id, 'feat')}
                                      >
                                        {asiChoice?.type === 'feat' ? (
                                          <>
                                            <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                                            Feat
                                          </>
                                        ) : (
                                          'Feat'
                                        )}
                                      </Button>
                                      <span className="text-xs text-muted-foreground">
                                        Choose a feat instead
                                      </span>
                                    </div>
                                    
                                    {asiChoice?.type === 'feat' && (
                                      <div className="pl-4 flex flex-col gap-2">
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
                                            Add Feat
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
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

                {/* Ability Score Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ability Scores (Point Buy)</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      All abilities start at 8. You have {POINT_BUY_TOTAL} points to distribute. 
                      Each ability can be between 8-15 (before race/ASI bonuses). 
                      Costs: 1 point per point for scores 8-13, then 2 points per point for 14-15.
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                        const value = editableCharacter[ability as keyof CharacterData] as number || POINT_BUY_BASE
                        const modifier = calculateModifier(value)
                        
                        // Calculate base score (before race/ASI bonuses)
                        const raceBonus = abilityScoreChoices.find(c => c.ability === ability)?.increase || 0
                        
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
                            <Label htmlFor={`ability-${ability}`} className="text-sm font-medium capitalize">
                              {ability}
                            </Label>
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
                                className={`w-16 text-center ${hasAnyModification ? 'border-primary border-2' : ''}`}
                                min={minValue}
                                max={maxValue}
                              />
                              <Badge 
                                variant={hasAnyModification ? "default" : "secondary"} 
                                className={`text-xs ${hasAnyModification ? 'bg-primary text-primary-foreground' : ''}`}
                              >
                                {formatModifier(modifier)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div>Base: {baseScore} ({pointBuyCost} pts)</div>
                              {hasAnyModification && (
                                <div className="text-primary mt-0.5">
                                  {hasRaceModification && (
                                    <span className="font-medium">+{raceBonus} race</span>
                                  )}
                                  {hasRaceModification && hasASIModification && <span className="mx-1">+</span>}
                                  {hasASIModification && (
                                    <span className="font-medium">+{asiBonus} ASI</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Points Spent:</span>
                        <span className={`text-sm font-bold ${getTotalPointsSpent() > POINT_BUY_TOTAL ? 'text-destructive' : getTotalPointsSpent() === POINT_BUY_TOTAL ? 'text-green-600' : ''}`}>
                          {getTotalPointsSpent()} / {POINT_BUY_TOTAL}
                        </span>
                      </div>
                      {getTotalPointsSpent() < POINT_BUY_TOTAL && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-muted-foreground">Remaining:</span>
                          <span className="text-sm font-medium text-green-600">
                            {POINT_BUY_TOTAL - getTotalPointsSpent()} points
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* HP Roll Section */}
                <Card>
                  <CardContent className="px-4 py-4 flex flex-col gap-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <h4 className="font-medium">Hit Point Calculation</h4>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          {characterClasses.length > 1 ? (
                            <>
                              <p>Multiple classes detected. Hit points will be calculated per class:</p>
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
                                    <span>d{hitDie} × {c.level} levels + {formatModifier(conModifier)} CON × {c.level}</span>
                                  </div>
                                )
                              })}
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
                                <Badge variant="outline">Constitution Modifier:</Badge>
                                <span>{formatModifier(calculateModifier(editableCharacter.constitution || 10))}</span>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        onClick={rollHitDie}
                        disabled={hpRollResult !== null}
                        className="min-w-[120px]"
                        size="lg"
                      >
                        <Icon icon="lucide:dice-6" className="w-4 h-4" />
                        Roll Hit Dice
                      </Button>
                    </div>

                    {hpRollResult && (
                      <div className="bg-muted/50 rounded-lg p-4">
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
                                if (isLevel1) {
                                  return (
                                    <>
                                      {hitDie} (max of d{hitDie} for 1st level) + {formatModifier(hpRollResult.constitutionModifier)} (CON) = {hpRollResult.total} HP
                                    </>
                                  )
                                }
                                return (
                                  <>
                                    {hpRollResult.roll} (dice) + {formatModifier(hpRollResult.constitutionModifier)} × {level} (CON modifier × levels) = {hpRollResult.total} HP
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

                <Card className="flex flex-col gap-0 px-4">
                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Character Name</h5>
                    <p className="text-sm">{name}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Race</h5>
                    <div className="flex items-center gap-2">
                      {raceIds.map((race, index) => (
                        <Badge key={index} variant={race.isMain ? "default" : "secondary"}>
                          {races.find(r => r.id === race.id)?.name}
                          {race.isMain && " (Main)"}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Class{characterClasses.length > 1 ? 'es' : ''}</h5>
                    <div className="flex flex-col gap-1">
                      {characterClasses.map((charClass, idx) => (
                        <p key={idx} className="text-sm">
                          {charClass.name} {charClass.subclass && `(${charClass.subclass})`} - Level {charClass.level}
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground">Total Level: {level}</p>
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Background</h5>
                    <p className="text-sm">{background}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Alignment</h5>
                    <p className="text-sm">{alignment}</p>
                  </div>

                  <div className="flex flex-row gap-4 items-start justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Ability Scores</h5>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                          const score = editableCharacter[ability as keyof CharacterData] as number || POINT_BUY_BASE
                          const modifier = calculateModifier(score)
                          
                          // Calculate race bonuses
                          const raceBonus = abilityScoreChoices.find(c => c.ability === ability)?.increase || 0
                          
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
                              <div className="text-xs text-muted-foreground uppercase">
                                {ability}
                              </div>
                              <div className={`text-lg font-bold ${hasAnyModification ? 'text-primary' : ''}`}>
                                {score}
                                {hasAnyModification && totalBonus > 0 && (
                                  <span className="text-xs text-primary ml-1 font-normal">
                                    (+{totalBonus})
                                    {hasRaceModification && hasASIModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">
                                        race: +{raceBonus} | ASI: +{asiIncrease}
                                      </span>
                                    )}
                                    {hasRaceModification && !hasASIModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">race bonus</span>
                                    )}
                                    {hasASIModification && !hasRaceModification && (
                                      <span className="block text-[10px] mt-0.5 opacity-75">ASI bonus</span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm font-medium ${hasAnyModification ? 'text-primary' : 'text-foreground'}`}>
                                {formatModifier(modifier)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {(abilityScoreChoices.length > 0 || Array.from(asiChoices.values()).some(c => c.type === 'ability_scores' && (c.abilityScores?.first || c.abilityScores?.second))) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <Badge variant="outline" className="mr-2">Bonuses</Badge>
                          Abilities highlighted in blue were improved by race bonuses or Ability Score Improvement features
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Hit Points</h5>
                    <div className="flex items-center gap-2">
                      <strong className="text-lg font-bold font-mono text-primary">{hpRollResult?.total || 8}</strong>
                      <span className="flex items-center gap-2">Max HP</span>
                      {hpRollResult && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span><strong>Roll:</strong> {hpRollResult.roll}</span>
                          <span className="flex items-center gap-1"><Badge variant="secondary" className="text-xs">{formatModifier(hpRollResult.constitutionModifier)}</Badge> CON Modifier × {level}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Base Stats: AC, Initiative, Speed */}
                  <div className="flex flex-row gap-4 items-start justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Base Statistics</h5>
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-20">Armor Class:</span>
                        <span className="text-sm">
                          {(() => {
                            const dexModifier = calculateModifier(editableCharacter.dexterity || 10)
                            const baseAC = 10 + dexModifier
                            return (
                              <>
                                <strong className="font-mono text-primary">{baseAC}</strong>
                                <span className="text-xs text-muted-foreground ml-2">(10 + {formatModifier(dexModifier)} DEX)</span>
                              </>
                            )
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-20">Initiative:</span>
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
                        <span className="text-sm font-medium w-20">Speed:</span>
                        <span className="text-sm">
                          <strong className="font-mono text-primary">{editableCharacter.speed || 30}</strong>
                          <span className="text-xs text-muted-foreground ml-2">ft. (from race)</span>
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
                    } else if (step === 'class_selection') {
                      setStep('race_selection')
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
                    if (!background.trim()) {
                      setError("Background is required")
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
        character={editableCharacter as CharacterData}
        featIndex={editingFeatIndex}
        onSave={handleFeatSave}
      />
    </Dialog>
  )
}
