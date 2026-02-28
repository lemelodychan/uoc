"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { SKILL_OPTIONS, EQUIPMENT_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import { PassiveBonusesEditor } from "@/components/ui/passive-bonuses-editor"
import type { PassiveBonuses } from "@/lib/class-feature-types"

/**
 * Race Feature Interface
 *
 * For choice-type features, the options array should contain objects with:
 * - type: 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell'
 * - name: string (used as selection value in character creation)
 * - description: string
 * - Type-specific fields:
 *   - trait/darkvision: speed_bonus (optional number)
 *   - skill_proficiency: skill_choice ('fixed' | 'any'), skill_count (if 'any')
 *   - weapon_proficiency: weapons (string[])
 *
 * See docs/race-choice-feature-structure.md for complete documentation
 */
interface RaceFeature {
  name?: string
  description?: string
  feature_type?: 'skill_proficiency' | 'weapon_proficiency' | 'tool_proficiency' | 'trait' | 'spell' | 'choice' | 'feat'
    | 'darkvision' | 'damage_resistance' | 'damage_immunity' | 'condition_immunity' | 'language_proficiency' | 'innate_spellcasting'
  feature_skill_type?: string | 'choice'
  skill_options?: string[]
  max_selections?: number
  weapons?: string[]
  tools?: string[]
  tool_choice_type?: 'fixed' | 'choice'
  tool_options?: string[]
  uses_per_long_rest?: number | string
  usesPerLongRest?: number | string
  refueling_die?: string
  refuelingDie?: string
  hp_bonus_per_level?: boolean // If true, adds character level to max HP (e.g., Dwarven Toughness)
  passive_bonuses?: Record<string, any> | null
  // Darkvision
  darkvision_range?: number
  // Damage resistance / immunity
  damage_types?: string[]
  // Condition immunity
  condition_types?: string[]
  // Language proficiency
  languages?: string[]
  // Innate spellcasting
  spell_name?: string
  spell_level?: number
  uses_per_day?: number | 'at_will'
  casting_ability?: string
  concentration?: boolean
  options?: Array<{
    type: 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell'
    name: string
    description: string
    skill_choice?: 'fixed' | 'any'
    skill_count?: number
    weapons?: string[]
    speed_bonus?: number
    [key: string]: any
  }>
  [key: string]: any
}

interface RaceFeatureEditModalProps {
  isOpen: boolean
  onClose: () => void
  feature: RaceFeature | null
  featureIndex: number | null
  onSave: (feature: RaceFeature | null) => void // null means delete
}

const COMMON_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools"
]

const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
]

const CONDITION_TYPES = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
]

const COMMON_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling',
  'Orc', 'Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal',
  'Primordial', 'Sylvan', 'Undercommon'
]

