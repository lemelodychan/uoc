"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { loadBackgroundDetails } from "@/lib/database"

interface CharacterDetailsContentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  canEdit?: boolean
}

export function CharacterDetailsContentModal({ isOpen, onClose, character, onSave, canEdit = true }: CharacterDetailsContentModalProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    personalityTraits: character.personalityTraits || "",
    backstory: character.backstory || "",
    notes: character.notes || "",
  })
  const [backgroundData, setBackgroundData] = useState<{
    defining_events?: Array<{ number: number; text: string }>
    personality_traits?: Array<{ number: number; text: string }>
    ideals?: Array<{ number: number; text: string }>
    bonds?: Array<{ number: number; text: string }>
    flaws?: Array<{ number: number; text: string }>
  } | null>(null)
  const [backgroundName, setBackgroundName] = useState<string>("")
  const [definingEventsTitle, setDefiningEventsTitle] = useState<string>("Background Setup")

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      personalityTraits: character.personalityTraits || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
    })
  }, [character.personalityTraits, character.backstory, character.notes])

  // Load background data if backgroundId exists
  useEffect(() => {
    console.log('CharacterDetailsContentModal useEffect - Full character object:', character)
    console.log('CharacterDetailsContentModal useEffect - character.backgroundId:', character.backgroundId)
    console.log('CharacterDetailsContentModal useEffect - character.backgroundData:', character.backgroundData)
    console.log('CharacterDetailsContentModal useEffect - typeof character.backgroundData:', typeof character.backgroundData)
    
    if (character.backgroundId) {
      loadBackgroundDetails(character.backgroundId).then(({ background, error }) => {
        if (background && !error) {
          setBackgroundName(background.name)
          setDefiningEventsTitle(background.defining_events_title || "Background Setup")
        }
      })
    } else {
      setBackgroundName("")
      setDefiningEventsTitle("Background Setup")
    }
    
    // Load background_data from character if it exists
    if (character.backgroundData) {
      console.log('Setting backgroundData state to:', character.backgroundData)
      setBackgroundData(character.backgroundData)
    } else {
      console.log('No backgroundData found in character, setting to null')
      setBackgroundData(null)
    }
  }, [character.backgroundId, character.backgroundData])

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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-md">{title}</h4>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => startEditing(field)}>
              <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        {isEditing && canEdit ? (
          <div className="flex flex-col gap-4">
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
          <div className="p-3 border rounded-lg bg-card">
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:user" className="w-5 h-5" />
            Character Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
          {/* Background Data Section */}
          {backgroundData && (
            (Array.isArray(backgroundData.defining_events) && backgroundData.defining_events.length > 0) ||
            (Array.isArray(backgroundData.personality_traits) && backgroundData.personality_traits.length > 0) ||
            (Array.isArray(backgroundData.ideals) && backgroundData.ideals.length > 0) ||
            (Array.isArray(backgroundData.bonds) && backgroundData.bonds.length > 0) ||
            (Array.isArray(backgroundData.flaws) && backgroundData.flaws.length > 0)
          ) && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-base font-semibold">Background: {backgroundName}</Label>
                <p className="text-sm text-muted-foreground">Selected/rolled background features</p>
              </div>
              
              {backgroundData.defining_events && backgroundData.defining_events.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{definingEventsTitle}</Label>
                  <div className="space-y-1 pl-4">
                    {backgroundData.defining_events.map((event, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{event.number}.</span> {event.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {backgroundData.personality_traits && backgroundData.personality_traits.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Personality Traits</Label>
                  <div className="space-y-1 pl-4">
                    {backgroundData.personality_traits.map((trait, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{trait.number}.</span> {trait.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {backgroundData.ideals && backgroundData.ideals.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ideals</Label>
                  <div className="space-y-1 pl-4">
                    {backgroundData.ideals.map((ideal, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{ideal.number}.</span> {ideal.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {backgroundData.bonds && backgroundData.bonds.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bonds</Label>
                  <div className="space-y-1 pl-4">
                    {backgroundData.bonds.map((bond, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{bond.number}.</span> {bond.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {backgroundData.flaws && backgroundData.flaws.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Flaws</Label>
                  <div className="space-y-1 pl-4">
                    {backgroundData.flaws.map((flaw, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{flaw.number}.</span> {flaw.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <Separator />
          
          {renderSection("Personality Traits", "personalityTraits", formData.personalityTraits)}
          {renderSection("Backstory", "backstory", formData.backstory)}
          {renderSection("Notes", "notes", formData.notes)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
