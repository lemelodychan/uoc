"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"

interface CharacterDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function CharacterDetailsModal({ isOpen, onClose, character, onSave }: CharacterDetailsModalProps) {
  const [formData, setFormData] = useState({
    personalityTraits: character.personalityTraits || "",
    ideals: character.ideals || "",
    bonds: character.bonds || "",
    flaws: character.flaws || "",
    backstory: character.backstory || "",
    notes: character.notes || "",
  })

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

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Character Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="personalityTraits">Personality Traits</Label>
            <RichTextEditor
              content={formData.personalityTraits}
              onChange={(content) => setFormData({ ...formData, personalityTraits: content })}
              placeholder="Describe your character's personality traits..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ideals">Ideals</Label>
            <RichTextEditor
              content={formData.ideals}
              onChange={(content) => setFormData({ ...formData, ideals: content })}
              placeholder="What drives your character? What principles do they believe in?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonds">Bonds</Label>
            <RichTextEditor
              content={formData.bonds}
              onChange={(content) => setFormData({ ...formData, bonds: content })}
              placeholder="What connects your character to the world? People, places, or things they care about..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flaws">Flaws</Label>
            <RichTextEditor
              content={formData.flaws}
              onChange={(content) => setFormData({ ...formData, flaws: content })}
              placeholder="What are your character's weaknesses or vices?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backstory">Backstory</Label>
            <RichTextEditor
              content={formData.backstory}
              onChange={(content) => setFormData({ ...formData, backstory: content })}
              placeholder="Tell your character's story. Where did they come from? What shaped them?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor
              content={formData.notes}
              onChange={(content) => setFormData({ ...formData, notes: content })}
              placeholder="Any additional notes, reminders, or information about your character..."
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
