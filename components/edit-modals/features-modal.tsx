"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { CharacterData } from "@/lib/character-data"

interface FeaturesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeaturesModal({ isOpen, onClose, character, onSave }: FeaturesModalProps) {
  const [features, setFeatures] = useState(character.features)

  const handleSave = () => {
    onSave({ features })
    onClose()
  }

  const addFeature = () => {
    setFeatures([...features, { name: "", description: "" }])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = features.map((feature, i) => (i === index ? { ...feature, [field]: value } : feature))
    setFeatures(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Features & Traits</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {features.map((feature, index) => (
            <div key={index} className="grid gap-2 p-3 border rounded">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor={`feature-name-${index}`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`feature-name-${index}`}
                    value={feature.name}
                    onChange={(e) => updateFeature(index, "name", e.target.value)}
                    placeholder="Feature name"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFeature(index)}
                  className="text-destructive hover:text-destructive mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor={`feature-desc-${index}`} className="text-xs">
                  Description
                </Label>
                <Textarea
                  id={`feature-desc-${index}`}
                  value={feature.description}
                  onChange={(e) => updateFeature(index, "description", e.target.value)}
                  placeholder="Feature description"
                  rows={3}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addFeature} className="w-full bg-transparent">
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
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
