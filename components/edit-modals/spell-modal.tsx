"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData, SpellData, FeatSpellSlot, InnateSpell } from "@/lib/character-data"

interface SpellModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<SpellData>) => void
  onSaveInnateSpells?: (innateSpells: InnateSpell[]) => void
  onSaveFeatureUsage?: (usage: Record<string, any>) => void
}

export function SpellModal({ isOpen, onClose, character, onSave, onSaveInnateSpells, onSaveFeatureUsage }: SpellModalProps) {
  const [spellData, setSpellData] = useState<SpellData>(character.spellData)
  const [innateSpells, setInnateSpells] = useState<InnateSpell[]>(character.innateSpells ?? [])
  const [localFeatureUsage, setLocalFeatureUsage] = useState<Record<string, any>>({})
  const [innateFormOpen, setInnateFormOpen] = useState(false)
  // Which section owns the currently open innate form
  const [formSection, setFormSection] = useState<'innate' | 'feat' | 'other'>('innate')
  const [editingInnateIndex, setEditingInnateIndex] = useState<number | null>(null)
  const [innateForm, setInnateForm] = useState<Omit<InnateSpell, 'id'>>({
    name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '',
    concentration: false, resetOn: 'long_rest', source: 'race',
  })
  const [librarySpells, setLibrarySpells] = useState<Array<{ id: string; name: string; level: number }>>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Other Spells (featSpellSlots) edit state
  const [featSlotSearchIndex, setFeatSlotSearchIndex] = useState<number | null>(null)
  const [featSlotSearch, setFeatSlotSearch] = useState('')
  const [featSlotEditIndex, setFeatSlotEditIndex] = useState<number | null>(null)
  // Feat Spells rename state (for classFeatureSkillsUsage isFeatFeature entries)
  const [featRenaming, setFeatRenaming] = useState<string | null>(null)
  const [featRenameValue, setFeatRenameValue] = useState('')

  useEffect(() => {
    setSpellData(character.spellData)
    setInnateSpells(character.innateSpells ?? [])
    setLocalFeatureUsage({ ...(character.classFeatureSkillsUsage ?? {}) })
  }, [character.spellData, character.innateSpells, character.classFeatureSkillsUsage])

  useEffect(() => {
    if (isOpen && librarySpells.length === 0) {
      fetch('/api/spells')
        .then(r => r.ok ? r.json() : [])
        .then((data: Array<{ id: string; name: string; level: number }>) => setLibrarySpells(data))
        .catch(() => {})
    }
  }, [isOpen])

  const handleSave = () => {
    const editableSpellData = {
      spellAttackBonus: spellData.spellAttackBonus,
      spellSaveDC: spellData.spellSaveDC,
      featSpellSlots: spellData.featSpellSlots,
      spellNotes: spellData.spellNotes,
      spells: spellData.spells,
      ...(character.class.toLowerCase() === "paladin" && { cantripsKnown: spellData.cantripsKnown }),
    }
    onSave(editableSpellData)
    onSaveInnateSpells?.(innateSpells)
    onSaveFeatureUsage?.(localFeatureUsage)
    onClose()
  }

  // ── Innate form helpers ──────────────────────────────────────────────────

  const openAddInnateForm = (section: 'innate' | 'feat' | 'other') => {
    setEditingInnateIndex(null)
    const src = section === 'other' ? 'other' : section === 'feat' ? 'feat' : 'race'
    setInnateForm({ name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '', concentration: false, resetOn: 'long_rest', source: src })
    setLibrarySearch('')
    setLibraryOpen(false)
    setFormSection(section)
    setInnateFormOpen(true)
  }

  const openEditInnateForm = (index: number) => {
    const spell = innateSpells[index]
    setEditingInnateIndex(index)
    const src = spell.source ?? 'race'
    setFormSection(src === 'feat' ? 'feat' : src === 'other' ? 'other' : 'innate')
    setInnateForm({
      name: spell.name,
      spellLevel: spell.spellLevel ?? (spell as any).level ?? 0,
      usesPerDay: spell.usesPerDay,
      sourceName: spell.sourceName ?? '',
      castingAbility: spell.castingAbility ?? '',
      concentration: spell.concentration ?? false,
      resetOn: spell.resetOn ?? 'long_rest',
      source: src,
    })
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
    setInnateForm({ name: '', spellLevel: 0, usesPerDay: 'at_will', sourceName: '', castingAbility: '', concentration: false, resetOn: 'long_rest', source: 'race' })
  }

  const removeInnateSpell = (index: number) => {
    setInnateSpells(prev => prev.filter((_, i) => i !== index))
    if (editingInnateIndex === index) { setInnateFormOpen(false); setEditingInnateIndex(null) }
  }

  // ── Other Spells (featSpellSlots) helpers ───────────────────────────────

  const updateFeatSpellSlot = (index: number, updates: Partial<FeatSpellSlot>) => {
    setSpellData(prev => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.map((feat, i) => (i === index ? { ...feat, ...updates } : feat)),
    }))
  }

  const removeFeatSpellSlot = (index: number) => {
    setSpellData(prev => ({
      ...prev,
      featSpellSlots: prev.featSpellSlots.filter((_, i) => i !== index),
    }))
    if (featSlotEditIndex === index) setFeatSlotEditIndex(null)
  }

  // ── Derived lists ────────────────────────────────────────────────────────

  const LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

  const raceInnateSpells = innateSpells.filter(s => !s.source || s.source === 'race' || s.source === 'class_feature')
  const featInnateSpells = innateSpells.filter(s => s.source === 'feat')
  const otherInnateSpells = innateSpells.filter(s => s.source === 'other')

  const featUsageEntries = Object.entries(localFeatureUsage)
    .filter(([, d]: [string, any]) => d?.isFeatFeature && d?.category !== 'combat' && d?.category !== 'trait')

  // ── Shared innate form UI ────────────────────────────────────────────────

  const renderInnateForm = () => (
    <div className="p-4 border rounded-lg flex flex-col gap-3 bg-card border-primary/40">
      <div className="text-sm font-medium">{editingInnateIndex !== null ? 'Edit Spell' : 'Add Spell'}</div>
      {/* Spell library search */}
      <div className="relative">
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
      <Input placeholder="Spell name" value={innateForm.name} onChange={e => setInnateForm(f => ({ ...f, name: e.target.value }))} />
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
  )

  // Shared row renderer for innate spell entries (all 3 sections reuse this)
  const renderInnateRow = (spell: InnateSpell, listIndex: number) => {
    const origIdx = innateSpells.indexOf(spell)
    return (
      <div key={spell.id ?? listIndex} className="px-3 py-2 border rounded-md flex flex-col gap-1 bg-background">
        <div className="flex items-center gap-2">
          <span className="flex-1 font-medium text-sm">{spell.name}</span>
          <Badge variant="outline" className="text-xs">{LEVEL_LABELS[spell.spellLevel ?? (spell as any).level ?? 0] ?? 'Cantrip'}</Badge>
          {spell.sourceName && <Badge variant="secondary" className="text-xs">{spell.sourceName}</Badge>}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInnateForm(origIdx)}>
            <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" className="w-8 h-8" size="sm" onClick={() => removeInnateSpell(origIdx)}>
            <Icon icon="lucide:trash-2" className="w-4 h-4 text-[#ce6565]" />
          </Button>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{spell.usesPerDay === 'at_will' ? 'At will' : `${spell.usesPerDay}× per ${spell.resetOn === 'short_rest' ? 'short rest' : 'long rest'}`}</span>
          {spell.castingAbility && <span>· {spell.castingAbility}</span>}
          {spell.concentration && <span>· Concentration</span>}
        </div>
      </div>
    )
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
                onChange={(e) => setSpellData((prev) => ({ ...prev, spellAttackBonus: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="spellSaveDC">Spell Save DC</Label>
              <Input
                id="spellSaveDC"
                type="number"
                value={spellData.spellSaveDC}
                onChange={(e) => setSpellData((prev) => ({ ...prev, spellSaveDC: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
            {character.class.toLowerCase() === "paladin" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="cantripsKnown">Cantrips Known</Label>
                <Input
                  id="cantripsKnown"
                  type="number"
                  min="0"
                  value={spellData.cantripsKnown}
                  onChange={(e) => setSpellData((prev) => ({ ...prev, cantripsKnown: Number.parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">Optional for Paladins (depends on feats, multiclassing, etc.)</p>
              </div>
            )}
          </div>

          {/* ── INNATE SPELLS ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-m font-semibold w-full">Innate Spellcasting</div>
              <Button variant="outline" size="sm" onClick={() => openAddInnateForm('innate')}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Spell
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {raceInnateSpells.map((spell, i) => renderInnateRow(spell, i))}
              {innateFormOpen && formSection === 'innate' && renderInnateForm()}
              {raceInnateSpells.length === 0 && !(innateFormOpen && formSection === 'innate') && (
                <div className="text-center text-muted-foreground py-4">No innate spells configured</div>
              )}
            </div>
          </div>

          {/* ── FEAT SPELLS ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-m font-semibold w-full">Feat Spells</div>
            </div>
            <p className="text-xs text-muted-foreground">Spells automatically granted by feats. Rename placeholders or remove entries as needed.</p>
            <div className="flex flex-col gap-2">
              {featUsageEntries.map(([featureId, usageData]) => {
                const isPlaceholder = /^\d+(?:st|nd|rd|th)-level spell$/i.test((usageData as any).featureName?.trim() ?? '')
                return (
                  <div key={featureId} className="p-2 border rounded bg-background pr-3 flex items-center gap-2">
                    {featRenaming === featureId ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm font-medium bg-transparent border-b border-primary outline-none min-w-0"
                        value={featRenameValue}
                        onChange={e => setFeatRenameValue(e.target.value)}
                        onBlur={() => {
                          if (featRenameValue.trim()) {
                            setLocalFeatureUsage(prev => ({ ...prev, [featureId]: { ...(prev[featureId] as any), featureName: featRenameValue.trim() } }))
                          }
                          setFeatRenaming(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setFeatRenaming(null)
                        }}
                      />
                    ) : (
                      <span className={`flex-1 text-sm font-medium truncate ${isPlaceholder ? 'text-primary' : ''}`}>
                        {(usageData as any).featureName}
                      </span>
                    )}
                    {(usageData as any).featSource && (
                      <Badge variant="secondary" className="text-xs shrink-0">{(usageData as any).featSource}</Badge>
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      title={isPlaceholder ? 'Pick spell' : 'Rename'}
                      onClick={() => { setFeatRenaming(featureId); setFeatRenameValue((usageData as any).featureName || '') }}
                    >
                      <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline" className="w-8 h-8 shrink-0" size="sm"
                      onClick={() => setLocalFeatureUsage(prev => { const next = { ...prev }; delete next[featureId]; return next })}
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4 text-[#ce6565]" />
                    </Button>
                  </div>
                )
              })}
              {featInnateSpells.map((spell, i) => renderInnateRow(spell, i))}
              {innateFormOpen && formSection === 'feat' && renderInnateForm()}
              {featUsageEntries.length === 0 && featInnateSpells.length === 0 && !(innateFormOpen && formSection === 'feat') && (
                <div className="text-center text-muted-foreground py-4">No feat spells configured</div>
              )}
            </div>
          </div>

          {/* ── OTHER SPELLS ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-m font-semibold">Other Spells</div>
              <Button variant="outline" size="sm" onClick={() => openAddInnateForm('other')}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Spell
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Custom spells from magic items, class features, or any other source.</p>
            <div className="flex flex-col gap-2">
              {/* Legacy slot spells (featSpellSlots) */}
              {spellData.featSpellSlots.map((feat, featIndex) => (
                featSlotEditIndex === featIndex ? (
                  <div key={featIndex} className="p-4 border rounded-lg flex flex-col gap-3 bg-card border-primary/40">
                    <div className="text-sm font-medium">Edit Spell</div>
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
                      <Label className="text-xs">From Item / Source</Label>
                      <Input
                        placeholder="e.g., Staff of Fire"
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
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { removeFeatSpellSlot(featIndex); setFeatSlotEditIndex(null) }}>
                        <Icon icon="lucide:trash-2" className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setFeatSlotEditIndex(null)}>Done</Button>
                    </div>
                  </div>
                ) : (
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
              {/* Other innate spells (source='other') */}
              {otherInnateSpells.map((spell, i) => renderInnateRow(spell, i))}
              {innateFormOpen && formSection === 'other' && renderInnateForm()}
              {spellData.featSpellSlots.length === 0 && otherInnateSpells.length === 0 && !(innateFormOpen && formSection === 'other') && (
                <div className="text-center text-muted-foreground py-4">No other spells configured</div>
              )}
            </div>
          </div>

          {/* Spell Notes */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="spellNotes" className="text-base font-medium">Spell Notes</Label>
            <RichTextEditor
              value={spellData.spellNotes}
              onChange={(value) => setSpellData((prev) => ({ ...prev, spellNotes: value }))}
              placeholder="List your known spells, spell descriptions, or other spell-related notes..."
            />
          </div>

        </div>
        <DialogFooter className="p-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
