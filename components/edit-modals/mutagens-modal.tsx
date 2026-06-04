"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getMutagenFormulasKnown } from "@/lib/character-data"
import { getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage, updateFeatureUsage, addSingleFeature } from "@/lib/feature-usage-tracker"
import { loadMutagens, type Mutagen } from "@/lib/database"

interface MutagensModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

interface SelectedMutagen {
  id: string
  title: string
  description: string
  sideEffect?: string
}

// Parse a prerequisite like '7th level' / '11th level' into its numeric level.
const parsePrerequisiteLevel = (prerequisite?: string | null): number => {
  if (!prerequisite) return 0
  const match = prerequisite.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export function MutagensModal({ isOpen, onClose, character, onSave }: MutagensModalProps) {
  const [availableMutagens, setAvailableMutagens] = useState<Mutagen[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const bloodHunterLevel = getClassLevel(character, "Blood Hunter")
  const maxKnown = getMutagenFormulasKnown(bloodHunterLevel)

  // Load the seeded mutagen list when the modal opens.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    loadMutagens().then(({ mutagens }) => {
      if (cancelled) return
      setAvailableMutagens(mutagens || [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Seed selection from existing usage data whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return
    const usage = getFeatureUsage(character, "mutagen-formulas")
    const selected = (usage?.selectedOptions || []) as SelectedMutagen[]
    setSelectedIds(selected.map((m) => m.id))
  }, [isOpen, character])

  const toggleMutagen = (mutagenId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(mutagenId)) {
        return prev.filter((id) => id !== mutagenId)
      }
      if (prev.length >= maxKnown) {
        return prev // at cap — ignore
      }
      return [...prev, mutagenId]
    })
  }

  const handleSave = () => {
    // Ensure the feature exists in the unified system.
    let characterWithUsage = character
    if (!getFeatureUsage(character, "mutagen-formulas")) {
      const updatedUsage = addSingleFeature(character, "mutagen-formulas", {
        featureName: "Mutagen Formulas",
        featureType: "options_list",
        enabledAtLevel: 3,
        maxSelections: maxKnown,
      })
      characterWithUsage = { ...character, classFeatureSkillsUsage: updatedUsage }
    }

    const selectedOptions: SelectedMutagen[] = availableMutagens
      .filter((mutagen) => selectedIds.includes(mutagen.id))
      .map((mutagen) => ({
        id: mutagen.id,
        title: mutagen.name,
        description: mutagen.description,
        sideEffect: mutagen.side_effect || undefined,
      }))

    const updatedUsage = updateFeatureUsage(characterWithUsage, "mutagen-formulas", {
      selectedOptions,
      maxSelections: maxKnown,
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
            <Icon icon="lucide:flask-conical" className="w-5 h-5" />
            Edit Mutagen Formulas
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Choose your known formulas</h3>
            <Badge variant={selectedIds.length >= maxKnown ? "default" : "secondary"}>
              {selectedIds.length}/{maxKnown} selected
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading mutagens…</div>
          ) : availableMutagens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No mutagens found. Run the seed script (106) to populate the list.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableMutagens.map((mutagen) => {
                const checked = selectedIds.includes(mutagen.id)
                const requiredLevel = parsePrerequisiteLevel(mutagen.prerequisite)
                const levelLocked = bloodHunterLevel < requiredLevel
                const atCap = !checked && selectedIds.length >= maxKnown
                const disabled = levelLocked || atCap
                return (
                  <label
                    key={mutagen.id}
                    htmlFor={`mutagen-${mutagen.id}`}
                    className={`p-4 border rounded-lg bg-card flex flex-col gap-2 ${
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`mutagen-${mutagen.id}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleMutagen(mutagen.id)}
                        className="w-4 h-4 mt-1 rounded border-border shrink-0"
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{mutagen.name}</span>
                          {mutagen.prerequisite && (
                            <Badge variant="outline" className="text-xs">
                              {mutagen.prerequisite}
                            </Badge>
                          )}
                        </div>
                        <RichTextDisplay content={mutagen.description} className="text-xs text-muted-foreground" />
                        {mutagen.side_effect && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Side effect. </span>
                            <RichTextDisplay content={mutagen.side_effect} className="inline text-xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
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
