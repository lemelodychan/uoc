"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import type { CharacterData, SpellData, FeatSpellSlot } from "@/lib/character-data"

interface SpellModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function SpellModal({ isOpen, onClose, character, onSave }: SpellModalProps) {
  const [spellData, setSpellData] = useState<SpellData>(character.spellData)

  const handleSave = () => {
    onSave({ spellData })
    onClose()
  }

  const updateSpellSlotTotal = (level: number, total: number) => {
    setSpellData((prev) => ({
      ...prev,
      spellSlots: prev.spellSlots.map((slot) => (slot.level === level ? { ...slot, total: Math.max(0, total) } : slot)),
    }))
  }

  const addSpellSlotLevel = () => {
    const maxLevel = Math.max(...spellData.spellSlots.map((s) => s.level), 0)
    setSpellData((prev) => ({
      ...prev,
      spellSlots: [...prev.spellSlots, { level: maxLevel + 1, total: 1, used: 0 }],
    }))
  }

  const removeSpellSlotLevel = (level: number) => {
    setSpellData((prev) => ({
      ...prev,
      spellSlots: prev.spellSlots.filter((slot) => slot.level !== level),
    }))
  }

  const addFeatSpellSlot = () => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: [
        ...prev.featSpellSlots,
        {
          name: "New Feat",
          spells: [],
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

  const addSpellToFeat = (featIndex: number) => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.map((feat, i) =>
        i === featIndex ? { ...feat, spells: [...feat.spells, "New Spell"] } : feat,
      ),
    }))
  }

  const updateFeatSpell = (featIndex: number, spellIndex: number, spellName: string) => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.map((feat, i) =>
        i === featIndex
          ? { ...feat, spells: feat.spells.map((spell, j) => (j === spellIndex ? spellName : spell)) }
          : feat,
      ),
    }))
  }

  const removeSpellFromFeat = (featIndex: number, spellIndex: number) => {
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.map((feat, i) =>
        i === featIndex ? { ...feat, spells: feat.spells.filter((_, j) => j !== spellIndex) } : feat,
      ),
    }))
  }

  const isBard = character.class.toLowerCase() === "bard"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Spell Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Spell Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
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
            <div>
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
            <div>
              <Label htmlFor="cantripsKnown">Cantrips Known</Label>
              <Input
                id="cantripsKnown"
                type="number"
                value={spellData.cantripsKnown}
                onChange={(e) =>
                  setSpellData((prev) => ({ ...prev, cantripsKnown: Number.parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="spellsKnown">Spells Known</Label>
              <Input
                id="spellsKnown"
                type="number"
                value={spellData.spellsKnown}
                onChange={(e) =>
                  setSpellData((prev) => ({ ...prev, spellsKnown: Number.parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          {isBard && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bard Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Bardic Inspiration Slot */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Bardic Inspiration</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="bardicDie" className="text-xs">
                            Die Type
                          </Label>
                          <select
                            id="bardicDie"
                            className="w-full p-2 border rounded text-sm"
                            value={spellData.bardicInspirationSlot?.dieType || "d6"}
                            onChange={(e) =>
                              setSpellData((prev) => ({
                                ...prev,
                                bardicInspirationSlot: {
                                  dieType: e.target.value,
                                  usesPerRest: prev.bardicInspirationSlot?.usesPerRest || 1,
                                  currentUses: prev.bardicInspirationSlot?.currentUses || 1,
                                },
                              }))
                            }
                          >
                            <option value="d6">d6</option>
                            <option value="d8">d8</option>
                            <option value="d10">d10</option>
                            <option value="d12">d12</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="bardicUses" className="text-xs">
                            Max Uses
                          </Label>
                          <Input
                            id="bardicUses"
                            type="number"
                            value={spellData.bardicInspirationSlot?.usesPerRest || 0}
                            onChange={(e) =>
                              setSpellData((prev) => ({
                                ...prev,
                                bardicInspirationSlot: {
                                  dieType: prev.bardicInspirationSlot?.dieType || "d6",
                                  usesPerRest: Number.parseInt(e.target.value) || 0,
                                  currentUses: prev.bardicInspirationSlot?.currentUses || 0,
                                },
                              }))
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bardicCurrent" className="text-xs">
                            Current Uses
                          </Label>
                          <Input
                            id="bardicCurrent"
                            type="number"
                            value={spellData.bardicInspirationSlot?.currentUses || 0}
                            onChange={(e) =>
                              setSpellData((prev) => ({
                                ...prev,
                                bardicInspirationSlot: {
                                  dieType: prev.bardicInspirationSlot?.dieType || "d6",
                                  usesPerRest: prev.bardicInspirationSlot?.usesPerRest || 0,
                                  currentUses: Number.parseInt(e.target.value) || 0,
                                },
                              }))
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Song of Rest */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Song of Rest</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="songDie" className="text-xs">
                            Healing Die
                          </Label>
                          <select
                            id="songDie"
                            className="w-full p-2 border rounded text-sm"
                            value={spellData.songOfRest?.healingDie || "d6"}
                            onChange={(e) =>
                              setSpellData((prev) => ({
                                ...prev,
                                songOfRest: {
                                  healingDie: e.target.value,
                                  available: prev.songOfRest?.available || false,
                                },
                              }))
                            }
                          >
                            <option value="d6">d6</option>
                            <option value="d8">d8</option>
                            <option value="d10">d10</option>
                            <option value="d12">d12</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-2 pt-4">
                          <input
                            type="checkbox"
                            id="songAvailable"
                            checked={spellData.songOfRest?.available || false}
                            onChange={(e) =>
                              setSpellData((prev) => ({
                                ...prev,
                                songOfRest: {
                                  healingDie: prev.songOfRest?.healingDie || "d6",
                                  available: e.target.checked,
                                },
                              }))
                            }
                          />
                          <Label htmlFor="songAvailable" className="text-xs">
                            Available
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Spell Slots (Max Values)</CardTitle>
                <Button variant="outline" size="sm" onClick={addSpellSlotLevel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Level
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {spellData.spellSlots
                  .sort((a, b) => a.level - b.level)
                  .map((slot) => (
                    <div key={slot.level} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Badge variant="outline">Level {slot.level}</Badge>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Max Slots:</Label>
                        <Input
                          type="number"
                          value={slot.total}
                          onChange={(e) => updateSpellSlotTotal(slot.level, Number.parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">
                          Currently: {slot.total - slot.used}/{slot.total}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => removeSpellSlotLevel(slot.level)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                {spellData.spellSlots.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">No spell slots configured</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Feat Spell Slots</CardTitle>
                <Button variant="outline" size="sm" onClick={addFeatSpellSlot}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Feat
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spellData.featSpellSlots.map((feat, featIndex) => (
                  <div key={featIndex} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Feat name (e.g., Fey Touched)"
                        value={feat.name}
                        onChange={(e) => updateFeatSpellSlot(featIndex, { name: e.target.value })}
                        className="flex-1"
                      />
                      <Button variant="destructive" size="sm" onClick={() => removeFeatSpellSlot(featIndex)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Uses per Long Rest</Label>
                        <Input
                          type="number"
                          value={feat.usesPerLongRest}
                          onChange={(e) =>
                            updateFeatSpellSlot(featIndex, { usesPerLongRest: Number.parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>
                      <div>
                        <Label>Current Uses</Label>
                        <Input
                          type="number"
                          value={feat.currentUses}
                          onChange={(e) =>
                            updateFeatSpellSlot(featIndex, { currentUses: Number.parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Spells</Label>
                        <Button variant="outline" size="sm" onClick={() => addSpellToFeat(featIndex)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Spell
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {feat.spells.map((spell, spellIndex) => (
                          <div key={spellIndex} className="flex items-center gap-2">
                            <Input
                              placeholder="Spell name"
                              value={spell}
                              onChange={(e) => updateFeatSpell(featIndex, spellIndex, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSpellFromFeat(featIndex, spellIndex)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {spellData.featSpellSlots.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">No feat spell slots configured</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spell Notes */}
          <div>
            <Label htmlFor="spellNotes" className="text-base font-medium">
              Spell Notes
            </Label>
            <RichTextEditor
              value={spellData.spellNotes}
              onChange={(value) => setSpellData((prev) => ({ ...prev, spellNotes: value }))}
              placeholder="List your known spells, spell descriptions, or other spell-related notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
