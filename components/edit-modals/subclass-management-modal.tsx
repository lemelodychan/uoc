"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import { useToast } from "@/hooks/use-toast"
import type { ClassData } from "@/lib/class-utils"
import { upsertClass, deleteClass } from "@/lib/database"

interface SubclassManagementModalProps {
  isOpen: boolean
  onClose: () => void
  baseClass: ClassData
  allClasses: ClassData[]
  onSave: () => void
}

export function SubclassManagementModal({
  isOpen,
  onClose,
  baseClass,
  allClasses,
  onSave
}: SubclassManagementModalProps) {
  const [subclasses, setSubclasses] = useState<ClassData[]>([])
  const [editingSubclass, setEditingSubclass] = useState<ClassData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const { toast } = useToast()

  // Load subclasses for this base class
  useEffect(() => {
    if (isOpen && baseClass) {
      const baseClassSubclasses = allClasses.filter(
        c => c.name === baseClass.name && c.subclass !== null
      )
      setSubclasses(baseClassSubclasses)
    }
  }, [isOpen, baseClass, allClasses])

  const handleCreateSubclass = () => {
    const newSubclass: ClassData = {
      id: '',
      name: baseClass.name,
      subclass: '',
      description: '',
      hit_die: baseClass.hit_die,
      primary_ability: baseClass.primary_ability,
      saving_throw_proficiencies: baseClass.saving_throw_proficiencies,
      skill_proficiencies: baseClass.skill_proficiencies,
      equipment_proficiencies: baseClass.equipment_proficiencies,
      starting_equipment: baseClass.starting_equipment,
      spell_slots_1: baseClass.spell_slots_1,
      spell_slots_2: baseClass.spell_slots_2,
      spell_slots_3: baseClass.spell_slots_3,
      spell_slots_4: baseClass.spell_slots_4,
      spell_slots_5: baseClass.spell_slots_5,
      spell_slots_6: baseClass.spell_slots_6,
      spell_slots_7: baseClass.spell_slots_7,
      spell_slots_8: baseClass.spell_slots_8,
      spell_slots_9: baseClass.spell_slots_9,
      cantrips_known: baseClass.cantrips_known,
      spells_known: baseClass.spells_known,
      is_custom: baseClass.is_custom,
      created_by: baseClass.created_by,
      duplicated_from: baseClass.duplicated_from,
      source: baseClass.source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setEditingSubclass(newSubclass)
    setIsCreating(true)
    setShowEditModal(true)
  }

  const handleEditSubclass = (subclass: ClassData) => {
    setEditingSubclass(subclass)
    setIsCreating(false)
    setShowEditModal(true)
  }

  const handleSaveSubclass = async () => {
    if (!editingSubclass || !editingSubclass.subclass?.trim()) {
      toast({
        title: "Error",
        description: "Subclass name is required",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await upsertClass(editingSubclass)
      if (result.success) {
        toast({
          title: "Success",
          description: `Subclass "${editingSubclass.subclass}" ${isCreating ? 'created' : 'updated'} successfully`
        })
        setEditingSubclass(null)
        setIsCreating(false)
        setShowEditModal(false)
        onSave() // Reload classes
      } else {
        throw new Error(result.error || 'Failed to save subclass')
      }
    } catch (error) {
      console.error('Error saving subclass:', error)
      toast({
        title: "Error",
        description: "Failed to save subclass",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSubclass = async (subclass: ClassData) => {
    if (confirm(`Are you sure you want to delete the "${subclass.subclass}" subclass? This action cannot be undone.`)) {
      try {
        const result = await deleteClass(subclass.id)
        if (result.success) {
          toast({
            title: "Success",
            description: `Subclass "${subclass.subclass}" deleted successfully`
          })
          onSave() // Reload classes
        } else {
          throw new Error(result.error || 'Failed to delete subclass')
        }
      } catch (error) {
        console.error('Error deleting subclass:', error)
        toast({
          title: "Error",
          description: "Failed to delete subclass",
          variant: "destructive"
        })
      }
    }
  }

  const handleCancel = () => {
    setEditingSubclass(null)
    setIsCreating(false)
    setShowEditModal(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[70vw] !max-w-[70vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:layers" className="w-5 h-5" />
            Manage Subclasses for {baseClass.name}
          </DialogTitle>
          <DialogDescription>
            Create, edit, and delete subclasses for {baseClass.name}. Subclasses inherit all base class properties.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
          <div className="flex flex-col">
          {/* Subclass List */}
            <div className="flex flex-col gap-4">
              {subclasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon icon="lucide:layers" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subclasses found for {baseClass.name}</p>
                  <p className="text-sm">Click "Create Subclass" to add one</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {subclasses.map((subclass) => (
                    <Card key={subclass.id}>
                      <CardContent className="px-4">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{subclass.subclass}</h4>
                              {subclass.is_custom && (
                                <Badge variant="secondary" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            {subclass.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {subclass.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSubclass(subclass)}
                              className="w-8 h-8"
                            >
                              <Icon icon="lucide:edit" className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSubclass(subclass)}
                              className="w-8 h-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                            >
                              <Icon icon="lucide:trash-2" className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <div className="flex gap-2 justify-end">
            <Button onClick={handleCreateSubclass}>
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Create Subclass
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Subclass Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle>
              {isCreating ? 'Create New Subclass' : `Edit ${editingSubclass?.subclass}`}
            </DialogTitle>
            <DialogDescription>
              {isCreating 
                ? `Create a new subclass for ${baseClass.name}`
                : `Edit the ${editingSubclass?.subclass} subclass`
              }
            </DialogDescription>
          </DialogHeader>

          {editingSubclass && (
            <div className="p-4 bg-background overflow-y-auto flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="subclass-name">Subclass Name</Label>
                <Input
                  id="subclass-name"
                  value={editingSubclass.subclass || ''}
                  onChange={(e) => setEditingSubclass(prev => 
                    prev ? { ...prev, subclass: e.target.value } : null
                  )}
                  placeholder="e.g., Battle Smith, Artillerist, Alchemist"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="subclass-description">Description</Label>
                <Textarea
                  id="subclass-description"
                  value={editingSubclass.description || ''}
                  onChange={(e) => setEditingSubclass(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  placeholder="Describe this subclass and its unique features..."
                  rows={4}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg border">
                <div className="flex flex-row gap-6 text-sm">
                  <div className="flex flex-row gap-1">
                    <span className="text-muted-foreground">Hit Die:</span>
                    <span className="font-medium">d{baseClass.hit_die}</span>
                  </div>
                  <div className="flex flex-row gap-1">
                    <span className="text-muted-foreground">Primary Ability:</span>
                    <span className="font-medium">
                      {Array.isArray(baseClass.primary_ability) 
                        ? baseClass.primary_ability.join(', ')
                        : baseClass.primary_ability
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubclass} disabled={isSaving}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
