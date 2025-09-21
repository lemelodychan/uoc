"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData } from "@/lib/character-data"
import { Trash2 } from "lucide-react"

interface FeatureEditModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  featureIndex: number | null
  onSave: (updates: Partial<CharacterData>) => void
}

export function FeatureEditModal({ isOpen, onClose, character, featureIndex, onSave }: FeatureEditModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [usesPerLongRest, setUsesPerLongRest] = useState<number | string>(0)
  const [refuelingDie, setRefuelingDie] = useState("")

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && featureIndex !== null && character.features[featureIndex]) {
      const feature = character.features[featureIndex]
      setName(feature.name)
      setDescription(feature.description)
      setUsesPerLongRest(feature.usesPerLongRest ?? 0)
      setRefuelingDie(feature.refuelingDie ?? "")
    } else if (isOpen && featureIndex === null) {
      // New feature
      setName("")
      setDescription("")
      setUsesPerLongRest(0)
      setRefuelingDie("")
    }
  }, [isOpen, featureIndex, character.features])

  const handleSave = () => {
    if (featureIndex === null) {
      // Add new feature
      const newFeature = {
        name,
        description,
        usesPerLongRest,
        currentUses: 0,
        refuelingDie: refuelingDie || undefined
      }
      onSave({ features: [...character.features, newFeature] })
    } else {
      // Update existing feature
      const updatedFeatures = character.features.map((feature, index) => 
        index === featureIndex 
          ? { ...feature, name, description, usesPerLongRest, refuelingDie: refuelingDie || undefined }
          : feature
      )
      onSave({ features: updatedFeatures })
    }
    onClose()
  }

  const handleDelete = () => {
    if (featureIndex !== null) {
      const updatedFeatures = character.features.filter((_, index) => index !== featureIndex)
      onSave({ features: updatedFeatures })
      onClose()
    }
  }

  const isEditing = featureIndex !== null
  const feature = isEditing ? character.features[featureIndex] : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto gap-0 flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle>
            {isEditing ? `Edit Feature: ${feature?.name || "Unknown"}` : "Add New Feature"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feature-name">Name</Label>
            <Input
              id="feature-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feature name"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="feature-description">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Feature description"
              rows={4}
            />
          </div>
          
          <div className="flex flex-row gap-4">
            <div className="flex w-full flex-col gap-2">
              <Label>Max uses per long rest</Label>
              <Select
                value={typeof usesPerLongRest === 'string' ? usesPerLongRest : usesPerLongRest?.toString() ?? "0"}
                onValueChange={(val) => setUsesPerLongRest(isNaN(Number.parseInt(val)) ? val : Number.parseInt(val))}
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
            
            <div className="flex w-full flex-col gap-2">
              <Label>Refueling die</Label>
              <Select
                value={refuelingDie || "none"}
                onValueChange={(val) => setRefuelingDie(val === "none" ? "" : val)}
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
        <DialogFooter className="flex flex-row items-center justify-between gap-2 w-full">
          {isEditing && (
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave}>
            {isEditing ? "Save Changes" : "Add Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
