"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Plus, Trash2 } from "lucide-react"
import type { CharacterData } from "@/lib/character-data"

interface FeatsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeatsModal({ isOpen, onClose, character, onSave }: FeatsModalProps) {
  const [feats, setFeats] = useState(character.feats)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFeats(character.feats)
  }, [character.feats])

  const handleSave = () => {
    onSave({ feats })
    onClose()
  }

  const addFeat = () => {
    setFeats([...feats, { name: "", description: "" }])
  }

  const removeFeat = (index: number) => {
    setFeats(feats.filter((_, i) => i !== index))
  }

  const updateFeat = (index: number, field: string, value: string) => {
    const updated = feats.map((feat, i) => (i === index ? { ...feat, [field]: value } : feat))
    setFeats(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Feats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {feats.map((feat, index) => (
            <div key={index} className="grid gap-2 p-3 border rounded">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor={`feat-name-${index}`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`feat-name-${index}`}
                    value={feat.name}
                    onChange={(e) => updateFeat(index, "name", e.target.value)}
                    placeholder="Feat name"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFeat(index)}
                  className="text-destructive hover:text-destructive mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor={`feat-desc-${index}`} className="text-xs">
                  Description
                </Label>
                <RichTextEditor
                  value={feat.description}
                  onChange={(value) => updateFeat(index, "description", value)}
                  placeholder="Feat description and benefits"
                  rows={3}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addFeat} className="w-full bg-transparent">
            <Plus className="w-4 h-4 mr-2" />
            Add Feat
          </Button>
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
