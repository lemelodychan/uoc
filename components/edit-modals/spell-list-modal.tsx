"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, X, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import type { CharacterData, SpellData, Spell } from "@/lib/character-data"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface SpellListModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<SpellData>) => void
}

const spellSchools = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
]

const castingTimeOptions = ["1 Action", "1 Bonus Action", "1 Reaction"]
const ritualCastingTimes = ["1 Minute", "10 Minutes", "1 Hour", "8 Hours", "12 Hours", "24 Hours"]

export function SpellListModal({ isOpen, onClose, character, onSave }: SpellListModalProps) {
  const [spells, setSpells] = useState<Spell[]>(character.spellData.spells || [])
  const [newSpell, setNewSpell] = useState<Partial<Spell>>({
    name: "",
    level: 0,
    school: "Abjuration",
    isPrepared: false,
    castingTime: "1 Action",
    range: "",
    duration: "",
    components: { v: false, s: false, m: false, material: "" },
    saveThrow: "",
    damage: "",
    tag: "",
    description: "",
    higherLevel: "",
  })
  const [newSpellModalOpen, setNewSpellModalOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>("basic")
  
  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderCastingBadge = (castingTime?: string) => {
    if (!castingTime) return null
    const ct = castingTime.toLowerCase()
    let cls = ""
    if (ct.includes("bonus")) cls = "bg-amber-500 text-white"
    else if (ct.includes("reaction")) cls = "bg-fuchsia-600 text-white"
    else if (ct.includes("action")) cls = "bg-emerald-600 text-white"
    else cls = "bg-blue-600 text-white"
    return <Badge className={cls}>{castingTime}</Badge>
  }

  // Sync local state with character prop when it changes
  useEffect(() => {
    setSpells(character.spellData.spells || [])
  }, [character.spellData.spells])

  // Deprecated explicit save; we patch on every CRUD action.
  const handleSave = () => {
    onSave({ spells })
  }

  const addSpell = () => {
    if (!newSpell.name || newSpell.level === undefined || !newSpell.school) return

    setSpells((prev: Spell[]) => {
      const payload: Spell = {
        name: newSpell.name as string,
        level: newSpell.level as number,
        school: newSpell.school as string,
        isPrepared: newSpell.isPrepared || false,
        castingTime: newSpell.castingTime,
        range: newSpell.range,
        duration: newSpell.duration,
        components: newSpell.components,
        saveThrow: newSpell.saveThrow,
        damage: newSpell.damage,
        tag: newSpell.tag,
        description: newSpell.description,
        higherLevel: newSpell.higherLevel,
      }
      let next = [...prev]
      if (editIndex !== null) {
        next[editIndex] = payload
      } else {
        next.push(payload)
      }
      onSave({ spells: next })
      // After adding/saving, switch to the relevant tab for the spell
      const targetTab = (payload.tag && payload.tag.trim()) ? `tag:${payload.tag.trim()}` : "basic"
      setActiveTab(targetTab)
      return next
    })

    // Reset new spell form
    setNewSpell({
      name: "",
      level: 0,
      school: "Abjuration",
      isPrepared: false,
      castingTime: "1 Action",
      range: "",
      duration: "",
      components: { v: false, s: false, m: false, material: "" },
      saveThrow: "",
      damage: "",
      tag: "",
      description: "",
      higherLevel: "",
    })
    setEditIndex(null)
  }

  const removeSpell = (index: number) => {
    setSpells((prev) => {
      const next = prev.filter((_, i) => i !== index)
      onSave({ spells: next })
      return next
    })
  }

  const togglePrepared = (spellRef: Spell) => {
    setSpells((prev) => {
      const idx = prev.findIndex((s) => s === spellRef)
      if (idx === -1) return prev
      const next = prev.map((s, i) => (i === idx ? { ...s, isPrepared: !s.isPrepared } : s))
      onSave({ spells: next })
      return next
    })
  }

  // Base (untagged) spells grouped by level
  const baseSpells = spells.filter((s) => !s.tag)
  const spellsByLevel = baseSpells.reduce<{ [key: number]: Spell[] }>((acc, spell) => {
    if (!acc[spell.level]) acc[spell.level] = []
    acc[spell.level].push(spell)
    return acc
  }, {})
  // Tagged spells grouped by tag then level
  const taggedSpells = spells.filter((s) => !!s.tag)
  const tagKeys = Array.from(new Set(taggedSpells.map((s) => (s.tag as string).trim()))).filter(Boolean)
  const spellsByTagAndLevel: Record<string, Record<number, Spell[]>> = {}
  tagKeys.forEach((tag) => {
    spellsByTagAndLevel[tag] = {}
  })
  taggedSpells.forEach((s) => {
    const tag = (s.tag as string).trim()
    if (!spellsByTagAndLevel[tag][s.level]) spellsByTagAndLevel[tag][s.level] = []
    spellsByTagAndLevel[tag][s.level].push(s)
  })

  // Build tabs metadata
  const baseCount = baseSpells.length
  const tabs = [
    { id: "basic", label: "Basic Spells", count: baseCount },
    ...tagKeys
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((tag) => ({
        id: `tag:${tag}`,
        label: tag,
        count: Object.values(spellsByTagAndLevel[tag]).reduce((sum, arr) => sum + arr.length, 0),
      })),
  ]

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Spell List</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 gap-4">
            <div className="flex items-center justify-between gap-4">
              <TabsList>
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                    <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">{t.count}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
              <div className="space-y-6 pr-3">
                {Object.entries(spellsByLevel)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([level, levelSpells]) => (
                    <div key={level} className="space-y-2 flex flex-col gap-1 mb-10">
                      <h3 className="text-lg font-semibold flex items-center gap-3">
                        <span>{level === "0" ? "Cantrips" : `Level ${level}`}</span>
                        <Badge variant="outline" className="px-2 py-0.5 text-xs">{levelSpells.length}</Badge>
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {levelSpells
                          .slice()
                          .sort((a,b)=> ( (b.isPrepared?1:0) - (a.isPrepared?1:0) ) || a.name.localeCompare(b.name))
                          .map((spell, index) => {
                            const key = `${spell.level}-${spell.name}-${index}`
                            const isOpen = !!expanded[key]
                            const globalIndex = spells.findIndex((s) => s === spell)
                            return (
                              <div key={key} className={`p-3 border rounded-lg ${!spell.isPrepared && spell.level > 0 ? 'opacity-60' : ''}`}>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {(spell.description || spell.higherLevel) && (
                                        <button type="button" className={`w-5 h-5 flex items-center justify-center rounded border hover:bg-accent`} onClick={() => toggleExpanded(key)} aria-label="Toggle details">
                                          {isOpen ? (
                                            <ChevronDown className="w-4 h-4" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                      <div className="text-base font-semibold flex items-center gap-2">
                                        {spell.name}
                                        {spell.tag && <Badge variant="default">{spell.tag}</Badge>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {spell.level > 0 && (
                                        <Toggle aria-label="Prepared" pressed={!!spell.isPrepared} onPressedChange={() => togglePrepared(spell)} variant="outline" size="sm">{spell.isPrepared ? 'Prepared' : 'Prepare'}</Toggle>
                                      )}
                                      <Button variant="outline" size="sm" onClick={() => { setEditIndex(globalIndex); setNewSpell(spell); setNewSpellModalOpen(true) }}>Edit</Button>
                                      <Button variant="outline" size="sm" onClick={() => removeSpell(globalIndex)} className="text-destructive hover:text-destructive w-8 h-8"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    {renderCastingBadge(spell.castingTime)}
                                    {spell.duration && <Badge variant="secondary">{spell.duration.includes('Concentration') ? `Concentration, ${spell.duration.replace('Concentration, ', '')}` : spell.duration}</Badge>}
                                    {spell.saveThrow && <Badge variant="outline">{spell.saveThrow} saving throw</Badge>}
                                    {spell.damage && <Badge variant="outline">{spell.damage} damage</Badge>}
                                  </div>
                                  {(spell.description || spell.higherLevel) && isOpen && (
                                    <div className="mt-2 flex flex-col gap-3 border-t pt-3">
                                      <div className="flex flex-row gap-6 items-center flex-wrap">
                                        {spell.range && (<div className="text-xs flex items-center gap-2"><span className="font-medium">Range:</span><Badge variant="outline">{spell.range}</Badge></div>)}
                                        {spell.duration && (<div className="text-xs flex items-center gap-2"><span className="font-medium">Duration:</span><Badge variant="outline">{spell.duration}</Badge></div>)}
                                        {spell.components && (<div className="text-xs font-medium flex items-center gap-2">Components: <Badge variant="outline">{`${spell.components.v ? "V, " : ""}${spell.components.s ? "S, " : ""}${spell.components.m ? "M" : ""}`.replace(/, $/, "")}</Badge></div>)}
                                      </div>
                                      {spell.description && (<RichTextDisplay content={spell.description} className="text-sm text-muted-foreground" />)}
                                      {spell.higherLevel && (<div className="text-xs text-muted-foreground italic mt-2">Using a Higher-Level Spell Slot: {spell.higherLevel}</div>)}
                                      <Badge variant="secondary">School of {spell.school}</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {tagKeys.map((tag) => (
              <TabsContent key={tag} value={`tag:${tag}`} className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
                <div className="space-y-6 pr-3">
                  {Object.entries(spellsByTagAndLevel[tag])
                    .sort(([a],[b]) => parseInt(a) - parseInt(b))
                    .map(([level, levelSpells]) => (
                      <div key={`${tag}-${level}`} className="space-y-2 flex flex-col gap-1 mb-10">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <span>{level === "0" ? "Cantrips" : `Level ${level}`}</span>
                          <Badge variant="outline" className="px-2 py-0.5 text-xs">{levelSpells.length}</Badge>
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {levelSpells
                            .slice()
                            .sort((a,b)=> ( (b.isPrepared?1:0) - (a.isPrepared?1:0) ) || a.name.localeCompare(b.name))
                            .map((spell, index) => {
                              const key = `${tag}-${spell.level}-${spell.name}-${index}`
                              const isOpen = !!expanded[key]
                              const globalIndex = spells.findIndex((s) => s === spell)
                              return (
                                <div key={key} className={`p-3 border rounded-lg ${!spell.isPrepared && spell.level > 0 ? 'opacity-60' : ''}`}>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {(spell.description || spell.higherLevel) && (
                                          <button type="button" className={`w-5 h-5 flex items-center justify-center rounded border hover:bg-accent`} onClick={() => toggleExpanded(key)} aria-label="Toggle details">
                                            {isOpen ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                          </button>
                                        )}
                                        <div className="text-base font-semibold flex items-center gap-2">
                                          {spell.name}
                                          {spell.tag && <Badge variant="default">{spell.tag}</Badge>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {spell.level > 0 && (
                                          <Toggle aria-label="Prepared" pressed={!!spell.isPrepared} onPressedChange={() => togglePrepared(spell)} variant="outline" size="sm">{spell.isPrepared ? 'Prepared' : 'Prepare'}</Toggle>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => { setEditIndex(globalIndex); setNewSpell(spell); setNewSpellModalOpen(true) }}>Edit</Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeSpell(globalIndex)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      {renderCastingBadge(spell.castingTime)}
                                      {spell.duration && <Badge variant="secondary">{spell.duration.includes('Concentration') ? `Concentration, ${spell.duration.replace('Concentration, ', '')}` : spell.duration}</Badge>}
                                      {spell.saveThrow && <Badge variant="outline">{spell.saveThrow} Save</Badge>}
                                      {spell.damage && <Badge variant="outline">{spell.damage} base damage</Badge>}
                                    </div>
                                    {(spell.description || spell.higherLevel) && isOpen && (
                                      <div className="mt-2 flex flex-col gap-3 border-t pt-3">
                                        <div className="flex flex-row gap-6 items-center flex-wrap">
                                          {spell.range && (<div className="text-xs flex items-center gap-2"><span className="font-medium">Range:</span><Badge variant="outline">{spell.range}</Badge></div>)}
                                          {spell.duration && (<div className="text-xs flex items-center gap-2"><span className="font-medium">Duration:</span><Badge variant="outline">{spell.duration}</Badge></div>)}
                                          {spell.components && (<div className="text-xs font-medium flex items-center gap-2">Components: <Badge variant="outline">{`${spell.components.v ? "V, " : ""}${spell.components.s ? "S, " : ""}${spell.components.m ? "M" : ""}`.replace(/, $/, "")}</Badge></div>)}
                                        </div>
                                        {spell.description && (<RichTextDisplay content={spell.description} className="text-sm text-muted-foreground" />)}
                                        {spell.higherLevel && (<div className="text-xs text-muted-foreground italic mt-2">Using a Higher-Level Spell Slot: {spell.higherLevel}</div>)}
                                        <Badge variant="secondary">School of {spell.school}</Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Footer with Add New Spell button */}
          <div className="pt-4 border-t flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditIndex(null)
                setNewSpell({
                  name: "",
                  level: 0,
                  school: "Abjuration",
                  isPrepared: false,
                  castingTime: "1 Action",
                  range: "",
                  duration: "",
                  components: { v: false, s: false, m: false, material: "" },
                  saveThrow: "",
                  damage: "",
                  tag: "",
                  description: "",
                  higherLevel: "",
                })
                setNewSpellModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Add new spell
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={newSpellModalOpen} onOpenChange={(open)=>{ if(!open){ setNewSpellModalOpen(false); } }}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editIndex !== null ? 'Edit Spell' : 'Add New Spell'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 align-start items-start justify-start">
          <div className="col-span-1 flex flex-col gap-2">
            <Label htmlFor="spellLevel">Level</Label>
            <Select value={newSpell.level?.toString()} onValueChange={(value)=>setNewSpell(prev=>({ ...prev, level: parseInt(value) }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6,7,8,9].map((level) => (
                  <SelectItem key={level} value={level.toString()}>{level===0?"Cantrip":`Level ${level}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            <Label htmlFor="spellSchool">School</Label>
            <Select value={newSpell.school} onValueChange={(value)=>setNewSpell(prev=>({ ...prev, school:value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                {spellSchools.map((school) => (
                  <SelectItem key={school} value={school}>{school}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 md:col-span-2 h-full flex items-center">
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={!!newSpell.isPrepared}
                onChange={(e)=>setNewSpell(prev=>({ ...prev, isPrepared: e.target.checked }))}
                disabled={!newSpell.level || newSpell.level < 1}
                id="isPrepared"
              />
              <Label htmlFor="isPrepared">Is Prepared</Label>
            </div>
          </div>
          <div className="col-span-4 grid grid-cols-2 gap-4 flex flex-col gap-2 align-start items-start justify-start">
            <div className="flex flex-col gap-2">
              <Label htmlFor="spellName">Spell Name</Label>
              <Input id="spellName" value={newSpell.name} onChange={(e)=>setNewSpell(prev=>({ ...prev, name:e.target.value }))} placeholder="Enter spell name" />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="castingTime">Casting Time</Label>
            <Select
              value={(newSpell.castingTime || "1 Action").toString()}
              onValueChange={(value) => setNewSpell((prev) => ({ ...prev, castingTime: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select casting time" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Standard</SelectLabel>
                  {castingTimeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Ritual Durations</SelectLabel>
                  {ritualCastingTimes.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="range">Range/Area</Label>
            <Input id="range" value={newSpell.range || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, range:e.target.value }))} placeholder="30 ft." />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={newSpell.duration || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, duration:e.target.value }))} placeholder="8 Hours" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <Label>Components</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="w-4 h-4" checked={!!newSpell.components?.v} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), v:e.target.checked }}))} /> V
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="w-4 h-4" checked={!!newSpell.components?.s} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), s:e.target.checked }}))} /> S
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="w-4 h-4" checked={!!newSpell.components?.m} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), m:e.target.checked }}))} /> M
              </label>
              <Input className="max-w-xs" placeholder="Material (optional)" value={newSpell.components?.material || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), material:e.target.value }}))} />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="damage">Damage</Label>
            <Input id="damage" value={newSpell.damage || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, damage:e.target.value }))} placeholder="e.g., Fire, 2d8 Radiant" />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="saveThrow">Save throw</Label>
            <Input id="saveThrow" value={newSpell.saveThrow || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, saveThrow:e.target.value }))} placeholder="Dex Save, Con Save, —" />
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            <Label htmlFor="tag">Special tag</Label>
            <Input id="tag" value={newSpell.tag || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, tag:e.target.value }))} placeholder="e.g., Buff, Healing"
            />
          </div>
          <div className="col-span-4 flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor value={newSpell.description || ""} onChange={(value)=>setNewSpell(prev=>({ ...prev, description:value }))} rows={6} className="min-h-[224px]" />
          </div>
          <div className="col-span-4 flex flex-col gap-2">
            <Label htmlFor="higherLevel">At a Higher-Level Spell Slot</Label>
            <textarea id="higherLevel" className="w-full border rounded-md p-2 text-sm" rows={2} value={newSpell.higherLevel || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, higherLevel:e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={()=>{ addSpell(); setNewSpellModalOpen(false) }} className="w-full">
              {editIndex !== null ? 'Save Changes' : 'Add Spell'}
            </Button>
            <Button variant="outline" onClick={()=> setNewSpellModalOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
