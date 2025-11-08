"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { loadFeatsWithDetails, loadFeatDetails, type FeatData } from "@/lib/database"
import { ProficiencyCheckboxes, SKILL_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import type { CharacterData } from "@/lib/character-data"
import { useToast } from "@/hooks/use-toast"
import { calculateUsesFromFormula } from "@/lib/class-feature-templates"

interface FeatSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

const ABILITY_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'dexterity', label: 'Dexterity' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'charisma', label: 'Charisma' }
]

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

export function FeatSelectionModal({ isOpen, onClose, character, onSave }: FeatSelectionModalProps) {
  const [feats, setFeats] = useState<FeatData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFeatId, setSelectedFeatId] = useState<string | null>(null)
  const [selectedFeatData, setSelectedFeatData] = useState<FeatData | null>(null)
  const [step, setStep] = useState<'select' | 'configure'>('select')
  
  // Choice selections
  const [abilityChoices, setAbilityChoices] = useState<string[]>([])
  const [skillChoices, setSkillChoices] = useState<string[]>([])
  const [toolChoices, setToolChoices] = useState<string[]>([])
  const [languageChoices, setLanguageChoices] = useState<string[]>([])
  
  const { toast } = useToast()

  // Load feats when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadFeatsWithDetails().then(({ feats, error }) => {
        if (error) {
          console.error("Error loading feats:", error)
          toast({
            title: "Error",
            description: "Failed to load feats",
            variant: "destructive"
          })
        } else if (feats) {
          setFeats(feats)
        }
        setLoading(false)
      })
    } else {
      // Reset state when modal closes
      setSelectedFeatId(null)
      setSelectedFeatData(null)
      setStep('select')
      setAbilityChoices([])
      setSkillChoices([])
      setToolChoices([])
      setLanguageChoices([])
    }
  }, [isOpen, toast])

  const handleFeatSelect = async (featId: string) => {
    setLoading(true)
    const result = await loadFeatDetails(featId)
    if (result.feat) {
      setSelectedFeatId(featId)
      setSelectedFeatData(result.feat)
      setStep('configure')
      // Initialize choices based on feat data
      initializeChoices(result.feat)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load feat details",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const initializeChoices = (feat: FeatData) => {
    // Initialize ability choices if feat has choice-based ability modifiers
    if (feat.ability_modifiers && typeof feat.ability_modifiers === 'object' && !Array.isArray(feat.ability_modifiers)) {
      if (feat.ability_modifiers.type === 'choice') {
        const choices = (feat.ability_modifiers as any).choices
        const count = choices?.count || 1
        setAbilityChoices([]) // Will be filled by user
      }
    }
    
    // Initialize skill choices
    if (feat.skill_proficiencies && typeof feat.skill_proficiencies === 'object' && !Array.isArray(feat.skill_proficiencies)) {
      const skillsObj = feat.skill_proficiencies as any
      if (skillsObj.choice) {
        setSkillChoices([]) // Will be filled by user
      }
    }
    
    // Initialize tool choices
    if (feat.tool_proficiencies && typeof feat.tool_proficiencies === 'object' && !Array.isArray(feat.tool_proficiencies)) {
      const toolsObj = feat.tool_proficiencies as any
      if (toolsObj.choice) {
        setToolChoices([]) // Will be filled by user
      }
    }
    
    // Initialize language choices
    if (feat.languages && typeof feat.languages === 'object' && !Array.isArray(feat.languages)) {
      const langsObj = feat.languages as any
      if (langsObj.choice) {
        setLanguageChoices([]) // Will be filled by user
      }
    }
  }

  const handleApplyFeat = () => {
    if (!selectedFeatData) return

    // Validate choices
    if (!validateChoices()) {
      return
    }

    // Apply feat to character
    const updates = applyFeatToCharacter(selectedFeatData, {
      abilityChoices,
      skillChoices,
      toolChoices,
      languageChoices
    })

    onSave(updates)
    toast({
      title: "Success",
      description: `Feat "${selectedFeatData.name}" added successfully`
    })
    onClose()
  }

  const validateChoices = (): boolean => {
    if (!selectedFeatData) return false

    // Validate ability choices
    if (selectedFeatData.ability_modifiers && typeof selectedFeatData.ability_modifiers === 'object' && !Array.isArray(selectedFeatData.ability_modifiers)) {
      if (selectedFeatData.ability_modifiers.type === 'choice') {
        const choices = (selectedFeatData.ability_modifiers as any).choices
        const count = choices?.count || 1
        const availableAbilities = choices?.available_abilities || ABILITY_OPTIONS.map(a => a.value)
        
        if (abilityChoices.length !== count) {
          toast({
            title: "Validation Error",
            description: `Please select exactly ${count} ability/abilities`,
            variant: "destructive"
          })
          return false
        }
        
        // Check if all selected abilities are in available list
        const invalidChoices = abilityChoices.filter(a => !availableAbilities.includes(a))
        if (invalidChoices.length > 0) {
          toast({
            title: "Validation Error",
            description: "Some selected abilities are not available for this feat",
            variant: "destructive"
          })
          return false
        }
      }
    }

    // Validate skill choices
    if (selectedFeatData.skill_proficiencies && typeof selectedFeatData.skill_proficiencies === 'object' && !Array.isArray(selectedFeatData.skill_proficiencies)) {
      const skillsObj = selectedFeatData.skill_proficiencies as any
      if (skillsObj.choice) {
        const count = skillsObj.choice.count || 1
        if (skillChoices.length !== count) {
          toast({
            title: "Validation Error",
            description: `Please select exactly ${count} skill proficiency/proficiencies`,
            variant: "destructive"
          })
          return false
        }
      }
    }

    // Validate tool choices
    if (selectedFeatData.tool_proficiencies && typeof selectedFeatData.tool_proficiencies === 'object' && !Array.isArray(selectedFeatData.tool_proficiencies)) {
      const toolsObj = selectedFeatData.tool_proficiencies as any
      if (toolsObj.choice) {
        const count = toolsObj.choice.count || 1
        if (toolChoices.length !== count) {
          toast({
            title: "Validation Error",
            description: `Please select exactly ${count} tool proficiency/proficiencies`,
            variant: "destructive"
          })
          return false
        }
      }
    }

    // Validate language choices
    if (selectedFeatData.languages && typeof selectedFeatData.languages === 'object' && !Array.isArray(selectedFeatData.languages)) {
      const langsObj = selectedFeatData.languages as any
      if (langsObj.choice) {
        const count = langsObj.choice.count || 1
        if (languageChoices.length !== count) {
          toast({
            title: "Validation Error",
            description: `Please select exactly ${count} language/languages`,
            variant: "destructive"
          })
          return false
        }
      }
    }

    return true
  }

  const applyFeatToCharacter = (feat: FeatData, choices: {
    abilityChoices: string[]
    skillChoices: string[]
    toolChoices: string[]
    languageChoices: string[]
  }): Partial<CharacterData> => {
    const updates: Partial<CharacterData> = {}

    // 1. Add feat to feats list (with metadata for tracking)
    const newFeat = {
      name: feat.name,
      description: feat.description || '',
      featId: feat.id,
      choices: {
        abilityChoices: choices.abilityChoices.length > 0 ? choices.abilityChoices : undefined,
        skillChoices: choices.skillChoices.length > 0 ? choices.skillChoices : undefined,
        toolChoices: choices.toolChoices.length > 0 ? choices.toolChoices : undefined,
        languageChoices: choices.languageChoices.length > 0 ? choices.languageChoices : undefined
      }
    }
    updates.feats = [...(character.feats || []), newFeat]

    // 2. Apply ability score increases
    if (feat.ability_modifiers) {
      const abilityScores = { ...character }
      let updated = false

      if (Array.isArray(feat.ability_modifiers)) {
        feat.ability_modifiers.forEach((mod: any) => {
          const ability = mod.ability?.toLowerCase()
          const increase = mod.increase || 0
          if (ability && ability in abilityScores) {
            (abilityScores as any)[ability] = ((abilityScores as any)[ability] || 0) + increase
            updated = true
          }
        })
      } else if (typeof feat.ability_modifiers === 'object') {
        const asi = feat.ability_modifiers as any
        if (asi.type === 'choice') {
          const increase = asi.choices?.increase || 1
          choices.abilityChoices.forEach(ability => {
            const abilityKey = ability.toLowerCase() as keyof CharacterData
            if (abilityKey in abilityScores) {
              (abilityScores as any)[abilityKey] = ((abilityScores as any)[abilityKey] || 0) + increase
              updated = true
            }
          })
        } else if (asi.type === 'custom') {
          // Apply fixed increase
          if (asi.fixed) {
            const ability = asi.fixed.ability?.toLowerCase()
            const increase = asi.fixed.increase || 0
            if (ability && ability in abilityScores) {
              (abilityScores as any)[ability] = ((abilityScores as any)[ability] || 0) + increase
              updated = true
            }
          }
          // Apply choice increases
          if (asi.choices) {
            const increase = asi.choices.increase || 1
            choices.abilityChoices.forEach(ability => {
              const abilityKey = ability.toLowerCase() as keyof CharacterData
              if (abilityKey in abilityScores) {
                (abilityScores as any)[abilityKey] = ((abilityScores as any)[abilityKey] || 0) + increase
                updated = true
              }
            })
          }
        } else if (asi.type === 'fixed_multi') {
          Object.entries(asi.abilities || {}).forEach(([ability, increase]: [string, any]) => {
            const abilityKey = ability.toLowerCase() as keyof CharacterData
            if (abilityKey in abilityScores && increase > 0) {
              (abilityScores as any)[abilityKey] = ((abilityScores as any)[abilityKey] || 0) + increase
              updated = true
            }
          })
        }
      }

      if (updated) {
        updates.strength = abilityScores.strength
        updates.dexterity = abilityScores.dexterity
        updates.constitution = abilityScores.constitution
        updates.intelligence = abilityScores.intelligence
        updates.wisdom = abilityScores.wisdom
        updates.charisma = abilityScores.charisma
      }
    }

    // 3. Apply skill proficiencies
    if (feat.skill_proficiencies) {
      const currentSkills = character.skills || []
      const skillsToAdd: string[] = []

      if (Array.isArray(feat.skill_proficiencies)) {
        feat.skill_proficiencies.forEach(skill => {
          skillsToAdd.push(skill.toLowerCase().replace(/\s+/g, '_'))
        })
      } else if (typeof feat.skill_proficiencies === 'object') {
        const skillsObj = feat.skill_proficiencies as any
        // Add fixed skills
        if (skillsObj.fixed) {
          skillsObj.fixed.forEach((skill: string) => {
            skillsToAdd.push(skill.toLowerCase().replace(/\s+/g, '_'))
          })
        }
        // Add choice skills
        choices.skillChoices.forEach(skill => {
          skillsToAdd.push(skill.toLowerCase().replace(/\s+/g, '_'))
        })
      }

      const updatedSkills = currentSkills.map((skill: any) => {
        const skillKey = skill.name.toLowerCase().replace(/\s+/g, '_')
        if (skillsToAdd.includes(skillKey) && skill.proficiency === 'none') {
          return { ...skill, proficiency: 'proficient' as const }
        }
        return skill
      })
      updates.skills = updatedSkills
    }

    // 4. Apply tool proficiencies
    if (feat.tool_proficiencies) {
      const currentTools = character.toolsProficiencies || []
      const toolsToAdd: string[] = []

      if (Array.isArray(feat.tool_proficiencies)) {
        feat.tool_proficiencies.forEach(tool => {
          toolsToAdd.push(tool)
        })
      } else if (typeof feat.tool_proficiencies === 'object') {
        const toolsObj = feat.tool_proficiencies as any
        // Add fixed tools
        if (toolsObj.fixed) {
          toolsObj.fixed.forEach((tool: string) => {
            toolsToAdd.push(tool)
          })
        }
        // Add choice tools
        choices.toolChoices.forEach(tool => {
          toolsToAdd.push(tool)
        })
      }

      const newTools = toolsToAdd
        .filter(tool => !currentTools.some((t: any) => (typeof t === 'string' ? t : t.name) === tool))
        .map(tool => ({ name: tool, proficiency: 'proficient' as const }))
      updates.toolsProficiencies = [...currentTools, ...newTools]
    }

    // 5. Apply equipment proficiencies
    if (feat.equipment_proficiencies && feat.equipment_proficiencies.length > 0) {
      const currentEquipment = character.equipmentProficiencies || {}
      const updatedEquipment = { ...currentEquipment }
      
      feat.equipment_proficiencies.forEach(prof => {
        const key = prof.toLowerCase().replace(/\s+/g, '') as keyof typeof updatedEquipment
        if (key in updatedEquipment) {
          (updatedEquipment as any)[key] = true
        }
      })
      
      updates.equipmentProficiencies = updatedEquipment
    }

    // 6. Apply weapon proficiencies
    if (feat.weapon_proficiencies && feat.weapon_proficiencies.length > 0) {
      const currentEquipment = updates.equipmentProficiencies || character.equipmentProficiencies || {}
      const updatedEquipment = { ...currentEquipment }
      
      feat.weapon_proficiencies.forEach(weapon => {
        const key = weapon.toLowerCase().replace(/\s+/g, '') as keyof typeof updatedEquipment
        if (key in updatedEquipment) {
          (updatedEquipment as any)[key] = true
        } else {
          // Add as a new proficiency
          (updatedEquipment as any)[key] = true
        }
      })
      
      updates.equipmentProficiencies = updatedEquipment
    }

    // 7. Apply languages
    if (feat.languages) {
      const currentLanguages = character.languages || "Common"
      const languagesToAdd: string[] = []

      if (Array.isArray(feat.languages)) {
        feat.languages.forEach(lang => {
          languagesToAdd.push(lang)
        })
      } else if (typeof feat.languages === 'object') {
        const langsObj = feat.languages as any
        // Add fixed languages
        if (langsObj.fixed) {
          langsObj.fixed.forEach((lang: string) => {
            languagesToAdd.push(lang)
          })
        }
        // Add choice languages
        choices.languageChoices.forEach(lang => {
          languagesToAdd.push(lang)
        })
      }

      const languagesArray = currentLanguages.split(',').map(l => l.trim()).filter(Boolean)
      const newLanguages = languagesToAdd.filter(lang => 
        !languagesArray.some(l => l.toLowerCase() === lang.toLowerCase())
      )
      updates.languages = newLanguages.length > 0
        ? `${currentLanguages}${currentLanguages ? ', ' : ''}${newLanguages.join(', ')}`
        : currentLanguages
    }

    // 8. Add special features to features array with usage tracking
    if (feat.special_features && feat.special_features.length > 0) {
      const currentFeatures = character.features || []
      const currentFeatureUsage = character.classFeatureSkillsUsage || {}
      const newFeatures: any[] = []
      const newFeatureUsage: any = { ...currentFeatureUsage }

      feat.special_features.forEach((feature: any) => {
        if (feature.featureType === 'trait') {
          // Simple trait - just add to features
          newFeatures.push({
            name: feature.title,
            description: feature.description || ''
          })
        } else {
          // Complex feature - add to features and initialize usage tracking
          const featureId = feature.id || `feat-${feat.id}-${feature.title}-${Date.now()}`
          
          // Initialize usage tracking based on feature type
          let currentUses = 0
          let usesPerLongRest: number | string | undefined = undefined
          
          if (feature.featureType === 'slots') {
            const usesFormula = feature.config?.usesFormula || '1'
            const maxUses = calculateUsesFromFormula(usesFormula, character)
            currentUses = maxUses
            usesPerLongRest = usesFormula
            newFeatureUsage[featureId] = {
              featureName: feature.title,
              featureType: 'slots',
              currentUses: maxUses,
              maxUses: maxUses,
              lastReset: new Date().toISOString(),
              // Store full config for reconstruction
              config: feature.config,
              description: feature.description,
              isFeatFeature: true
            }
          } else if (feature.featureType === 'points_pool') {
            const totalFormula = feature.config?.totalFormula || '1'
            const maxPoints = calculateUsesFromFormula(totalFormula, character)
            currentUses = maxPoints
            usesPerLongRest = totalFormula
            newFeatureUsage[featureId] = {
              featureName: feature.title,
              featureType: 'points_pool',
              currentPoints: maxPoints,
              maxPoints: maxPoints,
              lastReset: new Date().toISOString(),
              // Store full config for reconstruction
              config: feature.config,
              description: feature.description,
              isFeatFeature: true
            }
          } else if (feature.featureType === 'availability_toggle') {
            newFeatureUsage[featureId] = {
              featureName: feature.title,
              featureType: 'availability_toggle',
              isAvailable: feature.config?.defaultAvailable ?? true,
              lastReset: new Date().toISOString(),
              // Store full config for reconstruction
              config: feature.config,
              description: feature.description,
              isFeatFeature: true
            }
          }
          
          newFeatures.push({
            name: feature.title,
            description: feature.description || '',
            usesPerLongRest: usesPerLongRest,
            currentUses: currentUses
          })
        }
      })

      updates.features = [...currentFeatures, ...newFeatures]
      updates.classFeatureSkillsUsage = newFeatureUsage
    }

    return updates
  }

  if (step === 'select') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Select Feat from Library</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading feats...</span>
              </div>
            ) : (
              <div className="grid gap-3">
                {feats.map((feat) => (
                  <div
                    key={feat.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleFeatSelect(feat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">{feat.name}</div>
                        {feat.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            <RichTextDisplay content={feat.description} />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {feat.ability_modifiers && (
                            <Badge variant="outline" className="text-xs">
                              Ability Modifiers
                            </Badge>
                          )}
                          {feat.skill_proficiencies && (
                            <Badge variant="outline" className="text-xs">
                              Skills
                            </Badge>
                          )}
                          {feat.tool_proficiencies && (
                            <Badge variant="outline" className="text-xs">
                              Tools
                            </Badge>
                          )}
                          {feat.special_features && feat.special_features.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {feat.special_features.length} Feature(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground ml-2" />
                    </div>
                  </div>
                ))}
                {feats.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No feats available in the library
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Configuration step
  if (!selectedFeatData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('select')}
              className="h-8 w-8 p-0"
            >
              <Icon icon="lucide:arrow-left" className="w-4 h-4" />
            </Button>
            Configure: {selectedFeatData.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Feat Description */}
          {selectedFeatData.description && (
            <div className="p-3 border rounded-lg bg-muted/50">
              <RichTextDisplay content={selectedFeatData.description} />
            </div>
          )}

          {/* Ability Modifier Choices */}
          {selectedFeatData.ability_modifiers && 
           typeof selectedFeatData.ability_modifiers === 'object' && 
           !Array.isArray(selectedFeatData.ability_modifiers) &&
           selectedFeatData.ability_modifiers.type === 'choice' && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Ability Score Increases</Label>
              <p className="text-sm text-muted-foreground">
                Choose {(selectedFeatData.ability_modifiers as any).choices?.count || 1} ability/abilities to increase by +{(selectedFeatData.ability_modifiers as any).choices?.increase || 1}
              </p>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg">
                {(() => {
                  const choices = (selectedFeatData.ability_modifiers as any).choices
                  const availableAbilities = choices?.available_abilities || ABILITY_OPTIONS.map(a => a.value)
                  const count = choices?.count || 1
                  
                  return ABILITY_OPTIONS.filter(a => availableAbilities.includes(a.value)).map(ability => {
                    const isSelected = abilityChoices.includes(ability.value)
                    const canSelect = abilityChoices.length < count
                    
                    return (
                      <div key={ability.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`ability-${ability.value}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (canSelect) {
                                setAbilityChoices([...abilityChoices, ability.value])
                              }
                            } else {
                              setAbilityChoices(abilityChoices.filter(a => a !== ability.value))
                            }
                          }}
                          disabled={!canSelect && !isSelected}
                        />
                        <Label htmlFor={`ability-${ability.value}`} className="text-sm cursor-pointer">
                          {ability.label}
                        </Label>
                      </div>
                    )
                  })
                })()}
              </div>
              {abilityChoices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {abilityChoices.map(ability => (
                    <Badge key={ability} variant="secondary">
                      {ABILITY_OPTIONS.find(a => a.value === ability)?.label} +{(selectedFeatData.ability_modifiers as any).choices?.increase || 1}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Skill Proficiency Choices */}
          {selectedFeatData.skill_proficiencies && 
           typeof selectedFeatData.skill_proficiencies === 'object' && 
           !Array.isArray(selectedFeatData.skill_proficiencies) &&
           (selectedFeatData.skill_proficiencies as any).choice && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Skill Proficiencies</Label>
              <p className="text-sm text-muted-foreground">
                Choose {(selectedFeatData.skill_proficiencies as any).choice.count || 1} skill proficiency/proficiencies
              </p>
              <ProficiencyCheckboxes
                title=""
                description=""
                value={skillChoices}
                onChange={setSkillChoices}
                options={(() => {
                  const skillsObj = selectedFeatData.skill_proficiencies as any
                  const available = skillsObj.available || []
                  if (available.length > 0) {
                    return SKILL_OPTIONS.filter(s => available.includes(s.value))
                  }
                  return SKILL_OPTIONS
                })()}
                readonly={false}
                maxSelections={(selectedFeatData.skill_proficiencies as any).choice.count || 1}
              />
            </div>
          )}

          {/* Tool Proficiency Choices */}
          {selectedFeatData.tool_proficiencies && 
           typeof selectedFeatData.tool_proficiencies === 'object' && 
           !Array.isArray(selectedFeatData.tool_proficiencies) &&
           (selectedFeatData.tool_proficiencies as any).choice && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Tool Proficiencies</Label>
              <p className="text-sm text-muted-foreground">
                Choose {(selectedFeatData.tool_proficiencies as any).choice.count || 1} tool proficiency/proficiencies
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                {(() => {
                  const toolsObj = selectedFeatData.tool_proficiencies as any
                  const available = toolsObj.available || []
                  const tools = available.length > 0 
                    ? TOOL_OPTIONS.filter(t => available.includes(t.value))
                    : TOOL_OPTIONS
                  const count = toolsObj.choice.count || 1
                  
                  return tools.map(tool => {
                    const isSelected = toolChoices.includes(tool.value)
                    const canSelect = toolChoices.length < count
                    
                    return (
                      <div key={tool.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`tool-${tool.value}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (canSelect) {
                                setToolChoices([...toolChoices, tool.value])
                              }
                            } else {
                              setToolChoices(toolChoices.filter(t => t !== tool.value))
                            }
                          }}
                          disabled={!canSelect && !isSelected}
                        />
                        <Label htmlFor={`tool-${tool.value}`} className="text-sm cursor-pointer">
                          {tool.label}
                        </Label>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* Language Choices */}
          {selectedFeatData.languages && 
           typeof selectedFeatData.languages === 'object' && 
           !Array.isArray(selectedFeatData.languages) &&
           (selectedFeatData.languages as any).choice && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Languages</Label>
              <p className="text-sm text-muted-foreground">
                Choose {(selectedFeatData.languages as any).choice.count || 1} additional language/languages
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: (selectedFeatData.languages as any).choice.count || 1 }).map((_, index) => (
                  <Input
                    key={index}
                    value={languageChoices[index] || ''}
                    onChange={(e) => {
                      const updated = [...languageChoices]
                      updated[index] = e.target.value
                      setLanguageChoices(updated)
                    }}
                    placeholder={`Language ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => setStep('select')}>
            Back
          </Button>
          <Button onClick={handleApplyFeat}>
            Add Feat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