export function RaceFeatureEditModal({ 
  isOpen, 
  onClose, 
  feature, 
  featureIndex, 
  onSave 
}: RaceFeatureEditModalProps) {
  const [featureType, setFeatureType] = useState<'skill_proficiency' | 'weapon_proficiency' | 'tool_proficiency' | 'trait' | 'spell' | 'choice' | 'feat' | 'custom_proficiency' | 'darkvision' | 'damage_resistance' | 'damage_immunity' | 'condition_immunity' | 'language_proficiency' | 'innate_spellcasting'>('trait')
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  
  // Skill proficiency fields
  const [skillType, setSkillType] = useState<string>('choice')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [maxSelections, setMaxSelections] = useState<number>(1)
  
  // Weapon proficiency fields
  const [selectedWeapons, setSelectedWeapons] = useState<string[]>([])
  
  // Tool proficiency fields
  const [toolType, setToolType] = useState<string>('fixed') // 'fixed' or 'choice'
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [toolMaxSelections, setToolMaxSelections] = useState<number>(1)
  const [customTool, setCustomTool] = useState("")
  const [customProficiencyName, setCustomProficiencyName] = useState("")
  
  // Regular feature fields
  const [usesPerLongRest, setUsesPerLongRest] = useState<number | string>(0)
  const [refuelingDie, setRefuelingDie] = useState("")
  const [hpBonusPerLevel, setHpBonusPerLevel] = useState(false)

  // Darkvision
  const [darkvisionRange, setDarkvisionRange] = useState<number>(60)
  // Damage resistance / immunity
  const [selectedDamageTypes, setSelectedDamageTypes] = useState<string[]>([])
  // Condition immunity
  const [selectedConditionTypes, setSelectedConditionTypes] = useState<string[]>([])
  // Language proficiency
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [customLanguage, setCustomLanguage] = useState("")
  // Innate spellcasting
  const [innateSpellName, setInnateSpellName] = useState("")
  const [innateSpellLevel, setInnateSpellLevel] = useState<number>(0)
  const [innateSpellUses, setInnateSpellUses] = useState<number | 'at_will'>('at_will')
  const [innateSpellCastingAbility, setInnateSpellCastingAbility] = useState("")
  const [innateSpellConcentration, setInnateSpellConcentration] = useState(false)
  // Passive bonuses
  const [passiveBonuses, setPassiveBonuses] = useState<PassiveBonuses | null>(null)

  // JSON fallback
  const [showJsonFallback, setShowJsonFallback] = useState(false)
  const [jsonFallbackValue, setJsonFallbackValue] = useState("")
  
  // Choice feature options
  // Structure must match character creation flow expectations:
  // - name is used as the selection value
  // - type determines how the option is processed
  // - Type-specific fields are validated based on type
  const [choiceOptions, setChoiceOptions] = useState<Array<{
    type: 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell'
    name: string
    description: string
    skill_choice?: 'fixed' | 'any'
    skill_count?: number
    weapons?: string[]
    speed_bonus?: number
    [key: string]: any
  }>>([])
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null)
  const [editingOption, setEditingOption] = useState<{
    type: 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell'
    name: string
    description: string
    skill_choice?: 'fixed' | 'any'
    skill_count?: number
    weapons?: string[]
    speed_bonus?: number
    uses_per_long_rest?: number | string
    refueling_die?: string
    [key: string]: any
  } | null>(null)

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && feature) {
      setFeatureType(feature.feature_type || 'trait')
      setName(feature.name || "")
      setDescription(feature.description || "")
      setUsesPerLongRest(feature.uses_per_long_rest || feature.usesPerLongRest || 0)
      setRefuelingDie(feature.refueling_die || feature.refuelingDie || "")
      setHpBonusPerLevel(feature.hp_bonus_per_level || false)
      
      // Skill proficiency
      if (feature.feature_type === 'skill_proficiency') {
        setSkillType(feature.feature_skill_type || 'choice')
        setSelectedSkills(feature.skill_options || [])
        setMaxSelections(feature.max_selections || 1)
      }
      
      // Weapon proficiency
      if (feature.feature_type === 'weapon_proficiency') {
        setSelectedWeapons(feature.weapons || [])
      }
      
      // Tool proficiency
      if (feature.feature_type === 'tool_proficiency') {
        // Check if this is a choice-based tool proficiency
        if (feature.tool_choice_type === 'choice') {
          setToolType('choice')
          setSelectedTools(feature.tool_options || [])
          setToolMaxSelections(feature.max_selections || 1)
        } else {
          setToolType('fixed')
          setSelectedTools(feature.tools || [])
        }
      }
      
      // Choice feature options
      if (feature.feature_type === 'choice') {
        setChoiceOptions(feature.options || [])
      }

      // Darkvision
      if (feature.feature_type === 'darkvision') {
        setDarkvisionRange(feature.darkvision_range || 60)
      }
      // Damage resistance / immunity
      if (feature.feature_type === 'damage_resistance' || feature.feature_type === 'damage_immunity') {
        setSelectedDamageTypes(feature.damage_types || [])
      }
      // Condition immunity
      if (feature.feature_type === 'condition_immunity') {
        setSelectedConditionTypes(feature.condition_types || [])
      }
      // Language proficiency
      if (feature.feature_type === 'language_proficiency') {
        setSelectedLanguages(feature.languages || [])
      }
      // Innate spellcasting
      if (feature.feature_type === 'innate_spellcasting') {
        setInnateSpellName(feature.spell_name || "")
        setInnateSpellLevel(feature.spell_level ?? 0)
        setInnateSpellUses(feature.uses_per_day ?? 'at_will')
        setInnateSpellCastingAbility(feature.casting_ability || "")
        setInnateSpellConcentration(feature.concentration || false)
      }
      setPassiveBonuses((feature.passive_bonuses as PassiveBonuses) ?? null)
      setShowJsonFallback(false)
      setJsonFallbackValue("")
    } else if (isOpen && !feature) {
      // New feature - reset all
      setFeatureType('trait')
      setName("")
      setDescription("")
      setSkillType('choice')
      setSelectedSkills([])
      setMaxSelections(1)
      setSelectedWeapons([])
      setToolType('fixed')
      setSelectedTools([])
      setToolMaxSelections(1)
      setCustomTool("")
      setUsesPerLongRest(0)
      setRefuelingDie("")
      setHpBonusPerLevel(false)
      setChoiceOptions([])
      setCustomProficiencyName("")
      setEditingOptionIndex(null)
      setEditingOption(null)
      setDarkvisionRange(60)
      setSelectedDamageTypes([])
      setSelectedConditionTypes([])
      setSelectedLanguages([])
      setCustomLanguage("")
      setInnateSpellName("")
      setInnateSpellLevel(0)
      setInnateSpellUses('at_will')
      setInnateSpellCastingAbility("")
      setInnateSpellConcentration(false)
      setPassiveBonuses(null)
      setShowJsonFallback(false)
      setJsonFallbackValue("")
    }
  }, [isOpen, feature])

  const handleSave = () => {
    // JSON fallback mode: parse and save directly
    if (showJsonFallback) {
      try {
        const parsed = JSON.parse(jsonFallbackValue)
        onSave(parsed)
        return
      } catch {
        alert("Invalid JSON. Please fix the JSON before saving.")
        return
      }
    }

    const savedFeature: RaceFeature = {
      name,
      description,
      feature_type: featureType === 'custom_proficiency' ? 'tool_proficiency' : featureType,
      uses_per_long_rest: usesPerLongRest || undefined,
      refueling_die: refuelingDie || undefined,
      hp_bonus_per_level: hpBonusPerLevel || undefined,
      passive_bonuses: passiveBonuses || undefined,
    }

    if (featureType === 'skill_proficiency') {
      savedFeature.feature_skill_type = skillType
      if (skillType === 'choice') {
        savedFeature.skill_options = selectedSkills
        savedFeature.max_selections = maxSelections
      } else {
        savedFeature.skill_options = selectedSkills
      }
    } else if (featureType === 'weapon_proficiency') {
      savedFeature.weapons = selectedWeapons
    } else if (featureType === 'tool_proficiency' || featureType === 'custom_proficiency') {
      if (featureType === 'custom_proficiency') {
        const trimmed = customProficiencyName.trim()
        if (trimmed.length > 0) {
          savedFeature.tools = [trimmed]
        }
      } else if (toolType === 'choice') {
        savedFeature.tool_choice_type = 'choice'
        savedFeature.tool_options = selectedTools
        savedFeature.max_selections = toolMaxSelections
      } else {
        savedFeature.tools = selectedTools
      }
    } else if (featureType === 'choice') {
      savedFeature.options = choiceOptions
    } else if (featureType === 'darkvision') {
      savedFeature.darkvision_range = darkvisionRange
    } else if (featureType === 'damage_resistance') {
      savedFeature.damage_types = selectedDamageTypes
    } else if (featureType === 'damage_immunity') {
      savedFeature.damage_types = selectedDamageTypes
    } else if (featureType === 'condition_immunity') {
      savedFeature.condition_types = selectedConditionTypes
    } else if (featureType === 'language_proficiency') {
      savedFeature.languages = selectedLanguages
    } else if (featureType === 'innate_spellcasting') {
      savedFeature.spell_name = innateSpellName
      savedFeature.spell_level = innateSpellLevel
      savedFeature.uses_per_day = innateSpellUses
      if (innateSpellCastingAbility) savedFeature.casting_ability = innateSpellCastingAbility
      if (innateSpellConcentration) savedFeature.concentration = true
    }

    onSave(savedFeature)
  }

  const buildCurrentFeatureJson = (): string => {
    const obj: RaceFeature = { name, description, feature_type: featureType as any }
    if (featureType === 'darkvision') obj.darkvision_range = darkvisionRange
    else if (featureType === 'damage_resistance' || featureType === 'damage_immunity') obj.damage_types = selectedDamageTypes
    else if (featureType === 'condition_immunity') obj.condition_types = selectedConditionTypes
    else if (featureType === 'language_proficiency') obj.languages = selectedLanguages
    else if (featureType === 'innate_spellcasting') {
      obj.spell_name = innateSpellName
      obj.spell_level = innateSpellLevel
      obj.uses_per_day = innateSpellUses
      if (innateSpellCastingAbility) obj.casting_ability = innateSpellCastingAbility
      if (innateSpellConcentration) obj.concentration = true
    } else if (featureType === 'skill_proficiency') {
      obj.feature_skill_type = skillType
      obj.skill_options = selectedSkills
      if (skillType === 'choice') obj.max_selections = maxSelections
    } else if (featureType === 'weapon_proficiency') {
      obj.weapons = selectedWeapons
    } else if (featureType === 'tool_proficiency') {
      if (toolType === 'choice') { obj.tool_choice_type = 'choice'; obj.tool_options = selectedTools; obj.max_selections = toolMaxSelections }
      else obj.tools = selectedTools
    } else if (featureType === 'choice') {
      obj.options = choiceOptions
    }
    if (usesPerLongRest) obj.uses_per_long_rest = usesPerLongRest
    if (refuelingDie) obj.refueling_die = refuelingDie
    if (hpBonusPerLevel) obj.hp_bonus_per_level = true
    return JSON.stringify(obj, null, 2)
  }
  
  const handleAddOption = () => {
    setEditingOption({
      type: 'trait',
      name: '',
      description: '',
      uses_per_long_rest: undefined,
      refueling_die: undefined
    })
    setEditingOptionIndex(null)
  }
  
  const handleEditOption = (index: number) => {
    setEditingOption({ ...choiceOptions[index] })
    setEditingOptionIndex(index)
  }
  
  const handleSaveOption = () => {
    if (!editingOption) return
    
    // Validate required fields
    if (!editingOption.name || !editingOption.name.trim()) {
      return // Name is required
    }
    if (!editingOption.description || !editingOption.description.trim()) {
      return // Description is required
    }
    
    // Clean up the option data to match character creation flow expectations
    // The character creation modal uses:
    // - option.name as the selection value
    // - option.type to determine processing logic
    // - Type-specific fields are checked conditionally
    const cleanedOption: typeof editingOption = {
      ...editingOption,
      name: editingOption.name.trim(),
      description: editingOption.description.trim()
    }
    
    // Remove undefined/null optional fields to keep data clean
    if (!cleanedOption.speed_bonus) delete cleanedOption.speed_bonus
    if (cleanedOption.type !== 'skill_proficiency') {
      delete cleanedOption.skill_choice
      delete cleanedOption.skill_count
    }
    if (cleanedOption.type !== 'weapon_proficiency') {
      if (!cleanedOption.weapons || cleanedOption.weapons.length === 0) {
        delete cleanedOption.weapons
      }
    }
    if (cleanedOption.type !== 'spell') {
      if (!cleanedOption.uses_per_long_rest) delete cleanedOption.uses_per_long_rest
      if (!cleanedOption.refueling_die) delete cleanedOption.refueling_die
    } else {
      // For spell type, keep uses_per_long_rest and refueling_die if they're set
      if (!cleanedOption.uses_per_long_rest) cleanedOption.uses_per_long_rest = undefined
      if (!cleanedOption.refueling_die) cleanedOption.refueling_die = undefined
    }
    
    if (editingOptionIndex !== null) {
      // Update existing option
      const updated = [...choiceOptions]
      updated[editingOptionIndex] = cleanedOption
      setChoiceOptions(updated)
    } else {
      // Add new option
      setChoiceOptions([...choiceOptions, cleanedOption])
    }
    setEditingOption(null)
    setEditingOptionIndex(null)
  }
  
  const handleDeleteOption = (index: number) => {
    setChoiceOptions(choiceOptions.filter((_, i) => i !== index))
  }

  const handleDelete = () => {
    if (featureIndex !== null) {
      onSave(null as any) // Signal deletion
      onClose()
    }
  }

  const isEditing = featureIndex !== null

  const toggleSkill = (skillValue: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillValue) 
        ? prev.filter(s => s !== skillValue)
        : [...prev, skillValue]
    )
  }

  const toggleWeapon = (weaponValue: string) => {
    setSelectedWeapons(prev => 
      prev.includes(weaponValue) 
        ? prev.filter(w => w !== weaponValue)
        : [...prev, weaponValue]
    )
  }

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    )
  }

  const addCustomTool = () => {
    if (customTool.trim() && !selectedTools.includes(customTool.trim())) {
      setSelectedTools(prev => [...prev, customTool.trim()])
      setCustomTool("")
    }
  }

  const removeTool = (tool: string) => {
    setSelectedTools(prev => prev.filter(t => t !== tool))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {isEditing ? `Edit Feature: ${feature?.name || "Unknown"}` : "Add New Feature"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-type">Feature Type *</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={() => {
                  if (!showJsonFallback) {
                    setJsonFallbackValue(buildCurrentFeatureJson())
                  }
                  setShowJsonFallback(prev => !prev)
                }}
              >
                <Icon icon={showJsonFallback ? "lucide:form-input" : "lucide:code-2"} className="w-3 h-3 mr-1" />
                {showJsonFallback ? "Back to form" : "JSON (advanced)"}
              </Button>
            </div>
            <Select value={featureType} onValueChange={(value: any) => setFeatureType(value)} disabled={showJsonFallback}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trait">Trait</SelectItem>
                <SelectItem value="skill_proficiency">Skill Proficiency</SelectItem>
                <SelectItem value="weapon_proficiency">Weapon Proficiency</SelectItem>
                <SelectItem value="tool_proficiency">Tool Proficiency</SelectItem>
                <SelectItem value="spell">Spell</SelectItem>
                <SelectItem value="choice">Choice</SelectItem>
                <SelectItem value="feat">Feat</SelectItem>
                <SelectItem value="custom_proficiency">Custom Proficiency (Tools section)</SelectItem>
                <SelectItem value="darkvision">Darkvision</SelectItem>
                <SelectItem value="damage_resistance">Damage Resistance</SelectItem>
                <SelectItem value="damage_immunity">Damage Immunity</SelectItem>
                <SelectItem value="condition_immunity">Condition Immunity</SelectItem>
                <SelectItem value="language_proficiency">Language Proficiency</SelectItem>
                <SelectItem value="innate_spellcasting">Innate Spellcasting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* JSON Fallback Mode */}
          {showJsonFallback && (
            <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium text-muted-foreground">Raw JSON — edit directly for advanced configurations</Label>
              <textarea
                className="w-full min-h-[200px] p-2 font-mono text-xs bg-background border rounded resize-y"
                value={jsonFallbackValue}
                onChange={(e) => setJsonFallbackValue(e.target.value)}
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">The JSON will be saved as-is. Make sure it is valid JSON with a <code>feature_type</code> field.</p>
            </div>
          )}
          {/* Custom Proficiency (Tools section) */}
          {featureType === 'custom_proficiency' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Custom Proficiency</Label>
              <div className="flex flex-col gap-2">
                <Label>Proficiency name</Label>
                <Input
                  placeholder="e.g., Vehicles (Land), Herbalism Kit, Dragonchess"
                  value={customProficiencyName}
                  onChange={(e) => setCustomProficiencyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Will appear under Tools Proficiencies on the character sheet.</p>
              </div>
            </div>
          )}

          {!showJsonFallback && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="feature-name">Name *</Label>
                <Input
                  id="feature-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Feature name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="feature-description">Description</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Feature description"
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Skill Proficiency Configuration */}
          {featureType === 'skill_proficiency' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
              <Label className="text-md font-medium">Skill Proficiency Configuration</Label>
              
              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Mode</Label>
                  <Select value={skillType} onValueChange={setSkillType}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choice">Player choice from a list</SelectItem>
                      <SelectItem value="fixed">All skills from a list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {skillType === 'choice' && (
                  <div className="flex flex-col gap-2">
                    <Label>Max Selections</Label>
                    <Input
                      type="number"
                      value={maxSelections}
                      onChange={(e) => setMaxSelections(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-24"
                    />
                  </div>
                )}
              </div>

              {skillType === 'choice' && ( 
                <div className="flex flex-col gap-3">
                  <Label>Can choose from the following:</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-3 border rounded bg-background">
                    {SKILL_OPTIONS.map(skill => (
                      <div key={skill.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`skill-${skill.value}`}
                          checked={selectedSkills.includes(skill.value)}
                          onCheckedChange={() => toggleSkill(skill.value)}
                        />
                        <Label htmlFor={`skill-${skill.value}`} className="text-sm font-normal cursor-pointer">
                          {skill.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skillType !== 'choice' && (
                <div className="flex flex-col gap-3">
                  <Label>Adds proficiency to the following skills:</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto p-3 border rounded bg-background">
                    {SKILL_OPTIONS.map(skill => (
                      <div key={skill.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`fixed-skill-${skill.value}`}
                          checked={selectedSkills.includes(skill.value)}
                          onCheckedChange={() => toggleSkill(skill.value)}
                        />
                        <Label htmlFor={`fixed-skill-${skill.value}`} className="text-sm font-normal cursor-pointer">
                          {skill.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weapon Proficiency Configuration */}
          {featureType === 'weapon_proficiency' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Weapon Proficiency Configuration</Label>
              <div className="flex flex-col gap-3">
                <Label>Select Weapons & Equipment:</Label>
                <div className="grid grid-cols-3 gap-2 p-3 border rounded bg-background">
                  {/* Armor and Shields */}
                  {EQUIPMENT_OPTIONS.filter(opt => 
                    ['light_armor', 'medium_armor', 'heavy_armor', 'shields'].includes(opt.value)
                  ).map(weapon => (
                    <div key={weapon.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`weapon-${weapon.value}`}
                        checked={selectedWeapons.includes(weapon.label)}
                        onCheckedChange={() => toggleWeapon(weapon.label)}
                      />
                      <Label htmlFor={`weapon-${weapon.value}`} className="text-sm font-normal cursor-pointer">
                        {weapon.label}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Weapon Categories */}
                  {EQUIPMENT_OPTIONS.filter(opt => 
                    ['simple_weapons', 'martial_weapons', 'firearms'].includes(opt.value)
                  ).map(weapon => (
                    <div key={weapon.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`weapon-${weapon.value}`}
                        checked={selectedWeapons.includes(weapon.label)}
                        onCheckedChange={() => toggleWeapon(weapon.label)}
                      />
                      <Label htmlFor={`weapon-${weapon.value}`} className="text-sm font-normal cursor-pointer">
                        {weapon.label}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Specific Weapons (not in EQUIPMENT_OPTIONS) */}
                  {[
                    { value: 'handCrossbows', label: 'Hand Crossbows' },
                    { value: 'longswords', label: 'Longswords' },
                    { value: 'rapiers', label: 'Rapiers' },
                    { value: 'shortswords', label: 'Shortswords' },
                    { value: 'scimitars', label: 'Scimitars' },
                    { value: 'lightCrossbows', label: 'Light Crossbows' },
                    { value: 'longbows', label: 'Longbows' },
                    { value: 'shortbows', label: 'Shortbows' },
                    { value: 'shortswords', label: 'Shortswords' },
                    { value: 'scimitars', label: 'Scimitars' },
                    { value: 'darts', label: 'Darts' },
                    { value: 'slings', label: 'Slings' },
                    { value: 'maces', label: 'Maces' },
                    { value: 'battleaxes', label: 'Battleaxes' },
                    { value: 'flails', label: 'Flails' },
                    { value: 'greataxes', label: 'Greataxes' },
                    { value: 'greatswords', label: 'Greatswords' },
                    { value: 'halberds', label: 'Halberds' },
                    { value: 'lances', label: 'Lances' },
                    { value: 'mauls', label: 'Mauls' },
                    { value: 'morningstars', label: 'Morningstars' },
                    { value: 'lightHammers', label: 'Light Hammers' },
                    { value: 'warhammers', label: 'Warhammers' },
                    { value: 'quarterstaffs', label: 'Quarterstaffs' }
                  ].map(weapon => (
                    <div key={weapon.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`weapon-${weapon.value}`}
                        checked={selectedWeapons.includes(weapon.label)}
                        onCheckedChange={() => toggleWeapon(weapon.label)}
                      />
                      <Label htmlFor={`weapon-${weapon.value}`} className="text-sm font-normal cursor-pointer">
                        {weapon.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedWeapons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedWeapons.map(weapon => (
                      <Badge key={weapon} variant="secondary">
                        {weapon}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tool Proficiency Configuration */}
          {featureType === 'tool_proficiency' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Tool Proficiency Configuration</Label>
              
              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Tool Type</Label>
                  <Select value={toolType} onValueChange={setToolType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (All selected tools)</SelectItem>
                      <SelectItem value="choice">Choice (Player selects from list)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {toolType === 'choice' && (
                  <div className="flex flex-col gap-2">
                    <Label>Max Selections</Label>
                    <Input
                      type="number"
                      value={toolMaxSelections}
                      onChange={(e) => setToolMaxSelections(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-24"
                    />
                  </div>
                )}
              </div>

              {toolType === 'choice' && (  
                  <div className="flex flex-col gap-3">
                    <Label>Available Tool Options</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-background border rounded">
                      {COMMON_TOOLS.map(tool => (
                        <div key={tool} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tool-${tool}`}
                            checked={selectedTools.includes(tool)}
                            onCheckedChange={() => toggleTool(tool)}
                          />
                          <Label htmlFor={`tool-${tool}`} className="text-sm font-normal cursor-pointer">
                            {tool}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Custom tool name"
                        value={customTool}
                        onChange={(e) => setCustomTool(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addCustomTool()
                          }
                        }}
                      />
                      <Button variant="outline" onClick={addCustomTool}>
                        <Icon icon="lucide:plus" className="w-4 h-4" />
                        Add Custom
                      </Button>
                    </div>
                  </div>
              )}

              {toolType === 'fixed' && (
                <div className="flex flex-col gap-3">
                  <Label>Select Tools</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-background border rounded">
                    {COMMON_TOOLS.map(tool => (
                      <div key={tool} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tool-fixed-${tool}`}
                          checked={selectedTools.includes(tool)}
                          onCheckedChange={() => toggleTool(tool)}
                        />
                        <Label htmlFor={`tool-fixed-${tool}`} className="text-sm font-normal cursor-pointer">
                          {tool}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom tool name"
                      value={customTool}
                      onChange={(e) => setCustomTool(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomTool()
                        }
                      }}
                    />
                    <Button variant="outline" onClick={addCustomTool}>
                      <Icon icon="lucide:plus" className="w-4 h-4" />
                      Add Custom
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedTools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTools.map(tool => (
                    <Badge key={tool} variant="secondary" className="flex items-center gap-1">
                      {tool}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeTool(tool)}
                      >
                        <Icon icon="lucide:x" className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Choice Feature Options */}
          {featureType === 'choice' && !showJsonFallback && (
            <div className="flex flex-col gap-3 p-3 bg-card border rounded-lg">
              <div className="flex items-start justify-between">
                <Label className="text-md font-medium">Choice Options</Label>
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  Add Option
                </Button>
              </div>
              
              {choiceOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">No options added yet. Click "Add Option" to create one.</p>
              )}
              
              {choiceOptions.map((option, index) => (
                <div key={index}>
                  {editingOptionIndex === index ? (
                    /* Option Editor - shown in place of the option being edited */
                    <div className="p-3 bg-card border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base font-semibold">
                          Edit Option
                        </Label>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingOption(null); setEditingOptionIndex(null) }}>
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </Button>
                      </div>
                  
                  {editingOption && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Option Type *</Label>
                      <Select
                        value={editingOption.type}
                        onValueChange={(val) => setEditingOption({ 
                          ...editingOption, 
                          type: val as 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell',
                          ...(val === 'skill_proficiency' ? { skill_choice: editingOption.skill_choice || 'fixed' } : {})
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trait">Trait</SelectItem>
                          <SelectItem value="darkvision">Darkvision (Special - for Custom Lineage compatibility)</SelectItem>
                          <SelectItem value="skill_proficiency">Skill Proficiency</SelectItem>
                          <SelectItem value="weapon_proficiency">Weapon Proficiency</SelectItem>
                          <SelectItem value="spell">Spell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Option Name *</Label>
                      <Input
                        value={editingOption.name}
                        onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                        placeholder="e.g., Darkvision, Skill Proficiency"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Description *</Label>
                      <RichTextEditor
                        value={editingOption.description}
                        onChange={(val) => setEditingOption({ ...editingOption, description: val })}
                        placeholder="Option description"
                        rows={3}
                      />
                    </div>
                    
                    {/* Skill Proficiency specific fields */}
                    {editingOption.type === 'skill_proficiency' && (
                      <div className="flex flex-col gap-4 p-3 border rounded-lg">
                        <div className="flex flex-col gap-2">
                          <Label>Skill Choice Type</Label>
                          <Select
                            value={editingOption.skill_choice || 'fixed'}
                            onValueChange={(val) => setEditingOption({ ...editingOption, skill_choice: val as 'fixed' | 'any' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed (specific skills)</SelectItem>
                              <SelectItem value="any">Any skill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {editingOption.skill_choice === 'any' && (
                          <div className="flex flex-col gap-2">
                            <Label>Number of Skills</Label>
                            <Input
                              type="number"
                              value={editingOption.skill_count || 1}
                              onChange={(e) => setEditingOption({ ...editingOption, skill_count: parseInt(e.target.value) || 1 })}
                              min="1"
                              className="w-24"
                            />
                          </div>
                        )}
                        {editingOption.skill_choice === 'fixed' && (
                          <div className="flex flex-col gap-2">
                            <Label>Select Skills</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto p-2 border rounded">
                              {SKILL_OPTIONS.map((skill) => {
                                const selectedSkills = (editingOption as any).skills || []
                                const isSelected = selectedSkills.includes(skill.value)
                                return (
                                  <div key={skill.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`add-option-skill-${skill.value}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const current = ((editingOption as any).skills || []) as string[]
                                        const updated = checked
                                          ? [...current, skill.value]
                                          : current.filter((s) => s !== skill.value)
                                        setEditingOption({ ...(editingOption as any), skills: updated })
                                      }}
                                    />
                                    <Label htmlFor={`add-option-skill-${skill.value}`} className="text-sm cursor-pointer">
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
                    
                    {/* Weapon Proficiency specific fields */}
                    {editingOption.type === 'weapon_proficiency' && (
                      <div className="flex flex-col gap-4 p-3 border rounded-lg">
                        <Label>Weapons & Equipment</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded">
                          {/* Armor and Shields */}
                          {EQUIPMENT_OPTIONS.filter(opt => 
                            ['light_armor', 'medium_armor', 'heavy_armor', 'shields'].includes(opt.value)
                          ).map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`option-weapon-${weapon.value}`} className="text-sm cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                          
                          {/* Weapon Categories */}
                          {EQUIPMENT_OPTIONS.filter(opt => 
                            ['simple_weapons', 'martial_weapons', 'firearms'].includes(opt.value)
                          ).map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`option-weapon-${weapon.value}`} className="text-sm cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                          
                          {/* Specific Weapons (not in EQUIPMENT_OPTIONS) */}
                          {[
                            { value: 'handCrossbows', label: 'Hand Crossbows' },
                            { value: 'longswords', label: 'Longswords' },
                            { value: 'rapiers', label: 'Rapiers' },
                            { value: 'shortswords', label: 'Shortswords' },
                            { value: 'scimitars', label: 'Scimitars' },
                            { value: 'lightCrossbows', label: 'Light Crossbows' },
                            { value: 'darts', label: 'Darts' },
                            { value: 'slings', label: 'Slings' },
                            { value: 'quarterstaffs', label: 'Quarterstaffs' }
                          ].map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`option-weapon-${weapon.value}`} className="text-sm cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trait/Darkvision with speed bonus */}
                    {(editingOption.type === 'trait' || editingOption.type === 'darkvision') && (
                      <div className="flex flex-col gap-2">
                        <Label>Speed Bonus (optional)</Label>
                        <Input
                          type="number"
                          value={editingOption.speed_bonus || ''}
                          onChange={(e) => setEditingOption({ ...editingOption, speed_bonus: parseInt(e.target.value) || undefined })}
                          placeholder="e.g., 5"
                          className="w-32"
                        />
                        {editingOption.type === 'darkvision' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: Darkvision type is used for Custom Lineage compatibility. The name should be "Darkvision" for proper character creation integration.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Spell specific fields */}
                    {editingOption.type === 'spell' && (
                      <div className="flex flex-col gap-4 p-3 border rounded-lg">
                        <div className="flex flex-col gap-2">
                          <Label>Uses Per Long Rest</Label>
                          <Select
                            value={typeof editingOption.uses_per_long_rest === 'string' ? editingOption.uses_per_long_rest : editingOption.uses_per_long_rest?.toString() ?? "0"}
                        onValueChange={(val) => setEditingOption({ ...editingOption, uses_per_long_rest: isNaN(Number.parseInt(val)) ? (val as string) : Number.parseInt(val) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="0" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None (0)</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="prof">Proficiency Bonus</SelectItem>
                              <SelectItem value="str">Strength Modifier</SelectItem>
                              <SelectItem value="dex">Dexterity Modifier</SelectItem>
                              <SelectItem value="con">Constitution Modifier</SelectItem>
                              <SelectItem value="int">Intelligence Modifier</SelectItem>
                              <SelectItem value="wis">Wisdom Modifier</SelectItem>
                              <SelectItem value="cha">Charisma Modifier</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Label>Refueling Die (optional)</Label>
                          <Select
                            value={editingOption.refueling_die || "none"}
                            onValueChange={(val) => setEditingOption({ ...editingOption, refueling_die: val === "none" ? undefined : val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="1d3">1d3</SelectItem>
                              <SelectItem value="1d4">1d4</SelectItem>
                              <SelectItem value="1d6">1d6</SelectItem>
                              <SelectItem value="1d8">1d8</SelectItem>
                              <SelectItem value="1d10">1d10</SelectItem>
                              <SelectItem value="1d12">1d12</SelectItem>
                              <SelectItem value="1d20">1d20</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => { setEditingOption(null); setEditingOptionIndex(null) }}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveOption} disabled={!editingOption.name || !editingOption.description}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                  ) : (
                    /* Option Display */
                    <div className="flex items-start justify-between p-3 border rounded-lg bg-card">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{option.type}</Badge>
                          <span className="font-medium">{option.name}</span>
                        </div>
                        {option.description && (
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        )}
                        {option.type === 'skill_proficiency' && option.skill_choice === 'any' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Skill count: {option.skill_count || 1}
                          </p>
                        )}
                        {option.weapons && option.weapons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {option.weapons.map((weapon, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{weapon}</Badge>
                            ))}
                          </div>
                        )}
                        {option.speed_bonus && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Speed bonus: +{option.speed_bonus} ft
                          </p>
                        )}
                        {option.type === 'spell' && (option.uses_per_long_rest || option.refueling_die) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {option.uses_per_long_rest && (
                              <p>Uses per long rest: {typeof option.uses_per_long_rest === 'string' ? option.uses_per_long_rest : option.uses_per_long_rest}</p>
                            )}
                            {option.refueling_die && (
                              <p>Refueling die: {option.refueling_die}</p>
                            )}
                          </div>
                        )}
                        {option.type === 'darkvision' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Note: Darkvision type for Custom Lineage compatibility
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditOption(index)}>
                          <Icon icon="lucide:edit" className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteOption(index)} className="text-destructive">
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Option Editor - shown at the end when adding a new option */}
              {editingOption && editingOptionIndex === null && (
                <div className="p-3 bg-background border rounded-lg relative flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-md font-medium">
                      Add Option
                    </Label>
                    <Button variant="outline" className="w-8 h-8 absolute top-2 right-2 text-[#ce6565] hover:bg-[#ce6565] hover:text-white" size="sm" onClick={() => { setEditingOption(null); setEditingOptionIndex(null) }}>
                      <Icon icon="lucide:x" className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Option Type *</Label>
                      <Select
                        value={editingOption.type}
                        onValueChange={(val) => setEditingOption({ 
                          ...editingOption, 
                          type: val as 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell',
                          ...(val === 'skill_proficiency' ? { skill_choice: editingOption.skill_choice || 'fixed' } : {})
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trait">Trait</SelectItem>
                          <SelectItem value="darkvision">Darkvision (Special - for Custom Lineage compatibility)</SelectItem>
                          <SelectItem value="skill_proficiency">Skill Proficiency</SelectItem>
                          <SelectItem value="weapon_proficiency">Weapon Proficiency</SelectItem>
                          <SelectItem value="spell">Spell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Option Name *</Label>
                      <Input
                        value={editingOption.name}
                        onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                        placeholder="e.g., Darkvision, Skill Proficiency"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label>Description *</Label>
                      <RichTextEditor
                        value={editingOption.description}
                        onChange={(val) => setEditingOption({ ...editingOption, description: val })}
                        placeholder="Option description"
                        rows={3}
                      />
                    </div>
                    
                    {/* Skill Proficiency specific fields */}
                    {editingOption.type === 'skill_proficiency' && (
                      <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
                        <div className="flex flex-col gap-2">
                          <Label>Skill Choice Type</Label>
                          <Select
                            value={editingOption.skill_choice || 'fixed'}
                            onValueChange={(val) => setEditingOption({ ...editingOption, skill_choice: val as 'fixed' | 'any' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed (specific skills)</SelectItem>
                              <SelectItem value="any">Any skill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {editingOption.skill_choice === 'any' && (
                          <div className="flex flex-col gap-2">
                            <Label>Number of Skills</Label>
                            <Input
                              type="number"
                              value={editingOption.skill_count || 1}
                              onChange={(e) => setEditingOption({ ...editingOption, skill_count: parseInt(e.target.value) || 1 })}
                              min="1"
                              className="w-24"
                            />
                          </div>
                        )}
                        {editingOption.skill_choice === 'fixed' && (
                          <div className="flex flex-col gap-2">
                            <Label>Adds proficiency to the following skills:</Label>
                            <div className="grid grid-cols-2 gap-2 p-2 border rounded">
                              {SKILL_OPTIONS.map((skill) => {
                                const selectedSkills = (editingOption as any).skills || []
                                const isSelected = selectedSkills.includes(skill.value)
                                return (
                                  <div key={skill.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`new-option-skill-${skill.value}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const current = ((editingOption as any).skills || []) as string[]
                                        const updated = checked
                                          ? [...current, skill.value]
                                          : current.filter((s) => s !== skill.value)
                                        setEditingOption({ ...(editingOption as any), skills: updated })
                                      }}
                                    />
                                    <Label htmlFor={`new-option-skill-${skill.value}`} className="text-sm cursor-pointer">
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
                    
                    {/* Weapon Proficiency specific fields */}
                    {editingOption.type === 'weapon_proficiency' && (
                      <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
                        <Label>Weapons & Equipment</Label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-background border rounded">
                          {/* Armor and Shields */}
                          {EQUIPMENT_OPTIONS.filter(opt => 
                            ['light_armor', 'medium_armor', 'heavy_armor', 'shields'].includes(opt.value)
                          ).map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`add-option-weapon-${weapon.value}`} className="text-sm font-normal cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                          
                          {/* Weapon Categories */}
                          {EQUIPMENT_OPTIONS.filter(opt => 
                            ['simple_weapons', 'martial_weapons', 'firearms'].includes(opt.value)
                          ).map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`add-option-weapon-${weapon.value}`} className="text-sm font-normal cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                          
                          {/* Specific Weapons (not in EQUIPMENT_OPTIONS) */}
                          {[
                            { value: 'handCrossbows', label: 'Hand Crossbows' },
                            { value: 'longswords', label: 'Longswords' },
                            { value: 'rapiers', label: 'Rapiers' },
                            { value: 'shortswords', label: 'Shortswords' },
                            { value: 'scimitars', label: 'Scimitars' },
                            { value: 'lightCrossbows', label: 'Light Crossbows' },
                            { value: 'darts', label: 'Darts' },
                            { value: 'slings', label: 'Slings' },
                            { value: 'quarterstaffs', label: 'Quarterstaffs' }
                          ].map(weapon => (
                            <div key={weapon.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-option-weapon-${weapon.value}`}
                                checked={(editingOption.weapons || []).includes(weapon.label)}
                                onCheckedChange={(checked) => {
                                  const currentWeapons = editingOption.weapons || []
                                  const updatedWeapons = checked
                                    ? [...currentWeapons, weapon.label]
                                    : currentWeapons.filter(w => w !== weapon.label)
                                  setEditingOption({ ...editingOption, weapons: updatedWeapons })
                                }}
                              />
                              <Label htmlFor={`add-option-weapon-${weapon.value}`} className="text-sm cursor-pointer">
                                {weapon.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trait/Darkvision with speed bonus */}
                    {(editingOption.type === 'trait' || editingOption.type === 'darkvision') && (
                      <div className="flex flex-col gap-2 p-3 bg-card border rounded-lg">
                        <Label>Speed Bonus (optional)</Label>
                        <Input
                          type="number"
                          value={editingOption.speed_bonus || ''}
                          onChange={(e) => setEditingOption({ ...editingOption, speed_bonus: parseInt(e.target.value) || undefined })}
                          placeholder="e.g., 5"
                          className="w-32"
                        />
                        {editingOption.type === 'darkvision' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: Darkvision type is used for Custom Lineage compatibility. The name should be "Darkvision" for proper character creation integration.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Spell specific fields */}
                    {editingOption.type === 'spell' && (
                      <div className="flex flex-row gap-4 p-3 border rounded-lg bg-card">
                        <div className="flex flex-col gap-2">
                          <Label>Uses Per Long Rest</Label>
                          <Select
                            value={typeof editingOption.uses_per_long_rest === 'string' ? editingOption.uses_per_long_rest : editingOption.uses_per_long_rest?.toString() ?? "0"}
                            onValueChange={(val) => setEditingOption({ ...editingOption, uses_per_long_rest: isNaN(Number.parseInt(val)) ? val : Number.parseInt(val) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="0" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None (0)</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="prof">Proficiency Bonus</SelectItem>
                              <SelectItem value="str">Strength Modifier</SelectItem>
                              <SelectItem value="dex">Dexterity Modifier</SelectItem>
                              <SelectItem value="con">Constitution Modifier</SelectItem>
                              <SelectItem value="int">Intelligence Modifier</SelectItem>
                              <SelectItem value="wis">Wisdom Modifier</SelectItem>
                              <SelectItem value="cha">Charisma Modifier</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Label>Refueling Die (optional)</Label>
                          <Select
                            value={editingOption.refueling_die || "none"}
                            onValueChange={(val) => setEditingOption({ ...editingOption, refueling_die: val === "none" ? undefined : val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="1d3">1d3</SelectItem>
                              <SelectItem value="1d4">1d4</SelectItem>
                              <SelectItem value="1d6">1d6</SelectItem>
                              <SelectItem value="1d8">1d8</SelectItem>
                              <SelectItem value="1d10">1d10</SelectItem>
                              <SelectItem value="1d12">1d12</SelectItem>
                              <SelectItem value="1d20">1d20</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => { setEditingOption(null); setEditingOptionIndex(null) }}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveOption} disabled={!editingOption.name || !editingOption.description}>
                          Add Option
                        </Button>
                      </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Darkvision Configuration */}
          {featureType === 'darkvision' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Darkvision Configuration</Label>
              <div className="flex flex-col gap-2">
                <Label>Range (feet)</Label>
                <Input
                  type="number"
                  value={darkvisionRange}
                  onChange={(e) => setDarkvisionRange(parseInt(e.target.value) || 60)}
                  min="5"
                  step="5"
                  className="w-32"
                  placeholder="60"
                />
                <p className="text-xs text-muted-foreground">Standard darkvision ranges: 60 ft (most races), 120 ft (Drow).</p>
              </div>
            </div>
          )}

          {/* Damage Resistance / Immunity Configuration */}
          {(featureType === 'damage_resistance' || featureType === 'damage_immunity') && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">
                {featureType === 'damage_resistance' ? 'Damage Resistance' : 'Damage Immunity'} Configuration
              </Label>
              <Label className="text-sm">Select damage types:</Label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-background border rounded">
                {DAMAGE_TYPES.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dmg-${type}`}
                      checked={selectedDamageTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        setSelectedDamageTypes(prev =>
                          checked ? [...prev, type] : prev.filter(t => t !== type)
                        )
                      }}
                    />
                    <Label htmlFor={`dmg-${type}`} className="text-sm font-normal cursor-pointer capitalize">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedDamageTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDamageTypes.map(t => (
                    <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Condition Immunity Configuration */}
          {featureType === 'condition_immunity' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Condition Immunity Configuration</Label>
              <Label className="text-sm">Select conditions:</Label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-background border rounded">
                {CONDITION_TYPES.map(cond => (
                  <div key={cond} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cond-${cond}`}
                      checked={selectedConditionTypes.includes(cond)}
                      onCheckedChange={(checked) => {
                        setSelectedConditionTypes(prev =>
                          checked ? [...prev, cond] : prev.filter(c => c !== cond)
                        )
                      }}
                    />
                    <Label htmlFor={`cond-${cond}`} className="text-sm font-normal cursor-pointer capitalize">
                      {cond}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedConditionTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedConditionTypes.map(c => (
                    <Badge key={c} variant="secondary" className="capitalize">{c}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Language Proficiency Configuration */}
          {featureType === 'language_proficiency' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Language Proficiency Configuration</Label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-background border rounded">
                {COMMON_LANGUAGES.map(lang => (
                  <div key={lang} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang}`}
                      checked={selectedLanguages.includes(lang)}
                      onCheckedChange={(checked) => {
                        setSelectedLanguages(prev =>
                          checked ? [...prev, lang] : prev.filter(l => l !== lang)
                        )
                      }}
                    />
                    <Label htmlFor={`lang-${lang}`} className="text-sm font-normal cursor-pointer">
                      {lang}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Custom language"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = customLanguage.trim()
                      if (trimmed && !selectedLanguages.includes(trimmed)) {
                        setSelectedLanguages(prev => [...prev, trimmed])
                        setCustomLanguage("")
                      }
                    }
                  }}
                />
                <Button variant="outline" onClick={() => {
                  const trimmed = customLanguage.trim()
                  if (trimmed && !selectedLanguages.includes(trimmed)) {
                    setSelectedLanguages(prev => [...prev, trimmed])
                    setCustomLanguage("")
                  }
                }}>
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  Add
                </Button>
              </div>
              {selectedLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedLanguages.map(l => (
                    <Badge key={l} variant="secondary" className="flex items-center gap-1">
                      {l}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setSelectedLanguages(prev => prev.filter(x => x !== l))}
                      >
                        <Icon icon="lucide:x" className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Innate Spellcasting Configuration */}
          {featureType === 'innate_spellcasting' && !showJsonFallback && (
            <div className="flex flex-col gap-4 p-3 border rounded-lg bg-card">
              <Label className="text-md font-medium">Innate Spellcasting Configuration</Label>
              <div className="flex flex-col gap-2">
                <Label>Spell Name *</Label>
                <Input
                  value={innateSpellName}
                  onChange={(e) => setInnateSpellName(e.target.value)}
                  placeholder="e.g., Thaumaturgy, Hellish Rebuke"
                />
              </div>
              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Spell Level</Label>
                  <Select
                    value={innateSpellLevel.toString()}
                    onValueChange={(v) => setInnateSpellLevel(parseInt(v))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Cantrip (0)</SelectItem>
                      <SelectItem value="1">1st level</SelectItem>
                      <SelectItem value="2">2nd level</SelectItem>
                      <SelectItem value="3">3rd level</SelectItem>
                      <SelectItem value="4">4th level</SelectItem>
                      <SelectItem value="5">5th level</SelectItem>
                      <SelectItem value="6">6th level</SelectItem>
                      <SelectItem value="7">7th level</SelectItem>
                      <SelectItem value="8">8th level</SelectItem>
                      <SelectItem value="9">9th level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Uses Per Day</Label>
                  <Select
                    value={innateSpellUses.toString()}
                    onValueChange={(v) => setInnateSpellUses(v === 'at_will' ? 'at_will' : parseInt(v))}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="at_will">At will</SelectItem>
                      <SelectItem value="1">1 / day</SelectItem>
                      <SelectItem value="2">2 / day</SelectItem>
                      <SelectItem value="3">3 / day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Casting Ability</Label>
                  <Select
                    value={innateSpellCastingAbility || "none"}
                    onValueChange={(v) => setInnateSpellCastingAbility(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Class default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Class default</SelectItem>
                      <SelectItem value="intelligence">Intelligence</SelectItem>
                      <SelectItem value="wisdom">Wisdom</SelectItem>
                      <SelectItem value="charisma">Charisma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="innate-concentration"
                  checked={innateSpellConcentration}
                  onCheckedChange={(checked) => setInnateSpellConcentration(checked as boolean)}
                />
                <Label htmlFor="innate-concentration" className="text-sm font-normal cursor-pointer">
                  Requires concentration
                </Label>
              </div>
            </div>
          )}

          {/* Regular feature fields (for trait, spell, feat) */}
          {(featureType === 'trait' || featureType === 'spell' || featureType === 'feat') && !showJsonFallback && (
            <div className="flex flex-row gap-4">
              <div className="flex w-full flex-col gap-2">
                <Label>Max uses per long rest</Label>
                <Select
                  value={typeof usesPerLongRest === 'string' ? usesPerLongRest : usesPerLongRest?.toString() ?? "0"}
                  onValueChange={(val) => setUsesPerLongRest(isNaN(Number.parseInt(val)) ? val : Number.parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None (0)</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="prof">Proficiency Bonus</SelectItem>
                    <SelectItem value="str">STR modifier</SelectItem>
                    <SelectItem value="dex">DEX modifier</SelectItem>
                    <SelectItem value="con">CON modifier</SelectItem>
                    <SelectItem value="int">INT modifier</SelectItem>
                    <SelectItem value="wis">WIS modifier</SelectItem>
                    <SelectItem value="cha">CHA modifier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex w-full flex-col gap-2">
                <Label>Refueling die</Label>
                <Select
                  value={refuelingDie || "none"}
                  onValueChange={(val) => setRefuelingDie(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1d3">1d3</SelectItem>
                    <SelectItem value="1d4">1d4</SelectItem>
                    <SelectItem value="1d6">1d6</SelectItem>
                    <SelectItem value="1d8">1d8</SelectItem>
                    <SelectItem value="1d10">1d10</SelectItem>
                    <SelectItem value="1d12">1d12</SelectItem>
                    <SelectItem value="1d20">1d20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* HP Bonus Per Level (for trait, spell, feat) */}
          {(featureType === 'trait') && !showJsonFallback && (
            <div className="flex items-center w-full">
              <Checkbox
                id="hp-bonus-per-level"
                checked={hpBonusPerLevel}
                onCheckedChange={(checked) => setHpBonusPerLevel(checked as boolean)}
              />
              <Label htmlFor="hp-bonus-per-level" className="text-sm font-normal cursor-pointer">
                HP Bonus Per Level (e.g., Dwarven Toughness - adds character level to max HP)
              </Label>
            </div>
          )}

          {/* Passive Bonuses */}
          {!showJsonFallback && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Label className="text-sm font-semibold">Passive Bonuses</Label>
              <p className="text-xs text-muted-foreground">
                AC calculation formulas or skill/tool bonus modifiers applied automatically (e.g., Unarmored Defense, Half-Proficiency).
              </p>
              <PassiveBonusesEditor value={passiveBonuses} onChange={setPassiveBonuses} />
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          {isEditing && (
            <Button variant="outline" onClick={handleDelete} className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white">
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? "Save Changes" : "Add Feature"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

