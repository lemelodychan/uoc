"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { BackgroundData } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { ProficiencyCheckboxes, SKILL_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface BackgroundEditorPageProps {
  backgroundData: BackgroundData
  canEdit?: boolean
  onSave: (backgroundData: Partial<BackgroundData>) => void
  onCancel: () => void
  onDelete: (backgroundId: string) => void
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

interface NumberedItem {
  number: number
  text: string
}

export function BackgroundEditorPage({
  backgroundData,
  canEdit = true,
  onSave,
  onCancel,
  onDelete
}: BackgroundEditorPageProps) {
  const [editingBackground, setEditingBackground] = useState<BackgroundData>(backgroundData)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Update local state when backgroundData prop changes
  useEffect(() => {
    setEditingBackground(backgroundData)
  }, [backgroundData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate required fields
      if (!editingBackground.name || editingBackground.name.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Background name is required",
          variant: "destructive"
        })
        return
      }

      // Prepare the data for saving
      const backgroundDataToSave = {
        ...editingBackground,
        name: editingBackground.name.trim(),
        ...(editingBackground.id && editingBackground.id.trim() !== '' ? { id: editingBackground.id } : {}),
      }
      
      await onSave(backgroundDataToSave)
      toast({
        title: "Success",
        description: "Background saved successfully"
      })
    } catch (error) {
      console.error('Error saving background:', error)
      toast({
        title: "Error",
        description: "Failed to save background",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (editingBackground.id && editingBackground.id.trim() !== '') {
      if (confirm(`Are you sure you want to delete "${editingBackground.name}"? This action cannot be undone.`)) {
        onDelete(editingBackground.id)
      }
    }
  }

  // Helper functions for numbered items (defining events, personality traits, etc.)
  const addNumberedItem = (field: 'defining_events' | 'personality_traits' | 'ideals' | 'bonds' | 'flaws') => {
    const currentItems = editingBackground[field] || []
    const nextNumber = currentItems.length > 0 
      ? Math.max(...currentItems.map(item => item.number)) + 1 
      : 1
    setEditingBackground(prev => ({
      ...prev,
      [field]: [...currentItems, { number: nextNumber, text: '' }]
    }))
  }

  const updateNumberedItem = (
    field: 'defining_events' | 'personality_traits' | 'ideals' | 'bonds' | 'flaws',
    index: number,
    updates: Partial<NumberedItem>
  ) => {
    const currentItems = editingBackground[field] || []
    const updated = currentItems.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    )
    setEditingBackground(prev => ({
      ...prev,
      [field]: updated
    }))
  }

  const removeNumberedItem = (
    field: 'defining_events' | 'personality_traits' | 'ideals' | 'bonds' | 'flaws',
    index: number
  ) => {
    const currentItems = editingBackground[field] || []
    const updated = currentItems.filter((_, i) => i !== index)
    setEditingBackground(prev => ({
      ...prev,
      [field]: updated.length === 0 ? null : updated
    }))
  }

  // Languages handling - can be array (legacy), or object with fixed and/or choice
  const languagesData = (() => {
    if (Array.isArray(editingBackground.languages)) {
      // Legacy format - convert to new format
      return { fixed: editingBackground.languages, choice: undefined }
    }
    if (editingBackground.languages && typeof editingBackground.languages === 'object' && !Array.isArray(editingBackground.languages)) {
      return {
        fixed: (editingBackground.languages as any).fixed || [],
        choice: (editingBackground.languages as any).choice || undefined
      }
    }
    return { fixed: [], choice: undefined }
  })()

  const languages = languagesData.fixed || []
  const hasLanguagesChoice = !!languagesData.choice

  const handleLanguagesChoiceToggle = (enabled: boolean) => {
    if (enabled) {
      setEditingBackground(prev => ({
        ...prev,
        languages: {
          fixed: languages,
          choice: { count: 1 }
        }
      }))
    } else {
      setEditingBackground(prev => ({
        ...prev,
        languages: languages.length > 0 ? languages : null
      }))
    }
  }

  const updateLanguagesChoiceCount = (count: number) => {
    setEditingBackground(prev => ({
      ...prev,
      languages: {
        fixed: languages,
        choice: { count: Math.max(1, count) }
      }
    }))
  }

  const addLanguage = () => {
    const newLanguages = [...languages, ""]
    setEditingBackground(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: newLanguages, choice: languagesData.choice }
        : newLanguages
    }))
  }

  const updateLanguage = (index: number, value: string) => {
    const updated = [...languages]
    updated[index] = value
    
    setEditingBackground(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: updated, choice: languagesData.choice }
        : updated
    }))
  }

  const removeLanguage = (index: number) => {
    const updated = languages.filter((_, i) => i !== index)
    
    setEditingBackground(prev => ({
      ...prev,
      languages: hasLanguagesChoice 
        ? { fixed: updated, choice: languagesData.choice }
        : updated.length === 0 ? null : updated
    }))
  }

  // Tool proficiencies handling - can be array (legacy), or object with fixed and/or choice
  const toolsData = (() => {
    if (Array.isArray(editingBackground.tool_proficiencies)) {
      // Legacy format - convert to new format
      return { fixed: editingBackground.tool_proficiencies, choice: undefined, available: [] }
    }
    if (editingBackground.tool_proficiencies && typeof editingBackground.tool_proficiencies === 'object' && !Array.isArray(editingBackground.tool_proficiencies)) {
      const toolsObj = editingBackground.tool_proficiencies as any
      const fixed = toolsObj.fixed || []
      const available = toolsObj.available || []
      const choice = toolsObj.choice || undefined
      
      // If from_selected is true and available is empty (or doesn't exist), 
      // the fixed array contains the choice options (not actual fixed tools)
      if (choice && choice.from_selected && available.length === 0 && fixed.length > 0) {
        // Fixed array is actually the available options for choice, no actual fixed tools
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

  const tools = toolsData.fixed || []
  const availableTools = toolsData.available || []
  const hasToolsChoice = !!toolsData.choice

  const handleToolsChoiceToggle = (enabled: boolean) => {
    setEditingBackground(prev => {
      if (enabled) {
        // Get current fixed tools from state
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
        // Get current fixed tools from state
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
    setEditingBackground(prev => {
      // Get current fixed, available, and choice from the previous state
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
    // If available tools are provided, from_selected is true, otherwise false
    const fromSelected = value.length > 0
    
    setEditingBackground(prev => {
      // Get current fixed tools and choice from the previous state
      let currentFixed: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.tool_proficiencies)) {
        currentFixed = prev.tool_proficiencies
      } else if (prev.tool_proficiencies && typeof prev.tool_proficiencies === 'object' && !Array.isArray(prev.tool_proficiencies)) {
        currentFixed = (prev.tool_proficiencies as any).fixed || []
        currentChoice = (prev.tool_proficiencies as any).choice || undefined
      }
      
      // Filter out any fixed tools from the available tools to prevent duplicates
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
    setEditingBackground(prev => {
      if (!hasToolsChoice) {
        return {
          ...prev,
          tool_proficiencies: value
        }
      }
      
      // Get current available tools and choice from the previous state
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

  // Skill proficiencies handling - can be array (legacy), or object with fixed and/or choice
  const skillsData = (() => {
    if (Array.isArray(editingBackground.skill_proficiencies)) {
      // Legacy format - convert to new format
      return { fixed: editingBackground.skill_proficiencies, choice: undefined, available: [] }
    }
    if (editingBackground.skill_proficiencies && typeof editingBackground.skill_proficiencies === 'object' && !Array.isArray(editingBackground.skill_proficiencies)) {
      const skillsObj = editingBackground.skill_proficiencies as any
      const fixed = skillsObj.fixed || []
      const available = skillsObj.available || []
      const choice = skillsObj.choice || undefined
      
      // If from_selected is true and available is empty (or doesn't exist), 
      // the fixed array contains the choice options (not actual fixed skills)
      // Example: Haunted One - fixed: [4 skills], choice: {count: 2, from_selected: true}, no available
      // Example: Knight of the Order - fixed: [persuasion], available: [4 skills], choice: {count: 1, from_selected: true}
      if (choice && choice.from_selected && available.length === 0 && fixed.length > 0) {
        // Fixed array is actually the available options for choice, no actual fixed skills
        return {
          fixed: [], // No actual fixed skills
          available: fixed, // Fixed array is actually the available options
          choice: choice
        }
      }
      
      // New format or data with both fixed and available
      // Example: Knight of the Order - fixed: [persuasion], available: [4 skills], choice: {count: 1, from_selected: true}
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
    setEditingBackground(prev => {
      if (enabled) {
        // Get current fixed skills from state
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
        // Get current fixed skills from state
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
    setEditingBackground(prev => {
      // Get current fixed, available, and choice from the previous state
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
    // If available skills are provided, from_selected is true, otherwise false
    const fromSelected = value.length > 0
    
    setEditingBackground(prev => {
      // Get current fixed skills and choice from the previous state
      let currentFixed: string[] = []
      let currentChoice: any = undefined
      
      if (Array.isArray(prev.skill_proficiencies)) {
        currentFixed = prev.skill_proficiencies
      } else if (prev.skill_proficiencies && typeof prev.skill_proficiencies === 'object' && !Array.isArray(prev.skill_proficiencies)) {
        currentFixed = (prev.skill_proficiencies as any).fixed || []
        currentChoice = (prev.skill_proficiencies as any).choice || undefined
      }
      
      // Filter out any fixed skills from the available skills to prevent duplicates
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
    setEditingBackground(prev => {
      if (!hasSkillsChoice) {
        return {
          ...prev,
          skill_proficiencies: value
        }
      }
      
      // Get current available skills and choice from the previous state
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

  // Money handling
  const updateMoney = (type: 'gold' | 'silver' | 'copper', value: number) => {
    setEditingBackground(prev => ({
      ...prev,
      money: {
        ...(prev.money || { gold: 0, silver: 0, copper: 0 }),
        [type]: Math.max(0, value)
      }
    }))
  }

  // Render numbered items section
  const renderNumberedItems = (
    field: 'defining_events' | 'personality_traits' | 'ideals' | 'bonds' | 'flaws',
    title: string,
    customTitle?: string | null,
    onCustomTitleChange?: (value: string) => void
  ) => {
    const items = editingBackground[field] || []
    const displayTitle = customTitle || title
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{displayTitle}</CardTitle>
            {field === 'defining_events' && canEdit && (
              <div className="flex items-center gap-2">
                <Label htmlFor="defining-events-title" className="text-sm text-muted-foreground">Custom Title:</Label>
                <Input
                  id="defining-events-title"
                  value={customTitle || ''}
                  onChange={(e) => onCustomTitleChange?.(e.target.value)}
                  placeholder="e.g., Background Setup, Life Events, etc."
                  className="w-[200px] bg-background"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={item.number}
                  onChange={(e) => updateNumberedItem(field, index, { number: parseInt(e.target.value) || 1 })}
                  className="w-20 bg-background"
                  disabled={!canEdit}
                  min="1"
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateNumberedItem(field, index, { text: e.target.value })}
                  placeholder={`${displayTitle} text`}
                  className="flex-1 bg-background"
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeNumberedItem(field, index)}
                    className="w-9 h-9 text-destructive hover:bg-destructive hover:text-white"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No {displayTitle.toLowerCase()} added yet
              </div>
            )}
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => addNumberedItem(field)} className="w-fit">
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add {displayTitle.slice(0, -1)}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="hover:text-primary transition-colors hover:cursor-pointer"
        >
          Background Management
        </button>
        <Icon icon="lucide:chevron-right" className="w-4 h-4" />
        <span className="text-muted-foreground">
          {editingBackground.id ? `Edit ${editingBackground.name}` : 'Create New Background'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold">
            {editingBackground.id ? `Edit ${editingBackground.name}` : 'Create New Background'}
          </h1>
          <p className="text-muted-foreground">
            {editingBackground.id ? 'Modify background details' : 'Create a new custom background'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <Icon icon="lucide:x" className="w-4 h-4" />
            Cancel
          </Button>
          {editingBackground.id && editingBackground.id.trim() !== '' && canEdit && (
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
            <Label htmlFor="background-name">Background Name *</Label>
            <Input
              id="background-name"
              value={editingBackground.name}
              onChange={(e) => setEditingBackground(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter background name"
              className="bg-background"
              disabled={!canEdit}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="background-description">Description</Label>
            <RichTextEditor
              value={editingBackground.description || ""}
              onChange={(value) => setEditingBackground(prev => ({ ...prev, description: value }))}
              placeholder="Enter background description"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skill Proficiencies */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Proficiencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProficiencyCheckboxes
            title={hasSkillsChoice ? "Fixed Skill Proficiencies" : "Skill Proficiencies"}
            description={hasSkillsChoice ? "Select fixed skill proficiencies granted by this background" : "Select skill proficiencies granted by this background"}
            value={skills}
            onChange={updateSkillsFixed}
            options={SKILL_OPTIONS}
            readonly={!canEdit}
          />

          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
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
                <div className="flex flex-col gap-3 pl-6">
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
                  
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Available Skills (Optional):</Label>
                    <p className="text-xs text-muted-foreground">
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
            title={hasToolsChoice ? "Fixed Tool Proficiencies" : "Tool Proficiencies"}
            description={hasToolsChoice ? "Select fixed tool proficiencies granted by this background" : "Select tool proficiencies granted by this background"}
            value={tools}
            onChange={updateToolsFixed}
            options={TOOL_OPTIONS}
            readonly={!canEdit}
          />

          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
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
                <div className="flex flex-col gap-3 pl-6">
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
                  
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Available Tools (Optional):</Label>
                    <p className="text-xs text-muted-foreground">
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
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
            <Checkbox
              id="languages-choice"
              checked={hasLanguagesChoice}
              onCheckedChange={(checked) => handleLanguagesChoiceToggle(checked as boolean)}
              disabled={!canEdit}
            />
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="languages-choice" className="cursor-pointer font-medium">
                Allow player to choose additional languages
              </Label>
              {hasLanguagesChoice && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Number to choose:</Label>
                  <Input
                    type="number"
                    value={languagesData.choice?.count || 1}
                    onChange={(e) => updateLanguagesChoiceCount(parseInt(e.target.value) || 1)}
                    className="w-[100px]"
                    min="1"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    Players can add {languagesData.choice?.count || 1} additional language(s) of their choice.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RichTextEditor
            value={editingBackground.equipment || ""}
            onChange={(value) => setEditingBackground(prev => ({ ...prev, equipment: value }))}
            placeholder="Enter equipment description (supports rich text and lists)"
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Money */}
      <Card>
        <CardHeader>
          <CardTitle>Starting Money</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-2">
              <Label htmlFor="money-gold">Gold</Label>
              <Input
                id="money-gold"
                type="number"
                value={editingBackground.money?.gold || 0}
                onChange={(e) => updateMoney('gold', parseInt(e.target.value) || 0)}
                className="bg-background w-[100px]"
                disabled={!canEdit}
                min="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="money-silver">Silver</Label>
              <Input
                id="money-silver"
                type="number"
                value={editingBackground.money?.silver || 0}
                onChange={(e) => updateMoney('silver', parseInt(e.target.value) || 0)}
                className="bg-background w-[100px]"
                disabled={!canEdit}
                min="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="money-copper">Copper</Label>
              <Input
                id="money-copper"
                type="number"
                value={editingBackground.money?.copper || 0}
                onChange={(e) => updateMoney('copper', parseInt(e.target.value) || 0)}
                className="bg-background w-[100px]"
                disabled={!canEdit}
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defining Events */}
      {renderNumberedItems(
        'defining_events', 
        'Background Setup',
        editingBackground.defining_events_title,
        (value) => setEditingBackground(prev => ({ ...prev, defining_events_title: value || null }))
      )}

      {/* Personality Traits */}
      {renderNumberedItems('personality_traits', 'Personality Traits')}

      {/* Ideals */}
      {renderNumberedItems('ideals', 'Ideals')}

      {/* Bonds */}
      {renderNumberedItems('bonds', 'Bonds')}

      {/* Flaws */}
      {renderNumberedItems('flaws', 'Flaws')}
    </div>
  )
}

