"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"

interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function EquipmentModal({ isOpen, onClose, character, onSave }: EquipmentModalProps) {
  const [equipment, setEquipment] = useState(character.equipment)

  const handleSave = () => {
    onSave({ equipment })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="equipment" className="text-sm font-medium">
              Equipment
            </Label>
            <RichTextEditor
              value={equipment}
              onChange={setEquipment}
              placeholder="List your equipment, weapons, armor, and other items..."
              rows={10}
              className="mt-2"
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
