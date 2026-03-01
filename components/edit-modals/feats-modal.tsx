"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { FeatEditModal } from "./feat-edit-modal"
import { FeatSelectionModal } from "./feat-selection-modal"
import type { CharacterData } from "@/lib/character-data"
import { RichTextDisplay } from "@/components/ui/rich-text-display"

interface FeatsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
  onOpenSpellEditor?: () => void
}

export function FeatsModal({ isOpen, onClose, character, onSave, onOpenSpellEditor }: FeatsModalProps) {
  const [featEditModalOpen, setFeatEditModalOpen] = useState(false)
  const [featSelectionModalOpen, setFeatSelectionModalOpen] = useState(false)
  const [editingFeatIndex, setEditingFeatIndex] = useState<number | null>(null)

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
          <DialogTitle>Feats</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 p-4 max-h-[50vh] overflow-y-auto">
          {(character.feats || []).map((feat, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg bg-card gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="font-semibold text-md">{feat.name || "Unnamed Feat"}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  <RichTextDisplay content={feat.description || "No description"} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditFeat(index)}
                className="w-9 h-9 shrink-0"
              >
                <Icon icon="lucide:edit" className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {character.feats.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No feats added yet
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingFeatIndex(null); setFeatEditModalOpen(true) }}>
            <Icon icon="lucide:pencil" className="w-4 h-4" />
            Add Custom
          </Button>
          <Button variant="default" size="sm" onClick={() => setFeatSelectionModalOpen(true)}>
            <Icon icon="lucide:book-open" className="w-4 h-4" />
            Pick from Library
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

      <FeatSelectionModal
        isOpen={featSelectionModalOpen}
        onClose={() => setFeatSelectionModalOpen(false)}
        character={character}
        onSave={onSave}
        onOpenSpellEditor={() => {
          setFeatSelectionModalOpen(false)
          onClose()
          onOpenSpellEditor?.()
        }}
      />
    </Dialog>
  )
}
