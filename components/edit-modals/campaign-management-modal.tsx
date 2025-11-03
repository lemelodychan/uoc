"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { JsonCodeEditor } from "@/components/ui/json-code-editor"
import { Icon } from "@iconify/react"
import { CampaignCreationModal } from "./campaign-creation-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { ClassData, SubclassData } from "@/lib/class-utils"
import type { UserProfile } from "@/lib/user-profiles"
import { loadClassesWithDetails, loadFeaturesForBaseWithSubclasses, upsertClass as dbUpsertClass, deleteClass as dbDeleteClass, upsertClassFeature, deleteClassFeature, loadAllClasses, loadClassById, duplicateClass, getCustomClasses, canEditClass } from "@/lib/database"
import { useToast } from "@/components/ui/use-toast"
import { SpellSlotsGrid } from "@/components/ui/spell-slots-grid"
import { ClassDuplicationModal } from "./class-duplication-modal"
import { ClassFeatureSkillModal } from "./class-feature-skill-modal"
import { ProficiencyCheckboxes, SAVING_THROW_OPTIONS, SKILL_OPTIONS, EQUIPMENT_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"

// Helper function to normalize proficiency data from various formats
function normalizeProficiencyArray(data: any): string[] {
  if (!data) return []
  
  if (Array.isArray(data)) {
    // If it's already an array, ensure all items are strings
    return data.filter(item => typeof item === 'string')
  }
  if (typeof data === 'object') {
    // If it's an object, extract the keys or values
    if (Array.isArray(data.options)) {
      return data.options.filter((item: any) => typeof item === 'string')
    }
    if (Array.isArray(data.proficiencies)) {
      return data.proficiencies.filter((item: any) => typeof item === 'string')
    }
    // If it's a key-value object, return the keys where value is true
    return Object.keys(data).filter(key => data[key] === true || data[key] === 'true')
  }
  if (typeof data === 'string') {
    // If it's a string, try to parse it as JSON
    try {
      const parsed = JSON.parse(data)
      return normalizeProficiencyArray(parsed)
    } catch {
      // If parsing fails, return as single-item array
      return [data]
    }
  }
  return []
}

type FeatureItem = { id: string; class_id: string; level: number; title: string; description: string; feature_type: string; subclass_id?: string | null }

interface CampaignManagementModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: Campaign[]
  characters: CharacterData[]
  users?: any[]
  onCreateCampaign: (campaign: Campaign) => void
  onUpdateCampaign: (campaign: Campaign) => void
  onDeleteCampaign: (campaignId: string) => void
  onAssignCharacterToCampaign: (characterId: string, campaignId: string) => void
  onRemoveCharacterFromCampaign: (characterId: string, campaignId: string) => void
  onConvertToNPC?: (characterId: string) => void
  onConvertFromNPC?: (characterId: string) => void
  onSetActiveCampaign: (campaignId: string) => void
}

