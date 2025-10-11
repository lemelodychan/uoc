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
    if (isOpen && featIndex !== null && character.feats[featIndex]) {
      const feat = character.feats[featIndex]
      setName(feat.name)
      setDescription(feat.description)
    } else if (isOpen && featIndex === null) {
      // New feat
      setName("")
      setDescription("")
    }
  }, [isOpen, featIndex, character.feats])

  const handleSave = () => {
    if (featIndex === null) {
      // Add new feat
      const newFeat = {
        name,
        description
      }
      onSave({ feats: [...character.feats, newFeat] })
    } else {
      // Update existing feat
      const updatedFeats = character.feats.map((feat, index) => 
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
      const updatedFeats = character.feats.filter((_, index) => index !== featIndex)
      onSave({ feats: updatedFeats })
      onClose()
    }
  }

  const isEditing = featIndex !== null
  const feat = isEditing ? character.feats[featIndex] : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto gap-0 flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle>
            {isEditing ? `Edit Feat: ${feat?.name || "Unknown"}` : "Add New Feat"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pb-4">
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
        <DialogFooter className="flex flex-row items-center justify-between gap-2 w-full">
          {isEditing && (
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave}>
            {isEditing ? "Save Changes" : "Add Feat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
