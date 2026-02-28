"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { Separator } from "@/components/ui/separator"
import type { CharacterData } from "@/lib/character-data"
import { loadBackgroundDetails } from "@/lib/database"
import { RichTextDisplay } from "@/components/ui/rich-text-display"

interface CharacterDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  canEdit?: boolean
}

export function CharacterDetailsModal({ isOpen, onClose, character, onSave, canEdit = true }: CharacterDetailsModalProps) {
  const [formData, setFormData] = useState({
    personalityTraits: character.personalityTraits || "",
    ideals: character.ideals || "",
    bonds: character.bonds || "",
    flaws: character.flaws || "",
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
  const [backgroundFeature, setBackgroundFeature] = useState<{ name: string; description: string } | null>(null)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFormData({
      personalityTraits: character.personalityTraits || "",
      ideals: character.ideals || "",
      bonds: character.bonds || "",
      flaws: character.flaws || "",
      backstory: character.backstory || "",
      notes: character.notes || "",
    })
  }, [character.personalityTraits, character.ideals, character.bonds, character.flaws, character.backstory, character.notes])

  // Load background data if backgroundId exists
  useEffect(() => {
    if (character.backgroundId) {
      loadBackgroundDetails(character.backgroundId).then(({ background, error }) => {
        if (background && !error) {
          setBackgroundName(background.name)
          setDefiningEventsTitle(background.defining_events_title || "Background Setup")
          setBackgroundFeature(background.background_feature || null)
        }
      })
    } else {
      setBackgroundFeature(null)
    }
    // Load background_data from character if it exists
    if (character.backgroundData) {
      setBackgroundData(character.backgroundData)
    } else {
      setBackgroundData(null)
    }
  }, [character.backgroundId, character.backgroundData])

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Character Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 p-4 max-h-[50vh] overflow-y-auto">
          {/* Background Data Section */}
          {(backgroundFeature || (backgroundData && (backgroundData.defining_events || backgroundData.personality_traits || backgroundData.ideals || backgroundData.bonds || backgroundData.flaws))) && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <Label className="text-base font-semibold">Background: {backgroundName}</Label>

              {backgroundFeature && (
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">{backgroundFeature.name}</Label>
                  <div className="text-sm text-muted-foreground">
                    <RichTextDisplay content={backgroundFeature.description} />
                  </div>
                </div>
              )}

              {backgroundData && backgroundData.defining_events && backgroundData.defining_events.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">{definingEventsTitle}</Label>
                  {backgroundData.defining_events.map((event, idx) => (
                    <div key={idx} className="text-sm">
                      {event.text}
                    </div>
                  ))}
                </div>
              )}
              
              {backgroundData?.personality_traits && backgroundData.personality_traits.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Personality Traits</Label>
                  {backgroundData.personality_traits.map((trait, idx) => (
                    <div key={idx} className="text-sm">
                      {trait.text}
                    </div>
                  ))}
                </div>
              )}

              {backgroundData?.ideals && backgroundData.ideals.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Ideals</Label>
                  {backgroundData.ideals.map((ideal, idx) => (
                    <div key={idx} className="text-sm">
                      {ideal.text}
                    </div>
                  ))}
                </div>
              )}

              {backgroundData?.bonds && backgroundData.bonds.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Bonds</Label>
                  {backgroundData.bonds.map((bond, idx) => (
                    <div key={idx} className="text-sm">
                      {bond.text}
                    </div>
                  ))}
                </div>
              )}

              {backgroundData?.flaws && backgroundData.flaws.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Flaws</Label>
                    {backgroundData.flaws.map((flaw, idx) => (
                      <div key={idx} className="text-sm">
                        {flaw.text}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="personalityTraits">Personality Traits</Label>
            <WysiwygEditor
              value={formData.personalityTraits}
              onChange={(content) => canEdit && setFormData({ ...formData, personalityTraits: content })}
              placeholder="Describe your character's personality traits..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backstory">Backstory</Label>
            <WysiwygEditor
              value={formData.backstory}
              onChange={(content) => canEdit && setFormData({ ...formData, backstory: content })}
              placeholder="Tell your character's story. Where did they come from? What shaped them?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <WysiwygEditor
              value={formData.notes}
              onChange={(content) => canEdit && setFormData({ ...formData, notes: content })}
              placeholder="Any additional notes, reminders, or information about your character..."
            />
          </div>
        </div>
        {canEdit && (
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
