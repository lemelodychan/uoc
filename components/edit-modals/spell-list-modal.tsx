"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData, SpellData, Spell } from "@/lib/character-data"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { SPELL_SCHOOL_COLORS, getCastingTimeColor } from "@/lib/color-mapping"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SpellLibraryModal, SpellLibraryModalRef } from "./spell-library-modal"
import { SpellCreationModal } from "./spell-creation-modal"
import { useToast } from "@/hooks/use-toast"
import { CardHeader, CardTitle } from "@/components/ui/card"

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
  const { toast } = useToast()
  const spellLibraryRef = useRef<SpellLibraryModalRef>(null)
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
  const [spellLibraryModalOpen, setSpellLibraryModalOpen] = useState(false)
  const [spellCreationModalOpen, setSpellCreationModalOpen] = useState(false)
  const [editingSpellId, setEditingSpellId] = useState<string | null>(null)
  const [editingSpellClasses, setEditingSpellClasses] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>("basic")
  
  const getSchoolColor = (school: string) => {
    return SPELL_SCHOOL_COLORS[school as keyof typeof SPELL_SCHOOL_COLORS] || "bg-muted text-muted-foreground"
  }

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderCastingBadge = (castingTime?: string) => {
    if (!castingTime) return null
    return <Badge className={getCastingTimeColor(castingTime)}>{castingTime}</Badge>
  }

  // Sync local state with character prop when it changes
  useEffect(() => {
    setSpells(character.spellData.spells || [])
  }, [character.spellData.spells])

  // Deprecated explicit save; we patch on every CRUD action.
  const handleSave = () => {
    onSave({ spells })
  }

  const handleAddSpellFromLibrary = (spell: Spell) => {
    setSpells((prev: Spell[]) => {
      const next = [...prev, spell]
      onSave({ spells: next })
      return next
    })
    setSpellLibraryModalOpen(false)
  }

  const handleCreateNewSpell = async (spell: Spell, classes: string[]) => {
    try {
      // First, save to library via API
      const response = await fetch('/api/spells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spell, classes }),
      })

      if (response.ok) {
        // Then add to character's spell list
        setSpells((prev: Spell[]) => {
          const next = [...prev, spell]
          onSave({ spells: next })
          return next
        })
        
        toast({
          title: "Spell Created",
          description: `"${spell.name}" has been added to the library and your character's spell list.`,
        })
        
        // Refresh the spell library to show the new spell
        if (spellLibraryRef.current) {
          spellLibraryRef.current.refreshLibrary()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Failed to Save Spell",
          description: errorData.error || "An error occurred while saving the spell to the library.",
          variant: "destructive",
        })
        return // Don't add to character if library save failed
      }
    } catch (error) {
      console.error('Error saving spell to library:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the spell.",
        variant: "destructive",
      })
      return // Don't add to character if library save failed
    }
    
    setSpellCreationModalOpen(false)
  }

  const handleSaveToLibraryOnly = async (spell: Spell, classes: string[]) => {
    try {
      // Save to library via API
      const response = await fetch('/api/spells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spell, classes }),
      })

      if (response.ok) {
        toast({
          title: "Spell Saved to Library",
          description: `"${spell.name}" has been saved to the library.`,
        })
        
        // Refresh the spell library to show the new spell
        if (spellLibraryRef.current) {
          spellLibraryRef.current.refreshLibrary()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Failed to Save Spell",
          description: errorData.error || "An error occurred while saving the spell to the library.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving spell to library:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the spell.",
        variant: "destructive",
      })
    }
    setSpellCreationModalOpen(false)
  }

  const handleEditLibrarySpell = (librarySpell: any) => {
    // Convert library spell to character spell format for editing
    const characterSpell: Spell = {
      name: librarySpell.name,
      level: librarySpell.level,
      school: librarySpell.school,
      isPrepared: false,
      castingTime: librarySpell.casting_time,
      range: librarySpell.range_area,
      duration: librarySpell.duration,
      components: librarySpell.components,
      saveThrow: librarySpell.save_throw || "",
      damage: librarySpell.damage || "",
      tag: "",
      description: librarySpell.description,
      higherLevel: librarySpell.higher_levels || ""
    }

    // Store the spell ID and classes for updating
    setEditingSpellId(librarySpell.id)
    setEditingSpellClasses(librarySpell.classes || [])
    // Open the spell creation modal with pre-filled data
    setNewSpell(characterSpell)
    setSpellCreationModalOpen(true)
  }

  const handleUpdateLibrarySpell = async (spellId: string, spell: Spell, classes: string[]) => {
    try {
      // Update the spell in the library
      const response = await fetch(`/api/spells/${spellId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spell, classes }),
      })

      if (response.ok) {
        toast({
          title: "Spell Updated",
          description: `"${spell.name}" has been updated in the library.`,
        })
        
        // Refresh the spell library to show the updated spell
        if (spellLibraryRef.current) {
          spellLibraryRef.current.refreshLibrary()
        }
        // Clear the editing state
        setEditingSpellId(null)
        setEditingSpellClasses([])
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Failed to Update Spell",
          description: errorData.error || "An error occurred while updating the spell.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating spell in library:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the spell.",
        variant: "destructive",
      })
    }
  }

  const handleAddSpellToLibrary = async (spell: Spell) => {
    try {
      // Check if spell already exists in library (case insensitive)
      const response = await fetch('/api/spells')
      if (response.ok) {
        const librarySpells = await response.json()
        const exists = librarySpells.some((libSpell: any) => 
          libSpell.name.toLowerCase() === spell.name.toLowerCase()
        )

        if (exists) {
          toast({
            title: "Spell Already Exists",
            description: `"${spell.name}" is already in the library.`,
            variant: "destructive",
          })
          return
        }

        // Get character's classes for the spell (multiclass support)
        const characterClasses = character.classes?.map(c => c.name) || [character.class]
        
        // Save to library
        const saveResponse = await fetch('/api/spells', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ spell, classes: characterClasses }),
        })

        if (saveResponse.ok) {
          toast({
            title: "Spell Added to Library",
            description: `"${spell.name}" has been added to the library with classes: ${characterClasses.join(', ')}.`,
          })
          
          // Refresh the spell library to show the new spell
          if (spellLibraryRef.current) {
            spellLibraryRef.current.refreshLibrary()
          }
        } else {
          const errorData = await saveResponse.json().catch(() => ({}))
          toast({
            title: "Failed to Add Spell",
            description: errorData.error || "An error occurred while adding the spell to the library.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Failed to Check Library",
          description: "Could not verify if the spell already exists in the library.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding spell to library:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding the spell to the library.",
        variant: "destructive",
      })
    }
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
      <DialogContent className="sm:max-w-[720px] p-0 gap-0">
        <DialogHeader className="p-4">
          <DialogTitle className="text-xl font-semibold">Spell List</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 min-h-[70vh] max-h-[70vh] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 gap-0 min-h-0">
            <div className="flex items-center justify-between gap-4 p-4 pt-0 border-b">
              <TabsList>
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">{t.count}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto bg-background">
              <div className="p-4">
                {Object.entries(spellsByLevel)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([level, levelSpells]) => (
                    <div key={level} className="space-y-2 flex flex-col gap-0 mb-10 last:mb-0">
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
                              <div key={key} className={`p-3 bg-card border rounded-lg ${!spell.isPrepared && spell.level > 0 ? 'opacity-60' : ''}`}>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {(spell.description || spell.higherLevel) && (
                                        <button type="button" className={`w-5 h-5 flex items-center justify-center rounded border hover:bg-muted`} onClick={() => toggleExpanded(key)} aria-label="Toggle details">
                                          {isOpen ? (
                                            <Icon icon="lucide:chevron-down" className="w-4 h-4" />
                                          ) : (
                                            <Icon icon="lucide:chevron-right" className="w-4 h-4" />
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
                                      <Button variant="outline" size="sm" onClick={() => removeSpell(globalIndex)} className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"><Icon icon="lucide:trash-2" className="w-4 h-4" /></Button>
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
                                      <Badge className={getSchoolColor(spell.school)}>School of {spell.school}</Badge>
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
              <TabsContent key={tag} value={`tag:${tag}`} className="flex-1 min-h-0 bg-background overflow-y-auto">
                <div className="flex flex-col p-4">
                  {Object.entries(spellsByTagAndLevel[tag])
                    .sort(([a],[b]) => parseInt(a) - parseInt(b))
                    .map(([level, levelSpells]) => (
                      <div key={`${tag}-${level}`} className="flex flex-col gap-2 mb-10 last:mb-0">
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
                                <div key={key} className={`p-3 bg-card border rounded-lg ${!spell.isPrepared && spell.level > 0 ? 'opacity-60' : ''}`}>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {(spell.description || spell.higherLevel) && (
                                          <button type="button" className={`w-5 h-5 flex items-center justify-center rounded border hover:bg-muted`} onClick={() => toggleExpanded(key)} aria-label="Toggle details">
                                            {isOpen ? (
                                              <Icon icon="lucide:chevron-down" className="w-4 h-4" />
                                            ) : (
                                              <Icon icon="lucide:chevron-right" className="w-4 h-4" />
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
                                        <Button variant="outline" size="sm" onClick={() => removeSpell(globalIndex)} className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"><Icon icon="lucide:trash-2" className="w-4 h-4" /></Button>
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
                                        <Badge className={getSchoolColor(spell.school)}>School of {spell.school}</Badge>
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
        </div>
        <DialogFooter className="p-4 border-t items-center justify-between">
            <div className="text-sm text-muted-foreground w-full">
              {spells.length} spell{spells.length !== 1 ? 's' : ''} in your list
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSpellLibraryModalOpen(true)}
              >
                <Icon icon="lucide:book-open" className="w-4 h-4" />
                Browse Library
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear any editing state when creating a new spell
                  setEditIndex(null)
                  setEditingSpellId(null)
                  setEditingSpellClasses([])
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
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Create Custom
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={newSpellModalOpen} onOpenChange={(open)=>{ if(!open){ setNewSpellModalOpen(false); } }}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0">
        <DialogHeader className="p-4 border-b pb-3">
          <DialogTitle>{editIndex !== null ? 'Edit Spell' : 'Add New Spell'}</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <div className="flex flex-col gap-4 overflow-y-auto p-4 max-h-[500px] bg-background"> 
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="spellName">Spell Name</Label>
                    <Input id="spellName" value={newSpell.name} onChange={(e)=>setNewSpell(prev=>({ ...prev, name:e.target.value }))} placeholder="Enter spell name" />
                  </div>
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
                <div className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-3">
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
              </div>
              <div className="flex flex-row gap-4">
                <div className="col-span-2 flex flex-col gap-3">
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
                <div className="col-span-2 flex flex-col gap-3">
                  <Label htmlFor="range">Range/Area</Label>
                  <Input id="range" value={newSpell.range || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, range:e.target.value }))} placeholder="30 ft." />
                </div>
                <div className="col-span-2 flex flex-col gap-3">
                  <Label htmlFor="duration">Duration</Label>
                  <Input id="duration" value={newSpell.duration || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, duration:e.target.value }))} placeholder="8 Hours" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="tag">Special tag</Label>
                <Input id="tag" value={newSpell.tag || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, tag:e.target.value }))} placeholder="e.g., Buff, Healing"
                />
              </div>
            </CardContent>  
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Components</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={!!newSpell.components?.v} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), v:e.target.checked }}))} /> Verbal (V)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={!!newSpell.components?.s} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), s:e.target.checked }}))} /> Somatic (S)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={!!newSpell.components?.m} 
                      onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), m:e.target.checked }}))} /> Material (M)
                  </label>
                </div>
                <Input placeholder="Material (optional)" value={newSpell.components?.material || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, components:{ ...(prev.components||{}), material:e.target.value }}))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Effects</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-3 w-full">
                  <Label htmlFor="damage">Damage</Label>
                  <Input id="damage" value={newSpell.damage || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, damage:e.target.value }))} placeholder="e.g., Fire, 2d8 Radiant" />
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Label htmlFor="saveThrow">Saving Throw</Label>
                  <Input id="saveThrow" value={newSpell.saveThrow || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, saveThrow:e.target.value }))} placeholder="Dex Save, Con Save, —" />
                </div>
              </div>
              <div className="col-span-4 flex flex-col gap-3">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor value={newSpell.description || ""} onChange={(value)=>setNewSpell(prev=>({ ...prev, description:value }))} rows={6} className="min-h-[224px]" />
              </div>
              <div className="col-span-4 flex flex-col gap-3">
                <Label htmlFor="higherLevel">At a Higher Levels</Label>
                <textarea id="higherLevel" className="w-full border rounded-md p-2 text-sm" rows={2} value={newSpell.higherLevel || ""} onChange={(e)=>setNewSpell(prev=>({ ...prev, higherLevel:e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-4 border-t justify-between items-center">
          <Button variant="outline" onClick={()=> setNewSpellModalOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {editIndex !== null && (
                <Button variant="outline" onClick={() => {
                  const spellToAdd: Spell = {
                    name: newSpell.name || "",
                    school: newSpell.school || "Evocation",
                    level: newSpell.level || 0,
                    castingTime: newSpell.castingTime || "1 Action",
                    range: newSpell.range || "",
                    duration: newSpell.duration || "",
                    components: newSpell.components || { v: false, s: false, m: false },
                    damage: newSpell.damage || "",
                    saveThrow: newSpell.saveThrow || "",
                    description: newSpell.description || "",
                    higherLevel: newSpell.higherLevel || "",
                    tag: newSpell.tag || "",
                    isPrepared: newSpell.isPrepared || false
                  }
                  handleAddSpellToLibrary(spellToAdd)
                }}>
                  Add to Library
                </Button>
              )}
              <Button onClick={()=>{ addSpell(); setNewSpellModalOpen(false) }}>
                {editIndex !== null ? 'Save Changes' : 'Add Spell'}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Spell Library Modal */}
    <SpellLibraryModal
      ref={spellLibraryRef}
      isOpen={spellLibraryModalOpen}
      onClose={() => setSpellLibraryModalOpen(false)}
      character={character}
      onAddSpell={handleAddSpellFromLibrary}
      onCreateNewSpell={() => {
        // Clear any editing state when creating a new spell
        setEditingSpellId(null)
        setEditingSpellClasses([])
        setNewSpell({
          name: "",
          level: 0,
          school: "Abjuration",
          isPrepared: false,
          castingTime: "1 Action",
          range: "",
          duration: "",
          components: { v: false, s: false, m: false, material: "" },
          damage: "",
          saveThrow: "",
          tag: "",
          description: "",
          higherLevel: "",
        })
        setSpellLibraryModalOpen(false)
        setSpellCreationModalOpen(true)
      }}
      onEditSpell={handleEditLibrarySpell}
    />

    {/* Spell Creation Modal */}
    <SpellCreationModal
      isOpen={spellCreationModalOpen}
      onClose={() => {
        setSpellCreationModalOpen(false)
        setEditingSpellId(null)
        setEditingSpellClasses([])
      }}
      character={character}
      onSave={handleCreateNewSpell}
      onSaveToLibraryOnly={handleSaveToLibraryOnly}
      onUpdateLibrarySpell={handleUpdateLibrarySpell}
      initialSpellData={newSpell}
      initialClasses={editingSpellClasses}
      editingSpellId={editingSpellId || undefined}
    />
    </>
  )
}
