"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Icon } from "@iconify/react"
import { useUser } from "@/lib/user-context"
import { useToast } from "@/hooks/use-toast"
import { SpellCreationModal } from "@/components/edit-modals/spell-creation-modal"
import { loadClassesWithDetails, loadFeaturesForBaseWithSubclasses, loadRacesWithDetails, loadBackgroundsWithDetails } from "@/lib/database"
import type { ClassData } from "@/lib/class-utils"
import type { RaceData, BackgroundData } from "@/lib/database"
import type { Spell, CharacterData } from "@/lib/character-data"
import { SPELL_SCHOOL_COLORS, getCastingTimeColor } from "@/lib/color-mapping"
import { SpellSlotsGrid } from "@/components/ui/spell-slots-grid"

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

export function WikiPage() {
  const [activeTab, setActiveTab] = useState<string>("classes")
  const [classes, setClasses] = useState<ClassData[]>([])
  const [races, setRaces] = useState<RaceData[]>([])
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([])
  const [spells, setSpells] = useState<LibrarySpell[]>([])
  const [filteredSpells, setFilteredSpells] = useState<LibrarySpell[]>([])
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})
  const [expandedRaces, setExpandedRaces] = useState<Record<string, boolean>>({})
  const [expandedBackgrounds, setExpandedBackgrounds] = useState<Record<string, boolean>>({})
  const [expandedSpells, setExpandedSpells] = useState<Record<string, boolean>>({})
  const [classFeatures, setClassFeatures] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classDetailTab, setClassDetailTab] = useState<string>("info")

  // Search and filter states for spells
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  
  // Search states for other sections
  const [classSearchTerm, setClassSearchTerm] = useState("")
  const [raceSearchTerm, setRaceSearchTerm] = useState("")
  const [backgroundSearchTerm, setBackgroundSearchTerm] = useState("")
  
  // Spell editing states
  const [spellCreationModalOpen, setSpellCreationModalOpen] = useState(false)
  const [editingSpellId, setEditingSpellId] = useState<string | null>(null)
  const [editingSpellClasses, setEditingSpellClasses] = useState<string[]>([])
  const [newSpell, setNewSpell] = useState<Partial<Spell>>({})
  
  const { isSuperadmin } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    loadClasses()
    loadRaces()
    loadBackgrounds()
    loadSpells()
  }, [])

  // Filter spells based on search and filters
  useEffect(() => {
    let filtered = spells

    if (searchTerm) {
      filtered = filtered.filter(spell => 
        spell.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedSchool !== "all") {
      filtered = filtered.filter(spell => spell.school === selectedSchool)
    }

    if (selectedClass !== "all") {
      filtered = filtered.filter(spell => spell.classes.includes(selectedClass))
    }

    if (selectedLevel !== "all") {
      const level = parseInt(selectedLevel)
      filtered = filtered.filter(spell => spell.level === level)
    }

    setFilteredSpells(filtered)
  }, [spells, searchTerm, selectedSchool, selectedClass, selectedLevel])

  const loadClasses = async () => {
    setLoading(true)
    try {
      const result = await loadClassesWithDetails()
      if (result.classes) {
        setClasses(result.classes as unknown as ClassData[])
        // Load features for each base class
        const baseClasses = result.classes.filter(c => c.subclass === null)
        for (const baseClass of baseClasses) {
          const subclasses = result.classes.filter(c => c.name === baseClass.name && c.subclass !== null)
          const subclassIds = subclasses.map(s => s.id)
          const featuresResult = await loadFeaturesForBaseWithSubclasses(baseClass.id, subclassIds)
          if (featuresResult.features) {
            setClassFeatures(prev => ({
              ...prev,
              [baseClass.id]: featuresResult.features || []
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRaces = async () => {
    try {
      const result = await loadRacesWithDetails()
      if (result.races) {
        setRaces(result.races)
      }
    } catch (error) {
      console.error('Error loading races:', error)
    }
  }

  const loadBackgrounds = async () => {
    try {
      const result = await loadBackgroundsWithDetails()
      if (result.backgrounds) {
        setBackgrounds(result.backgrounds)
      }
    } catch (error) {
      console.error('Error loading backgrounds:', error)
    }
  }

  const loadSpells = async () => {
    try {
      const response = await fetch('/api/spells')
      if (response.ok) {
        const data = await response.json()
        setSpells(data)
      }
    } catch (error) {
      console.error('Error fetching spells:', error)
    }
  }

  const handleEditSpell = (librarySpell: LibrarySpell) => {
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

    // Store the spell ID and classes for updating
    setEditingSpellId(librarySpell.id)
    setEditingSpellClasses(librarySpell.classes || [])
    // Open the spell creation modal with pre-filled data
    setNewSpell(characterSpell)
    setSpellCreationModalOpen(true)
  }

  const handleDeleteSpell = async (spellId: string, spellName: string) => {
    if (!confirm(`Are you sure you want to delete "${spellName}" from the spell library? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/spells/${spellId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the spell from the local state
        setSpells(prev => prev.filter(spell => spell.id !== spellId))
        setFilteredSpells(prev => prev.filter(spell => spell.id !== spellId))
        
        // Show success toast
        toast({
          title: "Spell Deleted",
          description: `"${spellName}" has been removed from the spell library.`,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Failed to Delete Spell",
          description: errorData.error || "An error occurred while deleting the spell.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting spell:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the spell.",
        variant: "destructive",
      })
    }
  }

  const handleCreateNewSpell = () => {
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
        
        // Reload spells to show the updated spell
        await loadSpells()
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

  const handleSaveToLibraryOnly = async (spell: Spell, classes: string[]) => {
    try {
      // Save to library via API
      const response = await fetch('/api/spells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spell,
          classes
        })
      })

      if (response.ok) {
        // Reload spells to show the new spell
        await loadSpells()
        
        toast({
          title: "Spell Created",
          description: `${spell.name} has been added to the spell library.`,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Failed to Create Spell",
          description: errorData.error || "An error occurred while creating the spell.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating spell:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the spell.",
        variant: "destructive",
      })
    }
    setSpellCreationModalOpen(false)
  }

  const toggleExpanded = (key: string, type: 'classes' | 'races' | 'backgrounds' | 'spells') => {
    if (type === 'classes') {
      setExpandedClasses(prev => ({ ...prev, [key]: !prev[key] }))
    } else if (type === 'races') {
      setExpandedRaces(prev => ({ ...prev, [key]: !prev[key] }))
    } else if (type === 'backgrounds') {
      setExpandedBackgrounds(prev => ({ ...prev, [key]: !prev[key] }))
    } else if (type === 'spells') {
      setExpandedSpells(prev => ({ ...prev, [key]: !prev[key] }))
    }
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

  const getSchoolColor = (school: string) => {
    return SPELL_SCHOOL_COLORS[school as keyof typeof SPELL_SCHOOL_COLORS] || "bg-muted text-muted-foreground"
  }

  const renderCastingBadge = (castingTime: string) => {
    if (!castingTime) return null
    return <Badge className={getCastingTimeColor(castingTime)}>{castingTime}</Badge>
  }

  // Group classes by base class
  const baseClasses = classes.filter(c => c.subclass === null)
  const classGroups = baseClasses.map(baseClass => {
    const subclasses = classes.filter(c => c.name === baseClass.name && c.subclass !== null)
    return {
      baseClass,
      subclasses,
      subclassCount: subclasses.length
    }
  })

  return (
    <div className="relative flex flex-row gap-6 h-full">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-card flex flex-col gap-1 py-4 flex-shrink-0 border-r border-t fixed left-[0px] top-[64px] h-[calc(100vh-64px)]">
        <div className="text-lg font-bold font-display px-4">Wiki</div>
        <nav className="flex flex-col gap-0 px-4">
          <Button
            variant="outline"
            onClick={() => setActiveTab('classes')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'classes' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:sword" className="w-4 h-4" />
            Classes
            <Badge variant="secondary" className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto">
                Beta
              </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('races')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'races' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:users" className="w-4 h-4" />
            Races
            <Badge variant="secondary" className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto">
                Beta
              </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('backgrounds')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'backgrounds' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:scroll-text" className="w-4 h-4" />
            Backgrounds
            <Badge variant="secondary" className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto">
                Beta
              </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('spells')}
            className={`rounded-none border-0 w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'spells' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:sparkles" className="w-4 h-4" />
            Spells
          </Button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full ml-72 h-100vh !overflow-hidden">
        {activeTab === 'classes' && (
          <>
          <div className="flex flex-col gap-3 p-6 bg-card border-b w-full">
            <h1 className="text-3xl font-display font-semibold">Classes</h1>
            <p className="text-sm text-muted-foreground">Explore the diverse classes that shape your character's story.</p>
            <div className="flex items-center gap-4 relative mt-2">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="Search classes by name..."
                value={classSearchTerm}
                onChange={(e) => setClassSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {classSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClassSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                >
                  <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-6 p-6 !overflow-auto h-[calc(100vh-173px-64px)]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading classes...</div>
              </div>
            ) : selectedClassId ? (
              // Class Detail View
              (() => {
                const selectedClassGroup = classGroups.find(g => g.baseClass.id === selectedClassId)
                if (!selectedClassGroup) {
                  setSelectedClassId(null)
                  return null
                }
                const { baseClass, subclasses } = selectedClassGroup
                const features = classFeatures[baseClass.id] || []
                const baseFeatures = features.filter(f => !f.subclass_id).sort((a, b) => a.level - b.level)
                const featuresBySubclass = new Map<string, any[]>()
                
                features.filter(f => f.subclass_id).forEach(f => {
                  const key = String(f.subclass_id)
                  if (!featuresBySubclass.has(key)) {
                    featuresBySubclass.set(key, [])
                  }
                  featuresBySubclass.get(key)!.push(f)
                })

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClassId(null)
                          setClassDetailTab("info")
                        }}
                        className="flex items-center gap-2"
                      >
                        <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                        Back to Classes
                      </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-display font-bold">{baseClass.name}</h1>
                        {baseClass.is_custom && (
                          <Badge variant="secondary" className="text-xs">
                            <Icon icon="lucide:user-plus" className="w-3 h-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                      </div>

                      <Tabs value={classDetailTab} onValueChange={setClassDetailTab} className="w-full flex flex-col gap-4">
                        <TabsList className="flex items-center gap-2 w-full h-fit p-2 rounded-xl">
                          <TabsTrigger value="info" className="flex items-center gap-2 h-8 rounded-lg">Class Information</TabsTrigger>
                          <TabsTrigger value="base-features" className="flex items-center gap-2 h-8 rounded-lg">Base Features</TabsTrigger>
                          <TabsTrigger value="subclass-features" className="flex items-center gap-2 h-8 rounded-lg">
                            Subclass Features
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="info">
                          <Card>
                            <CardContent>
                              <div className="flex flex-col gap-4">
                                {baseClass.description && (
                                  <div className="flex flex-col gap-2">
                                    <h3 className="font-semibold text-md">Description</h3>
                                    <RichTextDisplay content={baseClass.description} fontSize="base" className="text-muted-foreground" />
                                    {baseClass.source && (
                                      <div className="flex flex-row gap-2">
                                        <Badge variant="secondary">Source: {baseClass.source}</Badge>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {subclasses.length > 0 && (
                                <div className="border-t pt-4 flex flex-col gap-2">
                                  <div className="text-sm font-medium flex items-center gap-2">
                                    Available Subclasses
                                      <Badge variant="secondary" className="text-xs">
                                        {subclasses.length}
                                      </Badge>
                                  </div>
                                  <div className="flex flex-row flex-wrap gap-2">
                                    {subclasses.map(subclass => (
                                      <Badge key={subclass.id} variant="outline">
                                        <div className="font-semibold text-sm">{subclass.subclass}</div>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                )}

                                <div className="grid grid-cols-4 gap-4 border-t pt-4">
                                  <div className="flex flex-col gap-2">
                                    <h3 className="font-semibold text-sm">Hit Die</h3>
                                    <Badge variant="outline">d{baseClass.hit_die || 8}</Badge>
                                  </div>

                                  {baseClass.primary_ability && baseClass.primary_ability.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                      <h3 className="font-semibold text-sm">Primary Ability</h3>
                                      <div className="flex flex-wrap gap-2">
                                        {baseClass.primary_ability.map((ability: string, idx: number) => (
                                          <Badge key={idx} variant="outline">{ability}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {baseClass.saving_throw_proficiencies && baseClass.saving_throw_proficiencies.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                      <h3 className="font-semibold text-sm">Saving Throw Proficiencies</h3>
                                      <div className="flex flex-wrap gap-2">
                                        {baseClass.saving_throw_proficiencies.map((prof: string, idx: number) => (
                                          <Badge key={idx} variant="outline">{prof}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {baseClass.subclass_selection_level && (
                                    <div className="flex flex-col gap-2">
                                      <h3 className="font-semibold text-sm">Subclass Selection Level</h3>
                                      <Badge variant="outline">Level {baseClass.subclass_selection_level}</Badge>
                                    </div>
                                  )}
                                </div>

                                {/* Spell Progression Matrix */}
                                {(baseClass.cantrips_known || baseClass.spell_slots_1) && (
                                <div className="border-t pt-4 flex flex-col gap-2">
                                  <h3 className="font-semibold text-md">Spell Progression</h3>
                                  <SpellSlotsGrid
                                    value={{
                                      cantripsKnown: baseClass.cantrips_known || Array(20).fill(0),
                                      spellsKnown: baseClass.spells_known || undefined,
                                      spellSlots: {
                                        spell_slots_1: baseClass.spell_slots_1 || Array(20).fill(0),
                                        spell_slots_2: baseClass.spell_slots_2 || Array(20).fill(0),
                                        spell_slots_3: baseClass.spell_slots_3 || Array(20).fill(0),
                                        spell_slots_4: baseClass.spell_slots_4 || Array(20).fill(0),
                                        spell_slots_5: baseClass.spell_slots_5 || Array(20).fill(0),
                                        spell_slots_6: baseClass.spell_slots_6 || Array(20).fill(0),
                                        spell_slots_7: baseClass.spell_slots_7 || Array(20).fill(0),
                                        spell_slots_8: baseClass.spell_slots_8 || Array(20).fill(0),
                                        spell_slots_9: baseClass.spell_slots_9 || Array(20).fill(0),
                                      },
                                      sorceryPoints: baseClass.sorcery_points || undefined,
                                      martialArtsDice: baseClass.martial_arts_dice || undefined,
                                      kiPoints: baseClass.ki_points || undefined,
                                      unarmoredMovement: baseClass.unarmored_movement || undefined,
                                      rageUses: baseClass.rage_uses || undefined,
                                      rageDamage: baseClass.rage_damage || undefined,
                                    }}
                                    onChange={() => {}} // No-op for view-only
                                    readonly={true}
                                    title=""
                                    showSpellsKnown={baseClass.showSpellsKnown || false}
                                    showSorceryPoints={baseClass.showSorceryPoints || false}
                                    showMartialArts={baseClass.showMartialArts || false}
                                    showKiPoints={baseClass.showKiPoints || false}
                                    showUnarmoredMovement={baseClass.showUnarmoredMovement || false}
                                    showRage={baseClass.showRage || false}
                                    showRageDamage={baseClass.showRageDamage || false}
                                  />
                                </div>
                                )}

                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="base-features">
                          <div className="flex flex-col gap-4">
                            {baseFeatures.length > 0 ? (
                              baseFeatures.map((feature, idx) => (
                                <Card key={feature.id || idx} className="gap-3">
                                  <CardHeader>
                                    <CardTitle className="flex flex-col gap-3 text-base">
                                      <Badge variant="default" className="text-xs">Level {feature.level}</Badge>
                                      <span className="font-semibold text-xl">{feature.title}</span>
                                    </CardTitle>
                                  </CardHeader>
                                  {feature.description && (
                                    <CardContent>
                                      <RichTextDisplay content={feature.description} fontSize="md" className="text-muted-foreground" />
                                    </CardContent>
                                  )}
                                </Card>
                              ))
                            ) : (
                              <Card>
                                <CardContent className="pt-6">
                                  <p className="text-sm text-muted-foreground text-center">No base class features available</p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="subclass-features">
                          <div className="flex flex-col gap-4">
                            {subclasses.length > 0 ? (
                              <Accordion type="single" collapsible className="w-full flex flex-col gap-4">
                                {subclasses.map(subclass => {
                                  const subclassFeatures = featuresBySubclass.get(subclass.id) || []
                                  return (
                                    <AccordionItem key={subclass.id} value={subclass.id} className="gap-4 bg-card p-4 rounded-xl shadow-sm border">
                                      <AccordionTrigger className="p-0 hover:no-underline hover:cursor-pointer transition-colors">
                                        <div className="flex flex-col items-start gap-2">
                                          <span className="text-xl font-display font-semibold">{subclass.subclass}</span>
                                          {subclass.description && (
                                            <RichTextDisplay 
                                              content={subclass.description} 
                                              className="text-muted-foreground text-md font-normal"
                                              fontSize="md"
                                            />
                                          )}
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="p-0">
                                        {subclassFeatures.length > 0 ? (
                                          <div className="flex flex-col gap-4 pt-4">
                                            {subclassFeatures.sort((a, b) => a.level - b.level).map((feature, idx) => (
                                              <div key={feature.id || idx} className="p-3 border rounded-lg flex flex-col gap-2">
                                                <div className="flex items-center gap-3">
                                                  <Badge variant="default" className="text-xs">Level {feature.level}</Badge>
                                                  <span className="font-semibold text-lg">{feature.title}</span>
                                                </div>
                                                {feature.description && (
                                                  <RichTextDisplay content={feature.description} className="text-sm text-muted-foreground" />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground p-3 bg-card rounded-lg border mt-4">No features available for this subclass</p>
                                        )}
                                      </AccordionContent>
                                    </AccordionItem>
                                  )
                                })}
                              </Accordion>
                            ) : (
                              <Card>
                                <CardContent className="pt-6">
                                  <p className="text-sm text-muted-foreground text-center">No subclasses available</p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )
              })()
            ) : (
              // Class List View
              <div className="flex flex-col gap-4">
                {classGroups
                  .filter(({ baseClass }) => 
                    !classSearchTerm || 
                    baseClass.name.toLowerCase().includes(classSearchTerm.toLowerCase())
                  )
                  .map(({ baseClass, subclasses, subclassCount }) => (
                  <Card 
                    key={baseClass.id}
                    className="cursor-pointer hover:bg-card/50 transition-colors"
                    onClick={() => setSelectedClassId(baseClass.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">{baseClass.name}</span>
                          {baseClass.is_custom && (
                            <Badge variant="secondary" className="text-xs">
                              <Icon icon="lucide:user-plus" className="w-3 h-3 mr-1" />
                              Custom
                            </Badge>
                          )}
                          {subclassCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {subclassCount} subclass{subclassCount !== 1 ? 'es' : ''}
                            </Badge>
                          )}
                        </div>
                        <Icon icon="lucide:chevron-right" className="w-4 h-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
          </>
        )}

        {activeTab === 'races' && (
          <>
          <div className="flex flex-col gap-3 p-6 bg-card border-b w-full">
            <h1 className="text-3xl font-display font-semibold">Races</h1>
            <p className="text-sm text-muted-foreground">Explore the diverse races that shape your character's story.</p>
            <div className="flex items-center gap-4 relative mt-2">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="Search races by name..."
                value={raceSearchTerm}
                onChange={(e) => setRaceSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {raceSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRaceSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                >
                  <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-6 p-6 !overflow-auto h-[calc(100vh-173px-64px)]">
            <div className="flex flex-col gap-4">
              {races
                .filter(race => 
                  !raceSearchTerm || 
                  race.name.toLowerCase().includes(raceSearchTerm.toLowerCase())
                )
                .map(race => {
                const isExpanded = expandedRaces[race.id]
                return (
                  <Card key={race.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {race.image_url && (
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                              <img 
                                src={race.image_url} 
                                alt={race.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{race.name}</span>
                            {race.is_custom && (
                              <Badge variant="secondary" className="text-xs">
                                <Icon icon="lucide:user-plus" className="w-3 h-3 mr-1" />
                                Custom
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(race.id, 'races')}
                        >
                          <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="flex flex-col gap-4">
                        {race.image_url && (
                          <div className="w-full max-w-md h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            <img 
                              src={race.image_url} 
                              alt={race.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {race.description && (
                          <RichTextDisplay content={race.description} className="text-sm text-muted-foreground" />
                        )}
                        
                        {/* Ability Score Increases */}
                        {race.ability_score_increases && (
                          <div className="flex flex-col gap-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Icon icon="lucide:trending-up" className="w-4 h-4" />
                              Ability Score Increases
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const asi = race.ability_score_increases
                                // Array format: [{"ability": "Dexterity", "increase": 2}]
                                if (Array.isArray(asi)) {
                                  return asi.map((item: any, idx: number) => (
                                    <Badge key={idx} variant="default" className="text-xs">
                                      +{item.increase} {item.ability}
                                    </Badge>
                                  ))
                                }
                                // Fixed multi-ability format (e.g., Human +1 to all abilities)
                                if (asi.type === 'fixed_multi' && asi.abilities) {
                                  return Object.entries(asi.abilities).map(([ability, increase]: [string, any]) => {
                                    if (increase > 0) {
                                      return (
                                        <Badge key={ability} variant="default" className="text-xs">
                                          +{increase} {ability.charAt(0).toUpperCase() + ability.slice(1)}
                                        </Badge>
                                      )
                                    }
                                    return null
                                  })
                                }
                                // Choice format
                                if (asi.type === 'choice') {
                                  return (
                                    <Badge variant="outline" className="text-xs">
                                      Choose {asi.count || 1} ability score{asi.count !== 1 ? 's' : ''} to increase by {asi.increase || 1}
                                    </Badge>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {race.languages && (
                          <div className="flex flex-col gap-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Icon icon="lucide:languages" className="w-4 h-4" />
                              Languages
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const langs = race.languages
                                // Fixed languages array
                                if (Array.isArray(langs)) {
                                  return langs.map((lang: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {lang}
                                    </Badge>
                                  ))
                                }
                                // Object format with fixed languages
                                if (langs.fixed) {
                                  const fixedLangs = Array.isArray(langs.fixed) ? langs.fixed : [langs.fixed]
                                  return (
                                    <>
                                      {fixedLangs.map((lang: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {lang}
                                        </Badge>
                                      ))}
                                      {langs.choice && (
                                        <Badge variant="secondary" className="text-xs">
                                          + Choose {langs.choice.count || 1} language{langs.choice.count !== 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </>
                                  )
                                }
                                // Choice only
                                if (langs.choice) {
                                  return (
                                    <Badge variant="outline" className="text-xs">
                                      Choose {langs.choice.count || 1} language{langs.choice.count !== 1 ? 's' : ''}
                                    </Badge>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          {race.size && (
                            <div className="flex items-center gap-1">
                              <Icon icon="healthicons:body-outline-24px" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Size:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  let sizeValue = race.size
                                  if (typeof sizeValue === 'string') {
                                    try {
                                      const parsed = JSON.parse(sizeValue)
                                      sizeValue = parsed
                                    } catch {}
                                  }
                                  if (Array.isArray(sizeValue)) {
                                    return sizeValue.join(', ')
                                  }
                                  if (typeof sizeValue === 'object' && sizeValue !== null) {
                                    const sizeObj = sizeValue as any
                                    if (sizeObj.options && Array.isArray(sizeObj.options)) {
                                      return sizeObj.options.join(', ')
                                    }
                                    return JSON.stringify(sizeValue)
                                  }
                                  return String(sizeValue)
                                })()}
                              </Badge>
                            </div>
                          )}
                          
                          {race.speed && (
                            <div className="flex items-center gap-1">
                              <Icon icon="healthicons:walking-outline-24px" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Speed:</span>
                              <Badge variant="outline" className="text-xs">{race.speed} ft.</Badge>
                            </div>
                          )}

                          {race.spellcasting_ability && (
                            <div className="flex items-center gap-1">
                              <Icon icon="lucide:sparkles" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Spellcasting:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  if (typeof race.spellcasting_ability === 'string') {
                                    return race.spellcasting_ability.charAt(0).toUpperCase() + race.spellcasting_ability.slice(1)
                                  }
                                  if (typeof race.spellcasting_ability === 'object' && race.spellcasting_ability !== null) {
                                    const spellObj = race.spellcasting_ability as any
                                    if (spellObj.type === 'choice' && 'options' in spellObj && Array.isArray(spellObj.options)) {
                                      return spellObj.options.map((opt: any) => 
                                        typeof opt === 'string' 
                                          ? opt
                                          : String(opt)
                                      ).join(', ')
                                    }
                                    if ('ability' in spellObj && typeof spellObj.ability === 'string') {
                                      return spellObj.ability.charAt(0).toUpperCase() + spellObj.ability.slice(1)
                                    }
                                    return JSON.stringify(race.spellcasting_ability)
                                  }
                                  return String(race.spellcasting_ability)
                                })()}
                              </Badge>
                            </div>
                          )}

                          {race.features && Array.isArray(race.features) && race.features.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Icon icon="lucide:star" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Features:</span>
                              <Badge variant="outline" className="text-xs">{race.features.length}</Badge>
                            </div>
                          )}
                        </div>

                        {race.features && Array.isArray(race.features) && race.features.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <h4 className="font-semibold text-sm">Racial Features</h4>
                            {race.features.map((feature: any, idx: number) => (
                              <div key={idx} className="p-3 border rounded-lg">
                                <div className="font-medium mb-1">{feature.name || `Feature ${idx + 1}`}</div>
                                {feature.description && (
                                  <RichTextDisplay content={feature.description} className="text-sm text-muted-foreground" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
          </>
        )}

        {activeTab === 'backgrounds' && (
          <>
          <div className="flex flex-col gap-3 p-6 bg-card border-b w-full">
            <h1 className="text-3xl font-display font-semibold">Backgrounds</h1>
            <p className="text-sm text-muted-foreground">Explore the diverse backgrounds that shape your character's story.</p>
            <div className="flex items-center gap-4 relative mt-2">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="Search backgrounds by name..."
                value={backgroundSearchTerm}
                onChange={(e) => setBackgroundSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {backgroundSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBackgroundSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                >
                  <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-6 p-6 !overflow-auto h-[calc(100vh-173px-64px)]">
            <div className="flex flex-col gap-4">
              {backgrounds
                .filter(background => 
                  !backgroundSearchTerm || 
                  background.name.toLowerCase().includes(backgroundSearchTerm.toLowerCase())
                )
                .map(background => {
                const isExpanded = expandedBackgrounds[background.id]
                return (
                  <Card key={background.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{background.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(background.id, 'backgrounds')}
                        >
                          <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="flex flex-col gap-4">
                        {background.description && (
                          <RichTextDisplay content={background.description} className="text-sm text-muted-foreground" />
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          {background.skill_proficiencies && (
                            <div className="flex items-center gap-1">
                              <Icon icon="lucide:brain" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Skills:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  if (Array.isArray(background.skill_proficiencies)) {
                                    return background.skill_proficiencies.join(', ')
                                  }
                                  if (typeof background.skill_proficiencies === 'object' && !Array.isArray(background.skill_proficiencies)) {
                                    const skillsObj = background.skill_proficiencies as any
                                    const fixed = skillsObj.fixed || []
                                    const available = skillsObj.available || []
                                    const choice = skillsObj.choice
                                    if (fixed.length > 0 && choice) {
                                      return `${fixed.join(', ')} + Choose ${choice.count || 1}`
                                    } else if (fixed.length > 0) {
                                      return fixed.join(', ')
                                    } else if (choice) {
                                      return `Choose ${choice.count || 1}`
                                    }
                                  }
                                  return 'None'
                                })()}
                              </Badge>
                            </div>
                          )}

                          {background.tool_proficiencies && (
                            <div className="flex items-center gap-1">
                              <Icon icon="lucide:wrench" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Tools:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  if (Array.isArray(background.tool_proficiencies)) {
                                    return background.tool_proficiencies.join(', ')
                                  }
                                  if (typeof background.tool_proficiencies === 'object' && !Array.isArray(background.tool_proficiencies)) {
                                    const toolsObj = background.tool_proficiencies as any
                                    const fixed = toolsObj.fixed || []
                                    const choice = toolsObj.choice
                                    if (fixed.length > 0 && choice) {
                                      return `${fixed.join(', ')} + Choose ${choice.count || 1}`
                                    } else if (fixed.length > 0) {
                                      return fixed.join(', ')
                                    } else if (choice) {
                                      return `Choose ${choice.count || 1}`
                                    }
                                  }
                                  return 'None'
                                })()}
                              </Badge>
                            </div>
                          )}

                          {background.equipment && (
                            <div className="flex items-center gap-1">
                              <Icon icon="lucide:package" className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Equipment:</span>
                              <Badge variant="outline" className="text-xs">Included</Badge>
                            </div>
                          )}
                        </div>

                        {background.personality_traits && Array.isArray(background.personality_traits) && background.personality_traits.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <h4 className="font-semibold text-sm">Personality Traits</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {background.personality_traits.map((trait: any, idx: number) => (
                                <li key={idx}>{trait.text || trait}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {background.ideals && Array.isArray(background.ideals) && background.ideals.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <h4 className="font-semibold text-sm">Ideals</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {background.ideals.map((ideal: any, idx: number) => (
                                <li key={idx}>{ideal.text || ideal}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {background.bonds && Array.isArray(background.bonds) && background.bonds.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <h4 className="font-semibold text-sm">Bonds</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {background.bonds.map((bond: any, idx: number) => (
                                <li key={idx}>{bond.text || bond}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {background.flaws && Array.isArray(background.flaws) && background.flaws.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <h4 className="font-semibold text-sm">Flaws</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {background.flaws.map((flaw: any, idx: number) => (
                                <li key={idx}>{flaw.text || flaw}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
          </>
        )}

        {activeTab === 'spells' && (
          <>
          <div className="flex flex-col gap-3 border-b bg-card p-6 h-fit w-full relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-display font-semibold">Spell Library</h1>
                <p className="text-sm text-muted-foreground">Search for spells by name, school, class, or level.</p>
              </div>
              {isSuperadmin && (
                <Button onClick={handleCreateNewSpell} variant="default" className="absolute right-6 top-6">
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  Add New Spell
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 relative">
                <Icon icon="lucide:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <Input
                  placeholder="Search spells by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </div>
              <div className="flex flex-row gap-4 w-full">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">School</label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="w-[144px]">
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
                  <label className="text-sm font-medium">Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[144px]">
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
                  <label className="text-sm font-medium">Level</label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="w-[144px]">
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
              </div>
            </div>
          </div>
          {filteredSpells.length === 0 ? (
            <div className="flex items-center justify-center h-32 p-6">
              <div className="text-muted-foreground">No spells found matching your criteria</div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-6 !overflow-auto h-[calc(100vh-257px-64px)]">
              {Object.entries(
                filteredSpells.reduce((acc, spell) => {
                  if (!acc[spell.level]) acc[spell.level] = []
                  acc[spell.level].push(spell)
                  return acc
                }, {} as Record<number, LibrarySpell[]>)
              )
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([level, levelSpells]) => (
                  <div key={level} className="flex flex-col gap-3">
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
                          const isOpen = !!expandedSpells[key]
                          return (
                            <div key={key} className="p-3 border rounded-lg relative bg-card hover:bg-card/30 transition-colors">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {(spell.description || spell.higher_levels) && (
                                      <button 
                                        type="button" 
                                        className="w-5 h-5 flex items-center justify-center rounded border hover:bg-accent" 
                                        onClick={() => toggleExpanded(key, 'spells')} 
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
                                  {isSuperadmin && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditSpell(spell)}
                                        className="h-8 w-8"
                                      >
                                        <Icon icon="lucide:edit" className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteSpell(spell.id, spell.name)}
                                        className="h-8 w-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                                      >
                                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
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
          </>
        )}
      </div>

      {/* Spell Creation/Edit Modal */}
      {isSuperadmin && (
        <SpellCreationModal
          isOpen={spellCreationModalOpen}
          onClose={() => {
            setSpellCreationModalOpen(false)
            setEditingSpellId(null)
            setEditingSpellClasses([])
            setNewSpell({})
          }}
          character={{
            id: '',
            name: '',
            class: '',
            classes: [],
            level: 1,
            background: '',
            race: '',
            alignment: '',
            visibility: 'public',
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
            armorClass: 10,
            initiative: 0,
            speed: 30,
            currentHitPoints: 1,
            maxHitPoints: 1,
            savingThrowProficiencies: [],
            skills: [],
            weapons: [],
            weaponNotes: '',
            features: [],
            spellData: {
              spells: [],
              spellSlots: [],
              spellAttackBonus: 0,
              spellSaveDC: 0,
              cantripsKnown: 0,
              spellsKnown: 0,
              featSpellSlots: [],
              spellNotes: ''
            },
            classFeatures: [],
            toolsProficiencies: [],
            equipment: '',
            notes: '',
            magicItems: [],
            languages: '',
            feats: []
          } as CharacterData}
          onSave={async (spell, classes, characterId) => {
            // This won't be called in library-only mode, but required by interface
            await handleSaveToLibraryOnly(spell, classes)
          }}
          onSaveToLibraryOnly={handleSaveToLibraryOnly}
          onUpdateLibrarySpell={handleUpdateLibrarySpell}
          initialSpellData={newSpell}
          initialClasses={editingSpellClasses}
          editingSpellId={editingSpellId || undefined}
          isSuperadmin={isSuperadmin}
          libraryOnly={true}
        />
      )}
    </div>
  )
}

