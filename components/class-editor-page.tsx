"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Icon } from "@iconify/react"
import { SpellSlotsGrid } from "@/components/ui/spell-slots-grid"
import { ProficiencyCheckboxes, SAVING_THROW_OPTIONS, SKILL_OPTIONS, EQUIPMENT_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import type { ClassData } from "@/lib/class-utils"
import { useToast } from "@/hooks/use-toast"

interface ClassEditorPageProps {
  classData: ClassData
  onSave: (classData: Partial<ClassData>) => void
  onCancel: () => void
  onDelete: (classId: string) => void
  onDuplicate: () => void
}

export function ClassEditorPage({
  classData,
  onSave,
  onCancel,
  onDelete,
  onDuplicate
}: ClassEditorPageProps) {
  const [editingClass, setEditingClass] = useState<ClassData>(classData)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Update local state when classData prop changes
  useEffect(() => {
    console.log('Class editor loaded with classData:', {
      name: classData.name,
      showSpellsKnown: classData.showSpellsKnown,
      showSorceryPoints: classData.showSorceryPoints,
      showMartialArts: classData.showMartialArts,
      showKiPoints: classData.showKiPoints,
      showUnarmoredMovement: classData.showUnarmoredMovement,
      showRage: classData.showRage,
      showRageDamage: classData.showRageDamage,
      is_custom: classData.is_custom
    })
    setEditingClass(classData)
  }, [classData])
  
  // Debug: Log current toggle state whenever editingClass changes
  useEffect(() => {
    console.log('Current editingClass toggle state:', {
      showSpellsKnown: editingClass.showSpellsKnown,
      showSorceryPoints: editingClass.showSorceryPoints,
      showMartialArts: editingClass.showMartialArts,
      showKiPoints: editingClass.showKiPoints,
      showUnarmoredMovement: editingClass.showUnarmoredMovement,
      showRage: editingClass.showRage,
      showRageDamage: editingClass.showRageDamage,
      is_custom: editingClass.is_custom
    })
  }, [editingClass.showSpellsKnown, editingClass.showSorceryPoints, editingClass.showMartialArts, editingClass.showKiPoints, editingClass.showUnarmoredMovement, editingClass.showRage, editingClass.showRageDamage, editingClass.is_custom])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate required fields
      if (!editingClass.name || editingClass.name.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Class name is required",
          variant: "destructive"
        })
        return
      }

      // Prepare the data for saving
      const classDataToSave = {
        ...editingClass,
        name: editingClass.name.trim(),
        // For new classes (empty ID), don't include the ID so database can generate one
        ...(editingClass.id && editingClass.id.trim() !== '' ? { id: editingClass.id } : {}),
        updated_at: new Date().toISOString()
      }
      
      // Debug: Log the toggle values being saved
      console.log('Saving class with toggles:', {
        showSpellsKnown: classDataToSave.showSpellsKnown,
        showSorceryPoints: classDataToSave.showSorceryPoints,
        showMartialArts: classDataToSave.showMartialArts,
        showKiPoints: classDataToSave.showKiPoints,
        showUnarmoredMovement: classDataToSave.showUnarmoredMovement,
        showRage: classDataToSave.showRage,
        showRageDamage: classDataToSave.showRageDamage,
        is_custom: classDataToSave.is_custom
      })
      
      await onSave(classDataToSave)
      toast({
        title: "Success",
        description: "Class saved successfully"
      })
    } catch (error) {
      console.error('Error saving class:', error)
      toast({
        title: "Error",
        description: "Failed to save class",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (editingClass.id && editingClass.id.trim() !== '') {
      if (confirm(`Are you sure you want to delete "${editingClass.name}"? This action cannot be undone.`)) {
        onDelete(editingClass.id)
      }
    }
  }

  const handlePrimaryAbilityChange = (value: string) => {
    // Convert to array format for database
    const abilities = value.split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
    setEditingClass(prev => ({ ...prev, primary_ability: abilities }))
  }

  const getPrimaryAbilityDisplay = () => {
    if (Array.isArray(editingClass.primary_ability)) {
      return editingClass.primary_ability.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
    }
    return editingClass.primary_ability || ''
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="hover:text-primary transition-colors hover:cursor-pointer"
        >
          Management
        </button>
        <Icon icon="lucide:chevron-right" className="w-4 h-4" />
        <span className="text-muted-foreground">
          {editingClass.id ? `Edit ${editingClass.name}` : 'Create New Class'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">
            {editingClass.id ? `Edit ${editingClass.name}` : 'Create New Class'}
          </h1>
          <p className="text-muted-foreground">
            {editingClass.id ? 'Modify class details and features' : 'Create a new custom class'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <Icon icon="lucide:x" className="w-4 h-4" />
            Cancel
          </Button>
          {editingClass.id && editingClass.id.trim() !== '' && (
            <>
              <Button variant="outline" onClick={onDuplicate}>
                <Icon icon="lucide:copy" className="w-4 h-4" />
                Duplicate
              </Button>
              <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                Delete
              </Button>
            </>
          )}
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
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                value={editingClass.name}
                onChange={(e) => setEditingClass(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter class name"
                className="bg-background"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hit-die">Hit Die</Label>
              <Select
                value={editingClass.hit_die?.toString() || "8"}
                onValueChange={(value) => setEditingClass(prev => ({ ...prev, hit_die: parseInt(value) }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">d6</SelectItem>
                  <SelectItem value="8">d8</SelectItem>
                  <SelectItem value="10">d10</SelectItem>
                  <SelectItem value="12">d12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="primary-ability">Primary Ability</Label>
              <Input
                className="bg-background"
                id="primary-ability"
                value={getPrimaryAbilityDisplay()}
                onChange={(e) => handlePrimaryAbilityChange(e.target.value)}
                placeholder="e.g., Strength, Intelligence, Dexterity"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              className="bg-background"
              id="description"
              value={editingClass.description || ''}
              onChange={(e) => setEditingClass(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter class description"
              rows={4}
            />
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="source">Source</Label>
              <Select
                value={editingClass.source || 'custom'}
                onValueChange={(value) => setEditingClass(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="SRD 5.1">SRD 5.1</SelectItem>
                  <SelectItem value="PHB">Player's Handbook</SelectItem>
                  <SelectItem value="XGE">Xanathar's Guide to Everything</SelectItem>
                  <SelectItem value="TCE">Tasha's Cauldron of Everything</SelectItem>
                  <SelectItem value="FToD">Fizban's Treasury of Dragons</SelectItem>
                  <SelectItem value="MPMM">Mordenkainen Presents: Monsters of the Multiverse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="spell-progression">Spell Progression Columns</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-spells-known"
                    checked={editingClass.showSpellsKnown || false}
                    onCheckedChange={(checked) => {
                      console.log('Spells Known toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showSpellsKnown: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-spells-known" className="text-sm font-normal">
                    Spells Known
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-sorcery-points"
                    checked={editingClass.showSorceryPoints || false}
                    onCheckedChange={(checked) => {
                      console.log('Sorcery Points toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showSorceryPoints: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-sorcery-points" className="text-sm font-normal">
                    Sorcery Points
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-martial-arts"
                    checked={editingClass.showMartialArts || false}
                    onCheckedChange={(checked) => {
                      console.log('Martial Arts toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showMartialArts: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-martial-arts" className="text-sm font-normal">
                    Martial Arts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-ki-points"
                    checked={editingClass.showKiPoints || false}
                    onCheckedChange={(checked) => {
                      console.log('Ki Points toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showKiPoints: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-ki-points" className="text-sm font-normal">
                    Ki Points
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-unarmored-movement"
                    checked={editingClass.showUnarmoredMovement || false}
                    onCheckedChange={(checked) => {
                      console.log('Unarmored Movement toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showUnarmoredMovement: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-unarmored-movement" className="text-sm font-normal">
                    Unarmored Movement
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-rage"
                    checked={editingClass.showRage || false}
                    onCheckedChange={(checked) => {
                      console.log('Rage toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showRage: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-rage" className="text-sm font-normal">
                    Rage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-rage-damage"
                    checked={editingClass.showRageDamage || false}
                    onCheckedChange={(checked) => {
                      console.log('Rage Damage toggle changed:', checked)
                      setEditingClass(prev => ({ ...prev, showRageDamage: !!checked }))
                    }}
                  />
                  <Label htmlFor="show-rage-damage" className="text-sm font-normal">
                    Rage Damage
                  </Label>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="is-custom">Custom Class</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="is-custom"
                  checked={editingClass.is_custom || false}
                  onCheckedChange={(checked) => {
                    console.log('Custom Class toggle changed:', checked)
                    setEditingClass(prev => ({ ...prev, is_custom: !!checked }))
                  }}
                />
                <Label htmlFor="is-custom" className="text-sm font-normal">
                  This is a custom class
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proficiencies */}
      <Card>
        <CardHeader>
          <CardTitle>Proficiencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProficiencyCheckboxes
            title="Saving Throw Proficiencies"
            description="Select which saving throws this class is proficient with"
            options={SAVING_THROW_OPTIONS}
            value={editingClass.saving_throw_proficiencies || []}
            onChange={(proficiencies) => setEditingClass(prev => ({ ...prev, saving_throw_proficiencies: proficiencies }))}
            maxSelections={2}
          />
          <ProficiencyCheckboxes
            title="Skill Proficiencies"
            description="Select which skills players can choose from when creating a character with this class"
            options={SKILL_OPTIONS}
            value={editingClass.skill_proficiencies || []}
            onChange={(proficiencies) => setEditingClass(prev => ({ ...prev, skill_proficiencies: proficiencies }))}
          />
          <ProficiencyCheckboxes
            title="Equipment Proficiencies"
            description="Select which equipment this class is proficient with"
            options={EQUIPMENT_OPTIONS}
            value={editingClass.equipment_proficiencies || []}
            onChange={(proficiencies) => setEditingClass(prev => ({ ...prev, equipment_proficiencies: proficiencies }))}
          />
        </CardContent>
      </Card>

      {/* Spell Progression */}
      <Card>
        <CardHeader>
          <CardTitle>Spell Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <SpellSlotsGrid
            value={{
              cantripsKnown: editingClass.cantrips_known || Array(20).fill(0),
              spellsKnown: editingClass.spells_known || Array(20).fill(0),
              spellSlots: {
                spell_slots_1: editingClass.spell_slots_1 || Array(20).fill(0),
                spell_slots_2: editingClass.spell_slots_2 || Array(20).fill(0),
                spell_slots_3: editingClass.spell_slots_3 || Array(20).fill(0),
                spell_slots_4: editingClass.spell_slots_4 || Array(20).fill(0),
                spell_slots_5: editingClass.spell_slots_5 || Array(20).fill(0),
                spell_slots_6: editingClass.spell_slots_6 || Array(20).fill(0),
                spell_slots_7: editingClass.spell_slots_7 || Array(20).fill(0),
                spell_slots_8: editingClass.spell_slots_8 || Array(20).fill(0),
                spell_slots_9: editingClass.spell_slots_9 || Array(20).fill(0)
              },
              // Sorcerer-specific fields
              sorceryPoints: editingClass.sorcery_points || Array(20).fill(0),
              // Monk-specific fields
              martialArtsDice: editingClass.martial_arts_dice || Array(20).fill(4),
              kiPoints: editingClass.ki_points || Array(20).fill(0),
              unarmoredMovement: editingClass.unarmored_movement || Array(20).fill(0),
              // Barbarian-specific fields
              rageUses: editingClass.rage_uses || Array(20).fill(0),
              rageDamage: editingClass.rage_damage || Array(20).fill(0)
            }}
            showSpellsKnown={editingClass.showSpellsKnown || false}
            showSorceryPoints={editingClass.showSorceryPoints || false}
            showMartialArts={editingClass.showMartialArts || false}
            showKiPoints={editingClass.showKiPoints || false}
            showUnarmoredMovement={editingClass.showUnarmoredMovement || false}
            showRage={editingClass.showRage || false}
            showRageDamage={editingClass.showRageDamage || false}
            onChange={(spellData) => {
              setEditingClass(prev => ({
                ...prev,
                cantrips_known: spellData.cantripsKnown,
                spells_known: spellData.spellsKnown || null,
                spell_slots_1: spellData.spellSlots.spell_slots_1,
                spell_slots_2: spellData.spellSlots.spell_slots_2,
                spell_slots_3: spellData.spellSlots.spell_slots_3,
                spell_slots_4: spellData.spellSlots.spell_slots_4,
                spell_slots_5: spellData.spellSlots.spell_slots_5,
                spell_slots_6: spellData.spellSlots.spell_slots_6,
                spell_slots_7: spellData.spellSlots.spell_slots_7,
                spell_slots_8: spellData.spellSlots.spell_slots_8,
                spell_slots_9: spellData.spellSlots.spell_slots_9,
                // Sorcerer-specific fields
                sorcery_points: spellData.sorceryPoints || null,
                // Monk-specific fields
                martial_arts_dice: spellData.martialArtsDice || null,
                ki_points: spellData.kiPoints || null,
                unarmored_movement: spellData.unarmoredMovement || null,
                // Barbarian-specific fields
                rage_uses: spellData.rageUses || null,
                rage_damage: spellData.rageDamage || null
              }))
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
