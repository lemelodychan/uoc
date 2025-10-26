"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import type { ClassFeatureSkill, SlotConfig, PointsPoolConfig, OptionsListConfig, SpecialUXConfig, SkillModifierConfig, AvailabilityToggleConfig } from "@/lib/class-feature-types"
import { validateFeatureSkill } from "@/lib/class-feature-templates"

interface ClassFeatureSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (feature: ClassFeatureSkill) => void
  editingFeature?: ClassFeatureSkill | null
  availableSubclasses?: Array<{ id: string; name: string }>
}

export function ClassFeatureSkillModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingFeature,
  availableSubclasses = []
}: ClassFeatureSkillModalProps) {
  const [formData, setFormData] = useState<Partial<ClassFeatureSkill>>({
    id: '',
    version: 1,
    title: '',
    subtitle: '',
    featureType: 'slots',
    enabledAtLevel: 1,
    enabledBySubclass: null,
    config: {
      usesFormula: 'fixed:1',
      replenishOn: 'long_rest',
      displayStyle: 'circles'
    }
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form data when editing
  useEffect(() => {
    if (editingFeature) {
      setFormData(editingFeature)
    } else {
      setFormData({
        id: '',
        version: 1,
        title: '',
        subtitle: '',
        featureType: 'slots',
        enabledAtLevel: 1,
        enabledBySubclass: null,
        config: {
          usesFormula: 'fixed:1',
          replenishOn: 'long_rest',
          displayStyle: 'circles'
        }
      })
    }
    setErrors([])
  }, [editingFeature, isOpen])

  const handleSave = () => {
    // Generate ID if not provided
    const featureData: ClassFeatureSkill = {
      ...formData,
      id: formData.id || `feature-${crypto.randomUUID()}`,
      version: formData.version || 1,
      title: formData.title || '',
      featureType: formData.featureType || 'slots',
      enabledAtLevel: formData.enabledAtLevel || 1,
      config: formData.config || {}
    } as ClassFeatureSkill

    // Validate
    const validation = validateFeatureSkill(featureData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsLoading(true)
    try {
      onSave(featureData)
      onClose()
    } catch (error) {
      console.error("Error saving feature:", error)
      setErrors([error instanceof Error ? error.message : "Failed to save feature"])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isLoading) return
    onClose()
  }

  const updateFormData = (updates: Partial<ClassFeatureSkill>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates }
      
      // If feature type changed, reset config to appropriate default
      if (updates.featureType && updates.featureType !== prev.featureType) {
        switch (updates.featureType) {
          case 'slots':
            newData.config = {
              usesFormula: 'fixed:1',
              replenishOn: 'long_rest',
              displayStyle: 'circles'
            }
            break
          case 'points_pool':
            newData.config = {
              totalFormula: 'level',
              canSpendPartial: true,
              replenishOn: 'long_rest',
              displayStyle: 'slider'
            }
            break
          case 'options_list':
            newData.config = {
              maxSelectionsFormula: 'fixed:1',
              optionsSource: 'custom',
              allowDuplicates: false,
              displayStyle: 'list'
            }
            break
          case 'special_ux':
            newData.config = {
              componentId: '',
              customConfig: {}
            }
            break
          case 'skill_modifier':
            newData.config = {
              modifierType: 'skill',
              modifierFormula: 'proficiency_bonus',
              stackable: false,
              displayStyle: 'badge'
            }
            break
          case 'availability_toggle':
            newData.config = {
              defaultAvailable: true,
              replenishOn: 'long_rest',
              displayStyle: 'toggle'
            }
            break
          default:
            newData.config = undefined
        }
      }
      
      return newData
    })
    setErrors([])
  }

  const updateConfig = (configUpdates: any) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdates }
    }))
  }

  const renderConfigFields = () => {
    switch (formData.featureType) {
      case 'slots':
        return <SlotsConfigFields config={formData.config as SlotConfig} onUpdate={updateConfig} />
      case 'points_pool':
        return <PointsPoolConfigFields config={formData.config as PointsPoolConfig} onUpdate={updateConfig} />
      case 'options_list':
        return <OptionsListConfigFields config={formData.config as OptionsListConfig} onUpdate={updateConfig} />
      case 'special_ux':
        return <SpecialUXConfigFields config={formData.config as SpecialUXConfig} onUpdate={updateConfig} />
      case 'skill_modifier':
        return <SkillModifierConfigFields config={formData.config as SkillModifierConfig} onUpdate={updateConfig} />
      case 'availability_toggle':
        return <AvailabilityToggleConfigFields config={formData.config as AvailabilityToggleConfig} onUpdate={updateConfig} />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFeature ? "Edit Feature Skill" : "Add Feature Skill"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="e.g., Bardic Inspiration"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle || ''}
                onChange={(e) => updateFormData({ subtitle: e.target.value })}
                placeholder="e.g., Grant allies inspiration dice"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feature-type">Feature Type *</Label>
              <Select
                value={formData.featureType}
                onValueChange={(value: any) => updateFormData({ featureType: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feature type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slots">Slots (usage tracking)</SelectItem>
                  <SelectItem value="points_pool">Points Pool</SelectItem>
                  <SelectItem value="options_list">Options List</SelectItem>
                  <SelectItem value="special_ux">Special UX</SelectItem>
                  <SelectItem value="skill_modifier">Skill Modifier</SelectItem>
                  <SelectItem value="availability_toggle">Availability Toggle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enabled-level">Enabled at Level *</Label>
              <Input
                id="enabled-level"
                type="number"
                min="1"
                max="20"
                value={formData.enabledAtLevel || 1}
                onChange={(e) => updateFormData({ enabledAtLevel: parseInt(e.target.value) || 1 })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subclass">Enabled by Subclass (optional)</Label>
            <Select
              value={formData.enabledBySubclass || ''}
              onValueChange={(value) => updateFormData({ enabledBySubclass: value || null })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subclass (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Base class feature</SelectItem>
                {availableSubclasses.map((subclass) => (
                  <SelectItem key={subclass.id} value={subclass.id}>
                    {subclass.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Configuration</Label>
            {renderConfigFields()}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || !formData.title?.trim()}
          >
            {isLoading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="lucide:save" className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Configuration field components for each feature type

function SlotsConfigFields({ config, onUpdate }: { config: SlotConfig; onUpdate: (updates: Partial<SlotConfig>) => void }) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="uses-formula">Uses Formula *</Label>
        <Input
          id="uses-formula"
          value={config.usesFormula || ''}
          onChange={(e) => onUpdate({ usesFormula: e.target.value })}
          placeholder="e.g., charisma_modifier, fixed:3, level / 2"
        />
        <div className="text-xs text-muted-foreground">
          Examples: charisma_modifier, proficiency_bonus, fixed:3, level / 2
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="replenish-on">Replenish On *</Label>
        <Select
          value={config.replenishOn || 'long_rest'}
          onValueChange={(value: any) => onUpdate({ replenishOn: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_rest">Short Rest</SelectItem>
            <SelectItem value="long_rest">Long Rest</SelectItem>
            <SelectItem value="dawn">Dawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-style">Display Style</Label>
        <Select
          value={config.displayStyle || 'circles'}
          onValueChange={(value: any) => onUpdate({ displayStyle: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circles">Circles</SelectItem>
            <SelectItem value="checkboxes">Checkboxes</SelectItem>
            <SelectItem value="counter">Counter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function PointsPoolConfigFields({ config, onUpdate }: { config: PointsPoolConfig; onUpdate: (updates: Partial<PointsPoolConfig>) => void }) {
  const formulaExamples = [
    { formula: 'level * 5', description: 'Lay on Hands (Paladin) - 5 points per level' },
    { formula: 'level', description: 'Ki Points (Monk) - 1 point per level' },
    { formula: 'level', description: 'Sorcery Points (Sorcerer) - 1 point per level' },
    { formula: 'level * 2', description: 'Custom - 2 points per level' },
    { formula: 'level / 2', description: 'Custom - 1 point per 2 levels (rounded down)' },
    { formula: 'Math.floor(level / 2) + 1', description: 'Custom - 1 point per 2 levels + 1' },
    { formula: 'Math.min(level, 10)', description: 'Custom - 1 point per level, max 10' }
  ]

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="total-formula">Total Formula *</Label>
        <div className="space-y-2">
          <Input
            id="total-formula"
            value={config.totalFormula || ''}
            onChange={(e) => onUpdate({ totalFormula: e.target.value })}
            placeholder="e.g., level * 5, level, level * 2"
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Quick presets:</span>
            {formulaExamples.slice(0, 4).map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onUpdate({ totalFormula: example.formula })}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border"
              >
                {example.formula}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">Common Formulas:</div>
          <div className="grid grid-cols-1 gap-1">
            {formulaExamples.map((example, index) => (
              <div key={index} className="flex justify-between">
                <code className="text-blue-600">{example.formula}</code>
                <span className="text-gray-600">{example.description}</span>
              </div>
            ))}
          </div>
          
          {/* Formula Preview */}
          {config.totalFormula && (
            <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-200">
              <div className="text-xs font-medium text-green-800">Formula Preview:</div>
              <div className="text-xs text-green-700 mt-1">
                {(() => {
                  try {
                    const preview = []
                    for (let level = 1; level <= 20; level += 4) {
                      const formula = config.totalFormula.replace(/level/g, level.toString())
                      const result = eval(formula)
                      preview.push(`Level ${level}: ${result} points`)
                    }
                    return preview.join(' • ')
                  } catch (error) {
                    return 'Invalid formula - check syntax'
                  }
                })()}
              </div>
            </div>
          )}
          
          <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
            <div className="text-xs font-medium text-blue-800">Formula Help:</div>
            <div className="text-xs text-blue-700 mt-1">
              • Use <code>level</code> for character level<br/>
              • Use <code>Math.floor()</code> for rounding down<br/>
              • Use <code>Math.min()</code> and <code>Math.max()</code> for limits<br/>
              • Use <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code> for math
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="can-spend-partial"
          checked={config.canSpendPartial || false}
          onChange={(e) => onUpdate({ canSpendPartial: e.target.checked })}
        />
        <Label htmlFor="can-spend-partial" className="text-sm">
          Can spend partial amounts
        </Label>
      </div>

      {config.canSpendPartial && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="min-spend">Minimum Spend</Label>
            <Input
              id="min-spend"
              type="number"
              min="1"
              value={config.minSpend || 1}
              onChange={(e) => onUpdate({ minSpend: parseInt(e.target.value) || 1 })}
              placeholder="1"
            />
            <div className="text-xs text-muted-foreground">
              Minimum points that can be spent at once
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-spend">Maximum Spend (Optional)</Label>
            <Input
              id="max-spend"
              type="number"
              min="1"
              value={config.maxSpend || ''}
              onChange={(e) => onUpdate({ maxSpend: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="No limit"
            />
            <div className="text-xs text-muted-foreground">
              Maximum points that can be spent at once
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="replenish-on">Replenish On *</Label>
        <Select
          value={config.replenishOn || 'long_rest'}
          onValueChange={(value: any) => onUpdate({ replenishOn: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_rest">Short Rest</SelectItem>
            <SelectItem value="long_rest">Long Rest</SelectItem>
            <SelectItem value="dawn">Dawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-style">Display Style</Label>
        <Select
          value={config.displayStyle || 'slider'}
          onValueChange={(value: any) => onUpdate({ displayStyle: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="input">Input Field</SelectItem>
            <SelectItem value="increment_decrement">+/- Buttons</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function OptionsListConfigFields({ config, onUpdate }: { config: OptionsListConfig; onUpdate: (updates: Partial<OptionsListConfig>) => void }) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="max-selections">Max Selections Formula *</Label>
        <Input
          id="max-selections"
          value={config.maxSelectionsFormula || ''}
          onChange={(e) => onUpdate({ maxSelectionsFormula: e.target.value })}
          placeholder="e.g., level / 2, fixed:2, proficiency_bonus"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="options-source">Options Source *</Label>
        <Select
          value={config.optionsSource || 'database'}
          onValueChange={(value: any) => onUpdate({ optionsSource: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="database">Database Table</SelectItem>
            <SelectItem value="custom">Custom List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.optionsSource === 'database' && (
        <div className="space-y-2">
          <Label htmlFor="database-table">Database Table</Label>
          <Input
            id="database-table"
            value={config.databaseTable || ''}
            onChange={(e) => onUpdate({ databaseTable: e.target.value })}
            placeholder="e.g., eldritch_invocations"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="allow-duplicates"
          checked={config.allowDuplicates || false}
          onChange={(e) => onUpdate({ allowDuplicates: e.target.checked })}
        />
        <Label htmlFor="allow-duplicates" className="text-sm">
          Allow duplicate selections
        </Label>
      </div>
    </div>
  )
}

function SpecialUXConfigFields({ config, onUpdate }: { config: SpecialUXConfig; onUpdate: (updates: Partial<SpecialUXConfig>) => void }) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="component-id">Component ID *</Label>
        <Input
          id="component-id"
          value={config.componentId || ''}
          onChange={(e) => onUpdate({ componentId: e.target.value })}
          placeholder="e.g., eldritch-cannon, wild-shape"
        />
        <div className="text-xs text-muted-foreground">
          This identifies which custom component to render
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-config">Custom Configuration (JSON)</Label>
        <Textarea
          id="custom-config"
          value={JSON.stringify(config.customConfig || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onUpdate({ customConfig: parsed })
            } catch {
              // Invalid JSON, don't update
            }
          }}
          placeholder='{"key": "value"}'
          rows={4}
        />
        <div className="text-xs text-muted-foreground">
          Component-specific configuration in JSON format
        </div>
      </div>
    </div>
  )
}

function SkillModifierConfigFields({ config, onUpdate }: { config: SkillModifierConfig; onUpdate: (updates: Partial<SkillModifierConfig>) => void }) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="modifier-formula">Modifier Formula *</Label>
        <Input
          id="modifier-formula"
          value={config.modifierFormula || ''}
          onChange={(e) => onUpdate({ modifierFormula: e.target.value })}
          placeholder="e.g., proficiency_bonus, charisma_modifier, fixed:2"
        />
        <div className="text-xs text-muted-foreground">
          Examples: proficiency_bonus, charisma_modifier, fixed:2
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="modifier-type">Modifier Type *</Label>
        <Select
          value={config.modifierType || 'skill'}
          onValueChange={(value: any) => onUpdate({ modifierType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skill">Skill Checks</SelectItem>
            <SelectItem value="saving_throw">Saving Throws</SelectItem>
            <SelectItem value="ability_check">Ability Checks</SelectItem>
            <SelectItem value="attack_roll">Attack Rolls</SelectItem>
            <SelectItem value="damage_roll">Damage Rolls</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-style">Display Style</Label>
        <Select
          value={config.displayStyle || 'badge'}
          onValueChange={(value: any) => onUpdate({ displayStyle: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="badge">Badge</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="icon">Icon</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function AvailabilityToggleConfigFields({ config, onUpdate }: { config: AvailabilityToggleConfig; onUpdate: (updates: Partial<AvailabilityToggleConfig>) => void }) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="default-available"
          checked={config.defaultAvailable || true}
          onChange={(e) => onUpdate({ defaultAvailable: e.target.checked })}
        />
        <Label htmlFor="default-available" className="text-sm">
          Starts as available (unchecked = starts as used)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="replenish-on">Replenish On *</Label>
        <Select
          value={config.replenishOn || 'long_rest'}
          onValueChange={(value: any) => onUpdate({ replenishOn: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_rest">Short Rest</SelectItem>
            <SelectItem value="long_rest">Long Rest</SelectItem>
            <SelectItem value="dawn">Dawn</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-style">Display Style</Label>
        <Select
          value={config.displayStyle || 'toggle'}
          onValueChange={(value: any) => onUpdate({ displayStyle: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toggle">Toggle Button</SelectItem>
            <SelectItem value="badge">Badge</SelectItem>
            <SelectItem value="button">Button</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="available-text">Available Text</Label>
          <Input
            id="available-text"
            value={config.availableText || 'Available'}
            onChange={(e) => onUpdate({ availableText: e.target.value })}
            placeholder="Available"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="used-text">Used Text</Label>
          <Input
            id="used-text"
            value={config.usedText || 'Used'}
            onChange={(e) => onUpdate({ usedText: e.target.value })}
            placeholder="Used"
          />
        </div>
      </div>
    </div>
  )
}
