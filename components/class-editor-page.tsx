"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    setEditingClass(classData)
  }, [classData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Prepare the data for saving
      const classDataToSave = {
        ...editingClass,
        updated_at: new Date().toISOString()
      }
      
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
    if (confirm(`Are you sure you want to delete "${editingClass.name}"? This action cannot be undone.`)) {
      onDelete(editingClass.id)
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
          {editingClass.id && (
            <>
              <Button variant="outline" onClick={onDuplicate}>
                <Icon icon="lucide:copy" className="w-4 h-4" />
                Duplicate
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
              }
            }}
            showSpellsKnown={editingClass.name?.toLowerCase() === 'bard'}
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
                spell_slots_9: spellData.spellSlots.spell_slots_9
              }))
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
