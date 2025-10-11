"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { FeatEditModal } from "./feat-edit-modal"
import type { CharacterData } from "@/lib/character-data"
import { RichTextDisplay } from "@/components/ui/rich-text-display"

interface FeatsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeatsModal({ isOpen, onClose, character, onSave }: FeatsModalProps) {
  const [featEditModalOpen, setFeatEditModalOpen] = useState(false)
  const [editingFeatIndex, setEditingFeatIndex] = useState<number | null>(null)

  const handleAddFeat = () => {
    setEditingFeatIndex(null)
    setFeatEditModalOpen(true)
  }

  const handleEditFeat = (index: number) => {
    setEditingFeatIndex(index)
    setFeatEditModalOpen(true)
  }

  const handleFeatEditClose = () => {
    setFeatEditModalOpen(false)
    setEditingFeatIndex(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Feats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
          {character.feats.map((feat, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-md">{feat.name || "Unnamed Feat"}</div>
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={feat.description || "No description"} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditFeat(index)}
                className="w-9 h-9"
              >
                <Icon icon="lucide:edit" className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {character.feats.length === 0 && (
            <div className="text-sm text-muted-foreground text-center">
              No feats added yet
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleAddFeat}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Add Feat
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <FeatEditModal
        isOpen={featEditModalOpen}
        onClose={handleFeatEditClose}
        character={character}
        featIndex={editingFeatIndex}
        onSave={onSave}
      />
    </Dialog>
  )
}
