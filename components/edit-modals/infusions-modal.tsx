"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import type { CharacterData, Infusion } from "@/lib/character-data"
import { getFeatureUsage, addFeatureOption, removeFeatureOption, updateFeatureUsage, addSingleFeature } from "@/lib/feature-usage-tracker"

interface InfusionsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function InfusionsModal({ isOpen, onClose, character, onSave }: InfusionsModalProps) {
  const [infusions, setInfusions] = useState<Infusion[]>([])
  const [infusionNotes, setInfusionNotes] = useState("")

  // Get unified feature usage data
  const infusionsUsage = getFeatureUsage(character, 'artificer-infusions')
  const selectedInfusions = infusionsUsage?.selectedOptions || []
  const maxSelections = infusionsUsage?.maxSelections || 0

  // Sync local state with character prop when it changes
  useEffect(() => {
    // Always prioritize unified feature usage data if it exists
    if (infusionsUsage && infusionsUsage.selectedOptions) {
      const unifiedInfusions = infusionsUsage.selectedOptions.map((option: any) => {
        if (typeof option === 'object') {
          return {
            id: option.id,
            title: option.title,
            description: option.description,
            needsAttunement: option.needsAttunement,
            ...option
          }
        } else {
          // Fallback for string-based options
          return {
            id: option,
            title: option,
            description: '',
            needsAttunement: false
          }
        }
      })
      setInfusions(unifiedInfusions)
    } else {
      // No unified data exists, start with empty array
      setInfusions([])
    }
    
    // Use unified notes only (legacy notes column has been dropped)
    setInfusionNotes(infusionsUsage?.notes || "")
  }, [infusionsUsage])

  const handleSave = () => {
    const updates: Partial<CharacterData> = {}
    
    // Ensure the infusions feature exists in unified system
    let characterWithUsage = character
    if (!infusionsUsage) {
      const maxInfusions = Math.max(1, Math.floor((character.intelligence - 10) / 2))
      const updatedUsage = addSingleFeature(character, 'artificer-infusions', {
        featureName: 'Infuse Item',
        featureType: 'options_list',
        enabledAtLevel: 2,
        maxSelections: maxInfusions
      })
      characterWithUsage = { ...character, classFeatureSkillsUsage: updatedUsage }
    }
    
    // Update infusions using proper feature usage tracker
    const updatedUsage = updateFeatureUsage(characterWithUsage, 'artificer-infusions', {
      selectedOptions: infusions.map(infusion => ({
        ...infusion, // Preserve any additional properties first
        id: infusion.id || `infusion-${Date.now()}-${Math.random()}`,
        title: infusion.title || 'Untitled Infusion',
        description: infusion.description || '',
        needsAttunement: infusion.needsAttunement || false
      })),
      notes: infusionNotes, // Save notes to unified system
      lastUpdated: new Date().toISOString()
    })
    
    updates.classFeatureSkillsUsage = updatedUsage
    
    // Legacy fields removed: unified system is the source of truth
    
    onSave(updates)
    onClose()
  }

  const addInfusion = () => {
    setInfusions([...infusions, { title: "", description: "", needsAttunement: false }])
  }

  const removeInfusion = (index: number) => {
    setInfusions(infusions.filter((_, i) => i !== index))
  }

  const updateInfusion = (index: number, field: keyof Infusion, value: string | boolean) => {
    const updated = infusions.map((infusion, i) => 
      i === index ? { ...infusion, [field]: value } : infusion
    )
    setInfusions(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:wrench" className="w-5 h-5" />
            Edit Infusions
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 p-4 max-h-[50vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium mb-3">Infusions List</h3>
            <div className="flex flex-col gap-2">
              {infusions.map((infusion, index) => (
                <div key={index} className="p-4 border rounded-lg bg-card relative flex flex-col gap-4">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeInfusion(index)}
                      className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8 absolute right-4 top-4"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`infusion-title-${index}`} className="text-xs font-medium">
                        Infusion Title
                      </Label>
                      <Input
                        id={`infusion-title-${index}`}
                        value={infusion.title}
                        onChange={(e) => updateInfusion(index, "title", e.target.value)}
                        placeholder="e.g., Enhanced Weapon, Repeating Shot"
                        className="w-[240px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`infusion-attunement-${index}`}
                        checked={infusion.needsAttunement}
                        onChange={(e) => updateInfusion(index, "needsAttunement", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <Label htmlFor={`infusion-attunement-${index}`} className="text-xs">
                        Requires Attunement
                      </Label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`infusion-description-${index}`} className="text-xs font-medium">
                      Description
                    </Label>
                    <RichTextEditor
                      value={infusion.description}
                      onChange={(value) => updateInfusion(index, "description", value)}
                      placeholder="Describe the infusion's effects, benefits, and any special rules..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addInfusion} className="w-full bg-card">
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Add Infusion
              </Button>
            </div>
          </div>

          {infusions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="lucide:wrench" className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No infusions added yet.</p>
              <p className="text-xs">Click "Add Infusion" to create your first infusion.</p>
            </div>
          )}

          {/* Infusion Notes */}
          <div>
            <h3 className="text-sm font-medium mb-3">Infusion Notes</h3>
            <RichTextEditor
              value={infusionNotes}
              onChange={setInfusionNotes}
              placeholder="Add notes about your infusions, strategies, or any additional information..."
              rows={6}
            />
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
