"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import type { CharacterData, Infusion } from "@/lib/character-data"

interface InfusionsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function InfusionsModal({ isOpen, onClose, character, onSave }: InfusionsModalProps) {
  const [infusions, setInfusions] = useState<Infusion[]>(character.infusions || [])
  const [infusionNotes, setInfusionNotes] = useState(character.infusionNotes || "")

  // Sync local state with character prop when it changes
  useEffect(() => {
    setInfusions(character.infusions || [])
    setInfusionNotes(character.infusionNotes || "")
  }, [character.infusions, character.infusionNotes])

  const handleSave = () => {
    onSave({ infusions, infusionNotes })
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:wrench" className="w-5 h-5" />
            Edit Infusions
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[500px] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium mb-3">Infusions List</h3>
            <div className="space-y-4">
              {infusions.map((infusion, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor={`infusion-title-${index}`} className="text-xs font-medium">
                        Infusion Title
                      </Label>
                      <Input
                        id={`infusion-title-${index}`}
                        value={infusion.title}
                        onChange={(e) => updateInfusion(index, "title", e.target.value)}
                        placeholder="e.g., Enhanced Weapon, Repeating Shot"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`infusion-attunement-${index}`}
                          checked={infusion.needsAttunement}
                          onChange={(e) => updateInfusion(index, "needsAttunement", e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`infusion-attunement-${index}`} className="text-xs">
                          Requires Attunement
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInfusion(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
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
              <Button variant="outline" onClick={addInfusion} className="w-full bg-transparent">
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
