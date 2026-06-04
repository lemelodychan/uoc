"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getBloodHunterCursesKnown, getBloodHunterFreeCurse, getClassSubclass } from "@/lib/character-data"
import { getClassLevel } from "@/lib/class-feature-utils"
import { getFeatureUsage, updateFeatureUsage, addSingleFeature } from "@/lib/feature-usage-tracker"
import { loadBloodCurses, type BloodCurse } from "@/lib/database"

interface BloodCursesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

interface SelectedCurse {
  id: string
  title: string
  description: string
  amplified?: string
  granted?: boolean // Order-granted curse — doesn't count against curses known
}

// Parse an order prerequisite like '15th level, Order of the Mutant'.
const parseCursePrerequisite = (prerequisite?: string | null): { level: number; order: string | null } => {
  if (!prerequisite) return { level: 0, order: null }
  const levelMatch = prerequisite.match(/(\d+)/)
  const orderMatch = prerequisite.match(/Order of the ([\w\s]+)/i)
  return {
    level: levelMatch ? parseInt(levelMatch[1], 10) : 0,
    order: orderMatch ? orderMatch[1].trim() : null,
  }
}

export function BloodCursesModal({ isOpen, onClose, character, onSave }: BloodCursesModalProps) {
  const [availableCurses, setAvailableCurses] = useState<BloodCurse[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const bloodHunterLevel = getClassLevel(character, "Blood Hunter")
  const maxKnown = getBloodHunterCursesKnown(bloodHunterLevel)
  const subclass = getClassSubclass(character.classes || [], "Blood Hunter") || character.subclass
  const freeCurseName = getBloodHunterFreeCurse(subclass, bloodHunterLevel)

  // Load the seeded curse list when the modal opens.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    loadBloodCurses().then(({ curses }) => {
      if (cancelled) return
      setAvailableCurses(curses || [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Seed selection from existing usage data whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return
    const usage = getFeatureUsage(character, "blood-curses")
    const selected = (usage?.selectedOptions || []) as SelectedCurse[]
    // Order-granted curses are managed automatically — only seed manual picks.
    setSelectedIds(selected.filter((c) => !c.granted && c.title !== freeCurseName).map((c) => c.id))
  }, [isOpen, character, freeCurseName])

  const toggleCurse = (curseId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(curseId)) {
        return prev.filter((id) => id !== curseId)
      }
      if (prev.length >= maxKnown) {
        return prev // at cap — ignore
      }
      return [...prev, curseId]
    })
  }

  const handleSave = () => {
    // Ensure the feature exists in the unified system.
    let characterWithUsage = character
    if (!getFeatureUsage(character, "blood-curses")) {
      const updatedUsage = addSingleFeature(character, "blood-curses", {
        featureName: "Blood Curses",
        featureType: "options_list",
        enabledAtLevel: 1,
        maxSelections: maxKnown,
      })
      characterWithUsage = { ...character, classFeatureSkillsUsage: updatedUsage }
    }

    const selectedOptions: SelectedCurse[] = availableCurses
      .filter((curse) => selectedIds.includes(curse.id) && curse.name !== freeCurseName)
      .map((curse) => ({
        id: curse.id,
        title: curse.name,
        description: curse.description,
        amplified: curse.amplified_effect || undefined,
      }))

    // Auto-include the order-granted curse (doesn't count against curses known).
    if (freeCurseName) {
      const freeCurse = availableCurses.find((curse) => curse.name === freeCurseName)
      if (freeCurse) {
        selectedOptions.push({
          id: freeCurse.id,
          title: freeCurse.name,
          description: freeCurse.description,
          amplified: freeCurse.amplified_effect || undefined,
          granted: true,
        })
      }
    }

    const updatedUsage = updateFeatureUsage(characterWithUsage, "blood-curses", {
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
            <Icon icon="lucide:droplets" className="w-5 h-5" />
            Edit Blood Curses
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Choose your known curses</h3>
            <Badge variant={selectedIds.length >= maxKnown ? "default" : "secondary"}>
              {selectedIds.length}/{maxKnown} selected
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading curses…</div>
          ) : availableCurses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No blood curses found. Run the seed script (102) to populate the list.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableCurses.map((curse) => {
                const isFreeCurse = curse.name === freeCurseName
                const prereq = parseCursePrerequisite(curse.prerequisite)
                // Order-locked curses require the matching order + level.
                const prereqLocked =
                  !isFreeCurse &&
                  (prereq.order !== null || prereq.level > 0) &&
                  (bloodHunterLevel < prereq.level || (prereq.order !== null && !subclass?.includes(prereq.order)))
                const checked = isFreeCurse || selectedIds.includes(curse.id)
                const atCap = !checked && selectedIds.length >= maxKnown
                const disabled = isFreeCurse || prereqLocked || atCap
                return (
                  <label
                    key={curse.id}
                    htmlFor={`curse-${curse.id}`}
                    className={`p-4 border rounded-lg bg-card flex flex-col gap-2 ${
                      prereqLocked || atCap ? "opacity-50 cursor-not-allowed" : isFreeCurse ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`curse-${curse.id}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleCurse(curse.id)}
                        className="w-4 h-4 mt-1 rounded border-border shrink-0"
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{curse.name}</span>
                          {isFreeCurse ? (
                            <Badge className="text-xs">Order (free)</Badge>
                          ) : (
                            curse.prerequisite && (
                              <Badge variant="outline" className="text-xs">
                                {curse.prerequisite}
                              </Badge>
                            )
                          )}
                        </div>
                        <RichTextDisplay content={curse.description} className="text-xs text-muted-foreground" />
                        {curse.amplified_effect && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Amplified. </span>
                            <RichTextDisplay content={curse.amplified_effect} className="inline text-xs" />
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
