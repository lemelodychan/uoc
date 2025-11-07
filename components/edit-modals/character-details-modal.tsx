"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Separator } from "@/components/ui/separator"
import type { CharacterData } from "@/lib/character-data"
import { loadBackgroundDetails } from "@/lib/database"

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
        }
      })
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
          {backgroundData && (backgroundData.defining_events || backgroundData.personality_traits || backgroundData.ideals || backgroundData.bonds || backgroundData.flaws) && (
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
          
          <div className="space-y-2">
            <Label htmlFor="personalityTraits">Personality Traits</Label>
            <RichTextEditor
              content={formData.personalityTraits}
              onChange={(content) => canEdit && setFormData({ ...formData, personalityTraits: content })}
              placeholder="Describe your character's personality traits..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ideals">Ideals</Label>
            <RichTextEditor
              content={formData.ideals}
              onChange={(content) => canEdit && setFormData({ ...formData, ideals: content })}
              placeholder="What drives your character? What principles do they believe in?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonds">Bonds</Label>
            <RichTextEditor
              content={formData.bonds}
              onChange={(content) => canEdit && setFormData({ ...formData, bonds: content })}
              placeholder="What connects your character to the world? People, places, or things they care about..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flaws">Flaws</Label>
            <RichTextEditor
              content={formData.flaws}
              onChange={(content) => canEdit && setFormData({ ...formData, flaws: content })}
              placeholder="What are your character's weaknesses or vices?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backstory">Backstory</Label>
            <RichTextEditor
              content={formData.backstory}
              onChange={(content) => canEdit && setFormData({ ...formData, backstory: content })}
              placeholder="Tell your character's story. Where did they come from? What shaped them?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor
              content={formData.notes}
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
