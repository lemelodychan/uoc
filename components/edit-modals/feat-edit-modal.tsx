"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"
import { Icon } from "@iconify/react"

interface FeatEditModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  featIndex: number | null
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeatEditModal({ isOpen, onClose, character, featIndex, onSave }: FeatEditModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Initialize form when modal opens
  useEffect(() => {
    const feats = character.feats || []
    if (isOpen && featIndex !== null && feats[featIndex]) {
      const feat = feats[featIndex]
      setName(feat.name)
      setDescription(feat.description)
    } else if (isOpen && featIndex === null) {
      // New feat
      setName("")
      setDescription("")
    }
  }, [isOpen, featIndex, character.feats])

  const handleSave = () => {
    const feats = character.feats || []
    if (featIndex === null) {
      // Add new feat
      const newFeat = {
        name,
        description
      }
      onSave({ feats: [...feats, newFeat] })
    } else {
      // Update existing feat
      const updatedFeats = feats.map((feat, index) => 
        index === featIndex 
          ? { ...feat, name, description }
          : feat
      )
      onSave({ feats: updatedFeats })
    }
    onClose()
  }

  const handleDelete = () => {
    if (featIndex !== null) {
      const feats = character.feats || []
      const updatedFeats = feats.filter((_, index) => index !== featIndex)
      onSave({ feats: updatedFeats })
      onClose()
    }
  }

  const isEditing = featIndex !== null
  const feats = character.feats || []
  const feat = isEditing ? feats[featIndex] : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {isEditing ? `Edit Feat: ${feat?.name || "Unknown"}` : "Add New Feat"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feat-name">Name</Label>
            <Input
              id="feat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feat name"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="feat-description">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Feat description and benefits"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          {isEditing && (
            <Button variant="outline" onClick={handleDelete} className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white">
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? "Save Changes" : "Add Feat"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
