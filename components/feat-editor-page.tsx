"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { PassiveBonusesEditor } from "@/components/ui/passive-bonuses-editor"
import { PrerequisitesEditor } from "@/components/ui/prerequisites-editor"
import type { FeatData } from "@/lib/database"
import type { PassiveBonuses } from "@/lib/class-feature-types"
import { useToast } from "@/hooks/use-toast"
import { ProficiencyCheckboxes, SKILL_OPTIONS, EQUIPMENT_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface FeatEditorPageProps {
  featData: FeatData
  canEdit?: boolean
  onSave: (featData: Partial<FeatData>) => void
  onCancel: () => void
  onDelete: (featId: string) => void
}

// Tool options for tool proficiencies
const TOOL_OPTIONS = [
  { value: 'thieves_tools', label: 'Thieves\' Tools', description: 'Lockpicks, trap disarming' },
  { value: 'artisans_tools', label: 'Artisan\'s Tools', description: 'Smith\'s tools, brewer\'s supplies' },
  { value: 'tinkers_tools', label: 'Tinker\'s Tools', description: 'Clockwork, mechanical devices' },
  { value: 'alchemists_supplies', label: 'Alchemist\'s Supplies', description: 'Potions, chemical compounds' },
  { value: 'herbalism_kit', label: 'Herbalism Kit', description: 'Healing herbs, natural remedies' },
  { value: 'poisoners_kit', label: 'Poisoner\'s Kit', description: 'Poisons, toxins' },
  { value: 'disguise_kit', label: 'Disguise Kit', description: 'Costumes, makeup, false identities' },
  { value: 'forgery_kit', label: 'Forgery Kit', description: 'Fake documents, signatures' },
  { value: 'navigators_tools', label: 'Navigator\'s Tools', description: 'Maps, compasses, sextants' },
  { value: 'musical_instruments', label: 'Musical Instruments', description: 'Lute, flute, drums, etc.' },
  { value: 'gaming_set', label: 'Gaming Set', description: 'Dice, cards, board games' },
  { value: 'vehicles_land', label: 'Vehicles (Land)', description: 'Carts, wagons, chariots' },
  { value: 'vehicles_water', label: 'Vehicles (Water)', description: 'Ships, boats' }
]

const ABILITY_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'dexterity', label: 'Dexterity' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'charisma', label: 'Charisma' }
]

// Weapon options for weapon proficiencies
const WEAPON_OPTIONS = [
  // Weapon Categories (from EQUIPMENT_OPTIONS)
  { value: 'simple_weapons', label: 'Simple Weapons', category: 'category' },
  { value: 'martial_weapons', label: 'Martial Weapons', category: 'category' },
  { value: 'firearms', label: 'Firearms', category: 'category' },
  // Specific Weapons
  { value: 'handCrossbows', label: 'Hand Crossbows', category: 'weapon' },
  { value: 'longswords', label: 'Longswords', category: 'weapon' },
  { value: 'rapiers', label: 'Rapiers', category: 'weapon' },
  { value: 'shortswords', label: 'Shortswords', category: 'weapon' },
  { value: 'scimitars', label: 'Scimitars', category: 'weapon' },
  { value: 'lightCrossbows', label: 'Light Crossbows', category: 'weapon' },
  { value: 'longbows', label: 'Longbows', category: 'weapon' },
  { value: 'shortbows', label: 'Shortbows', category: 'weapon' },
  { value: 'darts', label: 'Darts', category: 'weapon' },
  { value: 'slings', label: 'Slings', category: 'weapon' },
  { value: 'maces', label: 'Maces', category: 'weapon' },
  { value: 'battleaxes', label: 'Battleaxes', category: 'weapon' },
  { value: 'flails', label: 'Flails', category: 'weapon' },
  { value: 'greataxes', label: 'Greataxes', category: 'weapon' },
  { value: 'greatswords', label: 'Greatswords', category: 'weapon' },
  { value: 'halberds', label: 'Halberds', category: 'weapon' },
  { value: 'lances', label: 'Lances', category: 'weapon' },
  { value: 'mauls', label: 'Mauls', category: 'weapon' },
  { value: 'morningstars', label: 'Morningstars', category: 'weapon' },
  { value: 'lightHammers', label: 'Light Hammers', category: 'weapon' },
  { value: 'warhammers', label: 'Warhammers', category: 'weapon' },
  { value: 'quarterstaffs', label: 'Quarterstaffs', category: 'weapon' }
]

// ── Spell Grant ────────────────────────────────────────────────────────────

const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]
const SPELL_CLASSES = [
  'Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin',
  'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
]

interface SpellLibraryEntry {
  id: string
  name: string
  level: number
  school: string
  classes: string[]
}

interface GrantedSpell {
  id: string
  mode: 'library' | 'choice' | 'custom'
  // library
  spellId?: string
  name?: string
  spellLevel?: number
  // choice
  criteria?: { maxLevel?: number; school?: string; classes?: string[] }
  placeholderName?: string
  // custom
  customName?: string
  customLevel?: number
  // per-spell casting config
  usesPerLongRest: number
  resetOn: 'long_rest' | 'short_rest' | 'dawn' | 'at_will'
}

interface SpellGrantEntryProps {
  spell: GrantedSpell
  spellLibrary: SpellLibraryEntry[]
  canEdit: boolean
  onUpdate: (updated: GrantedSpell) => void
  onRemove: () => void
}