export function CampaignManagementModal({
  isOpen,
  onClose,
  campaigns,
  characters,
  users = [],
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onAssignCharacterToCampaign,
  onRemoveCharacterFromCampaign,
  onConvertToNPC,
  onConvertFromNPC,
  onSetActiveCampaign
}: CampaignManagementModalProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<string>("campaigns")

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  )


  const getCharactersInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId === campaignId)
  }

  const getDungeonMasterName = (campaign: Campaign): string => {
    if (!campaign.dungeonMasterId) return "No DM assigned"
    const dm = users.find(user => user.userId === campaign.dungeonMasterId)
    return dm ? dm.displayName || `User ${dm.userId.slice(0, 8)}...` : "Unknown DM"
  }

  const getDungeonMasterBadge = (campaign: Campaign) => {
    if (!campaign.dungeonMasterId) return null
    const dm = users.find(user => user.userId === campaign.dungeonMasterId)
    if (dm && dm.permissionLevel === 'superadmin') {
      return <Badge variant="default" className="text-xs">Superadmin</Badge>
    }
    return null
  }

  const handleCreateCampaign = (campaign: Campaign) => {
    onCreateCampaign(campaign)
    setShowCreateModal(false)
  }

  const handleUpdateCampaign = (campaign: Campaign) => {
    onUpdateCampaign(campaign)
    setEditingCampaign(null)
  }

  const handleDeleteCampaign = () => {
    if (deletingCampaign) {
      onDeleteCampaign(deletingCampaign.id)
      setDeletingCampaign(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="bg-white dark:bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border p-6 shadow-lg duration-200 sm:max-w-[960px] p-0 gap-0"
          >
            <DialogPrimitive.Close
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <Icon icon="lucide:x" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Management</DialogTitle>
            <DialogDescription>
              Manage campaigns, and create/edit classes, subclasses, and their features.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col max-h-[80vh]">
            <TabsList className="grid w-full grid-cols-2 p-2 h-fit rounded-xl">
              <TabsTrigger value="campaigns" className="flex items-center gap-2 p-2 rounded-lg">Campaign Management</TabsTrigger>
              <TabsTrigger value="classes" className="flex items-center gap-2 p-2 rounded-lg">
                Class Management 
                <Badge 
                  variant="secondary" 
                  className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1"
                >
                  Beta
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="flex-1 min-h-0 flex flex-col gap-0">
              <div className="flex gap-2 flex-shrink-0 border-b p-4">
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => setShowCreateModal(true)}>
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  New Campaign
                </Button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto p-4 bg-background h-[70vh]">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No campaigns found matching your search." : "No campaigns created yet."}
                  </div>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const campaignCharacters = getCharactersInCampaign(campaign.id)
                    const activeCharacters = campaignCharacters.filter(char => char.partyStatus === 'active')
                    const awayCharacters = campaignCharacters.filter(char => char.partyStatus === 'away')
                    const deceasedCharacters = campaignCharacters.filter(char => char.partyStatus === 'deceased')

                    return (
                      <Card key={campaign.id} className="bg-card">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              <CardTitle className="text-lg">{campaign.name}</CardTitle>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {campaign.description.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Icon icon="lucide:calendar" className="w-4 h-4" />
                                  Created {formatDate(campaign.created_at)}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Icon icon="lucide:crown" className="w-4 h-4" />
                                  <span>{getDungeonMasterName(campaign)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {/* Character Summary */}
                                  <div className="flex items-center gap-2">
                                    <Icon icon="lucide:users" className="w-4 h-4" />
                                    <span className="text-xs">
                                      {campaignCharacters.length} character{campaignCharacters.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  {campaignCharacters.length === 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      No characters assigned to this campaign yet. Click Edit to manage characters.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {!campaign.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onSetActiveCampaign(campaign.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Set Active
                                </Button>
                              )}
                              {campaign.isActive && (
                                <Badge variant="default" className="bg-green-600">
                                  Active
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCampaign(campaign)}
                              >
                                <Icon icon="lucide:edit" className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingCampaign(campaign)}
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="classes" className="flex-1 min-h-0">
              <ClassManagement />
            </TabsContent>
          </Tabs>

          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Campaign Creation Modal */}
      <CampaignCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateCampaign}
        users={users}
      />

      {/* Campaign Edit Modal */}
      <CampaignCreationModal
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSave={handleUpdateCampaign}
        editingCampaign={editingCampaign}
        characters={characters}
        users={users}
        onAssignCharacterToCampaign={onAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={onRemoveCharacterFromCampaign}
        onConvertToNPC={onConvertToNPC}
        onConvertFromNPC={onConvertFromNPC}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCampaign?.name}"? This action cannot be undone.
              Characters in this campaign will be moved to "No Campaign" status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ClassManagement() {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [subclasses, setSubclasses] = useState<SubclassData[]>([])
  const [featuresByClass, setFeaturesByClass] = useState<Record<string, FeatureItem[]>>({})
  const [search, setSearch] = useState("")
  const [editingClass, setEditingClass] = useState<ClassData | null>(null)
  const [editingSubclass, setEditingSubclass] = useState<SubclassData | null>(null)
  const [editingFeature, setEditingFeature] = useState<{ id?: string; class_id: string; level: number; title: string; description: string; feature_type: "class" | "subclass"; subclass_id?: string | null } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { toast } = useToast()
  const [detailsClassId, setDetailsClassId] = useState<string | null>(null)
  const [detailsClassName, setDetailsClassName] = useState<string>("")
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false)
  const [detailsTab, setDetailsTab] = useState<'subclasses' | 'features' | 'feature-skills'>("subclasses")
  
  // New state for enhanced class management
  const [duplicatingClass, setDuplicatingClass] = useState<ClassData | null>(null)
  const [editingFeatureSkill, setEditingFeatureSkill] = useState<ClassFeatureSkill | null>(null)
  const [featureSkillsByClass, setFeatureSkillsByClass] = useState<Record<string, ClassFeatureSkill[]>>({})
  const [customClasses, setCustomClasses] = useState<ClassData[]>([])
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  const filteredClasses = useMemo(() => {
    let filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (showCustomOnly) {
      filtered = filtered.filter(c => c.is_custom)
    }
    return filtered
  }, [classes, search, showCustomOnly])

  // Load from database on mount
  const reloadFromDb = async () => {
    try {
      setLoadError(null)
      const { classes: dbClasses } = await loadClassesWithDetails()
      const byName = new Map<string, any[]>()
      ;(dbClasses || []).forEach((row: any) => {
        const arr = byName.get(row.name) || []
        arr.push(row)
        byName.set(row.name, arr)
      })

      const base: ClassData[] = []
      const subs: SubclassData[] = []
      const featureLoadPairs: Array<[string, string]> = [] // [classIdToLoadFeaturesFor, className]

      // Fallback: if no detailed classes returned, use minimal loader
      if (byName.size === 0) {
        const { classes: minimal } = await loadAllClasses()
        ;(minimal || []).forEach((row: any) => {
          const arr = byName.get(row.name) || []
          arr.push({ ...row, hit_die: 8 })
          byName.set(row.name, arr)
        })
      }

      byName.forEach((rows, name) => {
        const baseRow = rows.find((r: any) => !r.subclass)
        const baseId = baseRow ? baseRow.id : rows[0]?.id
        const source = baseRow || rows[0] || {}
        const baseCommon: any = {
          id: baseId,
          name,
          description: source.description || "",
          hit_die: (source.hit_die ?? 8),
          primary_ability: source.primary_ability ?? "strength",
          saving_throw_proficiencies: source.saving_throw_proficiencies ?? [],
          skill_proficiencies: source.skill_proficiencies ?? {},
          equipment_proficiencies: source.equipment_proficiencies ?? {},
          starting_equipment: source.starting_equipment ?? {},
          spell_slots_1: source.spell_slots_1 ?? [],
          spell_slots_2: source.spell_slots_2 ?? [],
          spell_slots_3: source.spell_slots_3 ?? [],
          spell_slots_4: source.spell_slots_4 ?? [],
          spell_slots_5: source.spell_slots_5 ?? [],
          spell_slots_6: source.spell_slots_6 ?? [],
          spell_slots_7: source.spell_slots_7 ?? [],
          spell_slots_8: source.spell_slots_8 ?? [],
          spell_slots_9: source.spell_slots_9 ?? [],
          cantrips_known: source.cantrips_known ?? 0,
          spells_known: source.spells_known ?? 0,
          spell_progression: source.spell_progression ?? {},
          max_spell_slots: source.max_spell_slots ?? {},
          // class_features column has been dropped - using separate class_features table
        }
        base.push(baseCommon as ClassData)
        featureLoadPairs.push([baseId, name])

        rows.forEach((row: any) => {
          if (row.subclass) {
            subs.push({
              id: row.id,
              class_id: baseId,
              name: row.subclass,
              description: row.description || "",
              subclass_features: row.subclass_features || {},
            })
          }
        })
      })

      setClasses(base)
      setSubclasses(subs)

      // Load features for base and associated subclasses per base
      const map: Record<string, Array<{ id: string; class_id: string; level: number; title: string; description: string; feature_type: string; subclass_id?: string | null }>> = {}
      for (const [baseId] of featureLoadPairs) {
        const scopedSubIds = subs.filter(s => s.class_id === baseId).map(s => s.id)
        const { features } = await loadFeaturesForBaseWithSubclasses(baseId, scopedSubIds)
        map[baseId] = features || []
      }
      setFeaturesByClass(map)
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load classes")
      setClasses([])
      setSubclasses([])
      setFeaturesByClass({})
    }
  }

  useEffect(() => {
    reloadFromDb()
  }, [])

  const upsertClass = (cls: Partial<ClassData>) => {
    if (!cls.name) return
    ;(async () => {
      if (editingClass) {
        // Patch ALL entries for this class name (base and all subclasses)
        const { classes: dbClasses } = await loadClassesWithDetails()
        const matching = (dbClasses || []).filter((r: any) => r.name === ((editingClass as any).originalName || editingClass.name))
        await Promise.all(matching.map(async (row: any) => {
          const payload: any = {
            // Keep row identity and subclass linkage
            id: row.id,
            name: row.name,
            subclass: row.subclass ?? null,
            description: row.description ?? null,
            // Apply edited shared fields
            hit_die: (cls.hit_die ?? (editingClass as any).hit_die) ?? row.hit_die ?? 8,
            primary_ability: ((cls.primary_ability ?? (editingClass as any).primary_ability) ?? row.primary_ability ?? "strength").toString().toLowerCase(),
            saving_throw_proficiencies: (cls.saving_throw_proficiencies ?? (editingClass as any).saving_throw_proficiencies) ?? row.saving_throw_proficiencies ?? [],
            skill_proficiencies: ((cls as any).skill_proficiencies ?? (editingClass as any).skill_proficiencies) ?? row.skill_proficiencies ?? {},
            equipment_proficiencies: ((cls as any).equipment_proficiencies ?? (editingClass as any).equipment_proficiencies) ?? row.equipment_proficiencies ?? {},
            starting_equipment: ((cls as any).starting_equipment ?? (editingClass as any).starting_equipment) ?? row.starting_equipment ?? {},
            spell_slots_1: ((cls as any).spell_slots_1 ?? (editingClass as any).spell_slots_1) ?? row.spell_slots_1 ?? [],
            spell_slots_2: ((cls as any).spell_slots_2 ?? (editingClass as any).spell_slots_2) ?? row.spell_slots_2 ?? [],
            spell_slots_3: ((cls as any).spell_slots_3 ?? (editingClass as any).spell_slots_3) ?? row.spell_slots_3 ?? [],
            spell_slots_4: ((cls as any).spell_slots_4 ?? (editingClass as any).spell_slots_4) ?? row.spell_slots_4 ?? [],
            spell_slots_5: ((cls as any).spell_slots_5 ?? (editingClass as any).spell_slots_5) ?? row.spell_slots_5 ?? [],
            spell_slots_6: ((cls as any).spell_slots_6 ?? (editingClass as any).spell_slots_6) ?? row.spell_slots_6 ?? [],
            spell_slots_7: ((cls as any).spell_slots_7 ?? (editingClass as any).spell_slots_7) ?? row.spell_slots_7 ?? [],
            spell_slots_8: ((cls as any).spell_slots_8 ?? (editingClass as any).spell_slots_8) ?? row.spell_slots_8 ?? [],
            spell_slots_9: ((cls as any).spell_slots_9 ?? (editingClass as any).spell_slots_9) ?? row.spell_slots_9 ?? [],
            cantrips_known: ((cls as any).cantrips_known ?? (editingClass as any).cantrips_known) ?? row.cantrips_known ?? [],
            spells_known: ((cls as any).spells_known ?? (editingClass as any).spells_known) ?? row.spells_known ?? [],
          }
          await dbUpsertClass(payload)
        }))
        setEditingClass(null)
        await reloadFromDb()
        toast({ title: "Class updated", description: `Updated ${editingClass.name} (${matching.length} entries)` })
      } else {
        // Create or upsert a single base entry
        const { success, id } = await dbUpsertClass(cls as any)
        if (!success) return
        const newClass: ClassData = {
          id: id!,
          name: cls.name!,
          subclass: null,
          description: null,
          hit_die: cls.hit_die ?? 8,
          primary_ability: Array.isArray(cls.primary_ability) ? cls.primary_ability : [cls.primary_ability ?? "strength"],
          saving_throw_proficiencies: cls.saving_throw_proficiencies ?? [],
          skill_proficiencies: null,
          equipment_proficiencies: null,
          starting_equipment: null,
          spell_slots_1: null,
          spell_slots_2: null,
          spell_slots_3: null,
          spell_slots_4: null,
          spell_slots_5: null,
          spell_slots_6: null,
          spell_slots_7: null,
          spell_slots_8: null,
          spell_slots_9: null,
          cantrips_known: null,
          spells_known: null,
          is_custom: false,
          created_by: null,
          duplicated_from: null,
          source: 'SRD 5.1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Legacy fields
          spell_progression: cls.spell_progression ?? {},
          max_spell_slots: cls.max_spell_slots ?? {},
          class_features: cls.class_features ?? {},
          spellcasting_ability: (cls as any).spellcasting_ability,
        }
        setClasses(prev => [...prev, newClass])
        toast({ title: "Class created", description: `${cls.name} has been saved` })
      }
    })()
  }

  const removeClass = (id: string) => {
    ;(async () => {
      const { success } = await dbDeleteClass(id)
      if (!success) return
      setClasses(prev => prev.filter(c => c.id !== id))
      setSubclasses(prev => prev.filter(sc => sc.class_id !== id))
      setFeaturesByClass(prev => { const copy = { ...prev }; delete copy[id]; return copy })
    })()
  }

  const upsertSubclass = (sc: Partial<SubclassData> & { class_id: string }) => {
    if (!sc.name) return
    if (editingSubclass) {
      setSubclasses(prev => prev.map(s => s.id === editingSubclass.id ? { ...editingSubclass, ...sc, id: editingSubclass.id } as SubclassData : s))
      setEditingSubclass(null)
    } else {
      const id = crypto.randomUUID()
      const newSubclass: SubclassData = {
        id,
        class_id: sc.class_id,
        name: sc.name,
        description: sc.description ?? "",
        subclass_features: sc.subclass_features ?? {},
      } as SubclassData
      setSubclasses(prev => [...prev, newSubclass])
    }
  }

  const removeSubclass = (id: string) => {
    setSubclasses(prev => prev.filter(s => s.id !== id))
  }

  // New functions for enhanced class management
  const handleDuplicateClass = async (sourceClass: ClassData, newName: string, options: {
    copySubclasses?: boolean
    copyFeatures?: boolean
    copyFeatureSkills?: boolean
  }) => {
    try {
      const { success, newClassId, error } = await duplicateClass(sourceClass.id, newName, options)
      if (success && newClassId) {
        toast({ title: "Class duplicated", description: `${newName} has been created successfully` })
        await reloadFromDb() // Reload to show the new class
        setDuplicatingClass(null)
      } else {
        toast({ title: "Error", description: error || "Failed to duplicate class", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate class", variant: "destructive" })
    }
  }

  const handleAddFeatureSkill = (classId: string) => {
    const newFeatureSkill: ClassFeatureSkill = {
      id: crypto.randomUUID(),
      version: 1,
      title: '',
      featureType: 'slots',
      enabledAtLevel: 1,
      config: {
        usesFormula: '1',
        replenishOn: 'long_rest',
        displayStyle: 'circles'
      }
    }
    setEditingFeatureSkill(newFeatureSkill)
  }

  const handleSaveFeatureSkill = async (featureSkill: ClassFeatureSkill) => {
    try {
      // This would integrate with the database function to save feature skills
      // For now, we'll update the local state
      setFeatureSkillsByClass(prev => ({
        ...prev,
        [featureSkill.id]: [...(prev[featureSkill.id] || []), featureSkill]
      }))
      setEditingFeatureSkill(null)
      toast({ title: "Feature skill saved", description: `${featureSkill.title} has been added` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save feature skill", variant: "destructive" })
    }
  }

  const loadCustomClasses = async () => {
    try {
      const { classes: custom } = await getCustomClasses()
      setCustomClasses(custom || [])
    } catch (error) {
      console.error("Failed to load custom classes:", error)
    }
  }

  // Load custom classes on mount
  useEffect(() => {
    loadCustomClasses()
  }, [])

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">
      <div className="flex flex-col w-full gap-2 p-4 pt-0 border-b">
        <div className="flex flex-row gap-2">
          <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button 
            variant={showCustomOnly ? "default" : "outline"}
            onClick={() => setShowCustomOnly(!showCustomOnly)}
            className="whitespace-nowrap"
          >
            {showCustomOnly ? "Show All" : "Custom Only"}
          </Button>
          <Button onClick={() => setEditingClass({
            id: "",
            name: "",
            subclass: null,
            description: null,
            hit_die: 8,
            primary_ability: ["strength"],
            saving_throw_proficiencies: [],
            skill_proficiencies: null,
            equipment_proficiencies: null,
            starting_equipment: null,
            spell_slots_1: null,
            spell_slots_2: null,
            spell_slots_3: null,
            spell_slots_4: null,
            spell_slots_5: null,
            spell_slots_6: null,
            spell_slots_7: null,
            spell_slots_8: null,
            spell_slots_9: null,
            cantrips_known: null,
            spells_known: null,
            is_custom: true,
            created_by: null,
            duplicated_from: null,
            source: 'Custom',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Legacy fields
            spell_progression: {},
            max_spell_slots: {},
            class_features: {},
          } as ClassData)}>
            <Icon icon="lucide:plus" className="w-4 h-4" /> New Class
          </Button>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-sm text-muted-foreground max-h-[50vh]">No classes found.</div>
      ) : (
        <div className="flex flex-row flex-wrap justify-start items-start content-start gap-4 overflow-y-auto h-[70vh] p-4 bg-background">
        {filteredClasses.map((cls) => {
          const relatedSubclasses = subclasses.filter(sc => sc.class_id === cls.id)
          return (
            <Card key={cls.id} className="flex flex-col gap-2 bg-card h-[188px] w-[calc(50%-8px)]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                      {cls.is_custom && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      Primary ability: <Badge variant="secondary">{cls.primary_ability}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="w-8 h-8" onClick={async () => {
                      // Refresh latest DB data when opening editor
                      const { klass } = await loadClassById(cls.id)
                      if (klass) {
                        const fresh: any = {
                          id: cls.id,
                          name: klass.name,
                          description: klass.description || "",
                          hit_die: klass.hit_die ?? 8,
                          primary_ability: (typeof klass.primary_ability === 'string' ? klass.primary_ability : String(klass.primary_ability || 'strength')).toLowerCase(),
                          saving_throw_proficiencies: klass.saving_throw_proficiencies ?? [],
                          skill_proficiencies: klass.skill_proficiencies ?? {},
                          equipment_proficiencies: klass.equipment_proficiencies ?? {},
                          starting_equipment: klass.starting_equipment ?? {},
                          spell_slots_1: klass.spell_slots_1 ?? [],
                          spell_slots_2: klass.spell_slots_2 ?? [],
                          spell_slots_3: klass.spell_slots_3 ?? [],
                          spell_slots_4: klass.spell_slots_4 ?? [],
                          spell_slots_5: klass.spell_slots_5 ?? [],
                          spell_slots_6: klass.spell_slots_6 ?? [],
                          spell_slots_7: klass.spell_slots_7 ?? [],
                          spell_slots_8: klass.spell_slots_8 ?? [],
                          spell_slots_9: klass.spell_slots_9 ?? [],
                          cantrips_known: klass.cantrips_known ?? 0,
                          spells_known: klass.spells_known ?? 0,
                        }
                        setEditingClass(fresh)
                      } else {
                        setEditingClass(cls)
                      }
                    }}>
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-8 h-8" 
                      onClick={() => setDuplicatingClass(cls)}
                      title="Duplicate class"
                    >
                      <Icon icon="lucide:copy" className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white" onClick={() => removeClass(cls.id)}>
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-grow-1 h-auto">
                {/* Features moved to details modal for performance */}
                <div className="text-sm text-muted-foreground flex-grow-1 h-auto">{(cls as any).description || ""}</div>
                <Button variant="outline" size="sm" onClick={async () => {
                  // Open details modal; lazily ensure features are loaded
                  const cid = cls.id
                  setDetailsClassId(cid)
                  setDetailsClassName(cls.name)
                  if (!featuresByClass[cid] || featuresByClass[cid].length === 0) {
                    const scopedSubIds = subclasses.filter(s => s.class_id === cid).map(s => s.id)
                    const { features } = await loadFeaturesForBaseWithSubclasses(cid, scopedSubIds)
                    setFeaturesByClass(prev => ({ ...prev, [cid]: features || [] }))
                  }
                  setDetailsOpen(true)
                }}>
                  Manage features
                </Button>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Class Editor */}
      <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
        <DialogContent className="sm:max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="sticky top-0 z-10 bg-background px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle>{editingClass?.id ? "Edit Class" : "New Class"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="class-name">Class Name</Label>
              <Input id="class-name" placeholder="e.g. Bard" value={editingClass?.name ?? ""} onChange={(e) => setEditingClass(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div className="grid gap-1">
              <Label>Description</Label>
              <RichTextEditor value={(editingClass as any)?.description ?? ""} onChange={(val) => setEditingClass(prev => prev ? { ...(prev as any), description: val } as any : prev)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="hit-die">Hit Die</Label>
                <Select value={String(editingClass?.hit_die ?? 8)} onValueChange={(val) => setEditingClass(prev => prev ? { ...prev, hit_die: Number(val) } : prev)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select die" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">d6</SelectItem>
                    <SelectItem value="8">d8</SelectItem>
                    <SelectItem value="10">d10</SelectItem>
                    <SelectItem value="12">d12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="primary-ability">Primary Ability</Label>
                <Select 
                  value={(() => {
                    const primaryAbility = Array.isArray((editingClass as any)?.primary_ability) 
                      ? (editingClass as any).primary_ability[0] 
                      : (editingClass as any)?.primary_ability ?? "strength"
                    // Convert to capitalized format for display
                    return primaryAbility ? primaryAbility.charAt(0).toUpperCase() + primaryAbility.slice(1).toLowerCase() : "Strength"
                  })()} 
                  onValueChange={(val) => {
                    setEditingClass(prev => prev ? { ...prev, primary_ability: [val.toLowerCase()] as any } : prev)
                    // Trigger autosave
                    setTimeout(() => {
                      if (editingClass) {
                        upsertClass({ ...editingClass, primary_ability: [val.toLowerCase()] })
                      }
                    }, 500)
                  }}
                >
                  <SelectTrigger id="primary-ability">
                    <SelectValue placeholder="Select ability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strength">Strength</SelectItem>
                    <SelectItem value="Dexterity">Dexterity</SelectItem>
                    <SelectItem value="Constitution">Constitution</SelectItem>
                    <SelectItem value="Intelligence">Intelligence</SelectItem>
                    <SelectItem value="Wisdom">Wisdom</SelectItem>
                    <SelectItem value="Charisma">Charisma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1">
              <ProficiencyCheckboxes
                value={normalizeProficiencyArray(editingClass?.saving_throw_proficiencies)}
                onChange={(val) => {
                  setEditingClass(prev => prev ? { ...prev, saving_throw_proficiencies: val as any } as ClassData : prev)
                  // Trigger autosave
                  setTimeout(() => {
                    if (editingClass) {
                      upsertClass({ ...editingClass, saving_throw_proficiencies: val })
                    }
                  }, 500)
                }}
                options={SAVING_THROW_OPTIONS}
                title="Saving Throw Proficiencies"
                description="Select which saving throws this class is proficient with"
                maxSelections={2}
              />
            </div>
            <div className="grid gap-1">
              <ProficiencyCheckboxes
                value={normalizeProficiencyArray((editingClass as any)?.skill_proficiencies)}
                onChange={(val) => {
                  setEditingClass(prev => prev ? { ...(prev as any), skill_proficiencies: val } as any : prev)
                  // Trigger autosave
                  setTimeout(() => {
                    if (editingClass) {
                      upsertClass({ ...editingClass, skill_proficiencies: val })
                    }
                  }, 500)
                }}
                options={SKILL_OPTIONS}
                title="Skill Proficiencies"
                description="Select which skills players can choose from when creating a character with this class"
              />
            </div>
            <div className="grid gap-1">
              <ProficiencyCheckboxes
                value={normalizeProficiencyArray((editingClass as any)?.equipment_proficiencies)}
                onChange={(val) => {
                  setEditingClass(prev => prev ? { ...(prev as any), equipment_proficiencies: val } as any : prev)
                  // Trigger autosave
                  setTimeout(() => {
                    if (editingClass) {
                      upsertClass({ ...editingClass, equipment_proficiencies: val })
                    }
                  }, 500)
                }}
                options={EQUIPMENT_OPTIONS}
                title="Equipment Proficiencies"
                description="Select which equipment this class is proficient with"
              />
            </div>
            <div className="grid gap-1">
              <Label>Starting Equipment (JSON)</Label>
              <JsonCodeEditor value={(editingClass as any)?.starting_equipment ?? {}} onChange={(val) => setEditingClass(prev => prev ? { ...(prev as any), starting_equipment: val } as any : prev)} />
            </div>
            <div className="grid gap-1">
              <Label>Spell Progression</Label>
              <SpellSlotsGrid
                value={{
                  cantripsKnown: (editingClass as any)?.cantrips_known ?? Array(20).fill(0),
                  spellSlots: {
                    spell_slots_1: (editingClass as any)?.spell_slots_1 ?? Array(20).fill(0),
                    spell_slots_2: (editingClass as any)?.spell_slots_2 ?? Array(20).fill(0),
                    spell_slots_3: (editingClass as any)?.spell_slots_3 ?? Array(20).fill(0),
                    spell_slots_4: (editingClass as any)?.spell_slots_4 ?? Array(20).fill(0),
                    spell_slots_5: (editingClass as any)?.spell_slots_5 ?? Array(20).fill(0),
                    spell_slots_6: (editingClass as any)?.spell_slots_6 ?? Array(20).fill(0),
                    spell_slots_7: (editingClass as any)?.spell_slots_7 ?? Array(20).fill(0),
                    spell_slots_8: (editingClass as any)?.spell_slots_8 ?? Array(20).fill(0),
                    spell_slots_9: (editingClass as any)?.spell_slots_9 ?? Array(20).fill(0)
                  }
                }}
                onChange={(spellData) => {
                  setEditingClass(prev => prev ? {
                    ...(prev as any),
                    cantrips_known: spellData.cantripsKnown,
                    spell_slots_1: spellData.spellSlots.spell_slots_1,
                    spell_slots_2: spellData.spellSlots.spell_slots_2,
                    spell_slots_3: spellData.spellSlots.spell_slots_3,
                    spell_slots_4: spellData.spellSlots.spell_slots_4,
                    spell_slots_5: spellData.spellSlots.spell_slots_5,
                    spell_slots_6: spellData.spellSlots.spell_slots_6,
                    spell_slots_7: spellData.spellSlots.spell_slots_7,
                    spell_slots_8: spellData.spellSlots.spell_slots_8,
                    spell_slots_9: spellData.spellSlots.spell_slots_9
                  } as any : prev)
                  
                  // Trigger autosave
                  setTimeout(() => {
                    if (editingClass) {
                      upsertClass({
                        ...editingClass,
                        cantrips_known: spellData.cantripsKnown,
                        spell_slots_1: spellData.spellSlots.spell_slots_1,
                        spell_slots_2: spellData.spellSlots.spell_slots_2,
                        spell_slots_3: spellData.spellSlots.spell_slots_3,
                        spell_slots_4: spellData.spellSlots.spell_slots_4,
                        spell_slots_5: spellData.spellSlots.spell_slots_5,
                        spell_slots_6: spellData.spellSlots.spell_slots_6,
                        spell_slots_7: spellData.spellSlots.spell_slots_7,
                        spell_slots_8: spellData.spellSlots.spell_slots_8,
                        spell_slots_9: spellData.spellSlots.spell_slots_9
                      })
                    }
                  }, 1000) // Longer delay for spell slots since they change frequently
                }}
              />
            </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3 shrink-0">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
              <Button onClick={() => upsertClass(editingClass || {})}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={(v) => setDetailsOpen(!!v)}>
        <DialogContent className="sm:max-w-[720px] h-[80vh] max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{detailsClassName} — Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden gap-0">
            <Tabs value={detailsTab} onValueChange={(v:any)=>setDetailsTab(v)} className="h-full flex flex-col gap-0">
              <div className="p-4 border-b">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="subclasses">Subclasses</TabsTrigger>
                  <TabsTrigger value="features">Class Features</TabsTrigger>
                  <TabsTrigger value="feature-skills">Feature Skills</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="subclasses" className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  {subclasses.filter(sc => sc.class_id === detailsClassId).map(sc => (
                    <div key={sc.id} className="flex items-center justify-between p-2 pl-3 border rounded-lg">
                      <div className="text-sm font-medium">{sc.name}</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="w-8 h-8" onClick={() => setEditingSubclass(sc)}><Icon icon="lucide:edit" className="w-4 h-4" /></Button>
                        <Button variant="outline" className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8" size="sm" onClick={() => removeSubclass(sc.id)}><Icon icon="lucide:trash-2" className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="features" className="flex-1 overflow-y-auto p-4 gap-0">
                <div>
                  {detailsClassId && (() => {
                    const all = (featuresByClass[detailsClassId] || []) as FeatureItem[]
                    const base = all.filter(f => !f.subclass_id).sort((a,b) => a.level - b.level)
                    const bySubclass = new Map<string, FeatureItem[]>()
                    all.filter(f => !!f.subclass_id).forEach(f => {
                      const key = String(f.subclass_id)
                      const arr = bySubclass.get(key) || []
                      arr.push(f)
                      bySubclass.set(key, arr)
                    })
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          {base.length > 0 && <div className="text-xs text-muted-foreground">Base Class</div>}
                          {base.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-2 pl-3 border rounded-lg">
                              <div className="text-sm font-medium">Level {f.level}: {f.title}</div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="w-8 h-8" onClick={() => setEditingFeature({ id: f.id, class_id: detailsClassId, level: f.level, title: f.title, description: f.description, feature_type: 'class' })}><Icon icon="lucide:edit" className="w-4 h-4" /></Button>
                                <Button variant="outline" className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8" size="sm" onClick={async () => { const { success } = await deleteClassFeature(f.id); if (success) setFeaturesByClass(prev => ({ ...prev, [detailsClassId]: (prev[detailsClassId] || []).filter(x => x.id !== f.id) })) }}><Icon icon="lucide:trash-2" className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {[...bySubclass.entries()].map(([subId, feats]) => {
                          const sc = subclasses.find(s => s.id === subId)
                          const title = sc ? sc.name : 'Subclass'
                          const sorted = feats.sort((a,b) => a.level - b.level)
                          return (
                            <div key={subId} className="flex flex-col gap-2">
                              <div className="text-xs text-muted-foreground">{title}</div>
                              {sorted.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-2 pl-3 border rounded-lg">
                                  <div className="text-sm font-medium">Level {f.level}: {f.title}</div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="w-8 h-8" onClick={() => setEditingFeature({ id: f.id, class_id: detailsClassId, subclass_id: subId, level: f.level, title: f.title, description: f.description, feature_type: 'subclass' })}><Icon icon="lucide:edit" className="w-4 h-4" /></Button>
                                    <Button variant="outline" className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8" size="sm" onClick={async () => { const { success } = await deleteClassFeature(f.id); if (success) setFeaturesByClass(prev => ({ ...prev, [detailsClassId]: (prev[detailsClassId] || []).filter(x => x.id !== f.id) })) }}><Icon icon="lucide:trash-2" className="w-4 h-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </TabsContent>
              <TabsContent value="feature-skills" className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Feature Skills</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddFeatureSkill(detailsClassId!)}
                    >
                      <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                      Add Feature Skill
                    </Button>
                  </div>
                  
                  {detailsClassId && featureSkillsByClass[detailsClassId] ? (
                    <div className="space-y-3">
                      {featureSkillsByClass[detailsClassId].map((skill) => (
                        <div key={skill.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{skill.title}</h4>
                              {skill.subtitle && (
                                <p className="text-sm text-muted-foreground">{skill.subtitle}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {skill.featureType.replace('_', ' ')}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Level {skill.enabledAtLevel}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingFeatureSkill(skill)}
                              >
                                <Icon icon="lucide:edit" className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setFeatureSkillsByClass(prev => ({
                                    ...prev,
                                    [detailsClassId]: prev[detailsClassId].filter(s => s.id !== skill.id)
                                  }))
                                }}
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon icon="lucide:zap" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No feature skills defined for this class.</p>
                      <p className="text-sm">Add feature skills to enable usage tracking for class abilities.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        
          <DialogFooter className="p-4 border-t">
              <div className="flex gap-2 justify-start items-center align-left">
                {detailsTab === 'subclasses' && detailsClassId && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingSubclass({ id: "", class_id: detailsClassId!, name: "", description: "", subclass_features: {} } as SubclassData)}>
                      <Icon icon="lucide:plus" className="w-4 h-4" /> Add Subclass
                  </Button>
                )}
                {detailsTab === 'features' && detailsClassId && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingFeature({ class_id: detailsClassId!, level: 1, title: "", description: "", feature_type: "class" })}>
                      <Icon icon="lucide:plus" className="w-4 h-4" /> Add Feature
                  </Button>
                )}
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subclass Editor */}
      <Dialog open={!!editingSubclass} onOpenChange={() => setEditingSubclass(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingSubclass?.id ? "Edit Subclass" : "New Subclass"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="subclass-name">Subclass Name</Label>
              <Input id="subclass-name" placeholder="e.g. College of Lore" value={editingSubclass?.name ?? ""} onChange={(e) => setEditingSubclass(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="subclass-description">Description</Label>
              <RichTextEditor value={editingSubclass?.description ?? ""} onChange={(val) => setEditingSubclass(prev => prev ? { ...prev, description: val } : prev)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingSubclass(null)}>Cancel</Button>
            {editingSubclass?.class_id && (
              <Button onClick={() => upsertSubclass({ ...(editingSubclass || {}), class_id: editingSubclass.class_id })}>Save</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Editor */}
      <Dialog open={!!editingFeature} onOpenChange={() => setEditingFeature(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingFeature?.id ? "Edit Feature" : "New Feature"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="feature-title">Title</Label>
              <Input id="feature-title" value={editingFeature?.title ?? ""} onChange={(e) => setEditingFeature(prev => prev ? { ...prev, title: e.target.value } : prev)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label>Feature Type</Label>
                <Select value={editingFeature?.feature_type ?? "class"} onValueChange={(val) => setEditingFeature(prev => prev ? { ...prev, feature_type: val as any } : prev)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="subclass">Subclass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Linked Subclass</Label>
                {(() => {
                  const baseClassId = editingFeature?.class_id
                  const scopedSubclasses = subclasses.filter(sc => sc.class_id === baseClassId)
                  return (
                    <Select disabled={editingFeature?.feature_type !== 'subclass'} onValueChange={(val) => setEditingFeature(prev => prev ? { ...prev, subclass_id: val } : prev)} value={editingFeature?.subclass_id ?? undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subclass" />
                      </SelectTrigger>
                      <SelectContent>
                        {scopedSubclasses.map((sc) => (
                          <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="feature-level">Level</Label>
                <Input id="feature-level" type="number" value={editingFeature?.level ?? 1} onChange={(e) => setEditingFeature(prev => prev ? { ...prev, level: Number(e.target.value) } : prev)} />
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="feature-description">Description</Label>
              <WysiwygEditor value={editingFeature?.description ?? ""} onChange={(val) => setEditingFeature(prev => prev ? { ...prev, description: val } : prev)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingFeature(null)}>Cancel</Button>
            {editingFeature?.class_id && (
              <Button onClick={async () => {
                const { success, id } = await upsertClassFeature(editingFeature!)
                if (success) {
                  const saved = { ...editingFeature!, id: id || editingFeature!.id! }
                  setFeaturesByClass(prev => ({ ...prev, [saved.class_id]: [...(prev[saved.class_id] || []).filter(f => f.id !== saved.id), saved].sort((a,b) => a.level - b.level) }))
                  setEditingFeature(null)
                }
              }}>Save</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Duplication Modal */}
      {duplicatingClass && (
        <ClassDuplicationModal
          sourceClass={duplicatingClass}
          onClose={() => setDuplicatingClass(null)}
          onSuccess={(newClass) => {
            // The modal will handle the duplication internally
            setDuplicatingClass(null)
            reloadFromDb() // Reload to show the new class
          }}
        />
      )}

      {/* Feature Skill Editor Modal */}
      {editingFeatureSkill && (
        <ClassFeatureSkillModal
          isOpen={!!editingFeatureSkill}
          onClose={() => setEditingFeatureSkill(null)}
          onSave={handleSaveFeatureSkill}
          editingFeature={editingFeatureSkill}
        />
      )}
    </div>
  )
}
