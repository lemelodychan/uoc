"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { loadBackgroundDetails } from "@/lib/database"
import { CharacterDetailsFieldEditModal } from "./character-details-field-edit-modal"

interface CharacterDetailsContentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  canEdit?: boolean
}

export function CharacterDetailsContentModal({ isOpen, onClose, character, onSave, canEdit = true }: CharacterDetailsContentModalProps) {
  const [editingField, setEditingField] = useState<"personalityTraits" | "backstory" | "notes" | null>(null)
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

  const handleFieldSave = (field: "personalityTraits" | "backstory" | "notes", value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    onSave({ [field]: value })
    setEditingField(null)
  }

  const renderSection = (title: string, field: "personalityTraits" | "backstory" | "notes", content: string) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-md">{title}</h4>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditingField(field)}>
              <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        <div className="p-3 border rounded-lg bg-card character-details-content">
          {content ? (
            <RichTextDisplay content={content} />
          ) : (
            <p className="text-muted-foreground">No {title.toLowerCase()} added yet.</p>
          )}
        </div>
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
          <Label className="text-base font-semibold mb-3">
            <span className="font-normal text-muted-foreground">Background Details:</span> {backgroundName}
          </Label>
          {/* Background Data Section */}
          {backgroundData && (
            (Array.isArray(backgroundData.defining_events) && backgroundData.defining_events.length > 0) ||
            (Array.isArray(backgroundData.personality_traits) && backgroundData.personality_traits.length > 0) ||
            (Array.isArray(backgroundData.ideals) && backgroundData.ideals.length > 0) ||
            (Array.isArray(backgroundData.bonds) && backgroundData.bonds.length > 0) ||
            (Array.isArray(backgroundData.flaws) && backgroundData.flaws.length > 0)
          ) && (
            <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
              {backgroundData.defining_events && backgroundData.defining_events.length > 0 && (
                <div className="flex flex-col gap-1 border bg-background rounded-lg p-2">
                  <Label className="text-sm font-semibold font-display">{definingEventsTitle}</Label>
                  {backgroundData.defining_events.map((event, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {event.text}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
              {backgroundData.personality_traits && backgroundData.personality_traits.length > 0 && (
                <div className="flex flex-col gap-1 border bg-background rounded-lg p-2">
                  <Label className="text-sm font-semibold font-display">Personality Traits</Label>
                  {backgroundData.personality_traits.map((trait, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {trait.text}
                    </div>
                  ))}
                </div>
              )}
              
              {backgroundData.ideals && backgroundData.ideals.length > 0 && (
                <div className="flex flex-col gap-1 border bg-background rounded-lg p-2">
                  <Label className="text-sm font-semibold font-display">Ideals</Label>
                  {backgroundData.ideals.map((ideal, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {ideal.text}
                    </div>
                  ))}
                </div>
              )}
              
              {backgroundData.bonds && backgroundData.bonds.length > 0 && (
                <div className="flex flex-col gap-1 border bg-background rounded-lg p-2">
                  <Label className="text-sm font-semibold font-display">Bonds</Label>
                  {backgroundData.bonds.map((bond, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {bond.text}
                    </div>
                  ))}
                </div>
              )}
              
              {backgroundData.flaws && backgroundData.flaws.length > 0 && (
                <div className="flex flex-col gap-1 border bg-background rounded-lg p-2">
                  <Label className="text-sm font-semibold font-display">Flaws</Label>
                  {backgroundData.flaws.map((flaw, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {flaw.text}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}
          
          <Separator />
          
          {renderSection("Personality Traits", "personalityTraits", formData.personalityTraits)}
          {renderSection("Backstory", "backstory", formData.backstory)}
          {renderSection("Notes", "notes", formData.notes)}
        </div>
      </DialogContent>

      {/* Field Editing Modal */}
      {editingField && (
        <CharacterDetailsFieldEditModal
          isOpen={true}
          onClose={() => setEditingField(null)}
          field={editingField}
          title={
            editingField === "personalityTraits" ? "Personality Traits" :
            editingField === "backstory" ? "Backstory" :
            "Notes"
          }
          value={
            editingField === "personalityTraits" ? formData.personalityTraits :
            editingField === "backstory" ? formData.backstory :
            formData.notes
          }
          onSave={(value) => handleFieldSave(editingField, value)}
          placeholder={
            editingField === "personalityTraits" ? "Describe your character's personality traits..." :
            editingField === "backstory" ? "Tell your character's story. Where did they come from? What shaped them?" :
            "Any additional notes, reminders, or information about your character..."
          }
          canEdit={canEdit}
        />
      )}
    </Dialog>
  )
}
