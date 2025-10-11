"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface CharacterDetailsContentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function CharacterDetailsContentModal({ isOpen, onClose, character, onSave }: CharacterDetailsContentModalProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    personalityTraits: character.personalityTraits || "",
    backstory: character.backstory || "",
    notes: character.notes || "",
  })

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      personalityTraits: character.personalityTraits || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
    })
  }, [character.personalityTraits, character.backstory, character.notes])

  const handleSave = () => {
    onSave(formData)
    setEditingSection(null)
  }

  const handleCancel = () => {
    setFormData({
      personalityTraits: character.personalityTraits || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
    })
    setEditingSection(null)
  }

  const startEditing = (section: string) => {
    setEditingSection(section)
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderSection = (title: string, field: keyof typeof formData, content: string) => {
    const isEditing = editingSection === field
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-lg">{title}</h4>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => startEditing(field)}>
              <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <RichTextEditor
              value={formData[field]}
              onChange={(value) => updateField(field, value)}
              placeholder={`Enter ${title.toLowerCase()}...`}
              rows={4}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 border rounded-lg bg-muted/20">
            {content ? (
              <RichTextDisplay content={content} />
            ) : (
              <p className="text-muted-foreground">No {title.toLowerCase()} added yet.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:user" className="w-5 h-5" />
            Character Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4 max-h-[50vh] overflow-y-auto">
          {renderSection("Personality Traits", "personalityTraits", formData.personalityTraits)}
          {renderSection("Backstory", "backstory", formData.backstory)}
          {renderSection("Notes", "notes", formData.notes)}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