function SpellGrantEntry({ spell, spellLibrary, canEdit, onUpdate, onRemove }: SpellGrantEntryProps) {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = search.length >= 2
    ? spellLibrary.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12)
    : []

  return (
    <div className="p-3 border rounded-lg bg-background space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {/* Row 1: mode + uses + reset */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Spell Mode</Label>
              <Select
                value={spell.mode || 'library'}
                onValueChange={v => onUpdate({ ...spell, mode: v as GrantedSpell['mode'] })}
                disabled={!canEdit}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="library">Library Spell</SelectItem>
                  <SelectItem value="choice">Player's Choice</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Uses</Label>
              <Input
                type="number"
                value={spell.usesPerLongRest ?? 1}
                onChange={e => onUpdate({ ...spell, usesPerLongRest: Math.max(0, parseInt(e.target.value) || 1) })}
                className="text-xs h-8"
                min="0"
                disabled={!canEdit}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Resets On</Label>
              <Select
                value={spell.resetOn || 'long_rest'}
                onValueChange={v => onUpdate({ ...spell, resetOn: v as GrantedSpell['resetOn'] })}
                disabled={!canEdit}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long_rest">Long Rest</SelectItem>
                  <SelectItem value="short_rest">Short Rest</SelectItem>
                  <SelectItem value="dawn">Dawn</SelectItem>
                  <SelectItem value="at_will">At Will</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: spell-specific fields */}
          {spell.mode === 'library' && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Spell from Library</Label>
              <div className="relative">
                <Input
                  value={search || (spell.name ? '' : '')}
                  placeholder={spell.name ? spell.name : 'Search spell library…'}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  className="text-xs h-8"
                  disabled={!canEdit}
                />
                {showDropdown && filtered.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
                    {filtered.map(s => (
                      <div
                        key={s.id}
                        className="px-3 py-1.5 text-xs hover:bg-accent cursor-pointer flex items-center justify-between"
                        onMouseDown={() => {
                          onUpdate({ ...spell, name: s.name, spellId: s.id, spellLevel: s.level })
                          setSearch('')
                          setShowDropdown(false)
                        }}
                      >
                        <span>{s.name}</span>
                        <span className="text-muted-foreground ml-2">Lv {s.level} · {s.school}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {spell.name && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {spell.name}
                    {spell.spellLevel !== undefined && ` (Lv ${spell.spellLevel})`}
                  </Badge>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...spell, name: undefined, spellId: undefined, spellLevel: undefined })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon icon="lucide:x" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {spell.mode === 'choice' && (
            <div className="space-y-2 p-2 border rounded bg-muted/30">
              <Label className="text-xs font-medium">Player Choice Criteria</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Max Spell Level</Label>
                  <Input
                    type="number"
                    value={spell.criteria?.maxLevel ?? ''}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      onUpdate({ ...spell, criteria: { ...(spell.criteria || {}), maxLevel: isNaN(val) ? undefined : val } })
                    }}
                    placeholder="Any"
                    className="text-xs h-7"
                    min="0"
                    max="9"
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">School</Label>
                  <Select
                    value={spell.criteria?.school || 'any'}
                    onValueChange={v => onUpdate({ ...spell, criteria: { ...(spell.criteria || {}), school: v === 'any' ? undefined : v } })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="text-xs h-7">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any School</SelectItem>
                      {SPELL_SCHOOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input
                    value={spell.placeholderName || ''}
                    onChange={e => onUpdate({ ...spell, placeholderName: e.target.value })}
                    placeholder="e.g. 1st-level spell"
                    className="text-xs h-7"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Limit to Classes (optional)</Label>
                <div className="flex flex-wrap gap-1">
                  {SPELL_CLASSES.map(cls => {
                    const selected = (spell.criteria?.classes || []).includes(cls)
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          if (!canEdit) return
                          const current = spell.criteria?.classes || []
                          const updated = selected
                            ? current.filter((c: string) => c !== cls)
                            : [...current, cls]
                          onUpdate({ ...spell, criteria: { ...(spell.criteria || {}), classes: updated.length > 0 ? updated : undefined } })
                        }}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-accent'
                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {cls}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {spell.mode === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spell Name</Label>
                <Input
                  value={spell.customName || ''}
                  onChange={e => onUpdate({ ...spell, customName: e.target.value, name: e.target.value })}
                  placeholder="e.g. Silvery Barbs"
                  className="text-xs h-8"
                  disabled={!canEdit}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spell Level</Label>
                <Input
                  type="number"
                  value={spell.customLevel ?? 0}
                  onChange={e => onUpdate({ ...spell, customLevel: parseInt(e.target.value) || 0 })}
                  className="text-xs h-8"
                  min="0"
                  max="9"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 self-start mt-5"
          >
            <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────

export function FeatEditorPage({
  featData,
  canEdit = true,
  onSave,
  onCancel,
  onDelete
}: FeatEditorPageProps) {
  const [editingFeat, setEditingFeat] = useState<FeatData>(featData)
  const [isSaving, setIsSaving] = useState(false)
  const [spellLibrary, setSpellLibrary] = useState<SpellLibraryEntry[]>([])
  const { toast } = useToast()

  // Update local state when featData prop changes
  useEffect(() => {
    setEditingFeat(featData)
  }, [featData])

  // Load spell library once for the spell_grant feature editor
  useEffect(() => {
    fetch('/api/spells')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSpellLibrary(data) })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate required fields
      if (!editingFeat.name || editingFeat.name.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Feat name is required",
          variant: "destructive"
        })
        return
      }

      // Prepare the data for saving
      const featDataToSave = {
        ...editingFeat,
        name: editingFeat.name.trim(),
        ...(editingFeat.id && editingFeat.id.trim() !== '' ? { id: editingFeat.id } : {}),
      }
      
      await onSave(featDataToSave)
      toast({
        title: "Success",
        description: "Feat saved successfully"
      })
    } catch (error) {
      console.error('Error saving feat:', error)
      toast({
        title: "Error",
        description: "Failed to save feat",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (editingFeat.id && editingFeat.id.trim() !== '') {
      if (confirm(`Are you sure you want to delete "${editingFeat.name}"? This action cannot be undone.`)) {
        onDelete(editingFeat.id)
      }
    }
  }

  // Ability modifiers handling
  const abilityModifiersType = (() => {
    if (!editingFeat.ability_modifiers) return "none"
    if (Array.isArray(editingFeat.ability_modifiers)) return "array"
    if (editingFeat.ability_modifiers.type === 'choice') return "choice"
    if (editingFeat.ability_modifiers.type === 'custom') return "custom"
    if (editingFeat.ability_modifiers.type === 'fixed_multi') return "fixed_multi"
    return "none"
  })()

  const handleAbilityModifiersTypeChange = (type: string) => {
    if (type === "none") {
      setEditingFeat(prev => ({ ...prev, ability_modifiers: null }))
    } else if (type === "array") {
      setEditingFeat(prev => ({ ...prev, ability_modifiers: [] }))
    } else if (type === "choice") {
      setEditingFeat(prev => ({ 
        ...prev, 
        ability_modifiers: { 
          type: 'choice', 
          choices: { count: 2, increase: 1, description: '', max_score: 20, available_abilities: undefined } 
        } 
      }))
    } else if (type === "custom") {
      setEditingFeat(prev => ({ 
        ...prev, 
        ability_modifiers: { type: 'custom', fixed: null, choices: null } 
      }))
    } else if (type === "fixed_multi") {
      setEditingFeat(prev => ({ 
        ...prev, 
        ability_modifiers: { 
          type: 'fixed_multi',
          abilities: {
            strength: 0,
            dexterity: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0
          }
        } 
      }))
    }
  }

  // Languages handling - same as backgrounds
  const languagesData = (() => {
    if (Array.isArray(editingFeat.languages)) {
      return { fixed: editingFeat.languages, choice: undefined }
    }
    if (editingFeat.languages && typeof editingFeat.languages === 'object' && !Array.isArray(editingFeat.languages)) {
      const langsObj = editingFeat.languages as any
      return {
        fixed: langsObj.fixed || [],
        choice: langsObj.choice || undefined
      }
    }
    return { fixed: [], choice: undefined }
  })()

  const languages = languagesData.fixed || []
  const hasLanguagesChoice = !!languagesData.choice

  const addLanguage = () => {
    setEditingFeat(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: [...languages, ""], choice: languagesData.choice }
        : [...languages, ""]
    }))
  }

  const updateLanguage = (index: number, value: string) => {
    const updated = [...languages]
    updated[index] = value
    
    setEditingFeat(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: updated, choice: languagesData.choice }
        : updated
    }))
  }

  const removeLanguage = (index: number) => {
    const updated = languages.filter((_: string, i: number) => i !== index)
    
    setEditingFeat(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: updated, choice: languagesData.choice }
        : updated.length === 0 ? null : updated
    }))
  }

  const handleLanguagesChoiceToggle = (enabled: boolean) => {
    setEditingFeat(prev => {
      if (enabled) {
        let currentFixed: string[] = []
        if (Array.isArray(prev.languages)) {
          currentFixed = prev.languages
        } else if (prev.languages && typeof prev.languages === 'object' && !Array.isArray(prev.languages)) {
          currentFixed = (prev.languages as any).fixed || []
        }
        
        return {
          ...prev,
          languages: {
            fixed: currentFixed,
            choice: { count: 1 }
          }
        }
      } else {
        let currentFixed: string[] = []
        if (Array.isArray(prev.languages)) {
          currentFixed = prev.languages
        } else if (prev.languages && typeof prev.languages === 'object' && !Array.isArray(prev.languages)) {
          currentFixed = (prev.languages as any).fixed || []
        }
        
        return {
          ...prev,
          languages: currentFixed.length > 0 ? currentFixed : null
        }
      }
    })
  }

  const updateLanguagesChoiceCount = (count: number) => {
    setEditingFeat(prev => {
      let currentFixed: string[] = []
      if (Array.isArray(prev.languages)) {
        currentFixed = prev.languages
      } else if (prev.languages && typeof prev.languages === 'object' && !Array.isArray(prev.languages)) {
        currentFixed = (prev.languages as any).fixed || []
      }
      
      return {
        ...prev,
        languages: {
          fixed: currentFixed,
          choice: {
            count: Math.max(1, count)
          }
        }
      }
    })
  }

  // Tool proficiencies handling - same as backgrounds
  const toolsData = (() => {
    if (Array.isArray(editingFeat.tool_proficiencies)) {
      return { fixed: editingFeat.tool_proficiencies, choice: undefined, available: [] }
    }
    if (editingFeat.tool_proficiencies && typeof editingFeat.tool_proficiencies === 'object' && !Array.isArray(editingFeat.tool_proficiencies)) {
      const toolsObj = editingFeat.tool_proficiencies as any
      const fixed = toolsObj.fixed || []
      const available = toolsObj.available || []
      const choice = toolsObj.choice || undefined
      
      if (choice && choice.from_selected && available.length === 0 && fixed.length > 0) {
        return {
          fixed: [],
          available: fixed,
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

  const tools = toolsData.fixed || []
  const availableTools = toolsData.available || []
  const hasToolsChoice = !!toolsData.choice

  const handleToolsChoiceToggle = (enabled: boolean) => {
    setEditingFeat(prev => {
      if (enabled) {
        let currentFixed: string[] = []
        if (Array.isArray(prev.tool_proficiencies)) {
          currentFixed = prev.tool_proficiencies
        } else if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
          currentFixed = (prev.tool_proficiencies as any).fixed || []
        }
        
        return {
          ...prev,
          tool_proficiencies: {
            fixed: currentFixed,
            available: [],
            choice: { count: 1 }
          }
        }
      } else {
        let currentFixed: string[] = []
        if (Array.isArray(prev.tool_proficiencies)) {
          currentFixed = prev.tool_proficiencies
        } else if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
          currentFixed = (prev.tool_proficiencies as any).fixed || []
        }
        
        return {
          ...prev,
          tool_proficiencies: currentFixed.length > 0 ? currentFixed : null
        }
      }
    })
  }

  const updateToolsChoiceCount = (count: number) => {
    setEditingFeat(prev => {
      let currentFixed: string[] = []
      let currentAvailable: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.tool_proficiencies)) {
        currentFixed = prev.tool_proficiencies
      } else if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
        currentFixed = (prev.tool_proficiencies as any).fixed || []
        currentAvailable = (prev.tool_proficiencies as any).available || []
        currentChoice = (prev.tool_proficiencies as any).choice || undefined
      }
      
      const fromSelected = currentAvailable.length > 0
      
      return {
        ...prev,
        tool_proficiencies: {
          fixed: currentFixed,
          available: currentAvailable,
          choice: {
            ...currentChoice,
            count: Math.max(1, count),
            from_selected: fromSelected
          }
        }
      }
    })
  }

  const updateToolsAvailable = (value: string[]) => {
    const fromSelected = value.length > 0
    
    setEditingFeat(prev => {
      let currentFixed: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.tool_proficiencies)) {
        currentFixed = prev.tool_proficiencies
      } else if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
        currentFixed = (prev.tool_proficiencies as any).fixed || []
        currentChoice = (prev.tool_proficiencies as any).choice || undefined
      }
      
      const filteredAvailable = value.filter(tool => !currentFixed.includes(tool))
      
      return {
        ...prev,
        tool_proficiencies: {
          fixed: currentFixed,
          available: filteredAvailable,
          choice: {
            ...currentChoice,
            from_selected: fromSelected
          }
        }
      }
    })
  }

  const updateToolsFixed = (value: string[]) => {
    setEditingFeat(prev => {
      if (!hasToolsChoice) {
        return {
          ...prev,
          tool_proficiencies: value
        }
      }
      
      let currentAvailable: string[] = []
      let currentChoice: any = undefined
      
      if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
        currentAvailable = (prev.tool_proficiencies as any).available || []
        currentChoice = (prev.tool_proficiencies as any).choice || undefined
      }
      
      return {
        ...prev,
        tool_proficiencies: {
          fixed: value,
          available: currentAvailable,
          choice: currentChoice
        }
      }
    })
  }

  // Skill proficiencies handling - same as backgrounds
  const skillsData = (() => {
    if (Array.isArray(editingFeat.skill_proficiencies)) {
      return { fixed: editingFeat.skill_proficiencies, choice: undefined, available: [] }
    }
    if (editingFeat.skill_proficiencies && typeof editingFeat.skill_proficiencies === 'object' && !Array.isArray(editingFeat.skill_proficiencies)) {
      const skillsObj = editingFeat.skill_proficiencies as any
      const fixed = skillsObj.fixed || []
      const available = skillsObj.available || []
      const choice = skillsObj.choice || undefined
      
      if (choice && choice.from_selected && available.length === 0 && fixed.length > 0) {
        return {
          fixed: [],
          available: fixed,
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

  const skills = skillsData.fixed || []
  const availableSkills = skillsData.available || []
  const hasSkillsChoice = !!skillsData.choice

  const handleSkillsChoiceToggle = (enabled: boolean) => {
    setEditingFeat(prev => {
      if (enabled) {
        let currentFixed: string[] = []
        if (Array.isArray(prev.skill_proficiencies)) {
          currentFixed = prev.skill_proficiencies
        } else if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
          currentFixed = (prev.skill_proficiencies as any).fixed || []
        }
        
        return {
          ...prev,
          skill_proficiencies: {
            fixed: currentFixed,
            available: [],
            choice: { count: 1, from_selected: false }
          }
        }
      } else {
        let currentFixed: string[] = []
        if (Array.isArray(prev.skill_proficiencies)) {
          currentFixed = prev.skill_proficiencies
        } else if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
          currentFixed = (prev.skill_proficiencies as any).fixed || []
        }
        
        return {
          ...prev,
          skill_proficiencies: currentFixed.length > 0 ? currentFixed : null
        }
      }
    })
  }

  const updateSkillsChoiceCount = (count: number) => {
    setEditingFeat(prev => {
      let currentFixed: string[] = []
      let currentAvailable: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.skill_proficiencies)) {
        currentFixed = prev.skill_proficiencies
      } else if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
        currentFixed = (prev.skill_proficiencies as any).fixed || []
        currentAvailable = (prev.skill_proficiencies as any).available || []
        currentChoice = (prev.skill_proficiencies as any).choice || undefined
      }
      
      const fromSelected = currentAvailable.length > 0
      
      return {
        ...prev,
        skill_proficiencies: {
          fixed: currentFixed,
          available: currentAvailable,
          choice: {
            ...currentChoice,
            count: Math.max(1, count),
            from_selected: fromSelected
          }
        }
      }
    })
  }

  const updateSkillsAvailable = (value: string[]) => {
    const fromSelected = value.length > 0
    
    setEditingFeat(prev => {
      let currentFixed: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.skill_proficiencies)) {
        currentFixed = prev.skill_proficiencies
      } else if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
        currentFixed = (prev.skill_proficiencies as any).fixed || []
        currentChoice = (prev.skill_proficiencies as any).choice || undefined
      }
      
      const filteredAvailable = value.filter(skill => !currentFixed.includes(skill))
      
      return {
        ...prev,
        skill_proficiencies: {
          fixed: currentFixed,
          available: filteredAvailable,
          choice: {
            ...currentChoice,
            from_selected: fromSelected
          }
        }
      }
    })
  }

  const updateSkillsFixed = (value: string[]) => {
    setEditingFeat(prev => {
      if (!hasSkillsChoice) {
        return {
          ...prev,
          skill_proficiencies: value
        }
      }
      
      let currentAvailable: string[] = []
      let currentChoice: any = undefined
      
      if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
        currentAvailable = (prev.skill_proficiencies as any).available || []
        currentChoice = (prev.skill_proficiencies as any).choice || undefined
      }
      
      return {
        ...prev,
        skill_proficiencies: {
          fixed: value,
          available: currentAvailable,
          choice: currentChoice
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="hover:text-primary transition-colors hover:cursor-pointer"
        >
          Feat Management
        </button>
        <Icon icon="lucide:chevron-right" className="w-4 h-4" />
        <span className="text-muted-foreground">
          {editingFeat.id ? `Edit ${editingFeat.name}` : 'Create New Feat'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold">
            {editingFeat.id ? `Edit ${editingFeat.name}` : 'Create New Feat'}
          </h1>
          <p className="text-muted-foreground">
            {editingFeat.id ? 'Modify feat details' : 'Create a new custom feat'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <Icon icon="lucide:x" className="w-4 h-4" />
            Cancel
          </Button>
          {editingFeat.id && editingFeat.id.trim() !== '' && canEdit && (
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive hover:text-white">
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feat-name">Feat Name *</Label>
            <Input
              id="feat-name"
              value={editingFeat.name}
              onChange={(e) => setEditingFeat(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter feat name"
              className="bg-background"
              disabled={!canEdit}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feat-description">Description</Label>
            <RichTextEditor
              value={editingFeat.description || ""}
              onChange={(value) => setEditingFeat(prev => ({ ...prev, description: value }))}
              placeholder="Enter feat description"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ability Modifiers */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Score Modifiers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Modifier Type</Label>
            <Select
              value={abilityModifiersType}
              onValueChange={handleAbilityModifiersTypeChange}
              disabled={!canEdit}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="array">Simple Array</SelectItem>
                <SelectItem value="choice">Choice</SelectItem>
                <SelectItem value="custom">Custom (Fixed + Choice)</SelectItem>
                <SelectItem value="fixed_multi">Fixed Multiple</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {abilityModifiersType === "array" && (
            <div className="flex flex-col gap-2">
              <Label>Ability Modifiers (Array Format)</Label>
              <p className="text-xs text-muted-foreground">
                Format: [{"{ability: \"Strength\", increase: 1}"}]
              </p>
              <p className="text-xs text-muted-foreground">
                Note: This is a simplified format. For more complex options, use Choice or Custom.
              </p>
            </div>
          )}

          {abilityModifiersType === "choice" && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-background">
              <div className="flex flex-col gap-2">
                <Label>Number of Abilities to Choose</Label>
                <Input
                  type="number"
                  value={(editingFeat.ability_modifiers as any)?.choices?.count || 2}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 2
                    setEditingFeat(prev => ({
                      ...prev,
                      ability_modifiers: {
                        type: 'choice',
                        choices: {
                          ...(prev.ability_modifiers as any)?.choices,
                          count
                        }
                      }
                    }))
                  }}
                  className="w-[100px]"
                  min="1"
                  disabled={!canEdit}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Increase Amount</Label>
                <Input
                  type="number"
                  value={(editingFeat.ability_modifiers as any)?.choices?.increase || 1}
                  onChange={(e) => {
                    const increase = parseInt(e.target.value) || 1
                    setEditingFeat(prev => ({
                      ...prev,
                      ability_modifiers: {
                        type: 'choice',
                        choices: {
                          ...(prev.ability_modifiers as any)?.choices,
                          increase
                        }
                      }
                    }))
                  }}
                  className="w-[100px]"
                  min="1"
                  max="2"
                  disabled={!canEdit}
                />
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Label className="text-sm font-medium">Available Abilities (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {(() => {
                    const availableAbilities = (editingFeat.ability_modifiers as any)?.choices?.available_abilities || []
                    const count = (editingFeat.ability_modifiers as any)?.choices?.count || 1
                    if (availableAbilities.length > 0) {
                      return `Players can choose ${count} ability/abilities from the ${availableAbilities.length} ability/abilities selected below. Leave all unchecked to allow choosing from all abilities.`
                    } else {
                      return `Players can choose ${count} ability/abilities from all available abilities. Select specific abilities below to limit the choice.`
                    }
                  })()}
                </p>
                <div className="flex flex-wrap gap-3">
                  {ABILITY_OPTIONS.map(ability => {
                    const availableAbilities = (editingFeat.ability_modifiers as any)?.choices?.available_abilities || []
                    const isSelected = availableAbilities.includes(ability.value)
                    return (
                      <div key={ability.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`ability-${ability.value}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const currentAvailable = (editingFeat.ability_modifiers as any)?.choices?.available_abilities || []
                            const newAvailable = checked
                              ? [...currentAvailable, ability.value]
                              : currentAvailable.filter((a: string) => a !== ability.value)
                            
                            setEditingFeat(prev => ({
                              ...prev,
                              ability_modifiers: {
                                type: 'choice',
                                choices: {
                                  ...(prev.ability_modifiers as any)?.choices,
                                  available_abilities: newAvailable.length > 0 ? newAvailable : undefined
                                }
                              }
                            }))
                          }}
                          disabled={!canEdit}
                        />
                        <Label 
                          htmlFor={`ability-${ability.value}`}
                          className="text-sm cursor-pointer font-normal"
                        >
                          {ability.label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {abilityModifiersType === "custom" && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">
                Custom format allows a fixed ability increase plus optional choice increases.
              </p>
              {/* TODO: Add custom ability modifier UI */}
            </div>
          )}

          {abilityModifiersType === "fixed_multi" && (
            <div className="flex flex-col gap-2 p-4 border rounded-lg bg-background">
              <Label>Fixed Ability Increases</Label>
              {ABILITY_OPTIONS.map(ability => (
                <div key={ability.value} className="flex items-center gap-2">
                  <Label className="w-32">{ability.label}</Label>
                  <Input
                    type="number"
                    value={(editingFeat.ability_modifiers as any)?.abilities?.[ability.value] || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      setEditingFeat(prev => ({
                        ...prev,
                        ability_modifiers: {
                          type: 'fixed_multi',
                          abilities: {
                            ...(prev.ability_modifiers as any)?.abilities,
                            [ability.value]: value
                          }
                        }
                      }))
                    }}
                    className="w-[100px]"
                    min="0"
                    max="2"
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Proficiencies */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Proficiencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProficiencyCheckboxes
            title={hasSkillsChoice ? "Fixed Skill Proficiencies" : "Fixed Skill Proficiencies"}
            description={hasSkillsChoice ? "Select fixed skill proficiencies granted by this feat" : "Select fixed skill proficiencies granted by this feat"}
            value={skills}
            onChange={updateSkillsFixed}
            options={SKILL_OPTIONS}
            readonly={!canEdit}
          />

          <div className="flex items-start p-4 gap-4 border rounded-lg bg-background">
            <Checkbox
              id="skills-choice"
              checked={hasSkillsChoice}
              onCheckedChange={(checked) => handleSkillsChoiceToggle(checked as boolean)}
              disabled={!canEdit}
            />
            <div className="flex-1 flex flex-col gap-3">
              <Label htmlFor="skills-choice" className="cursor-pointer font-medium">
                Allow player to choose skill proficiencies
              </Label>
              {hasSkillsChoice && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Number to choose:</Label>
                    <Input
                      type="number"
                      value={skillsData.choice?.count || 1}
                      onChange={(e) => updateSkillsChoiceCount(parseInt(e.target.value) || 1)}
                      className="w-[100px]"
                      min="1"
                      disabled={!canEdit}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-4 pb-2 mt-2 border-t">
                    <Label className="text-sm font-medium">Available Skills:</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {availableSkills.length > 0 
                        ? `Players can choose ${skillsData.choice?.count || 1} skill(s) from the ${availableSkills.length} skill(s) selected below. Leave empty to allow choosing from all skills.`
                        : `Players can choose ${skillsData.choice?.count || 1} skill(s) from all available skills. Select specific skills below to limit the choice.`}
                    </p>
                    <ProficiencyCheckboxes
                      title=""
                      description=""
                      value={availableSkills}
                      onChange={updateSkillsAvailable}
                      options={SKILL_OPTIONS}
                      readonly={!canEdit}
                      disabledValues={skills}
                      variant="simple"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tool Proficiencies */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Proficiencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProficiencyCheckboxes
            title={hasToolsChoice ? "Fixed Tool Proficiencies" : "Fixed Tool Proficiencies"}
            description={hasToolsChoice ? "Select fixed tool proficiencies granted by this feat" : "Select fixed tool proficiencies granted by this feat"}
            value={tools}
            onChange={updateToolsFixed}
            options={TOOL_OPTIONS}
            readonly={!canEdit}
          />

          <div className="flex items-start p-4 gap-4 border rounded-lg bg-background">
            <Checkbox
              id="tools-choice"
              checked={hasToolsChoice}
              onCheckedChange={(checked) => handleToolsChoiceToggle(checked as boolean)}
              disabled={!canEdit}
            />
            <div className="flex-1 flex flex-col gap-3">
              <Label htmlFor="tools-choice" className="cursor-pointer font-medium">
                Allow player to choose tool proficiencies
              </Label>
              {hasToolsChoice && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Number to choose:</Label>
                    <Input
                      type="number"
                      value={toolsData.choice?.count || 1}
                      onChange={(e) => updateToolsChoiceCount(parseInt(e.target.value) || 1)}
                      className="w-[100px]"
                      min="1"
                      disabled={!canEdit}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-4 pb-2 mt-2 border-t">
                    <Label className="text-sm font-medium">Available Tools (Optional):</Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      {availableTools.length > 0 
                        ? `Players can choose ${toolsData.choice?.count || 1} tool(s) from the ${availableTools.length} tool(s) selected below. Leave empty to allow choosing from all tools.`
                        : `Players can choose ${toolsData.choice?.count || 1} tool(s) from all available tools. Select specific tools below to limit the choice.`}
                    </p>
                    <ProficiencyCheckboxes
                      title=""
                      description=""
                      value={availableTools}
                      onChange={updateToolsAvailable}
                      options={TOOL_OPTIONS}
                      readonly={!canEdit}
                      disabledValues={tools}
                      variant="simple"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment & Weapon Proficiencies */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Equipment Proficiencies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProficiencyCheckboxes
              title=""
              description="Select equipment proficiencies granted by this feat"
              value={editingFeat.equipment_proficiencies || []}
              onChange={(value) => setEditingFeat(prev => ({ ...prev, equipment_proficiencies: value }))}
              options={EQUIPMENT_OPTIONS}
              readonly={!canEdit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weapon Proficiencies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Select Weapons</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select weapon proficiencies granted by this feat. You can select weapon categories (e.g., "Simple Weapons") or specific weapons.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-3 border rounded-lg bg-background">
                {/* Weapon Categories */}
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Weapon Categories</Label>
                  <div className="flex flex-col gap-2">
                    {WEAPON_OPTIONS.filter(w => w.category === 'category').map(weapon => {
                      const selectedWeapons = editingFeat.weapon_proficiencies || []
                      const isSelected = selectedWeapons.includes(weapon.label)
                      return (
                        <div key={weapon.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`weapon-${weapon.value}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = editingFeat.weapon_proficiencies || []
                              const updated = checked
                                ? [...current, weapon.label]
                                : current.filter(w => w !== weapon.label)
                              setEditingFeat(prev => ({ ...prev, weapon_proficiencies: updated.length > 0 ? updated : null }))
                            }}
                            disabled={!canEdit}
                          />
                          <Label htmlFor={`weapon-${weapon.value}`} className="text-sm cursor-pointer font-normal">
                            {weapon.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Specific Weapons */}
                <div className="col-span-2 mt-4 pt-4 border-t">
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Specific Weapons</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEAPON_OPTIONS.filter(w => w.category === 'weapon').map(weapon => {
                      const selectedWeapons = editingFeat.weapon_proficiencies || []
                      const isSelected = selectedWeapons.includes(weapon.label)
                      return (
                        <div key={weapon.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`weapon-${weapon.value}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = editingFeat.weapon_proficiencies || []
                              const updated = checked
                                ? [...current, weapon.label]
                                : current.filter(w => w !== weapon.label)
                              setEditingFeat(prev => ({ ...prev, weapon_proficiencies: updated.length > 0 ? updated : null }))
                            }}
                            disabled={!canEdit}
                          />
                          <Label htmlFor={`weapon-${weapon.value}`} className="text-sm cursor-pointer font-normal">
                            {weapon.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              
              {/* Selected Weapons Display */}
              {editingFeat.weapon_proficiencies && editingFeat.weapon_proficiencies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-lg bg-muted/50">
                  <Label className="text-xs font-medium text-muted-foreground w-full">Selected Weapons:</Label>
                  {editingFeat.weapon_proficiencies.map(weapon => (
                    <Badge key={weapon} variant="secondary" className="text-xs">
                      {weapon}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Fixed Languages</Label>
            {languages.map((lang: string, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={lang}
                  onChange={(e) => updateLanguage(index, e.target.value)}
                  placeholder="Language name"
                  className="bg-background"
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 h-9 text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => removeLanguage(index)}
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addLanguage} className="w-fit">
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Language
              </Button>
            )}
          </div>

          <div className="flex items-start p-4 gap-4 border rounded-lg bg-background">
            <Checkbox
              id="languages-choice"
              checked={hasLanguagesChoice}
              onCheckedChange={(checked) => handleLanguagesChoiceToggle(checked as boolean)}
              disabled={!canEdit}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="languages-choice" className="cursor-pointer font-medium">
                Allow player to choose additional languages
              </Label>
              {hasLanguagesChoice && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-sm text-muted-foreground">Number to choose:</Label>
                  <Input
                    type="number"
                    value={languagesData.choice?.count || 1}
                    onChange={(e) => updateLanguagesChoiceCount(parseInt(e.target.value) || 1)}
                    className="w-[100px]"
                    min="1"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground ml-2">
                    Players will be able to add {languagesData.choice?.count || 1} additional language(s) of their choice.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Features */}
      <Card>
        <CardHeader>
          <CardTitle>Special Features</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Add special features that grant abilities, usage tracking, or other mechanics. These can include slots, points pools, options lists, and more.
          </p>
          
          <div className="flex flex-col gap-3">
            {(editingFeat.special_features || []).map((feature: any, index: number) => (
              <Card key={index} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{feature.title || `Feature ${index + 1}`}</CardTitle>
                      {feature.featureType && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {feature.featureType.replace(/_/g, ' ')}
                      </Badge>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = [...(editingFeat.special_features || [])]
                          updated.splice(index, 1)
                          setEditingFeat(prev => ({ ...prev, special_features: updated.length > 0 ? updated : null }))
                        }}
                        className="text-destructive hover:bg-destructive hover:text-white"
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label>Feature Title *</Label>
                      <Input
                        value={feature.title || ''}
                        onChange={(e) => {
                          const updated = [...(editingFeat.special_features || [])]
                          updated[index] = { ...updated[index], title: e.target.value }
                          setEditingFeat(prev => ({ ...prev, special_features: updated }))
                        }}
                        placeholder="Feature name"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Feature Type</Label>
                      <Select
                        value={feature.featureType || 'trait'}
                        onValueChange={(value) => {
                          const updated = [...(editingFeat.special_features || [])]
                          if (value === 'spell_grant') {
                            updated[index] = {
                              ...updated[index],
                              featureType: 'spell_grant',
                              config: undefined,
                              spells: updated[index].spells ?? [],
                              castingAbility: updated[index].castingAbility,
                            }
                          } else {
                            updated[index] = {
                              ...updated[index],
                              featureType: value,
                              config: value === 'trait' ? undefined : getDefaultConfigForType(value),
                            }
                          }
                          setEditingFeat(prev => ({ ...prev, special_features: updated }))
                        }}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trait">Trait (Simple)</SelectItem>
                          <SelectItem value="spell_grant">Spell Grant</SelectItem>
                          <SelectItem value="slots">Slots (Usage Tracking)</SelectItem>
                          <SelectItem value="points_pool">Points Pool</SelectItem>
                          <SelectItem value="options_list">Options List</SelectItem>
                          <SelectItem value="skill_modifier">Skill Modifier</SelectItem>
                          <SelectItem value="availability_toggle">Availability Toggle</SelectItem>
                          <SelectItem value="special_ux">Special UX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {['slots', 'points_pool', 'availability_toggle'].includes(feature.featureType) && (
                      <div className="flex flex-col gap-2">
                        <Label>Display in</Label>
                        <Select
                          value={feature.category || 'combat'}
                          onValueChange={(value) => {
                            const updated = [...(editingFeat.special_features || [])]
                            updated[index] = { ...updated[index], category: value }
                            setEditingFeat(prev => ({ ...prev, special_features: updated }))
                          }}
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="combat">Combat Feat Skills</SelectItem>
                            <SelectItem value="spell">Feat Spells</SelectItem>
                            <SelectItem value="trait">Traits</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Description</Label>
                    <RichTextEditor
                      value={feature.description || ''}
                      onChange={(value) => {
                        const updated = [...(editingFeat.special_features || [])]
                        updated[index] = { ...updated[index], description: value }
                        setEditingFeat(prev => ({ ...prev, special_features: updated }))
                      }}
                      placeholder="Feature description"
                      rows={3}
                    />
                  </div>

                  {/* Configuration based on feature type */}
                  {feature.featureType === 'slots' && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <Label className="text-sm font-medium">Slots Configuration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Uses Formula</Label>
                          <Input
                            value={feature.config?.usesFormula || ''}
                            onChange={(e) => {
                              const updated = [...(editingFeat.special_features || [])]
                              updated[index] = { 
                                ...updated[index], 
                                config: { ...updated[index].config, usesFormula: e.target.value }
                              }
                              setEditingFeat(prev => ({ ...prev, special_features: updated }))
                            }}
                            placeholder="e.g., proficiency_bonus"
                            disabled={!canEdit}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Replenish On</Label>
                          <Select
                            value={feature.config?.replenishOn || 'long_rest'}
                            onValueChange={(value) => {
                              const updated = [...(editingFeat.special_features || [])]
                              updated[index] = { 
                                ...updated[index], 
                                config: { ...updated[index].config, replenishOn: value }
                              }
                              setEditingFeat(prev => ({ ...prev, special_features: updated }))
                            }}
                            disabled={!canEdit}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short_rest">Short Rest</SelectItem>
                              <SelectItem value="long_rest">Long Rest</SelectItem>
                              <SelectItem value="dawn">Dawn</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {feature.featureType === 'points_pool' && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <Label className="text-sm font-medium">Points Pool Configuration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Total Formula</Label>
                          <Input
                            value={feature.config?.totalFormula || ''}
                            onChange={(e) => {
                              const updated = [...(editingFeat.special_features || [])]
                              updated[index] = { 
                                ...updated[index], 
                                config: { ...updated[index].config, totalFormula: e.target.value }
                              }
                              setEditingFeat(prev => ({ ...prev, special_features: updated }))
                            }}
                            placeholder="e.g., level * 5"
                            disabled={!canEdit}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Replenish On</Label>
                          <Select
                            value={feature.config?.replenishOn || 'long_rest'}
                            onValueChange={(value) => {
                              const updated = [...(editingFeat.special_features || [])]
                              updated[index] = { 
                                ...updated[index], 
                                config: { ...updated[index].config, replenishOn: value }
                              }
                              setEditingFeat(prev => ({ ...prev, special_features: updated }))
                            }}
                            disabled={!canEdit}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short_rest">Short Rest</SelectItem>
                              <SelectItem value="long_rest">Long Rest</SelectItem>
                              <SelectItem value="dawn">Dawn</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {feature.featureType === 'availability_toggle' && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <Label className="text-sm font-medium">Availability Toggle Configuration</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={feature.config?.defaultAvailable ?? true}
                          onCheckedChange={(checked) => {
                            const updated = [...(editingFeat.special_features || [])]
                            updated[index] = {
                              ...updated[index],
                              config: { ...updated[index].config, defaultAvailable: checked as boolean }
                            }
                            setEditingFeat(prev => ({ ...prev, special_features: updated }))
                          }}
                          disabled={!canEdit}
                        />
                        <Label className="text-xs">Default Available</Label>
                      </div>
                    </div>
                  )}

                  {feature.featureType === 'spell_grant' && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Spell Grant Configuration</Label>
                      </div>

                      {/* Feature-level casting ability */}
                      <div className="flex items-center gap-3">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Default Casting Ability:</Label>
                        <Select
                          value={feature.castingAbility || 'default'}
                          onValueChange={(value) => {
                            const updated = [...(editingFeat.special_features || [])]
                            updated[index] = { ...updated[index], castingAbility: value === 'default' ? undefined : value }
                            setEditingFeat(prev => ({ ...prev, special_features: updated }))
                          }}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="text-xs h-8 w-48">
                            <SelectValue placeholder="Character default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Character Default</SelectItem>
                            <SelectItem value="intelligence">Intelligence</SelectItem>
                            <SelectItem value="wisdom">Wisdom</SelectItem>
                            <SelectItem value="charisma">Charisma</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Spells list */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Granted Spells</Label>
                        {(feature.spells || []).length === 0 && (
                          <p className="text-xs text-muted-foreground">No spells added yet. Click "Add Spell" below.</p>
                        )}
                        {(feature.spells || []).map((spell: GrantedSpell, spellIndex: number) => (
                          <SpellGrantEntry
                            key={spell.id || spellIndex}
                            spell={spell}
                            spellLibrary={spellLibrary}
                            canEdit={canEdit}
                            onUpdate={(updated) => {
                              const updatedFeatures = [...(editingFeat.special_features || [])]
                              const updatedSpells = [...(updatedFeatures[index].spells || [])]
                              updatedSpells[spellIndex] = updated
                              updatedFeatures[index] = { ...updatedFeatures[index], spells: updatedSpells }
                              setEditingFeat(prev => ({ ...prev, special_features: updatedFeatures }))
                            }}
                            onRemove={() => {
                              const updatedFeatures = [...(editingFeat.special_features || [])]
                              const updatedSpells = (updatedFeatures[index].spells || [])
                                .filter((_: GrantedSpell, si: number) => si !== spellIndex)
                              updatedFeatures[index] = { ...updatedFeatures[index], spells: updatedSpells }
                              setEditingFeat(prev => ({ ...prev, special_features: updatedFeatures }))
                            }}
                          />
                        ))}
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedFeatures = [...(editingFeat.special_features || [])]
                              const newSpell: GrantedSpell = {
                                id: crypto.randomUUID(),
                                mode: 'library',
                                usesPerLongRest: 1,
                                resetOn: 'long_rest',
                              }
                              updatedFeatures[index] = {
                                ...updatedFeatures[index],
                                spells: [...(updatedFeatures[index].spells || []), newSpell],
                              }
                              setEditingFeat(prev => ({ ...prev, special_features: updatedFeatures }))
                            }}
                            className="text-xs"
                          >
                            <Icon icon="lucide:plus" className="w-3 h-3" />
                            Add Spell
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {canEdit && (
            <Button
              variant="outline"
              onClick={() => {
                const newFeature = {
                  id: crypto.randomUUID(),
                  title: '',
                  description: '',
                  featureType: 'trait' as const
                }
                setEditingFeat(prev => ({
                  ...prev,
                  special_features: [...(prev.special_features || []), newFeature]
                }))
              }}
              className="w-fit"
            >
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add Special Feature
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Passive Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle>Passive Bonuses</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mechanical effects automatically applied when this feat is equipped (AC formulas, skill bonuses, tool bonuses).
          </p>
        </CardHeader>
        <CardContent>
          <PassiveBonusesEditor
            value={editingFeat.passive_bonuses as PassiveBonuses | null}
            onChange={(val) => setEditingFeat(prev => ({ ...prev, passive_bonuses: val }))}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle>Prerequisites</CardTitle>
          <p className="text-sm text-muted-foreground">
            Requirements that should be met before taking this feat. These are soft warnings — feats remain selectable regardless.
          </p>
        </CardHeader>
        <CardContent>
          <PrerequisitesEditor
            value={editingFeat.prerequisites ?? null}
            onChange={(val) => setEditingFeat(prev => ({ ...prev, prerequisites: val }))}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get default config for feature types
function getDefaultConfigForType(featureType: string): any {
  switch (featureType) {
    case 'slots':
      return {
        usesFormula: 'proficiency_bonus',
        replenishOn: 'long_rest',
        displayStyle: 'circles'
      }
    case 'points_pool':
      return {
        totalFormula: 'level',
        canSpendPartial: true,
        replenishOn: 'long_rest',
        displayStyle: 'input'
      }
    case 'availability_toggle':
      return {
        defaultAvailable: true,
        replenishOn: 'long_rest',
        displayStyle: 'badge'
      }
    case 'options_list':
      return {
        maxSelectionsFormula: 'fixed:1',
        optionsSource: 'custom',
        allowDuplicates: false,
        displayStyle: 'list'
      }
    case 'skill_modifier':
      return {
        modifierType: 'skill',
        modifierFormula: 'proficiency_bonus',
        stackable: false,
        displayStyle: 'badge'
      }
    case 'special_ux':
      return {
        componentId: '',
        customConfig: {}
      }
    default:
      return undefined
  }
}

