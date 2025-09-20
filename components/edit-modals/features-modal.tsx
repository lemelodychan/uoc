"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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

  // Sync local state with character prop when it changes
  useEffect(() => {
    setFeatures(character.features)
  }, [character.features])

  const handleSave = () => {
    onSave({ features })
    onClose()
  }

  const addFeature = () => {
    setFeatures([...features, { name: "", description: "", usesPerLongRest: 0, currentUses: 0, refuelingDie: "" }])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, field: string, value: string | number) => {
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
                <RichTextEditor
                  value={feature.description}
                  onChange={(value) => updateFeature(index, "description", value)}
                  placeholder="Feature description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Max uses per long rest</Label>
                  <Select
                    value={typeof feature.usesPerLongRest === 'string' ? feature.usesPerLongRest : feature.usesPerLongRest?.toString() ?? "0"}
                    onValueChange={(val) => updateFeature(index, "usesPerLongRest", isNaN(Number.parseInt(val)) ? val : Number.parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="0" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None (0)</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="prof">Proficiency Bonus</SelectItem>
                      <SelectItem value="str">STR modifier</SelectItem>
                      <SelectItem value="dex">DEX modifier</SelectItem>
                      <SelectItem value="con">CON modifier</SelectItem>
                      <SelectItem value="int">INT modifier</SelectItem>
                      <SelectItem value="wis">WIS modifier</SelectItem>
                      <SelectItem value="cha">CHA modifier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Refueling die</Label>
                  <Select
                    value={feature.refuelingDie ?? "none"}
                    onValueChange={(val) => updateFeature(index, "refuelingDie", val === "none" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1d3">1d3</SelectItem>
                      <SelectItem value="1d4">1d4</SelectItem>
                      <SelectItem value="1d6">1d6</SelectItem>
                      <SelectItem value="1d8">1d8</SelectItem>
                      <SelectItem value="1d10">1d10</SelectItem>
                      <SelectItem value="1d12">1d12</SelectItem>
                      <SelectItem value="1d20">1d20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
