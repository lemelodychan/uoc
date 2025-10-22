"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData, SpellData, FeatSpellSlot } from "@/lib/character-data"

interface SpellModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<SpellData>) => void
}

export function SpellModal({ isOpen, onClose, character, onSave }: SpellModalProps) {
  const [spellData, setSpellData] = useState<SpellData>(character.spellData)
  // Spell list handled at page level

  // Sync local state with character prop when it changes
  useEffect(() => {
    setSpellData(character.spellData)
  }, [character.spellData])

  const handleSave = () => {
    // Only save the editable spell data, preserve calculated data from class
    const editableSpellData = {
      spellAttackBonus: spellData.spellAttackBonus,
      spellSaveDC: spellData.spellSaveDC,
      featSpellSlots: spellData.featSpellSlots,
      spellNotes: spellData.spellNotes,
      spells: spellData.spells,
      // For Paladins, cantrips are editable (optional depending on choices)
      ...(character.class.toLowerCase() === "paladin" && { cantripsKnown: spellData.cantripsKnown }),
    }
    console.log("[v0] SpellModal handleSave called with:", editableSpellData)
    onSave(editableSpellData)
    onClose()
  }

  const handleSpellListSave = (updates: Partial<SpellData>) => {
    setSpellData(prev => ({ ...prev, ...updates }))
  }

  // Spell slot totals are now calculated from class data, not editable

  const addFeatSpellSlot = () => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: [
        ...prev.featSpellSlots,
        {
          spellName: "New Spell",
          featName: "New Feat",
          usesPerLongRest: 1,
          currentUses: 1,
        },
      ],
    }))
  }

  const updateFeatSpellSlot = (index: number, updates: Partial<FeatSpellSlot>) => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.map((feat, i) => (i === index ? { ...feat, ...updates } : feat)),
    }))
  }

  const removeFeatSpellSlot = (index: number) => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.filter((_, i) => i !== index),
    }))
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="mb-2">Edit Spell Data</DialogTitle>
          <DialogDescription className="mb-2">
            Edit your character's spell attack bonus, save DC, and spell notes. Spell slots and cantrips are calculated from your class and level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4 max-h-[50vh] overflow-y-auto">
          {/* Basic Spell Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="spellAttackBonus">Spell Attack Bonus</Label>
              <Input
                id="spellAttackBonus"
                type="number"
                value={spellData.spellAttackBonus}
                onChange={(e) =>
                  setSpellData((prev) => ({ ...prev, spellAttackBonus: Number.parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="spellSaveDC">Spell Save DC</Label>
              <Input
                id="spellSaveDC"
                type="number"
                value={spellData.spellSaveDC}
                onChange={(e) =>
                  setSpellData((prev) => ({ ...prev, spellSaveDC: Number.parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            {/* Cantrips field for Paladins (optional depending on choices) */}
            {character.class.toLowerCase() === "paladin" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="cantripsKnown">Cantrips Known</Label>
                <Input
                  id="cantripsKnown"
                  type="number"
                  min="0"
                  value={spellData.cantripsKnown}
                  onChange={(e) =>
                    setSpellData((prev) => ({ ...prev, cantripsKnown: Number.parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional for Paladins (depends on feats, multiclassing, etc.)
                </p>
              </div>
            )}
          </div>



          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="text-m font-semibold w-full">Feat Spell Slots</div>
                <Button variant="outline" size="sm" onClick={addFeatSpellSlot}>
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  Add Feat
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {spellData.featSpellSlots.map((feat, featIndex) => (
                  <div key={featIndex} className="p-4 border rounded-lg space-y-3 flex flex-col gap-2 bg-card">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Spell name (e.g., Misty Step)"
                        value={feat.spellName}
                        onChange={(e) => updateFeatSpellSlot(featIndex, { spellName: e.target.value })}
                        className="flex-1"
                      />
                      <Button variant="outline" className="w-9 h-9" size="sm" onClick={() => removeFeatSpellSlot(featIndex)}>
                        <Icon icon="lucide:trash-2" className="w-4 h-4 text-[#ce6565] hover:bg-[#ce6565] hover:text-white" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium min-w-0 flex-shrink-0">From Feat:</Label>
                      <Input
                        placeholder="Feat name (e.g., Fey Touched)"
                        value={feat.featName}
                        onChange={(e) => updateFeatSpellSlot(featIndex, { featName: e.target.value })}
                        className="flex-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <Label>Available Slots</Label>
                        <Input
                          type="number"
                          value={feat.currentUses}
                          onChange={(e) =>
                            updateFeatSpellSlot(featIndex, { currentUses: Number.parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Max Slots per Long Rest</Label>
                        <Input
                          type="number"
                          value={feat.usesPerLongRest}
                          onChange={(e) =>
                            updateFeatSpellSlot(featIndex, { usesPerLongRest: Number.parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>
                    </div>

                  </div>
                ))}
                {spellData.featSpellSlots.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">No feat spell slots configured</div>
                )}
              </div>
            </div>
          </div>

          {/* Spell Notes */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="spellNotes" className="text-base font-medium">
              Spell Notes
            </Label>
            <RichTextEditor
              value={spellData.spellNotes}
              onChange={(value) => setSpellData((prev) => ({ ...prev, spellNotes: value }))}
              placeholder="List your known spells, spell descriptions, or other spell-related notes..."
            />
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
