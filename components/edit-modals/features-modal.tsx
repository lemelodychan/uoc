"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { FeatureEditModal } from "./feature-edit-modal"
import type { CharacterData } from "@/lib/character-data"
import { RichTextDisplay } from "../ui/rich-text-display"

interface FeaturesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeaturesModal({ isOpen, onClose, character, onSave }: FeaturesModalProps) {
  const [featureEditModalOpen, setFeatureEditModalOpen] = useState(false)
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)

  const handleAddFeature = () => {
    setEditingFeatureIndex(null)
    setFeatureEditModalOpen(true)
  }

  const handleEditFeature = (index: number) => {
    setEditingFeatureIndex(index)
    setFeatureEditModalOpen(true)
  }

  const handleFeatureEditClose = () => {
    setFeatureEditModalOpen(false)
    setEditingFeatureIndex(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Features & Traits</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto">
          {character.features.map((feature, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-md">{feature.name || "Unnamed Feature"}</div>
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={feature.description || "No description"} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditFeature(index)}
                  className="w-9 h-9"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {character.features.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No features added yet
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-row items-center align-left justify-start w-full">
          <Button variant="outline" onClick={handleAddFeature}>
            <Plus className="w-4 h-4" />
            Add Feature
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <FeatureEditModal
        isOpen={featureEditModalOpen}
        onClose={handleFeatureEditClose}
        character={character}
        featureIndex={editingFeatureIndex}
        onSave={onSave}
      />
    </Dialog>
  )
}
