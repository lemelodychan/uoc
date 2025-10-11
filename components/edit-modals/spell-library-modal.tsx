"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData, Spell } from "@/lib/character-data"

interface SpellLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onAddSpell: (spell: Spell) => void
  onCreateNewSpell: () => void
  onEditSpell?: (spell: LibrarySpell) => void
}

export interface SpellLibraryModalRef {
  refreshLibrary: () => void
}

interface LibrarySpell {
  id: string
  name: string
  school: string
  level: number
  casting_time: string
  range_area: string
  duration: string
  components: {
    v: boolean
    s: boolean
    m: boolean
    material: string
  }
  damage?: string
  save_throw?: string
  description: string
  higher_levels?: string
  classes: string[]
}

const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration", 
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation"
]

const SPELL_CLASSES = [
  "Artificer",
  "Bard", 
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Rogue",
  "Fighter",
  "Monk",
  "Barbarian"
]

export const SpellLibraryModal = forwardRef<SpellLibraryModalRef, SpellLibraryModalProps>(({ isOpen, onClose, character, onAddSpell, onCreateNewSpell, onEditSpell }, ref) => {
  const [spells, setSpells] = useState<LibrarySpell[]>([])
  const [filteredSpells, setFilteredSpells] = useState<LibrarySpell[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Fetch spells from library
  useEffect(() => {
    if (isOpen) {
      fetchSpellsFromLibrary()
    }
  }, [isOpen])

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshLibrary: fetchSpellsFromLibrary
  }), [])

  // Filter spells based on search and filters
  useEffect(() => {
    let filtered = spells

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter(spell => 
        spell.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by school
    if (selectedSchool !== "all") {
      filtered = filtered.filter(spell => spell.school === selectedSchool)
    }

    // Filter by class
    if (selectedClass !== "all") {
      filtered = filtered.filter(spell => spell.classes.includes(selectedClass))
    }

    // Filter by level
    if (selectedLevel !== "all") {
      const level = parseInt(selectedLevel)
      filtered = filtered.filter(spell => spell.level === level)
    }

    setFilteredSpells(filtered)
  }, [spells, searchTerm, selectedSchool, selectedClass, selectedLevel])

  const fetchSpellsFromLibrary = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/spells')
      if (response.ok) {
        const data = await response.json()
        setSpells(data)
      } else {
        console.error('Failed to fetch spells from library')
      }
    } catch (error) {
      console.error('Error fetching spells:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSpell = (librarySpell: LibrarySpell) => {
    // Convert library spell to character spell format
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

    onAddSpell(characterSpell)
  }

  const isSpellInCharacterList = (librarySpell: LibrarySpell): boolean => {
    return character.spellData?.spells?.some(characterSpell => 
      characterSpell.name.toLowerCase() === librarySpell.name.toLowerCase()
    ) || false
  }

  const getLevelDisplay = (level: number) => {
    return level === 0 ? "Cantrip" : `Level ${level}`
  }

  const getSchoolColor = (school: string) => {
    const colors: Record<string, string> = {
      "Abjuration": "bg-blue-100 text-blue-800",
      "Conjuration": "bg-green-100 text-green-800", 
      "Divination": "bg-purple-100 text-purple-800",
      "Enchantment": "bg-pink-100 text-pink-800",
      "Evocation": "bg-red-100 text-red-800",
      "Illusion": "bg-yellow-100 text-yellow-800",
      "Necromancy": "bg-gray-100 text-gray-800",
      "Transmutation": "bg-orange-100 text-orange-800"
    }
    return colors[school] || "bg-gray-100 text-gray-800"
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSchool("all")
    setSelectedClass("all")
    setSelectedLevel("all")
  }

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderCastingBadge = (castingTime: string) => {
    if (!castingTime) return null
    const ct = castingTime.toLowerCase()
    let cls = ""
    if (ct.includes("bonus")) cls = "bg-amber-500 text-white"
    else if (ct.includes("reaction")) cls = "bg-fuchsia-600 text-white"
    else if (ct.includes("action")) cls = "bg-emerald-600 text-white"
    else cls = "bg-blue-600 text-white"
    return <Badge className={cls}>{castingTime}</Badge>
  }

  const getAbilityShort = (ability: string) => {
    const abilityMap: Record<string, string> = {
      "Strength": "STR",
      "Dexterity": "DEX", 
      "Constitution": "CON",
      "Intelligence": "INT",
      "Wisdom": "WIS",
      "Charisma": "CHA"
    }
    return abilityMap[ability] || ability
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-h-[90vh] overflow-hidden flex flex-col"
        style={{ width: '70vw', height: '90vh', maxWidth: 'none' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:book-open" className="w-5 h-5" />
            Spell Library
          </DialogTitle>
          <DialogDescription>
            Browse and add spells from the D&D 5e spell library to your character
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 relative">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search spells by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
          </div>

          <div className="flex flex-row gap-4 w-full">
            <div className="flex flex-col gap-2">
              <Label htmlFor="school-filter">School</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {SPELL_SCHOOLS.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="class-filter">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {SPELL_CLASSES.map(className => (
                    <SelectItem key={className} value={className}>{className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="level-filter">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="0">Cantrip</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                    <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 w-full">
              <Button onClick={onCreateNewSpell} variant="outline">
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add missing Spell
              </Button>
            </div>
          </div>
        </div>

        {/* Spells List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading spells...</div>
            </div>
          ) : filteredSpells.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">No spells found matching your criteria</div>
            </div>
          ) : (
            <div className="space-y-6 pr-3">
              {Object.entries(
                filteredSpells.reduce((acc, spell) => {
                  if (!acc[spell.level]) acc[spell.level] = []
                  acc[spell.level].push(spell)
                  return acc
                }, {} as Record<number, LibrarySpell[]>)
              )
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([level, levelSpells]) => (
                  <div key={level} className="space-y-2 flex flex-col gap-1">
                    <h3 className="text-lg font-semibold flex items-center gap-3">
                      <span>{level === "0" ? "Cantrips" : `Level ${level}`}</span>
                      <Badge variant="outline" className="px-2 py-0.5 text-xs">{levelSpells.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {levelSpells
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((spell, index) => {
                          const key = `${spell.level}-${spell.name}-${index}`
                          const isOpen = !!expanded[key]
                          return (
                            <div key={key} className="p-3 border rounded-lg relative">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {(spell.description || spell.higher_levels) && (
                                      <button 
                                        type="button" 
                                        className="w-5 h-5 flex items-center justify-center rounded border hover:bg-accent" 
                                        onClick={() => toggleExpanded(key)} 
                                        aria-label="Toggle details"
                                      >
                                        {isOpen ? (
                                          <Icon icon="lucide:chevron-down" className="w-4 h-4" />
                                        ) : (
                                          <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                    <div className="text-base font-semibold flex items-center gap-2">
                                      {spell.name}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onEditSpell && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onEditSpell(spell)}
                                        className="h-8"
                                      >
                                        <Icon icon="lucide:edit" className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      variant="outline"
                                      disabled={isSpellInCharacterList(spell)}
                                      onClick={() => handleAddSpell(spell)}
                                    >
                                      {isSpellInCharacterList(spell) ? (
                                        <>✓ Added to list</>
                                      ) : (
                                        <><Icon icon="lucide:plus" className="w-4 h-4" />Add to spell list</>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  {renderCastingBadge(spell.casting_time)}
                                  {spell.duration && (
                                    <Badge variant="secondary">{spell.duration}</Badge>
                                  )}
                                  {spell.save_throw && (
                                    <Badge variant="outline">{getAbilityShort(spell.save_throw)} saving throw</Badge>
                                  )}
                                  {spell.damage && (
                                    <Badge variant="outline">{spell.damage}</Badge>
                                  )}
                                </div>
                                {(spell.description || spell.higher_levels) && isOpen && (
                                  <div className="mt-2 flex flex-col gap-3 border-t pt-3">
                                    <div className="flex flex-row gap-6 items-center flex-wrap">
                                      {spell.range_area && (
                                        <div className="text-xs flex items-center gap-2">
                                          <span className="font-medium">Range:</span>
                                          <Badge variant="outline">{spell.range_area}</Badge>
                                        </div>
                                      )}
                                      {spell.duration && (
                                        <div className="text-xs flex items-center gap-2">
                                          <span className="font-medium">Duration:</span>
                                          <Badge variant="outline">{spell.duration}</Badge>
                                        </div>
                                      )}
                                      {spell.components && (
                                        <div className="text-xs font-medium flex items-center gap-2">
                                          Components: 
                                          <Badge variant="outline">
                                            {`${spell.components.v ? "V, " : ""}${spell.components.s ? "S, " : ""}${spell.components.m ? "M" : ""}`.replace(/, $/, "")}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                    {spell.description && (
                                      <div className="text-sm text-muted-foreground">
                                        {spell.description}
                                      </div>
                                    )}
                                    {spell.higher_levels && (
                                      <div className="text-xs text-muted-foreground italic mt-2">
                                        Using a Higher-Level Spell Slot: {spell.higher_levels}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Badge className={getSchoolColor(spell.school)}>
                                        School of {spell.school}
                                      </Badge>
                                      <Badge variant="secondary">{spell.classes.join(", ")}</Badge>
                                    </div>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

SpellLibraryModal.displayName = "SpellLibraryModal"
