"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData, InnateSpell } from "@/lib/character-data"

interface InnateSpellsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (innateSpells: InnateSpell[]) => void
}

const SPELL_LEVEL_LABELS: Record<number, string> = {
  0: "Cantrip", 1: "1st", 2: "2nd", 3: "3rd", 4: "4th",
  5: "5th", 6: "6th", 7: "7th", 8: "8th", 9: "9th",
}

function defaultInnateSpell(): InnateSpell {
  return {
    name: "",
    spellLevel: 0,
    usesPerDay: "at_will",
    castingAbility: "charisma",
    source: "race",
    sourceName: "",
    concentration: false,
    resetOn: "long_rest",
  }
}

export function InnateSpellsModal({ isOpen, onClose, character, onSave }: InnateSpellsModalProps) {
  const [spells, setSpells] = useState<InnateSpell[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<InnateSpell>(defaultInnateSpell())

  useEffect(() => {
    setSpells(character.innateSpells ?? [])
    setEditingIndex(null)
    setDraft(defaultInnateSpell())
  }, [character.innateSpells])

  const startAdd = () => {
    setDraft(defaultInnateSpell())
    setEditingIndex(-1) // -1 signals "add new"
  }

  const startEdit = (index: number) => {
    setDraft({ ...spells[index] })
    setEditingIndex(index)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setDraft(defaultInnateSpell())
  }

  const saveDraft = () => {
    if (!draft.name.trim()) return
    if (editingIndex === -1) {
      // Add new
      setSpells([...spells, { ...draft }])
    } else if (editingIndex !== null) {
      // Edit existing
      setSpells(spells.map((s, i) => i === editingIndex ? { ...draft } : s))
    }
    cancelEdit()
  }

  const removeSpell = (index: number) => {
    setSpells(spells.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  const handleSave = () => {
    onSave(spells)
    onClose()
  }

  const isEditing = editingIndex !== null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Innate Spells</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4 max-h-[50vh] overflow-y-auto">
          {/* List of existing spells */}
          {spells.length > 0 && (
            <div className="flex flex-col gap-2">
              {spells.map((spell, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded bg-card">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{spell.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {SPELL_LEVEL_LABELS[spell.spellLevel] ?? `Level ${spell.spellLevel}`}
                      </Badge>
                      {spell.concentration && (
                        <Badge variant="outline" className="text-xs">C</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>
                        {spell.usesPerDay === "at_will" ? "At Will" : `${spell.usesPerDay}/day`}
                      </span>
                      {spell.sourceName && (
                        <span>from {spell.sourceName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(index)}>
                      <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSpell(index)}>
                      <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {spells.length === 0 && !isEditing && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No innate spells. Click "Add Spell" to add one.
            </div>
          )}

          {/* Add/Edit form */}
          {isEditing && (
            <div className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="text-sm font-medium">
                {editingIndex === -1 ? "Add Innate Spell" : "Edit Innate Spell"}
              </div>

              <div className="flex flex-row gap-2 flex-wrap">
                <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Hellish Rebuke"
                  />
                </div>
                <div className="w-28 flex flex-col gap-1">
                  <Label className="text-xs">Level</Label>
                  <Select
                    value={String(draft.spellLevel)}
                    onValueChange={(v) => setDraft({ ...draft, spellLevel: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SPELL_LEVEL_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-row gap-2 flex-wrap">
                <div className="w-36 flex flex-col gap-1">
                  <Label className="text-xs">Uses Per Day</Label>
                  <Select
                    value={draft.usesPerDay === "at_will" ? "at_will" : "limited"}
                    onValueChange={(v) => {
                      if (v === "at_will") {
                        setDraft({ ...draft, usesPerDay: "at_will" })
                      } else {
                        setDraft({ ...draft, usesPerDay: 1 })
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="at_will">At Will</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.usesPerDay !== "at_will" && (
                  <>
                    <div className="w-20 flex flex-col gap-1">
                      <Label className="text-xs">Uses</Label>
                      <Input
                        type="number"
                        min={1}
                        value={typeof draft.usesPerDay === "number" ? draft.usesPerDay : 1}
                        onChange={(e) => setDraft({ ...draft, usesPerDay: Math.max(1, parseInt(e.target.value) || 1) })}
                      />
                    </div>
                    <div className="w-32 flex flex-col gap-1">
                      <Label className="text-xs">Resets On</Label>
                      <Select
                        value={draft.resetOn ?? "long_rest"}
                        onValueChange={(v) => setDraft({ ...draft, resetOn: v as 'long_rest' | 'short_rest' })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="long_rest">Long Rest</SelectItem>
                          <SelectItem value="short_rest">Short Rest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-row gap-2 flex-wrap">
                <div className="w-40 flex flex-col gap-1">
                  <Label className="text-xs">Casting Ability</Label>
                  <Select
                    value={draft.castingAbility ?? "charisma"}
                    onValueChange={(v) => setDraft({ ...draft, castingAbility: v === "none" ? undefined : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intelligence">Intelligence</SelectItem>
                      <SelectItem value="wisdom">Wisdom</SelectItem>
                      <SelectItem value="charisma">Charisma</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                  <Label className="text-xs">Source Name</Label>
                  <Input
                    value={draft.sourceName ?? ""}
                    onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })}
                    placeholder="e.g. Tiefling, Magic Initiate"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="innate-concentration"
                  checked={draft.concentration ?? false}
                  onCheckedChange={(v) => setDraft({ ...draft, concentration: !!v })}
                />
                <Label htmlFor="innate-concentration" className="text-xs">Concentration</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                <Button size="sm" onClick={saveDraft} disabled={!draft.name.trim()}>
                  {editingIndex === -1 ? "Add" : "Update"}
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startAdd} className="w-full">
              <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
              Add Spell
            </Button>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
