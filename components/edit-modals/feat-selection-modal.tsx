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
import { loadFeatsWithDetails, loadFeatDetails, loadAllRaces, type FeatData } from "@/lib/database"
import { ProficiencyCheckboxes, SKILL_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import type { CharacterData, FeatSpellSlot, InnateSpell } from "@/lib/character-data"
import { useToast } from "@/hooks/use-toast"
import { calculateUsesFromFormula } from "@/lib/class-feature-templates"

interface FeatSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  onOpenSpellEditor?: () => void
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

// Race families: first member is the parent race (bare name).
// When the parent race is in the prereq array, all family members get
// collapsed into the plural label for display purposes only.
const RACE_FAMILIES = [
  { plural: 'Elves',     members: ['elf', 'high elf', 'wood elf', 'drow', 'dark elf', 'eladrin'] },
  { plural: 'Dwarves',   members: ['dwarf', 'hill dwarf', 'mountain dwarf'] },
  { plural: 'Gnomes',    members: ['gnome', 'forest gnome', 'rock gnome', 'deep gnome'] },
  { plural: 'Halflings', members: ['halfling', 'lightfoot halfling', 'stout halfling'] },
  { plural: 'Humans',    members: ['human', 'variant human'] },
]

function formatRacePrereq(races: string[]): string {
  const lower = races.map(r => r.toLowerCase())
  const usedIndices = new Set<number>()
  const parts: string[] = []

  for (const family of RACE_FAMILIES) {
    const parentIdx = lower.indexOf(family.members[0])
    if (parentIdx !== -1) {
      // Parent race present — collapse all matching family members
      lower.forEach((r, i) => { if (family.members.includes(r)) usedIndices.add(i) })
      parts.push(family.plural)
    }
  }

  races.forEach((r, i) => { if (!usedIndices.has(i)) parts.push(r) })
  return parts.join(' or ')
}

interface Prerequisites {
  min_level?: number | null
  ability_scores?: Partial<Record<'strength'|'dexterity'|'constitution'|'intelligence'|'wisdom'|'charisma', number>>
  spellcasting?: boolean
  proficiency?: string[]
  race?: string[]
  other?: string
}

interface PrereqCheck {
  label: string
  met: boolean | null // null = unknown/gray
}

function checkPrerequisites(prereqs: Prerequisites, character: CharacterData, mainRaceName?: string): PrereqCheck[] {
  const checks: PrereqCheck[] = []

  if (prereqs.min_level && prereqs.min_level > 0) {
    const charLevel = character.level || 1
    checks.push({
      label: `Lv \u2265 ${prereqs.min_level}`,
      met: charLevel >= prereqs.min_level
    })
  }

  if (prereqs.ability_scores) {
    const abilityLabels: Record<string, string> = {
      strength: 'STR', dexterity: 'DEX', constitution: 'CON',
      intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA'
    }
    for (const [ability, minScore] of Object.entries(prereqs.ability_scores)) {
      if (minScore && minScore > 0) {
        const charScore = (character as any)[ability] ?? 0
        checks.push({
          label: `${abilityLabels[ability] || ability} \u2265 ${minScore}`,
          met: charScore >= minScore
        })
      }
    }
  }

  if (prereqs.spellcasting) {
    const hasSpellcasting = character.classes?.some(
      (c: any) => c.classData?.spellcasting_ability
    ) ?? false
    checks.push({
      label: 'Spellcasting',
      met: hasSpellcasting
    })
  }

  if (prereqs.proficiency && prereqs.proficiency.length > 0) {
    const equipProfs = character.equipmentProficiencies || {} as any
    // Build a lookup of known proficiency keys (lowercase, no spaces)
    const profLookup = new Map<string, boolean>()
    for (const [key, val] of Object.entries(equipProfs)) {
      profLookup.set(key.toLowerCase(), !!val)
      // Also add human-readable versions: "lightArmor" -> "light armor"
      const humanKey = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
      profLookup.set(humanKey, !!val)
    }

    for (const prof of prereqs.proficiency) {
      const normalizedProf = prof.toLowerCase().trim()
      // Try exact match, then without spaces
      const noSpaces = normalizedProf.replace(/\s+/g, '')
      if (profLookup.has(normalizedProf)) {
        checks.push({ label: prof, met: profLookup.get(normalizedProf)! })
      } else if (profLookup.has(noSpaces)) {
        checks.push({ label: prof, met: profLookup.get(noSpaces)! })
      } else {
        checks.push({ label: prof, met: null }) // unknown
      }
    }
  }

  if (prereqs.race && prereqs.race.length > 0) {
    const raceName = mainRaceName || ''
    const met = raceName
      ? prereqs.race.some(r => r.toLowerCase() === raceName.toLowerCase())
      : null
    checks.push({ label: `Race: ${formatRacePrereq(prereqs.race)}`, met })
  }

  if (prereqs.other) {
    checks.push({ label: prereqs.other, met: null })
  }

  return checks
}

interface SpellLibraryEntry {
  id: string
  name: string
  level: number
  school: string
  classes: string[]
}

// spellChoices key: `${featureIndex}-${spellIndex}` → chosen spell name
type SpellChoices = Record<string, string>

export function FeatSelectionModal({ isOpen, onClose, character, onSave, onOpenSpellEditor }: FeatSelectionModalProps) {
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

  // Spell choices for spell_grant features
  const [spellChoices, setSpellChoices] = useState<SpellChoices>({})
  const [spellLibrary, setSpellLibrary] = useState<SpellLibraryEntry[]>([])
  const [spellSearchQuery, setSpellSearchQuery] = useState<Record<string, string>>({})
  const [featSearchQuery, setFeatSearchQuery] = useState('')
  const [racesMap, setRacesMap] = useState<Record<string, string>>({}) // id -> name

  const { toast } = useToast()

  // Load feats + spell library when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadFeatsWithDetails().then(({ feats, error }) => {
        if (error) {
          console.error("Error loading feats:", error)
          toast({ title: "Error", description: "Failed to load feats", variant: "destructive" })
        } else if (feats) {
          setFeats(feats)
        }
        setLoading(false)
      })
      // Fetch spell library for spell_grant choices
      if (spellLibrary.length === 0) {
        fetch('/api/spells')
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setSpellLibrary(data) })
          .catch(() => {})
      }
      // Fetch races for prerequisite name resolution
      if (Object.keys(racesMap).length === 0) {
        loadAllRaces().then(({ races }) => {
          if (races) {
            const map: Record<string, string> = {}
            races.forEach(r => { map[r.id] = r.name })
            setRacesMap(map)
          }
        })
      }
    } else {
      // Reset state when modal closes
      setSelectedFeatId(null)
      setSelectedFeatData(null)
      setStep('select')
      setAbilityChoices([])
      setSkillChoices([])
      setToolChoices([])
      setLanguageChoices([])
      setSpellChoices({})
      setSpellSearchQuery({})
      setFeatSearchQuery('')
    }
  }, [isOpen, toast]) // eslint-disable-line react-hooks/exhaustive-deps

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
      languageChoices,
      spellChoices,
    })

    onSave(updates)
    toast({ title: "Feat Added", description: `Feat "${selectedFeatData.name}" added successfully` })
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

    // Validate spell choices for spell_grant features
    if (selectedFeatData.special_features) {
      for (let fi = 0; fi < selectedFeatData.special_features.length; fi++) {
        const feature = selectedFeatData.special_features[fi]
        if (feature.featureType !== 'spell_grant') continue
        const spells = feature.spells || []
        for (let si = 0; si < spells.length; si++) {
          const spell = spells[si]
          const isChoice = spell.mode === 'choice' || (!spell.mode && spell.fixed === false)
          if (isChoice) {
            const key = `${fi}-${si}`
            if (!spellChoices[key] || spellChoices[key].trim() === '') {
              toast({
                title: "Validation Error",
                description: `Please choose a spell for "${spell.placeholderName || `Spell ${si + 1}`}" in "${feature.title}"`,
                variant: "destructive"
              })
              return false
            }
          }
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
    spellChoices: SpellChoices
  }): Partial<CharacterData> => {
    const updates: Partial<CharacterData> = {}

    // 1. Add feat to feats list (with metadata for tracking)
    const newFeat = {
      name: feat.name,
      description: feat.description || '',
      featId: feat.id,
      passiveBonuses: feat.passive_bonuses ?? null,
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
      const currentEquipment = character.equipmentProficiencies || {} as any
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
      const currentEquipment = updates.equipmentProficiencies || character.equipmentProficiencies || {} as any
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

      feat.special_features.forEach((feature: any, featureIndex: number) => {
        if (feature.featureType === 'spell_grant') {
          // Each granted spell routes to innateSpells (cantrips) or classFeatureSkillsUsage (limited-use)
          ;(feature.spells || []).forEach((spell: any, spellIndex: number) => {
            const isChoice = spell.mode === 'choice' || (!spell.mode && spell.fixed === false)
            const choiceKey = `${featureIndex}-${spellIndex}`
            const spellName = isChoice
              ? (choices.spellChoices[choiceKey] || spell.placeholderName || spell.hint || 'Chosen Spell')
              : (spell.name || spell.customName || 'Unknown Spell')
            const spellLevel = spell.level ?? 0
            const isCantrip = spellLevel === 0

            if (isCantrip) {
              // Cantrips are at-will — add to innateSpells
              const baseInnate: InnateSpell[] = (updates as any).innateSpells ?? [...(character.innateSpells ?? [])]
              ;(updates as any).innateSpells = [
                ...baseInnate,
                {
                  name: spellName,
                  spellLevel: 0,
                  usesPerDay: 'at_will' as const,
                  source: 'feat' as const,
                  sourceName: feat.name,
                  castingAbility: feature.castingAbility,
                },
              ]
            } else {
              // Limited-use spell — add to classFeatureSkillsUsage with isFeatFeature
              const maxUses = spell.usesPerLongRest ?? feature.usesPerLongRest ?? 1
              const featureId = `feat-${feat.id}-spell-${featureIndex}-${spellIndex}-${Date.now() + spellIndex}`
              newFeatureUsage[featureId] = {
                featureName: spellName,
                featureType: 'slots',
                currentUses: maxUses,
                maxUses,
                lastReset: new Date().toISOString(),
                config: {
                  usesFormula: String(maxUses),
                },
                featSource: feat.name,
                category: 'spell',
                isFeatFeature: true,
              }
            }
          })
          return // no entry added to features list for spell_grant
        } else if (feature.featureType === 'trait') {
          // Simple trait - just add to features
          newFeatures.push({
            name: feature.title,
            description: feature.description || ''
          })
        } else {
          // Complex tracked feature — route by category
          const featureId = feature.id || `feat-${feat.id}-${feature.title}-${Date.now()}`
          const category = feature.category ?? 'combat'

          if (category === 'trait') {
            // Render in Features & Traits — add to character.features only
            let usesPerLongRest: number | string | undefined = undefined
            let currentUses = 0
            if (feature.featureType === 'slots') {
              const usesFormula = feature.config?.usesFormula || '1'
              usesPerLongRest = usesFormula
              currentUses = calculateUsesFromFormula(usesFormula, character)
            } else if (feature.featureType === 'points_pool') {
              const totalFormula = feature.config?.totalFormula || '1'
              usesPerLongRest = totalFormula
              currentUses = calculateUsesFromFormula(totalFormula, character)
            } else if (feature.featureType === 'availability_toggle') {
              usesPerLongRest = 1
              currentUses = feature.config?.defaultAvailable !== false ? 1 : 0
            }
            newFeatures.push({
              name: feature.title,
              description: feature.description || '',
              usesPerLongRest,
              currentUses,
            })
          } else {
            // Render in Spellcasting (combat or spell section) — add to classFeatureSkillsUsage only
            if (feature.featureType === 'slots') {
              const usesFormula = feature.config?.usesFormula || '1'
              const maxUses = calculateUsesFromFormula(usesFormula, character)
              newFeatureUsage[featureId] = {
                featureName: feature.title,
                featureType: 'slots',
                currentUses: maxUses,
                maxUses,
                lastReset: new Date().toISOString(),
                config: feature.config,
                featSource: feat.name,
                category,
                isFeatFeature: true,
              }
            } else if (feature.featureType === 'points_pool') {
              const totalFormula = feature.config?.totalFormula || '1'
              const maxPoints = calculateUsesFromFormula(totalFormula, character)
              newFeatureUsage[featureId] = {
                featureName: feature.title,
                featureType: 'points_pool',
                currentPoints: maxPoints,
                maxPoints,
                lastReset: new Date().toISOString(),
                config: feature.config,
                featSource: feat.name,
                category,
                isFeatFeature: true,
              }
            } else if (feature.featureType === 'availability_toggle') {
              newFeatureUsage[featureId] = {
                featureName: feature.title,
                featureType: 'availability_toggle',
                isAvailable: feature.config?.defaultAvailable ?? true,
                lastReset: new Date().toISOString(),
                config: feature.config,
                featSource: feat.name,
                category,
                isFeatFeature: true,
              }
            }
          }
        }
      })

      updates.features = [...currentFeatures, ...newFeatures]
      updates.classFeatureSkillsUsage = newFeatureUsage
    }

    return updates
  }

  if (step === 'select') {
    const hasAbilityModifiers = (val: any) => val && (!Array.isArray(val) || val.length > 0)
    const displayedFeats = feats.filter(feat =>
      !featSearchQuery || feat.name.toLowerCase().includes(featSearchQuery.toLowerCase())
    )
    const mainRaceId = character.raceIds?.find(r => r.isMain)?.id ?? character.raceIds?.[0]?.id
    const mainRaceName = mainRaceId ? (racesMap[mainRaceId] ?? character.race) : character.race

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Select Feat from Library</DialogTitle>
            <div className="relative mt-2">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search feats..."
                value={featSearchQuery}
                onChange={(e) => setFeatSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </DialogHeader>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading feats...</span>
              </div>
            ) : (
              <div className="grid gap-3">
                {displayedFeats.map((feat) => {
                  const prereqs = feat.prerequisites as Prerequisites | null | undefined
                  const prereqChecks = prereqs ? checkPrerequisites(prereqs, character, mainRaceName) : []
                  const hasFailedCheck = prereqChecks.some(c => c.met === false)
                  const alreadyOwned = (character.feats || []).some(
                    (f: any) => f.featId === feat.id || f.name === feat.name
                  )
                  const isDisabled = hasFailedCheck || alreadyOwned
                  const hasBadges =
                    alreadyOwned ||
                    prereqChecks.length > 0 ||
                    hasAbilityModifiers(feat.ability_modifiers) ||
                    hasAbilityModifiers(feat.skill_proficiencies) ||
                    hasAbilityModifiers(feat.tool_proficiencies) ||
                    (feat.special_features && feat.special_features.length > 0)

                  return (
                  <div
                    key={feat.id}
                    className={`p-3 border rounded-lg transition-colors relative ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-card'
                    }`}
                    onClick={() => !isDisabled && handleFeatSelect(feat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                          {feat.name}
                        </div>
                        {feat.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            <RichTextDisplay content={feat.description} />
                          </div>
                        )}
                        {hasBadges && (
                          <div className="flex flex-wrap gap-2 pt-3 border-t">
                            {alreadyOwned && (
                              <Badge variant="outline" size="xs" className="bg-transparent text-[#6a8bc0] border-[#6a8bc0]">
                                Achieved
                              </Badge>
                            )}
                            {prereqChecks.length > 0 && (
                              <>
                                {prereqChecks.map((check, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    size="xs"
                                    className={`bg-transparent ${
                                      check.met === true
                                        ? 'text-[#6ab08b] border-[#6ab08b]'
                                        : check.met === false
                                        ? 'text-[#ce6565] border-[#ce6565]'
                                        : 'text-[#b0986a] border-[#b0986a]'
                                    }`}
                                  >
                                    {check.label}
                                    {check.met === true && ' \u2713'}
                                    {check.met === false && ' \u2717'}
                                  </Badge>
                                ))}
                              </>
                            )}
                            {hasAbilityModifiers(feat.ability_modifiers) && (
                              <Badge variant="outline" size="xs" className="text-xs">
                                Ability Modifiers
                              </Badge>
                            )}
                            {hasAbilityModifiers(feat.skill_proficiencies) && (
                              <Badge variant="outline" size="xs" className="text-xs">
                                Skills
                              </Badge>
                            )}
                            {hasAbilityModifiers(feat.tool_proficiencies) && (
                              <Badge variant="outline" size="xs" className="text-xs">
                                Tools
                              </Badge>
                            )}
                            {feat.special_features && feat.special_features.length > 0 && (
                              <Badge variant="outline" size="xs" className="text-xs">
                                {feat.special_features.length} Feature(s)
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Icon icon="lucide:chevron-right" className="w-5 h-5 absolute right-3 top-3" />
                    </div>
                  </div>
                  )
                })}
                {displayedFeats.length === 0 && feats.length > 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No feats match your search
                  </div>
                )}
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

          {/* Spell Choices (spell_grant features with player choice spells) */}
          {(selectedFeatData.special_features ?? []).some(
            (f: any) => f.featureType === 'spell_grant' &&
              (f.spells ?? []).some((s: any) => s.mode === 'choice' || (!s.mode && s.fixed === false))
          ) && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Spell Choices</Label>
              {(selectedFeatData.special_features ?? []).map((feature: any, fi: number) => {
                if (feature.featureType !== 'spell_grant') return null
                const choiceSpells = (feature.spells ?? []).filter(
                  (s: any) => s.mode === 'choice' || (!s.mode && s.fixed === false)
                )
                if (choiceSpells.length === 0) return null

                return (
                  <div key={fi} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">{feature.title}</p>
                    {(feature.spells ?? []).map((spell: any, si: number) => {
                      const isChoice = spell.mode === 'choice' || (!spell.mode && spell.fixed === false)
                      if (!isChoice) return null
                      const key = `${fi}-${si}`
                      const criteria = spell.criteria || {}
                      const label = spell.placeholderName || `Spell ${si + 1}`

                      // Filter spell library by criteria
                      const filtered = spellLibrary.filter(lib => {
                        if (criteria.maxLevel !== undefined && lib.level > criteria.maxLevel) return false
                        if (criteria.school && lib.school.toLowerCase() !== criteria.school.toLowerCase()) return false
                        if (criteria.classes && criteria.classes.length > 0) {
                          const hasClass = lib.classes.some((c: string) =>
                            criteria.classes.some((cc: string) => c.toLowerCase() === cc.toLowerCase())
                          )
                          if (!hasClass) return false
                        }
                        return true
                      })

                      const query = spellSearchQuery[key] || ''
                      const shown = query.length >= 1
                        ? filtered.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
                        : []

                      return (
                        <div key={si} className="space-y-1">
                          <Label className="text-sm text-muted-foreground">
                            {label}
                            {criteria.maxLevel !== undefined && ` (up to level ${criteria.maxLevel})`}
                            {criteria.school && ` · ${criteria.school}`}
                            {criteria.classes?.length > 0 && ` · ${criteria.classes.join('/')}`}
                          </Label>
                          <div className="relative">
                            <Input
                              value={spellChoices[key]
                                ? spellChoices[key]
                                : spellSearchQuery[key] || ''}
                              placeholder={spellChoices[key] ? spellChoices[key] : `Search ${label}…`}
                              onChange={(e) => {
                                setSpellChoices(prev => { const n = { ...prev }; delete n[key]; return n })
                                setSpellSearchQuery(prev => ({ ...prev, [key]: e.target.value }))
                              }}
                              className="h-9 text-sm"
                            />
                            {!spellChoices[key] && shown.length > 0 && (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
                                {shown.map(s => (
                                  <div
                                    key={s.id}
                                    className="px-3 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-center justify-between"
                                    onClick={() => {
                                      setSpellChoices(prev => ({ ...prev, [key]: s.name }))
                                      setSpellSearchQuery(prev => ({ ...prev, [key]: '' }))
                                    }}
                                  >
                                    <span>{s.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      Lv {s.level} · {s.school}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {spellChoices[key] && (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">{spellChoices[key]}</Badge>
                              <button
                                type="button"
                                onClick={() => setSpellChoices(prev => { const n = { ...prev }; delete n[key]; return n })}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Icon icon="lucide:x" className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
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

