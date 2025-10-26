"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { FeatEditModal } from "./feat-edit-modal"
import type { CharacterData, CharacterClass } from "@/lib/character-data"
import { calculateModifier, calculateProficiencyBonus, calculateSkillBonus, getHitDiceByClass, calculateTotalLevel, isSingleClass } from "@/lib/character-data"
import { loadClassFeatures, loadClassesWithDetails } from "@/lib/database"
import type { ClassData } from "@/lib/class-utils"

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updatedCharacter: CharacterData) => void
}

interface NewFeatures {
  name: string
  description: string
  source: string
  level: number
  className?: string
}

interface ASIChoice {
  type: 'ability_scores' | 'feat'
  abilityScores?: {
    first: string
    second: string
  }
  feat?: {
    name: string
    description: string
  } | null
}

interface NewClassSelection {
  classData: ClassData
  selectedSkills: string[]
}

export function LevelUpModal({ isOpen, onClose, character, onSave }: LevelUpModalProps) {
  // Function to format skill names from database format to display format
  const formatSkillName = (skillName: string): string => {
    return skillName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Function to get ability abbreviation
  const getAbilityAbbreviation = (ability: string): string => {
    return ability.slice(0, 3).toUpperCase()
  }

  // Function to convert formatted skill name back to database format
  const skillNameToDatabaseFormat = (skillName: string): string => {
    return skillName.toLowerCase().replace(/\s+/g, '_')
  }

  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null)
  const [newLevel, setNewLevel] = useState(calculateTotalLevel(character.classes) + 1)
  const [hpRoll, setHpRoll] = useState<number | null>(null)
  const [hpRollResult, setHpRollResult] = useState<{
    roll: number
    constitutionModifier: number
    total: number
  } | null>(null)
  const [newFeatures, setNewFeatures] = useState<NewFeatures[]>([])
  const [asiChoice, setAsiChoice] = useState<ASIChoice | null>(null)
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)
  const [step, setStep] = useState<'class_selection' | 'new_class_selection' | 'skill_selection' | 'hp_roll' | 'features' | 'asi_choice' | 'summary'>('class_selection')
  const [editableCharacter, setEditableCharacter] = useState<CharacterData>(character)
  const [customFeatName, setCustomFeatName] = useState('')
  const [customFeatDescription, setCustomFeatDescription] = useState('')
  const [featEditModalOpen, setFeatEditModalOpen] = useState(false)
  const [editingFeatIndex, setEditingFeatIndex] = useState<number | null>(null)
  const [availableClasses, setAvailableClasses] = useState<ClassData[]>([])
  const [newClassSelection, setNewClassSelection] = useState<NewClassSelection | null>(null)
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)

  // Function to reset all state to initial values
  // Always uses character's current active level + 1 as the starting point
  const resetAllState = () => {
    const totalLevel = calculateTotalLevel(character.classes)
    console.log('Resetting level up modal state:', {
      characterLevel: character.level,
      totalLevelFromClasses: totalLevel,
      characterClasses: character.classes?.map(c => ({ name: c.name, level: c.level })),
      newLevel: totalLevel + 1
    })
    
    setSelectedClass(null)
    setNewLevel(totalLevel + 1) // Always start from character's total level + 1
    setHpRoll(null)
    setHpRollResult(null)
    setNewFeatures([])
    setAsiChoice(null)
    setIsLoadingFeatures(false)
    setStep('class_selection')
    setEditableCharacter(character)
    setCustomFeatName('')
    setCustomFeatDescription('')
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
    setAvailableClasses([])
    setNewClassSelection(null)
    setIsLoadingClasses(false)
  }

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      resetAllState()
    }
  }, [isOpen, character.id]) // Removed character.classes to prevent unnecessary resets

  // No auto-selection - always show class selection step

  // Update editable character when ASI choices are made (for real-time preview)
  useEffect(() => {
    if (asiChoice?.type === 'ability_scores' && asiChoice.abilityScores) {
      const { first, second } = asiChoice.abilityScores
      // Start with original character + HP changes (if any)
      let updatedCharacter = { ...character }
      
      // Apply HP changes if they exist
      if (hpRollResult) {
        updatedCharacter.maxHitPoints = character.maxHitPoints + hpRollResult.total
        updatedCharacter.currentHitPoints = character.currentHitPoints + hpRollResult.total
      }
      
      // Apply ability score improvements
      if (first) {
        const firstAbility = first.toLowerCase() as keyof CharacterData
        updatedCharacter = {
          ...updatedCharacter,
          [firstAbility]: (character[firstAbility] as number) + (second ? 1 : 2)
        }
      }
      
      if (second) {
        const secondAbility = second.toLowerCase() as keyof CharacterData
        updatedCharacter = {
          ...updatedCharacter,
          [secondAbility]: (character[secondAbility] as number) + 1
        }
      }
      
      setEditableCharacter(updatedCharacter)
    } else if (asiChoice?.type === 'feat') {
      // When feat is selected, only apply HP changes if needed, don't reset the character
      if (hpRollResult) {
        setEditableCharacter(prev => ({
          ...prev,
          maxHitPoints: character.maxHitPoints + hpRollResult.total,
          currentHitPoints: character.currentHitPoints + hpRollResult.total
        }))
      }
    }
  }, [asiChoice, character, hpRollResult])

  // Update editable character when HP roll result changes (for real-time preview)
  useEffect(() => {
    if (hpRollResult) {
      // Always update HP when roll result changes, regardless of ASI state
      setEditableCharacter(prev => ({
        ...prev,
        maxHitPoints: character.maxHitPoints + hpRollResult.total,
        currentHitPoints: character.currentHitPoints + hpRollResult.total
      }))
    }
  }, [hpRollResult, character.maxHitPoints, character.currentHitPoints])

  const handleClassSelection = (className: string) => {
    const charClass = character.classes?.find(c => c.name === className)
    if (charClass) {
      setSelectedClass(charClass)
      setStep('hp_roll')
    }
  }

  const loadAvailableClasses = async () => {
    setIsLoadingClasses(true)
    try {
      const { classes, error } = await loadClassesWithDetails()
      if (error) {
        console.error('Error loading classes:', error)
        return
      }
      
      // Filter out classes the character already has and only show base classes (no subclasses)
      const existingClassNames = character.classes?.map(c => c.name.toLowerCase()) || []
      const baseClasses = classes?.filter(cls => 
        !cls.subclass && // Only base classes
        !existingClassNames.includes(cls.name.toLowerCase()) // Not already taken
      ).map(cls => ({
        id: cls.id,
        name: cls.name,
        subclass: cls.subclass,
        description: cls.description || null,
        hit_die: cls.hit_die || 8,
        primary_ability: cls.primary_ability ? [cls.primary_ability] : [],
        saving_throw_proficiencies: cls.saving_throw_proficiencies || [],
        skill_proficiencies: cls.skill_proficiencies || null,
        equipment_proficiencies: cls.equipment_proficiencies || null,
        starting_equipment: cls.starting_equipment || null,
        spell_slots_1: cls.spell_slots_1 || null,
        spell_slots_2: cls.spell_slots_2 || null,
        spell_slots_3: cls.spell_slots_3 || null,
        spell_slots_4: cls.spell_slots_4 || null,
        spell_slots_5: cls.spell_slots_5 || null,
        spell_slots_6: cls.spell_slots_6 || null,
        spell_slots_7: cls.spell_slots_7 || null,
        spell_slots_8: cls.spell_slots_8 || null,
        spell_slots_9: cls.spell_slots_9 || null,
        cantrips_known: Array.isArray(cls.cantrips_known) ? cls.cantrips_known : (cls.cantrips_known ? [cls.cantrips_known] : null),
        spells_known: Array.isArray(cls.spells_known) ? cls.spells_known : (cls.spells_known ? [cls.spells_known] : null),
        is_custom: false,
        created_by: null,
        duplicated_from: null,
        source: 'PHB',
        subclass_selection_level: cls.subclass_selection_level || 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })) || []
      
      setAvailableClasses(baseClasses)
      setStep('new_class_selection')
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const handleNewClassSelection = (classData: ClassData) => {
    setNewClassSelection({
      classData,
      selectedSkills: []
    })
    setStep('skill_selection')
  }

  const handleSkillSelection = (selectedSkills: string[]) => {
    if (newClassSelection) {
      setNewClassSelection({
        ...newClassSelection,
        selectedSkills
      })
      
      // Update the editable character's skills to show in sidebar preview
      const updatedSkills = character.skills.map(skill => {
        const skillInDbFormat = skillNameToDatabaseFormat(skill.name)
        const isSelected = selectedSkills.includes(skillInDbFormat)
        
        // If this skill is in the new class's skill list and is selected
        if (newClassSelection.classData.skill_proficiencies?.includes(skillInDbFormat) && isSelected) {
          // Apply new class proficiency
          if (skill.proficiency === 'proficient') {
            return { ...skill, proficiency: 'expertise' as const }
          } else {
            return { ...skill, proficiency: 'proficient' as const }
          }
        }
        
        return skill
      })
      
      // Add any new skills that weren't already in the character's skill list
      const newSkills = selectedSkills
        .filter(skillName => !character.skills.find(s => skillNameToDatabaseFormat(s.name) === skillName))
        .map(skillName => ({
          name: formatSkillName(skillName),
          ability: getSkillAbility(skillName),
          proficiency: 'proficient' as const
        }))
      
      // Update the editable character with the new skills
      setEditableCharacter(prev => ({
        ...prev,
        skills: [...updatedSkills, ...newSkills]
      }))
      
      // Create a temporary CharacterClass for the new class
      const newCharacterClass: CharacterClass = {
        name: newClassSelection.classData.name,
        level: 1,
        class_id: newClassSelection.classData.id,
        subclass: undefined
      }
      setSelectedClass(newCharacterClass)
      setStep('hp_roll')
    }
  }

  const rollHitDie = () => {
    if (!selectedClass) return

    let dieSize: number

    // Check if this is a new class (multiclassing)
    if (newClassSelection) {
      // Use the new class's hit die from the class data
      dieSize = newClassSelection.classData.hit_die || 8
    } else {
      // Use the existing class's hit die
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
      dieSize = hitDieTypes[selectedClass.name.toLowerCase()] || 8
    }

    const roll = Math.floor(Math.random() * dieSize) + 1
    const constitutionModifier = calculateModifier(editableCharacter.constitution)
    const total = Math.max(1, roll + constitutionModifier) // Minimum 1 HP gain

    setHpRoll(roll)
    setHpRollResult({
      roll,
      constitutionModifier,
      total
    })
  }

  const loadNewFeatures = async () => {
    if (!selectedClass) return

    setIsLoadingFeatures(true)
    try {
      // For single-class characters, the class level should match the character level
      // For multiclass characters, we use the individual class level
      const isSingleClassCharacter = isSingleClass(character.classes)
      
      let selectedClassNewLevel: number
      if (isSingleClassCharacter) {
        // Single class: class level should match character level
        selectedClassNewLevel = selectedClass.level + 1
      } else {
        // Multiclass: use the individual class level
        selectedClassNewLevel = selectedClass.level + 1
      }
      
      console.log('Level up debug:', {
        characterLevel: character.level,
        totalLevelFromClasses: calculateTotalLevel(character.classes),
        newLevel: newLevel,
        selectedClassName: selectedClass.name,
        selectedClassCurrentLevel: selectedClass.level,
        selectedClassNewLevel: selectedClassNewLevel,
        isSingleClass: isSingleClassCharacter,
        totalClasses: character.classes?.length
      })
      
      // Load features for the selected class's new level only
      const { features } = await loadClassFeatures(selectedClass.class_id || '', selectedClassNewLevel, selectedClass.subclass)
      if (features) {
        // Filter to only show features that are exactly at the selected class's new level
        const newLevelFeatures = features.filter(feature => feature.level === selectedClassNewLevel)
        console.log('Features loaded:', {
          totalFeatures: features.length,
          newLevelFeatures: newLevelFeatures.length,
          newLevelFeaturesList: newLevelFeatures.map(f => ({ name: f.name, level: f.level }))
        })
        setNewFeatures(newLevelFeatures)
      }
      // Automatically proceed to features step after loading
      setStep('features')
    } catch (error) {
      console.error('Error loading features:', error)
    } finally {
      setIsLoadingFeatures(false)
    }
  }

  const handleFeaturesLoaded = () => {
    // Check if "Ability Score Improvement" is included in the new features for this level
    const hasASI = newFeatures.some(feature => 
      feature.name.toLowerCase().includes('ability score improvement') ||
      feature.name.toLowerCase().includes('asi')
    )
    
    if (hasASI) {
      setStep('asi_choice')
    } else {
      setStep('summary')
    }
  }

  const handleASISelection = (type: 'ability_scores' | 'feat') => {
    if (type === 'ability_scores') {
      // Clear feat selection and any new feats when switching to ability scores
      setAsiChoice({
        type: 'ability_scores',
        abilityScores: {
          first: '',
          second: ''
        },
        feat: null
      })
      // Remove any new feats that were added
      if (editableCharacter.feats.length > character.feats.length) {
        const originalFeats = editableCharacter.feats.slice(0, character.feats.length)
        updateEditableCharacter({ feats: originalFeats })
      }
    } else {
      // Clear ability score selection when switching to feat
      setAsiChoice({
        type: 'feat',
        abilityScores: {
          first: '',
          second: ''
        },
        feat: null
      })
    }
  }

  const handleAbilityScoreSelection = (which: 'first' | 'second', ability: string) => {
    if (!asiChoice?.abilityScores) return

    setAsiChoice({
      ...asiChoice,
      abilityScores: {
        ...asiChoice.abilityScores,
        [which]: ability
      }
    })
  }

  const handleFeatSelection = (feat: { name: string; description: string }) => {
    setAsiChoice({
      type: 'feat',
      feat
    })
  }

  const handleCustomFeatCreation = () => {
    if (customFeatName.trim() && customFeatDescription.trim()) {
      const customFeat = {
        name: customFeatName.trim(),
        description: customFeatDescription.trim()
      }
      setAsiChoice({
        type: 'feat',
        feat: customFeat
      })
      setCustomFeatName('')
      setCustomFeatDescription('')
    }
  }

  const handleAddFeat = () => {
    setEditingFeatIndex(null)
    setFeatEditModalOpen(true)
  }

  const handleEditFeat = (index: number) => {
    setEditingFeatIndex(index)
    setFeatEditModalOpen(true)
  }

  const handleDeleteFeat = (index: number) => {
    const updatedFeats = [...editableCharacter.feats]
    updatedFeats.splice(index, 1)
    updateEditableCharacter({ feats: updatedFeats })
    
    // If the deleted feat was selected, clear the selection
    if (asiChoice?.feat && asiChoice.feat === editableCharacter.feats[index]) {
      setAsiChoice({ ...asiChoice, feat: null })
    }
  }

  const handleFeatEditClose = () => {
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
  }

  const handleFeatSave = (updates: Partial<CharacterData>) => {
    // Update the editable character with the new feats
    setEditableCharacter(prev => ({ ...prev, ...updates }))
    
    // If this is a new feat (editingFeatIndex is null), auto-select it as the ASI choice
    if (editingFeatIndex === null && updates.feats && asiChoice?.type === 'feat') {
      const newFeat = updates.feats[updates.feats.length - 1]
      setAsiChoice(prev => prev ? { ...prev, feat: newFeat } : null)
    }
    
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
  }

  const completeLevelUp = () => {
    if (!selectedClass || !hpRollResult) return

    // Start with the editable character to preserve all changes made during level-up
    let updatedCharacter = { ...editableCharacter }

    let updatedClasses: CharacterClass[]
    let updatedHitDiceByClass = editableCharacter.hitDiceByClass || []

    // Check if this is a new class (multiclassing)
    const isNewClass = newClassSelection !== null
    
    if (isNewClass && newClassSelection) {
      // Adding a new class at level 1
      const newCharacterClass: CharacterClass = {
        name: newClassSelection.classData.name,
        level: 1,
        class_id: newClassSelection.classData.id,
        subclass: undefined
      }
      
      updatedClasses = [...(editableCharacter.classes || []), newCharacterClass]
      
      // Add hit dice for the new class
      const hitDieSize = newClassSelection.classData.hit_die || 8
      updatedHitDiceByClass = [
        ...updatedHitDiceByClass,
        {
          className: newClassSelection.classData.name,
          dieType: `d${hitDieSize}`,
          total: 1,
          used: 0
        }
      ]
      
      // The skills are already updated in editableCharacter from the sidebar preview
      // No need to duplicate the skill logic here since it's already handled
    } else {
      // Leveling up existing class
      updatedClasses = editableCharacter.classes?.map(c => 
        c.name === selectedClass.name 
          ? { 
              ...c, 
              level: c.level + 1 // Always increment the individual class level
            }
          : c
      ) || []
      
      // Update hit dice
      updatedHitDiceByClass = editableCharacter.hitDiceByClass?.map(hd =>
        hd.className === selectedClass.name
          ? { ...hd, total: hd.total + 1 }
          : hd
      ) || []
    }

    // Update max HP
    const newMaxHP = editableCharacter.maxHitPoints + hpRollResult.total
    const newCurrentHP = editableCharacter.currentHitPoints + hpRollResult.total

    // Add new features
    const updatedClassFeatures = [
      ...editableCharacter.classFeatures,
      ...newFeatures.map(f => ({
        id: f.name.toLowerCase().replace(/\s+/g, '_'),
        class_id: selectedClass.class_id || '',
        level: f.level,
        title: f.name,
        description: f.description,
        feature_type: 'class_feature',
        feature_skill_type: undefined,
        subclass_id: undefined,
        class_features_skills: undefined,
        name: f.name,
        source: f.source,
        className: selectedClass.name
      }))
    ]

    // Apply base level up changes
    updatedCharacter = {
      ...updatedCharacter,
      level: calculateTotalLevel(updatedClasses), // Calculate total level from classes
      classes: updatedClasses,
      hitDiceByClass: updatedHitDiceByClass,
      maxHitPoints: newMaxHP,
      currentHitPoints: newCurrentHP,
      classFeatures: updatedClassFeatures
    }

    // Handle ASI
    if (asiChoice?.type === 'ability_scores' && asiChoice.abilityScores) {
      // Apply ability score improvements
      const { first, second } = asiChoice.abilityScores
      if (first) {
        const firstAbility = first.toLowerCase() as keyof CharacterData
        updatedCharacter = {
          ...updatedCharacter,
          [firstAbility]: (editableCharacter[firstAbility] as number) + (second ? 1 : 2)
        }
      }
      if (second) {
        const secondAbility = second.toLowerCase() as keyof CharacterData
        updatedCharacter = {
          ...updatedCharacter,
          [secondAbility]: (editableCharacter[secondAbility] as number) + 1
        }
      }
    } else if (asiChoice?.type === 'feat' && asiChoice.feat) {
      // Add feat
      updatedCharacter = {
        ...updatedCharacter,
        feats: [...editableCharacter.feats, asiChoice.feat]
      }
    }

    onSave(updatedCharacter)
    handleClose()
  }

  const getAbilityOptions = () => [
    { value: 'strength', label: 'Strength' },
    { value: 'dexterity', label: 'Dexterity' },
    { value: 'constitution', label: 'Constitution' },
    { value: 'intelligence', label: 'Intelligence' },
    { value: 'wisdom', label: 'Wisdom' },
    { value: 'charisma', label: 'Charisma' }
  ]

  const getSampleFeats = () => [
    {
      name: 'Alert',
      description: 'You gain a +5 bonus to initiative. You can\'t be surprised while you are conscious. Other creatures don\'t gain advantage on attack rolls against you as a result of being hidden from you.'
    },
    {
      name: 'Lucky',
      description: 'You have 3 luck points. Whenever you make an attack roll, an ability check, or a saving throw, you can spend one luck point to roll an additional d20. You can choose to spend one of your luck points after you roll the die, but before the outcome is determined.'
    },
    {
      name: 'Sharpshooter',
      description: 'You have mastered ranged weapons and can make shots that others find impossible. You gain the following benefits: Attacking at long range doesn\'t impose disadvantage on your ranged weapon attack rolls. Your ranged weapon attacks ignore half cover and three-quarters cover. Before you make an attack with a ranged weapon that you are proficient with, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack\'s damage roll.'
    }
  ]

  const updateEditableCharacter = useCallback((updates: Partial<CharacterData>) => {
    setEditableCharacter(prev => ({ ...prev, ...updates }))
  }, [])

  // Function to reset choices when going back to class selection
  const resetChoices = () => {
    setSelectedClass(null)
    setHpRoll(null)
    setHpRollResult(null)
    setNewFeatures([])
    setAsiChoice(null)
    setIsLoadingFeatures(false)
    setAvailableClasses([])
    setNewClassSelection(null)
    setIsLoadingClasses(false)
    setEditableCharacter(character) // Reset to original character
  }

  const getSkillAbility = useCallback((skillName: string): 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' => {
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
  }, [])

  const CharacterSidebar = useMemo(() => (
    <div className="w-80 border-l bg-muted/20 p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      
      {/* Ability Scores */}
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
              const originalValue = character[key as keyof CharacterData] as number
              const currentValue = editableCharacter[key as keyof CharacterData] as number
              const hasChanged = originalValue !== currentValue
              const originalModifier = calculateModifier(originalValue)
              const currentModifier = calculateModifier(currentValue)
              const modifierChanged = originalModifier !== currentModifier
              
              return (
                <div key={key} className="flex items-center justify-between gap-2 w-full">
                  <Label className="text-sm font-medium w-10 flex justify-start">{label}</Label>
                  <div className="flex items-center gap-2 w-full justify-end">
                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => updateEditableCharacter({ [key]: parseInt(e.target.value) || 0 })}
                      className={`w-14 h-6 text-xs px-2 ${hasChanged ? 'border-primary' : ''}`}
                      min="1"
                      max="30"
                    />
                    <Badge 
                      variant={modifierChanged ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {formatModifier(currentModifier)}
                    </Badge>
                  </div>
                </div>
              )
            })}
        </CardContent>
      </Card>

      {/* Hit Points */}
      <Card className="flex flex-col gap-1">
        <CardHeader>
          <CardTitle className="text-md">Hit Points</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-2">
            <Label className="text-sm font-medium w-full">Current</Label>
            <Input
              type="number"
              value={editableCharacter.currentHitPoints}
              onChange={(e) => updateEditableCharacter({ currentHitPoints: parseInt(e.target.value) || 0 })}
              className={`w-20 h-6 text-xs px-2 ${editableCharacter.currentHitPoints !== character.currentHitPoints ? 'border-primary' : ''}`}
              min="0"
            />
              {hpRollResult && (
                <Badge variant="default" className="text-xs">
                  +{hpRollResult.total}
                </Badge>
              )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Label className="text-sm font-medium w-full">Max</Label>
            <Input
              type="number"
              value={editableCharacter.maxHitPoints}
              onChange={(e) => updateEditableCharacter({ maxHitPoints: parseInt(e.target.value) || 0 })}
              className={`w-20 h-6 text-xs px-2 ${editableCharacter.maxHitPoints !== character.maxHitPoints ? 'border-primary' : ''}`}
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
              const sortedSkills = [...editableCharacter.skills].sort((a, b) => {
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
                    {group.map((skill, index) => {
                      const skillIndex = editableCharacter.skills.findIndex(s => s.name === skill.name)
                      const isProficient = skill.proficiency === 'proficient' || skill.proficiency === 'expertise'
                      const hasExpertise = skill.proficiency === 'expertise'
                      return (
                        <div key={skill.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  id={`sidebar-${skill.name}-prof`}
                                  checked={isProficient}
                                  onChange={(e) => {
                                    const updatedSkills = [...editableCharacter.skills]
                                    updatedSkills[skillIndex] = { 
                                      ...skill, 
                                      proficiency: e.target.checked ? 'proficient' : 'none' 
                                    }
                                    updateEditableCharacter({ skills: updatedSkills })
                                  }}
                                  className="w-3 h-3 rounded border-border"
                                />
                                <Label htmlFor={`sidebar-${skill.name}-prof`} className="sr-only">
                                  Proficient
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  id={`sidebar-${skill.name}-exp`}
                                  checked={hasExpertise}
                                  onChange={(e) => {
                                    const updatedSkills = [...editableCharacter.skills]
                                    updatedSkills[skillIndex] = { 
                                      ...skill, 
                                      proficiency: e.target.checked ? 'expertise' : 'proficient' 
                                    }
                                    updateEditableCharacter({ skills: updatedSkills })
                                  }}
                                  className="w-3 h-3 rounded border-border"
                                />
                                <Label htmlFor={`sidebar-${skill.name}-exp`} className="sr-only">
                                  Expertise
                                </Label>
                              </div>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">{skill.name}</span>
                              <span className="text-muted-foreground ml-1">
                                ({skill.ability.slice(0, 3).toUpperCase()})
                              </span>
                            </div>
                          </div>
                          <Badge 
                            variant={
                              calculateModifier(editableCharacter[skill.ability]) !== calculateModifier(character[skill.ability]) ||
                              skill.proficiency !== character.skills.find(s => s.name === skill.name)?.proficiency
                                ? "default" 
                                : "secondary"
                            } 
                            className="text-xs"
                          >
                            {formatModifier(calculateSkillBonus(editableCharacter, skill))}
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
  ), [editableCharacter, character, updateEditableCharacter, hpRollResult])

  const handleClose = () => {
    resetAllState()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:trending-up" className="w-5 h-5" />
            Level Up to {newLevel}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Current Level: {character.level} → New Level: {newLevel}
            {selectedClass && (
              <span className="ml-2">
                | {selectedClass.name}: {
                  newClassSelection 
                    ? `New Class at Level 1` 
                    : character.classes && character.classes.length === 1 
                      ? `${character.level} → ${newLevel}` 
                      : `${selectedClass.level} → ${selectedClass.level + 1}`
                }
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
          {/* Step 1: Class Selection */}
          {step === 'class_selection' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Choose Your Advancement</h3>
                <p className="text-sm text-muted-foreground">
                  {character.classes && character.classes.length === 1 
                    ? "Level up your current class or add a new class (multiclassing)"
                    : "Level up one of your existing classes or add a new class (multiclassing)"
                  }
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                {/* Existing Classes */}
                {character.classes && character.classes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-md font-medium text-muted-foreground">Existing Classes</h4>
                    {character.classes.map((charClass) => (
                      <Card key={charClass.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="px-4 py-0">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-row items-center gap-4">
                              <h4 className="font-medium flex items-center gap-2">
                                <span className="capitalize">{charClass.name}</span>
                                <Badge variant="outline">Level {charClass.level}</Badge>
                              </h4>
                              {charClass.subclass && (
                                <p className="text-sm text-muted-foreground">{charClass.subclass}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClassSelection(charClass.name)}
                              >
                                <Icon icon="lucide:trending-up" className="w-4 h-4" />
                                Level Up
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Multiclass Option */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-md font-medium text-muted-foreground">Multiclassing</h4>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors border">
                    <CardContent className="px-4 py-0">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-row items-center gap-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <span>Add New Class</span>
                            <Badge variant="outline">Level 1</Badge>
                          </h4>
                          <p className="text-sm text-muted-foreground">Start a new class at level 1</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadAvailableClasses}
                            disabled={isLoadingClasses}
                          >
                            {isLoadingClasses ? (
                              <>
                                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-1" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Icon icon="lucide:plus" className="w-4 h-4" />
                                Add Class
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: New Class Selection */}
          {step === 'new_class_selection' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Choose a New Class</h3>
                <p className="text-sm text-muted-foreground">
                  Select which class you want to add to your character
                </p>
              </div>
              
              <div className="flex flex-col gap-4">
                {availableClasses.map((classData) => (
                  <Card key={classData.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="px-4 py-0">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <span className="capitalize">{classData.name}</span>
                            <Badge variant="outline">d{classData.hit_die}</Badge>
                          </h4>
                          {classData.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {classData.description}
                            </p>
                          )}
                          {classData.skill_proficiencies && Array.isArray(classData.skill_proficiencies) && (
                            <p className="text-xs text-muted-foreground">
                              Choose 2 from: {classData.skill_proficiencies.map(skill => formatSkillName(skill)).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNewClassSelection(classData)}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Skill Selection */}
          {step === 'skill_selection' && newClassSelection && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Choose Skill Proficiencies</h3>
                <p className="text-sm text-muted-foreground">
                  Select 2 skills to be proficient in from your new {newClassSelection.classData.name} class
                </p>
              </div>
              
              <Card>
                <CardContent className="px-4 py-0">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h4 className="font-medium">{newClassSelection.classData.name} Skills</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose 2 skills from the following options:
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {newClassSelection.classData.skill_proficiencies?.map((skillName: string) => {
                        const isSelected = newClassSelection.selectedSkills.includes(skillName)
                        const canSelect = newClassSelection.selectedSkills.length < 2 || isSelected
                        
                        return (
                          <div
                            key={skillName}
                            className={`flex items-center gap-2 rounded ${
                              !canSelect ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (!canSelect) return
                                  
                                  let newSelectedSkills: string[]
                                  if (isSelected) {
                                    newSelectedSkills = newClassSelection.selectedSkills.filter(s => s !== skillName)
                                  } else {
                                    newSelectedSkills = [...newClassSelection.selectedSkills, skillName]
                                  }
                                  
                                  setNewClassSelection({
                                    ...newClassSelection,
                                    selectedSkills: newSelectedSkills
                                  })
                                  
                                  // Update the editable character's skills in real-time for sidebar preview
                                  const updatedSkills = character.skills.map(skill => {
                                    const skillInDbFormat = skillNameToDatabaseFormat(skill.name)
                                    const isSelected = newSelectedSkills.includes(skillInDbFormat)
                                    const wasSelected = newClassSelection.selectedSkills.includes(skillInDbFormat)
                                    
                                    // If this skill is in the new class's skill list
                                    if (newClassSelection.classData.skill_proficiencies?.includes(skillInDbFormat)) {
                                      if (isSelected) {
                                        // Apply new class proficiency
                                        const originalSkill = character.skills.find(s => s.name === skill.name)
                                        return { ...skill, proficiency: originalSkill?.proficiency === 'proficient' ? 'expertise' as const : 'proficient' as const }
                                      } else if (wasSelected) {
                                        // Revert to original proficiency
                                        const originalSkill = character.skills.find(s => s.name === skill.name)
                                        return { ...skill, proficiency: originalSkill?.proficiency || 'none' }
                                      }
                                    }
                                    
                                    return skill
                                  })
                                  
                                  // Add any new skills that weren't already in the character's skill list
                                  const newSkills = newSelectedSkills
                                    .filter(skillName => !character.skills.find(s => skillNameToDatabaseFormat(s.name) === skillName))
                                    .map(skillName => ({
                                      name: formatSkillName(skillName),
                                      ability: getSkillAbility(skillName),
                                      proficiency: 'proficient' as const
                                    }))
                                  
                                  // Update the editable character with the new skills
                                  setEditableCharacter(prev => ({
                                    ...prev,
                                    skills: [...updatedSkills, ...newSkills]
                                  }))
                                }}
                                disabled={!canSelect}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium">
                                {formatSkillName(skillName)}
                              </span>
                              <span className="text-sm text-muted-foreground">({getAbilityAbbreviation(getSkillAbility(skillName))})</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Selected: {newClassSelection.selectedSkills.length}/2
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: HP Roll */}
          {step === 'hp_roll' && selectedClass && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Roll for Hit Points</h3>
                <p className="text-sm text-muted-foreground">
                  Roll your {selectedClass.name} hit die and add your Constitution modifier
                </p>
              </div>

              <Card>
                <CardContent className="px-4 py-0 flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0">
                      <h4 className="font-medium">{selectedClass.name} Hit Die</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline">d{newClassSelection ? newClassSelection.classData.hit_die : (() => {
                          const hitDieTypes: Record<string, number> = {
                            'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
                            'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
                            'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
                          }
                          return hitDieTypes[selectedClass.name.toLowerCase()] || 8
                        })()}</Badge>
                        <Badge variant="outline">{formatModifier(calculateModifier(editableCharacter.constitution))}</Badge>
                        Constitution                      
                      </p>
                    </div>
                    <Button
                      onClick={rollHitDie}
                      disabled={hpRollResult !== null}
                      className="min-w-[120px] absolute top-0 right-4"
                    >
                      <Icon icon="lucide:dice-6" className="w-4 h-4" />
                      Roll Hit Die
                    </Button>
                  </div>

                  {hpRollResult && (
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary mb-2">
                        +{hpRollResult.total} HP
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {hpRollResult.roll} {formatModifier(hpRollResult.constitutionModifier)} (CON modifier)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          {/* Step 5: New Features */}
          {step === 'features' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">New Features</h3>
                <p className="text-sm text-muted-foreground">
                  Here are the new features you gain at this level:
                </p>
                {selectedClass && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Loading features for {selectedClass.name} level {
                      character.classes && character.classes.length === 1 
                        ? newLevel 
                        : selectedClass.level + 1
                    }
                  </p>
                )}
              </div>

              {newFeatures.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {newFeatures.map((feature, index) => (
                    <Card key={index}>
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Level {feature.level}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {feature.source} Feature
                            </Badge>
                          </div>
                          <h4 className="font-medium">{feature.name}</h4>
                        </div>
                        <RichTextDisplay content={feature.description} className="text-sm text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  No new features at this level.
                </div>
              )}

            </div>
          )}

          {/* Step 6: ASI Choice */}
          {step === 'asi_choice' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Ability Score Improvement Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Choose one between the following options:
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Card className={`cursor-pointer transition-colors ${asiChoice?.type === 'ability_scores' ? 'bg-background' : 'hover:bg-muted/50'}`}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-medium">Ability Score Improvement</h4>
                        <p className="text-sm text-muted-foreground">
                          Choose one ability score to increase by 2, or two ability scores to increase by 1 each
                        </p>
                      </div>
                      <Button
                        variant={asiChoice?.type === 'ability_scores' ? 'default' : 'outline'}
                        onClick={() => handleASISelection('ability_scores')}
                      >
                        {asiChoice?.type === 'ability_scores' ? (
                          <>
                            <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                            Selected
                          </>
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                    {/* Ability Score Selection */}
                    {asiChoice?.type === 'ability_scores' && (
                      <div className="flex flex-row gap-4 items-end pt-4 border-t mt-4">
                        <div className="flex flex-col gap-2">
                          <Label className="flex h-6">First Ability</Label>
                          <Select
                            value={asiChoice.abilityScores?.first || ''}
                            onValueChange={(value) => handleAbilityScoreSelection('first', value)}
                          >
                            <SelectTrigger>
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
                           <Label className="flex h-6">Second Ability <Badge variant="secondary">Optional</Badge></Label>
                           <div className="flex gap-2">
                             <Select
                               value={asiChoice.abilityScores?.second || ''}
                               onValueChange={(value) => handleAbilityScoreSelection('second', value)}
                             >
                               <SelectTrigger>
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
                                 onClick={() => handleAbilityScoreSelection('second', '')}
                                 className="w-9 h-9 p-0"
                               >
                                 <Icon icon="lucide:x" className="w-3 h-3" />
                               </Button>
                             )}
                           </div>
                         </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-colors ${asiChoice?.type === 'feat' ? 'bg-background' : 'hover:bg-muted/50'}`}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-medium">Feat</h4>
                        <p className="text-sm text-muted-foreground">
                          Choose a feat instead of ability score improvements
                        </p>
                      </div>
                      <Button
                        variant={asiChoice?.type === 'feat' ? 'default' : 'outline'}
                        onClick={() => handleASISelection('feat')}
                      >
                        {asiChoice?.type === 'feat' ? (
                          <>
                            <Icon icon="lucide:check" className="w-4 h-4" />
                            Selected
                          </>
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                    {asiChoice?.type === 'feat' && (
                        <div className="flex flex-col gap-4 border-t mt-4 pt-4">
                          {/* Existing Feats */}
                          {editableCharacter.feats && editableCharacter.feats.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h4 className="font-medium text-sm">Current Feats</h4>
                              {editableCharacter.feats.map((feat, index) => {
                                const isNewFeat = index >= character.feats.length
                                return (
                                  <div key={index} className="bg-card flex items-start justify-between p-3 border rounded-lg">
                                    <div className="flex flex-col gap-1 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium text-sm">{feat.name || "Unnamed Feat"}</div>
                                        {isNewFeat && (
                                          <Badge variant="default" className="text-xs">
                                            New
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground line-clamp-2">
                                        <RichTextDisplay content={feat.description || "No description"} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isNewFeat && (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditFeat(index)}
                                            className="w-8 h-8 p-0"
                                          >
                                            <Icon icon="lucide:edit" className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteFeat(index)}
                                            className="w-8 h-8 p-0 text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                                          >
                                            <Icon icon="lucide:trash-2" className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {/* Add New Feat */}
                          {(!editableCharacter.feats || editableCharacter.feats.length === character.feats.length) && (
                            <Button
                              onClick={handleAddFeat}
                              size="sm"
                              variant="outline"
                            >
                              <Icon icon="lucide:plus" className="w-4 h-4" />
                              Add new Feat
                            </Button>
                          )}
                        </div>
                    )} 
                  </CardContent>
                </Card>
              </div>

            </div>
          )}

          {/* Step 7: Summary */}
          {step === 'summary' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Review your level up choices before confirming
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Card className="flex flex-col gap-0 px-4">
                  <div className="flex flex-row gap-4 items-center justify-start pb-4 border-b mb-4">
                    <h5 className="text-base font-display font-bold w-[240px]">Class Advancement</h5>
                    <p className="flex items-center gap-2">
                      {newClassSelection ? (
                        <>
                          <span className="text-sm">Adding new class:</span>
                          <Badge variant="default">{selectedClass?.name}</Badge>
                          <span className="text-sm">at Level 1</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{selectedClass?.name} to</span>
                          <Badge variant="outline">Level {newLevel}</Badge>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-row gap-4 items-center justify-start">
                    <h5 className="text-base font-display font-bold w-[240px]">Hit Points</h5>
                    <div className="flex items-center gap-2">
                      <strong className="text-lg font-bold font-mono text-primary">{character.maxHitPoints + (hpRollResult?.total || 0)}</strong>
                      <span className="flex items-center gap-2">Max HP <Badge variant="default">+{hpRollResult?.total}</Badge></span>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span><strong>Roll:</strong> {hpRollResult?.roll}</span>
                        <span className="flex items-center gap-1"><Badge variant="secondary" className="text-xs">{formatModifier(hpRollResult?.constitutionModifier || 0)}</Badge> CON Modifier</span>
                      </p>
                    </div>
                  </div>

                  {newClassSelection && (
                    <div className="flex flex-row gap-4 items-center justify-start pt-4 border-t mt-4">
                      <h5 className="text-base font-display font-bold w-[240px]">New Skills</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Gaining proficiency in:</span>
                        <div className="flex gap-1">
                          {newClassSelection.selectedSkills.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {formatSkillName(skill)} ({getAbilityAbbreviation(getSkillAbility(skill))})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                   {newFeatures.length > 0 && (
                     <div className="flex flex-row gap-4 items-center justify-start pt-4 border-t mt-4">
                       <h5 className="text-base font-display font-bold w-[240px]">New Features</h5>
                        <ul className="space-y-1">
                          {newFeatures.map((feature, index) => (
                           <li key={index} className="text-sm flex flex-col gap-2 w-full">
                              <div className="text-sm flex items-center gap-2">
                                <Badge variant="outline">{feature.source} Feature</Badge> 
                                <strong>{feature.name}</strong>
                              </div>
                              {feature.name === "Ability Score Improvement" && asiChoice && (
                                <div className="text-muted-foreground">
                                  {asiChoice.type === 'ability_scores' ? (
                                    <div>
                                      {asiChoice.abilityScores?.second ? (
                                        <p className="text-sm flex items-center gap-2">
                                          <strong>ASI:</strong>
                                          <span className="flex items-center gap-1">+1 <p className="capitalize">{asiChoice.abilityScores.first}</p></span>
                                          <span className="flex items-center gap-1">+1 <p className="capitalize">{asiChoice.abilityScores.second}</p></span>
                                        </p>
                                      ) : (
                                        <p className="text-sm flex items-center gap-1">
                                          <strong>ASI:</strong>
                                          +2 <p className="capitalize">{asiChoice.abilityScores?.first}</p>
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-sm"><strong>New Feat:</strong> {asiChoice.feat?.name}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                           </li>
                          ))}
                        </ul>
                     </div>
                    )}

                </Card>

              </div>
            </div>
          )}
          </div>
          
          {/* Character Sidebar */}
          {CharacterSidebar}
        </div>

        <DialogFooter className="p-4 border-t">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {/* Show Cancel on first step, Previous on all other steps */}
              {step === 'class_selection' ? (
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (step === 'new_class_selection') {
                      setStep('class_selection')
                      resetChoices()
                    } else if (step === 'skill_selection') {
                      setStep('new_class_selection')
                    } else if (step === 'hp_roll') {
                      if (newClassSelection) {
                        setStep('skill_selection')
                      } else {
                        setStep('class_selection')
                        resetChoices()
                      }
                    } else if (step === 'features') {
                      setStep('hp_roll')
                    } else if (step === 'asi_choice') {
                      setStep('features')
                    } else if (step === 'summary') {
                      setStep('asi_choice')
                    }
                  }}
                >
                  <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {/* Step-specific continue buttons - always visible */}
              {step === 'skill_selection' && (
                <Button
                  onClick={() => handleSkillSelection(newClassSelection?.selectedSkills || [])}
                  disabled={!newClassSelection || newClassSelection.selectedSkills.length !== 2}
                >
                  Continue to HP Roll
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'hp_roll' && (
                <Button 
                  onClick={loadNewFeatures} 
                  disabled={!hpRollResult || isLoadingFeatures}
                >
                  {isLoadingFeatures ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      Loading Features...
                    </>
                  ) : (
                    <>
                      Continue to Features
                      <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
              
              {step === 'features' && (
                <Button onClick={handleFeaturesLoaded}>
                  Continue
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'asi_choice' && (
                <Button
                  onClick={() => setStep('summary')}
                  disabled={
                    !asiChoice || 
                    (asiChoice.type === 'ability_scores' && !asiChoice.abilityScores?.first) ||
                    (asiChoice.type === 'feat' && !asiChoice.feat)
                  }
                >
                  Continue to Summary
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </Button>
              )}
              
              {step === 'summary' && (
                <Button onClick={completeLevelUp}>
                  <Icon icon="lucide:check" className="w-4 h-4" />
                  Complete Level Up
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
        character={editableCharacter}
        featIndex={editingFeatIndex}
        onSave={handleFeatSave}
      />
    </Dialog>
  )
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}
