"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getFeatureUsage, updateFeatureUsage, addSingleFeature } from "@/lib/feature-usage-tracker"
import { BLOOD_HUNTER_PATRONS } from "@/lib/blood-hunter-patrons"

interface OtherworldlyPatronModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function OtherworldlyPatronModal({ isOpen, onClose, character, onSave }: OtherworldlyPatronModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Seed selection from existing usage data whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return
    const usage = getFeatureUsage(character, "otherworldly-patron")
    const selected = (usage?.selectedOptions || []) as Array<{ id: string }>
    setSelectedId(selected[0]?.id ?? null)
  }, [isOpen, character])

  const handleSave = () => {
    // Ensure the feature exists in the unified system.
    let characterWithUsage = character
    if (!getFeatureUsage(character, "otherworldly-patron")) {
      const updatedUsage = addSingleFeature(character, "otherworldly-patron", {
        featureName: "Otherworldly Patron",
        featureType: "options_list",
        enabledAtLevel: 3,
        maxSelections: 1,
      })
      characterWithUsage = { ...character, classFeatureSkillsUsage: updatedUsage }
    }

    const patron = BLOOD_HUNTER_PATRONS.find((p) => p.id === selectedId)
    const selectedOptions = patron
      ? [{ id: patron.id, title: patron.name, description: patron.riteFocus }]
      : []

    const updatedUsage = updateFeatureUsage(characterWithUsage, "otherworldly-patron", {
      selectedOptions,
      maxSelections: 1,
      lastUpdated: new Date().toISOString(),
    })

    onSave({ classFeatureSkillsUsage: updatedUsage })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[calc(100vh-32px)] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:eye" className="w-5 h-5" />
            Choose Your Otherworldly Patron
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Your patron defines your Rite Focus benefit (3rd level) and the spells granted by Revealed
            Arcana (7th level) and Unsealed Arcana (15th level).
          </p>
          <div className="flex flex-col gap-2">
            {BLOOD_HUNTER_PATRONS.map((patron) => {
              const checked = selectedId === patron.id
              return (
                <label
                  key={patron.id}
                  htmlFor={`patron-${patron.id}`}
                  className="p-4 border rounded-lg bg-card flex flex-col gap-2 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      id={`patron-${patron.id}`}
                      name="otherworldly-patron"
                      checked={checked}
                      onChange={() => setSelectedId(patron.id)}
                      className="w-4 h-4 mt-1 border-border shrink-0"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{patron.name}</span>
                        <Badge variant="outline" className="text-xs">{patron.source}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Rite Focus. </span>
                        {patron.riteFocus}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Revealed Arcana (7th). </span>
                        {patron.revealedArcana}
                        <span className="font-medium text-foreground"> · Unsealed Arcana (15th). </span>
                        {patron.unsealedArcana}
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
