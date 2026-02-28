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
import type { CharacterData, SpellData, FeatSpellSlot, InnateSpell } from "@/lib/character-data"

interface SpellModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<SpellData>) => void
  onSaveInnateSpells?: (innateSpells: InnateSpell[]) => void
}

export function SpellModal({ isOpen, onClose, character, onSave, onSaveInnateSpells }: SpellModalProps) {
  const [spellData, setSpellData] = useState<SpellData>(character.spellData)
  const [innateSpells, setInnateSpells] = useState<InnateSpell[]>(character.innateSpells ?? [])
  const [innateFormOpen, setInnateFormOpen] = useState(false)
  const [editingInnateIndex, setEditingInnateIndex] = useState<number | null>(null)
  const [innateForm, setInnateForm] = useState<Omit<InnateSpell, 'id'>>({
    name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '', concentration: false, resetOn: 'long_rest',
  })
  const [librarySpells, setLibrarySpells] = useState<Array<{ id: string; name: string; level: number }>>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Feat slot spell search: only one dropdown open at a time
  const [featSlotSearchIndex, setFeatSlotSearchIndex] = useState<number | null>(null)
  const [featSlotSearch, setFeatSlotSearch] = useState('')
  // Feat slot edit mode: which row is expanded for editing
  const [featSlotEditIndex, setFeatSlotEditIndex] = useState<number | null>(null)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setSpellData(character.spellData)
    setInnateSpells(character.innateSpells ?? [])
  }, [character.spellData, character.innateSpells])

  // Fetch spell library once when modal opens
  useEffect(() => {
    if (isOpen && librarySpells.length === 0) {
      fetch('/api/spells')
        .then(r => r.ok ? r.json() : [])
        .then((data: Array<{ id: string; name: string; level: number }>) => setLibrarySpells(data))
        .catch(() => {})
    }
  }, [isOpen])

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
    onSave(editableSpellData)
    onSaveInnateSpells?.(innateSpells)
    onClose()
  }

  const openAddInnateForm = () => {
    setEditingInnateIndex(null)
    setInnateForm({ name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '', concentration: false, resetOn: 'long_rest' })
    setLibrarySearch('')
    setLibraryOpen(false)
    setInnateFormOpen(true)
  }

  const openEditInnateForm = (index: number) => {
    const spell = innateSpells[index]
    setEditingInnateIndex(index)
    setInnateForm({ name: spell.name, spellLevel: spell.spellLevel ?? (spell as any).level ?? 0, usesPerDay: spell.usesPerDay, sourceName: spell.sourceName ?? '', castingAbility: spell.castingAbility ?? '', concentration: spell.concentration ?? false, resetOn: spell.resetOn ?? 'long_rest' })
    setLibrarySearch('')
    setLibraryOpen(false)
    setInnateFormOpen(true)
  }

  const commitInnateForm = () => {
    if (!innateForm.name.trim()) return
    if (editingInnateIndex !== null) {
      setInnateSpells(prev => prev.map((s, i) => i === editingInnateIndex ? { ...s, ...innateForm } : s))
    } else {
      setInnateSpells(prev => [...prev, { id: crypto.randomUUID(), ...innateForm }])
    }
    setInnateFormOpen(false)
    setEditingInnateIndex(null)
    setInnateForm({ name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '', concentration: false, resetOn: 'long_rest' })
  }

  const removeInnateSpell = (index: number) => {
    setInnateSpells(prev => prev.filter((_, i) => i !== index))
    if (editingInnateIndex === index) { setInnateFormOpen(false); setEditingInnateIndex(null) }
  }

  const LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

  const handleSpellListSave = (updates: Partial<SpellData>) => {
    setSpellData(prev => ({ ...prev, ...updates }))
  }

  // Spell slot totals are now calculated from class data, not editable

  const addFeatSpellSlot = () => {
    const newIndex = spellData.featSpellSlots.length
    setSpellData((prev) => ({
      ...prev,
      featSpellSlots: [
        ...prev.featSpellSlots,
        { spellName: "", featName: "", usesPerLongRest: 1, currentUses: 1 },
      ],
    }))
    setFeatSlotEditIndex(newIndex)
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
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="mb-2">Edit Spell Data</DialogTitle>
          <DialogDescription className="mb-2">
            Edit your character's spell attack bonus, save DC, and spell notes. Spell slots and cantrips are calculated from your class and level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4 flex-1 min-h-0 overflow-y-auto">
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



          {/* Innate Spellcasting */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-m font-semibold w-full">Innate Spellcasting</div>
              <Button variant="outline" size="sm" onClick={openAddInnateForm}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Spell
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {innateSpells.map((spell, i) => (
                <div key={spell.id ?? i} className="px-3 py-2 border rounded-md flex flex-col gap-1 bg-background">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-medium text-sm">{spell.name}</span>
                    <Badge variant="outline" className="text-xs">{LEVEL_LABELS[spell.spellLevel ?? (spell as any).level ?? 0] ?? 'Cantrip'}</Badge>
                    {spell.sourceName && <Badge variant="secondary" className="text-xs">{spell.sourceName}</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInnateForm(i)}>
                      <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" className="w-8 h-8" size="sm" onClick={() => removeInnateSpell(i)}>
                      <Icon icon="lucide:trash-2" className="w-4 h-4 text-[#ce6565]" />
                    </Button>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{spell.usesPerDay === 'at_will' ? 'At will' : `${spell.usesPerDay}× per ${spell.resetOn === 'short_rest' ? 'short rest' : 'long rest'}`}</span>
                    {spell.castingAbility && <span>· {spell.castingAbility}</span>}
                    {spell.concentration && <span>· Concentration</span>}
                  </div>
                </div>
              ))}
              {innateFormOpen && (
                <div className="p-4 border rounded-lg flex flex-col gap-3 bg-card border-primary/40">
                  <div className="text-sm font-medium">{editingInnateIndex !== null ? 'Edit Innate Spell' : 'Add Innate Spell'}</div>
                  {/* Spell library search */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Icon icon="lucide:search" className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search spell library..."
                          value={librarySearch}
                          className="pl-8"
                          onChange={e => { setLibrarySearch(e.target.value); setLibraryOpen(true) }}
                          onFocus={() => setLibraryOpen(true)}
                          onBlur={() => setTimeout(() => setLibraryOpen(false), 150)}
                        />
                      </div>
                    </div>
                    {libraryOpen && librarySearch.length >= 2 && (
                      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                        {librarySpells
                          .filter(s => s.name.toLowerCase().includes(librarySearch.toLowerCase()))
                          .slice(0, 20)
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                              onMouseDown={() => {
                                setInnateForm(f => ({ ...f, name: s.name, spellLevel: s.level ?? 0 }))
                                setLibrarySearch('')
                                setLibraryOpen(false)
                              }}
                            >
                              <span>{s.name}</span>
                              <Badge variant="outline" className="text-xs ml-2 shrink-0">{LEVEL_LABELS[s.level ?? 0] ?? 'Cantrip'}</Badge>
                            </button>
                          ))}
                        {librarySpells.filter(s => s.name.toLowerCase().includes(librarySearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No spells found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Spell name" value={innateForm.name} onChange={e => setInnateForm(f => ({ ...f, name: e.target.value }))} className="flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Level</Label>
                      <select
                        value={innateForm.spellLevel}
                        onChange={e => setInnateForm(f => ({ ...f, spellLevel: Number(e.target.value) }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        {LEVEL_LABELS.map((label, lvl) => <option key={lvl} value={lvl}>{label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Uses per Day</Label>
                      <select
                        value={innateForm.usesPerDay === 'at_will' ? 'at_will' : String(innateForm.usesPerDay)}
                        onChange={e => setInnateForm(f => ({ ...f, usesPerDay: e.target.value === 'at_will' ? 'at_will' : Number(e.target.value) }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="at_will">At Will</option>
                        {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}×</option>)}
                      </select>
                    </div>
                  </div>
                  {innateForm.usesPerDay !== 'at_will' && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Resets On</Label>
                      <select
                        value={innateForm.resetOn ?? 'long_rest'}
                        onChange={e => setInnateForm(f => ({ ...f, resetOn: e.target.value as 'long_rest' | 'short_rest' }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="long_rest">Long Rest</option>
                        <option value="short_rest">Short Rest</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Source (e.g. Tiefling)</Label>
                      <Input placeholder="Source" value={innateForm.sourceName ?? ''} onChange={e => setInnateForm(f => ({ ...f, sourceName: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Casting Ability</Label>
                      <select
                        value={innateForm.castingAbility ?? ''}
                        onChange={e => setInnateForm(f => ({ ...f, castingAbility: e.target.value }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None</option>
                        <option value="intelligence">Intelligence</option>
                        <option value="wisdom">Wisdom</option>
                        <option value="charisma">Charisma</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="innate-conc" checked={innateForm.concentration ?? false} onChange={e => setInnateForm(f => ({ ...f, concentration: e.target.checked }))} className="h-4 w-4" />
                    <Label htmlFor="innate-conc" className="text-xs cursor-pointer">Concentration</Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setInnateFormOpen(false); setEditingInnateIndex(null) }}>Cancel</Button>
                    <Button size="sm" onClick={commitInnateForm} disabled={!innateForm.name.trim()}>
                      {editingInnateIndex !== null ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}
              {innateSpells.length === 0 && !innateFormOpen && (
                <div className="text-center text-muted-foreground py-4">No innate spells configured</div>
              )}
            </div>
          </div>

          {/* Other Special Spells (other than innate/race or feat spell slots) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-m font-semibold">Other Special Spells</div>
              <Button variant="outline" size="sm" onClick={addFeatSpellSlot}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {spellData.featSpellSlots.map((feat, featIndex) => (
                featSlotEditIndex === featIndex ? (
                  /* ── EDIT MODE ── */
                  <div key={featIndex} className="p-4 border rounded-lg flex flex-col gap-3 bg-card border-primary/40">
                    <div className="text-sm font-medium">Edit Spell</div>
                    {/* Spell name with library search */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Spell</Label>
                      <div className="relative">
                        <Icon icon="lucide:search" className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search or type spell name..."
                          value={featSlotSearchIndex === featIndex ? featSlotSearch : feat.spellName}
                          className="pl-8"
                          onChange={e => {
                            setFeatSlotSearch(e.target.value)
                            updateFeatSpellSlot(featIndex, { spellName: e.target.value })
                          }}
                          onFocus={() => { setFeatSlotSearchIndex(featIndex); setFeatSlotSearch(feat.spellName) }}
                          onBlur={() => setTimeout(() => setFeatSlotSearchIndex(null), 150)}
                        />
                        {featSlotSearchIndex === featIndex && featSlotSearch.length >= 2 && (
                          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                            {librarySpells
                              .filter(s => s.name.toLowerCase().includes(featSlotSearch.toLowerCase()))
                              .slice(0, 20)
                              .map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                                  onMouseDown={() => {
                                    updateFeatSpellSlot(featIndex, { spellName: s.name })
                                    setFeatSlotSearchIndex(null)
                                    setFeatSlotSearch('')
                                  }}
                                >
                                  <span>{s.name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 shrink-0">{LEVEL_LABELS[s.level ?? 0] ?? 'Cantrip'}</Badge>
                                </button>
                              ))}
                            {librarySpells.filter(s => s.name.toLowerCase().includes(featSlotSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No spells found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">From Feat / Source</Label>
                      <Input
                        placeholder="e.g., Fey Touched"
                        value={feat.featName}
                        onChange={(e) => updateFeatSpellSlot(featIndex, { featName: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Available Uses</Label>
                        <Input
                          type="number"
                          value={feat.currentUses}
                          onChange={(e) => updateFeatSpellSlot(featIndex, { currentUses: Number.parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Max per Long Rest</Label>
                        <Input
                          type="number"
                          value={feat.usesPerLongRest}
                          onChange={(e) => updateFeatSpellSlot(featIndex, { usesPerLongRest: Number.parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setFeatSlotEditIndex(null)}>Done</Button>
                    </div>
                  </div>
                ) : (
                  /* ── DISPLAY MODE ── */
                  <div key={featIndex} className="p-2 border rounded bg-background pr-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{feat.spellName || `Spell ${featIndex + 1}`}</span>
                        {feat.featName && (
                          <Badge variant="secondary" className="text-xs shrink-0">{feat.featName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground font-mono">{feat.currentUses}/{feat.usesPerLongRest}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFeatSlotEditIndex(featIndex)}>
                          <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" className="w-8 h-8" size="sm" onClick={() => removeFeatSpellSlot(featIndex)}>
                          <Icon icon="lucide:trash-2" className="w-4 h-4 text-[#ce6565]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ))}
              {spellData.featSpellSlots.length === 0 && (
                <div className="text-center text-muted-foreground py-4">No special spells configured</div>
              )}
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
        <DialogFooter className="p-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
