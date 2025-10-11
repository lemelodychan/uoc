"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"

interface LanguagesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function LanguagesModal({ isOpen, onClose, character, onSave }: LanguagesModalProps) {
  const [languages, setLanguages] = useState(character.languages)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setLanguages(character.languages)
  }, [character.languages])

  const handleSave = () => {
    onSave({ languages })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Languages</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
          <RichTextEditor
            value={languages}
            onChange={setLanguages}
            placeholder="List languages you know (e.g., **Common**, **Elvish**, **Draconic**)..."
            rows={6}
            className="mt-2"
          />
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
