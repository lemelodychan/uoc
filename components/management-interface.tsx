"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { ClassData, SubclassData } from "@/lib/class-utils"
import type { UserProfile, PermissionLevel } from "@/lib/user-profiles"
import { useUser } from "@/lib/user-context"
import { loadClassesWithDetails, loadFeaturesForBaseWithSubclasses, upsertClass as dbUpsertClass, deleteClass as dbDeleteClass, upsertClassFeature, deleteClassFeature, loadAllClasses, loadClassById, duplicateClass, getCustomClasses, canEditClass, updateUserProfileByAdmin, deleteUserProfileByAdmin, loadRacesWithDetails, upsertRace as dbUpsertRace, deleteRace as dbDeleteRace, loadRaceDetails, loadBackgroundsWithDetails, upsertBackground as dbUpsertBackground, deleteBackground as dbDeleteBackground, loadBackgroundDetails, loadFeatsWithDetails, upsertFeat as dbUpsertFeat, deleteFeat as dbDeleteFeat, loadFeatDetails } from "@/lib/database"
import type { RaceData, BackgroundData, FeatData } from "@/lib/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { SpellSlotsGrid } from "@/components/ui/spell-slots-grid"
import { ClassDuplicationModal } from "./edit-modals/class-duplication-modal"
import { ClassFeatureSkillModal } from "./edit-modals/class-feature-skill-modal"
import { CampaignCreationModal } from "./edit-modals/campaign-creation-modal"
import { ClassEditorPage } from "./class-editor-page"
import { RaceEditorPage } from "./race-editor-page"
import { BackgroundEditorPage } from "./background-editor-page"
import { FeatEditorPage } from "./feat-editor-page"
import { SubclassManagementModal } from "@/components/edit-modals/subclass-management-modal"
import { FeatureManagementModal } from "@/components/edit-modals/feature-management-modal"
import { ProficiencyCheckboxes, SAVING_THROW_OPTIONS, SKILL_OPTIONS, EQUIPMENT_OPTIONS } from "@/components/ui/proficiency-checkboxes"
import type { ClassFeatureSkill } from "@/lib/class-feature-types"

interface ManagementInterfaceProps {
  campaigns: Campaign[]
  characters: CharacterData[]
  users: UserProfile[]
  onCreateCampaign: (campaign: Campaign) => void
  onUpdateCampaign: (campaign: Campaign) => void
  onDeleteCampaign: (campaign: Campaign) => void
  onAssignCharacterToCampaign: (characterId: string, campaignId: string) => void
  onRemoveCharacterFromCampaign: (characterId: string) => void
  onSetActiveCampaign: (campaignId: string) => void
}

export function ManagementInterface({
  campaigns,
  characters,
  users,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onAssignCharacterToCampaign,
  onRemoveCharacterFromCampaign,
  onSetActiveCampaign
}: ManagementInterfaceProps) {
  const [activeTab, setActiveTab] = useState<string>("campaigns")
  const [classes, setClasses] = useState<ClassData[]>([])
  const [editingClass, setEditingClass] = useState<ClassData | null>(null)
  const [lastEditedClassId, setLastEditedClassId] = useState<string | null>(null)
  const [showClassDuplicationModal, setShowClassDuplicationModal] = useState(false)
  const [showFeatureSkillModal, setShowFeatureSkillModal] = useState(false)
  const [editingFeature, setEditingFeature] = useState<ClassFeatureSkill | null>(null)
  const [showCampaignCreationModal, setShowCampaignCreationModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [classEditorView, setClassEditorView] = useState<'list' | 'editor'>('list')
  const [showSubclassManagementModal, setShowSubclassManagementModal] = useState(false)
  const [selectedBaseClass, setSelectedBaseClass] = useState<ClassData | null>(null)
  const [showFeatureManagementModal, setShowFeatureManagementModal] = useState(false)
  const [selectedClassForFeatures, setSelectedClassForFeatures] = useState<ClassData | null>(null)
  const { toast } = useToast()
  const [localUsers, setLocalUsers] = useState<UserProfile[]>(users)
  const { userProfile } = useUser()
  const canEdit = userProfile?.permissionLevel !== 'viewer'
  
  // Race management state
  const [races, setRaces] = useState<RaceData[]>([])
  const [editingRace, setEditingRace] = useState<RaceData | null>(null)
  const [raceEditorView, setRaceEditorView] = useState<'list' | 'editor'>('list')
  const [lastEditedRaceId, setLastEditedRaceId] = useState<string | null>(null)
  
  // Background management state
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([])
  const [editingBackground, setEditingBackground] = useState<BackgroundData | null>(null)
  const [backgroundEditorView, setBackgroundEditorView] = useState<'list' | 'editor'>('list')
  const [lastEditedBackgroundId, setLastEditedBackgroundId] = useState<string | null>(null)
  
  // Feat management state
  const [feats, setFeats] = useState<FeatData[]>([])
  const [editingFeat, setEditingFeat] = useState<FeatData | null>(null)
  const [featEditorView, setFeatEditorView] = useState<'list' | 'editor'>('list')
  const [lastEditedFeatId, setLastEditedFeatId] = useState<string | null>(null)
  
  // Refs for scroll management
  const classListTopRef = useRef<HTMLDivElement>(null)
  const classCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Load classes on mount
  useEffect(() => {
    loadClasses()
  }, [])

  // Load races on mount
  useEffect(() => {
    loadRaces()
  }, [])

  // Load backgrounds on mount
  useEffect(() => {
    loadBackgrounds()
  }, [])

  // Load feats on mount
  useEffect(() => {
    loadFeats()
  }, [])

  // Reload races when switching to races tab (if in list view)
  useEffect(() => {
    if (activeTab === 'races' && raceEditorView === 'list') {
      loadRaces()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Reload backgrounds when switching to backgrounds tab (if in list view)
  useEffect(() => {
    if (activeTab === 'backgrounds' && backgroundEditorView === 'list') {
      loadBackgrounds()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Reload feats when switching to feats tab (if in list view)
  useEffect(() => {
    if (activeTab === 'feats' && featEditorView === 'list') {
      loadFeats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Scroll to the last edited class when returning to list view
  useEffect(() => {
    if (classEditorView === 'list' && lastEditedClassId) {
      // Wait a bit for the DOM to update
      setTimeout(() => {
        const classCard = classCardRefs.current.get(lastEditedClassId)
        if (classCard) {
          classCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Clear the last edited class after scrolling
          setTimeout(() => setLastEditedClassId(null), 1000)
        }
      }, 100)
    }
  }, [classEditorView, lastEditedClassId])

  const loadClasses = async () => {
    try {
      const result = await loadClassesWithDetails()
      if (result.classes) {
        // Transform the database result to match ClassData interface
        const transformedClasses: ClassData[] = result.classes.map(dbClass => {
          
          return {
          id: dbClass.id,
          name: dbClass.name,
          subclass: dbClass.subclass,
          description: dbClass.description || null,
          hit_die: dbClass.hit_die || 8,
          subclass_selection_level: dbClass.subclass_selection_level ?? 3,
          primary_ability: Array.isArray(dbClass.primary_ability) 
            ? dbClass.primary_ability 
            : dbClass.primary_ability 
              ? [dbClass.primary_ability] 
              : [],
          saving_throw_proficiencies: dbClass.saving_throw_proficiencies || [],
          skill_proficiencies: dbClass.skill_proficiencies,
          equipment_proficiencies: dbClass.equipment_proficiencies,
          starting_equipment: dbClass.starting_equipment,
          spell_slots_1: dbClass.spell_slots_1,
          spell_slots_2: dbClass.spell_slots_2,
          spell_slots_3: dbClass.spell_slots_3,
          spell_slots_4: dbClass.spell_slots_4,
          spell_slots_5: dbClass.spell_slots_5,
          spell_slots_6: dbClass.spell_slots_6,
          spell_slots_7: dbClass.spell_slots_7,
          spell_slots_8: dbClass.spell_slots_8,
          spell_slots_9: dbClass.spell_slots_9,
          cantrips_known: Array.isArray(dbClass.cantrips_known) ? dbClass.cantrips_known : null,
          spells_known: Array.isArray(dbClass.spells_known) ? dbClass.spells_known : null,
          // Column toggles for spell progression matrix
          showSpellsKnown: dbClass.show_spells_known ?? false,
          showSorceryPoints: dbClass.show_sorcery_points ?? false,
          showMartialArts: dbClass.show_martial_arts ?? false,
          showKiPoints: dbClass.show_ki_points ?? false,
          showUnarmoredMovement: dbClass.show_unarmored_movement ?? false,
          showRage: dbClass.show_rage ?? false,
          showRageDamage: dbClass.show_rage_damage ?? false,
          // Sorcerer-specific fields
          sorcery_points: Array.isArray(dbClass.sorcery_points) ? dbClass.sorcery_points : null,
          // Monk-specific fields
          martial_arts_dice: Array.isArray(dbClass.martial_arts_dice) ? dbClass.martial_arts_dice : null,
          ki_points: Array.isArray(dbClass.ki_points) ? dbClass.ki_points : null,
          unarmored_movement: Array.isArray(dbClass.unarmored_movement) ? dbClass.unarmored_movement : null,
          // Barbarian-specific fields
          rage_uses: Array.isArray(dbClass.rage_uses) ? dbClass.rage_uses : null,
          rage_damage: Array.isArray(dbClass.rage_damage) ? dbClass.rage_damage : null,
          // Custom class support fields
          is_custom: dbClass.is_custom ?? false,
          created_by: dbClass.created_by ?? null,
          duplicated_from: dbClass.duplicated_from ?? null,
          source: dbClass.source ?? 'custom',
          created_at: dbClass.created_at ?? new Date().toISOString(),
          updated_at: dbClass.updated_at ?? new Date().toISOString(),
          // Legacy fields
          spell_progression: dbClass.spell_progression,
          max_spell_slots: dbClass.max_spell_slots,
          // class_features column has been dropped - using separate class_features table
        }
        })
        setClasses(transformedClasses)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive"
      })
    }
  }

  const upsertClass = async (classData: Partial<ClassData>) => {
    try {
      const result = await dbUpsertClass(classData)
      if (result.success) {
        toast({
          title: "Success",
          description: "Class saved successfully"
        })
        loadClasses() // Reload classes
      } else {
        throw new Error(result.error || 'Failed to save class')
      }
    } catch (error) {
      console.error('Error saving class:', error)
      toast({
        title: "Error",
        description: "Failed to save class",
        variant: "destructive"
      })
    }
  }

  const deleteClass = async (classId: string) => {
    try {
      const result = await dbDeleteClass(classId)
      if (result.success) {
        toast({
          title: "Success",
          description: "Class deleted successfully"
        })
        loadClasses() // Reload classes
        setEditingClass(null)
      } else {
        throw new Error(result.error || 'Failed to delete class')
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive"
      })
    }
  }

  const handleDuplicateClass = async (sourceClassId: string, newName: string, options: { copySubclasses?: boolean; copyFeatures?: boolean; copyFeatureSkills?: boolean }) => {
    try {
      const result = await duplicateClass(sourceClassId, newName, options)
      if (result.success) {
        toast({
          title: "Success",
          description: "Class duplicated successfully"
        })
        loadClasses() // Reload classes
        setShowClassDuplicationModal(false)
      } else {
        throw new Error(result.error || 'Failed to duplicate class')
      }
    } catch (error) {
      console.error('Error duplicating class:', error)
      toast({
        title: "Error",
        description: "Failed to duplicate class",
        variant: "destructive"
      })
    }
  }

  const handleManageSubclasses = (baseClass: ClassData) => {
    setSelectedBaseClass(baseClass)
    setShowSubclassManagementModal(true)
  }

  const handleManageFeatures = (classData: ClassData) => {
    setSelectedClassForFeatures(classData)
    setShowFeatureManagementModal(true)
  }

  const loadRaces = async () => {
    try {
      const result = await loadRacesWithDetails()
      if (result.races) {
        setRaces(result.races)
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading races:', error)
      toast({
        title: "Error",
        description: "Failed to load races",
        variant: "destructive"
      })
    }
  }

  const loadBackgrounds = async () => {
    try {
      const result = await loadBackgroundsWithDetails()
      if (result.backgrounds) {
        setBackgrounds(result.backgrounds)
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading backgrounds:', error)
      toast({
        title: "Error",
        description: "Failed to load backgrounds",
        variant: "destructive"
      })
    }
  }

  const loadFeats = async () => {
    try {
      const result = await loadFeatsWithDetails()
      if (result.feats) {
        setFeats(result.feats)
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading feats:', error)
      toast({
        title: "Error",
        description: "Failed to load feats",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="relative flex flex-row gap-6 h-full !overflow-auto">

      {/* Sidebar Navigation */}
      <div className="w-72 bg-card flex flex-col gap-1 py-4 flex-shrink-0 border-r border-t fixed left-[0px] top-[64px] h-[calc(100vh-64px)]">
        <div className="text-lg font-bold font-display px-4">Settings</div>
        <nav className="flex flex-col gap-0 px-4">
          <Button
            variant="outline"
            onClick={() => setActiveTab('campaigns')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'campaigns' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="iconoir:hexagon-dice" className="w-4 h-4" />
            Campaigns
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('classes')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'classes' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:sword" className="w-4 h-4" />
            Classes
            <Badge 
              variant="secondary" 
              className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto"
            >
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
            <Icon icon="lucide:users-round" className="w-4 h-4" />
            Races
            <Badge 
              variant="secondary" 
              className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto"
            >
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
            <Badge 
              variant="secondary" 
              className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto"
            >
              Beta
            </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('feats')}
            className={`rounded-none border-0 border-b w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'feats' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:sparkles" className="w-4 h-4" />
            Feats
            <Badge 
              variant="secondary" 
              className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto"
            >
              Beta
            </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('users')}
            className={`rounded-none border-0 w-full justify-start bg-transparent shadow-none text-sm !px-1 !py-4 h-fit hover:text-primary ${
              activeTab === 'users' ? 'text-primary' : ''
            }`}
          >
            <Icon icon="lucide:id-card" className="w-4 h-4" />
            Users
          </Button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full ml-72 h-fit !overflow-visible p-6">
        {activeTab === 'campaigns' && (
          <div className="flex flex-col gap-0">
            <CampaignManagement 
              campaigns={campaigns} 
              characters={characters} 
              users={users}
              onCreateCampaign={() => setShowCampaignCreationModal(true)}
              onEditCampaign={(campaign) => {
                setEditingCampaign(campaign)
                setShowCampaignCreationModal(true)
              }}
              onDeleteCampaign={onDeleteCampaign}
            />
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="flex flex-col gap-0">
            {classEditorView === 'list' ? (
              <ClassManagement 
                classes={classes}
                classListTopRef={classListTopRef}
                classCardRefs={classCardRefs}
                canEdit={canEdit}
                onEditClass={async (classData) => {
              // Scroll to top when entering edit mode
              classListTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              
              // Fetch fresh data from database
              const result = await loadClassById(classData.id)
              if (result.klass) {
                // Transform the raw database data to ClassData format
                const transformedClass: ClassData = {
                  id: result.klass.id,
                  name: result.klass.name,
                  subclass: result.klass.subclass,
                  description: result.klass.description || null,
                  hit_die: result.klass.hit_die || 8,
                  subclass_selection_level: result.klass.subclass_selection_level || 3,
                  primary_ability: Array.isArray(result.klass.primary_ability) 
                    ? result.klass.primary_ability 
                    : result.klass.primary_ability 
                      ? [result.klass.primary_ability] 
                      : [],
                  saving_throw_proficiencies: result.klass.saving_throw_proficiencies || [],
                  skill_proficiencies: result.klass.skill_proficiencies,
                  equipment_proficiencies: result.klass.equipment_proficiencies,
                  starting_equipment: result.klass.starting_equipment,
                  spell_slots_1: result.klass.spell_slots_1,
                  spell_slots_2: result.klass.spell_slots_2,
                  spell_slots_3: result.klass.spell_slots_3,
                  spell_slots_4: result.klass.spell_slots_4,
                  spell_slots_5: result.klass.spell_slots_5,
                  spell_slots_6: result.klass.spell_slots_6,
                  spell_slots_7: result.klass.spell_slots_7,
                  spell_slots_8: result.klass.spell_slots_8,
                  spell_slots_9: result.klass.spell_slots_9,
                  cantrips_known: Array.isArray(result.klass.cantrips_known) ? result.klass.cantrips_known : null,
                  spells_known: Array.isArray(result.klass.spells_known) ? result.klass.spells_known : null,
                  // Column toggles for spell progression matrix
                  showSpellsKnown: result.klass.show_spells_known ?? false,
                  showSorceryPoints: result.klass.show_sorcery_points ?? false,
                  showMartialArts: result.klass.show_martial_arts ?? false,
                  showKiPoints: result.klass.show_ki_points ?? false,
                  showUnarmoredMovement: result.klass.show_unarmored_movement ?? false,
                  showRage: result.klass.show_rage ?? false,
                  showRageDamage: result.klass.show_rage_damage ?? false,
                  // Sorcerer-specific fields
                  sorcery_points: Array.isArray(result.klass.sorcery_points) ? result.klass.sorcery_points : null,
                  // Monk-specific fields
                  martial_arts_dice: Array.isArray(result.klass.martial_arts_dice) ? result.klass.martial_arts_dice : null,
                  ki_points: Array.isArray(result.klass.ki_points) ? result.klass.ki_points : null,
                  unarmored_movement: Array.isArray(result.klass.unarmored_movement) ? result.klass.unarmored_movement : null,
                  // Barbarian-specific fields
                  rage_uses: Array.isArray(result.klass.rage_uses) ? result.klass.rage_uses : null,
                  rage_damage: Array.isArray(result.klass.rage_damage) ? result.klass.rage_damage : null,
                  // Custom class support fields
                  is_custom: result.klass.is_custom ?? false,
                  created_by: result.klass.created_by ?? null,
                  duplicated_from: result.klass.duplicated_from ?? null,
                  source: result.klass.source ?? 'custom',
                  created_at: result.klass.created_at ?? new Date().toISOString(),
                  updated_at: result.klass.updated_at ?? new Date().toISOString(),
                  // Legacy fields
                  spell_progression: result.klass.spell_progression,
                  max_spell_slots: result.klass.max_spell_slots,
                }
                
                
                setEditingClass(transformedClass)
                setClassEditorView('editor')
              } else {
                  toast({
                    title: "Error",
                    description: result.error || "Failed to load class data",
                    variant: "destructive"
                  })
                }
              }}
              onCreateClass={() => {
              // Scroll to top when creating a new class
              classListTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              
              setEditingClass({
                id: '', // Will be generated by database
                name: '',
                subclass: null,
                description: null,
                hit_die: 8,
                primary_ability: [],
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
                is_custom: true, // Mark as custom class
                created_by: null,
                duplicated_from: null,
                source: 'custom',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                subclass_selection_level: 3
                })
                setClassEditorView('editor')
              }}
              onDeleteClass={deleteClass}
              onReloadClasses={loadClasses}
              onManageSubclasses={handleManageSubclasses}
              onManageFeatures={handleManageFeatures}
            />
            ) : (
              editingClass && (
                <ClassEditorPage
                  classData={editingClass}
                  canEdit={canEdit}
                  onSave={async (classData) => {
                try {
                  const result = await dbUpsertClass(classData)
                  
                  // Check if the save was successful
                  if (!result.success) {
                    throw new Error(result.error || 'Failed to save class')
                  }
                  
                  // Store the ID of the class we just saved
                  const savedClassId = result.id || classData.id
                  if (savedClassId) {
                    setLastEditedClassId(savedClassId)
                  }
                  
                  // Reload classes list to show updated data
                  await loadClasses()
                  setClassEditorView('list')
                  setEditingClass(null)
                  toast({
                    title: "Success",
                    description: `Class "${classData.name}" saved successfully`,
                  })
                } catch (error) {
                  console.error('Error saving class:', error)
                    throw error // Re-throw to let ClassEditorPage handle the error display
                  }
                }}
                onCancel={() => {
                  setClassEditorView('list')
                  setEditingClass(null)
                  // Scroll to top when canceling
                  classListTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                onDelete={async (classId) => {
                try {
                  const classToDelete = classes.find(c => c.id === classId)
                  await deleteClass(classId)
                  // Reload classes list to show updated data
                  await loadClasses()
                  setClassEditorView('list')
                  setEditingClass(null)
                  toast({
                    title: "Success",
                    description: `Class "${classToDelete?.name || 'Unknown'}" deleted successfully`,
                  })
                } catch (error) {
                  console.error('Error deleting class:', error)
                  toast({
                    title: "Error",
                    description: "Failed to delete class",
                    variant: "destructive"
                    })
                  }
                }}
                onDuplicate={() => setShowClassDuplicationModal(true)}
              />
              )
            )}
          </div>
        )}

        {activeTab === 'races' && (
          <div className="flex-1 min-h-0 flex flex-col gap-0">
            {raceEditorView === 'list' ? (
              <RaceManagement 
                races={races}
                canEdit={canEdit}
                onEditRace={async (raceData) => {
              const result = await loadRaceDetails(raceData.id)
              if (result.race) {
                setEditingRace(result.race)
                setRaceEditorView('editor')
              } else {
                  toast({
                    title: "Error",
                    description: result.error || "Failed to load race data",
                    variant: "destructive"
                  })
                }
              }}
              onCreateRace={() => {
              setEditingRace({
                id: '',
                name: '',
                description: null,
                ability_score_increases: null,
                size: null,
                speed: 30,
                features: null,
                languages: null,
                spellcasting_ability: null,
                is_custom: false,
                created_by: null,
                source: "Player's Handbook"
                })
                setRaceEditorView('editor')
              }}
              onDeleteRace={async (raceId) => {
              try {
                await dbDeleteRace(raceId)
                await loadRaces()
                toast({
                  title: "Success",
                  description: "Race deleted successfully"
                })
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to delete race",
                  variant: "destructive"
                })
              }
            }}
                onReloadRaces={loadRaces}
              />
            ) : (
              editingRace && (
                <RaceEditorPage
                  raceData={editingRace}
                  canEdit={canEdit}
                  onSave={async (raceData) => {
                try {
                  const result = await dbUpsertRace(raceData)
                  if (!result.success) {
                    throw new Error(result.error || 'Failed to save race')
                  }
                  const savedRaceId = result.id || raceData.id
                  if (savedRaceId) {
                    setLastEditedRaceId(savedRaceId)
                  }
                  // Reload races to refresh the list
                  await loadRaces()
                  // Switch to list view after races are loaded
                  setRaceEditorView('list')
                  setEditingRace(null)
                  toast({
                    title: "Success",
                    description: `Race "${raceData.name}" saved successfully`,
                  })
                } catch (error) {
                    console.error('Error saving race:', error)
                    throw error
                  }
                }}
                onCancel={() => {
                  setRaceEditorView('list')
                  setEditingRace(null)
                }}
                onDelete={async (raceId) => {
                try {
                  await dbDeleteRace(raceId)
                  await loadRaces()
                  setRaceEditorView('list')
                  setEditingRace(null)
                  toast({
                    title: "Success",
                    description: "Race deleted successfully",
                  })
                } catch (error) {
                  console.error('Error deleting race:', error)
                  toast({
                    title: "Error",
                    description: "Failed to delete race",
                      variant: "destructive"
                    })
                  }
                }}
              />
            )
          )}
          </div>
        )}

        {activeTab === 'backgrounds' && (
          <div className="flex-1 min-h-0 flex flex-col gap-0">
            {backgroundEditorView === 'list' ? (
              <BackgroundManagement 
                backgrounds={backgrounds}
                canEdit={canEdit}
                onEditBackground={async (backgroundData) => {
              const result = await loadBackgroundDetails(backgroundData.id)
              if (result.background) {
                setEditingBackground(result.background)
                setBackgroundEditorView('editor')
              } else {
                  toast({
                    title: "Error",
                    description: result.error || "Failed to load background data",
                    variant: "destructive"
                  })
                }
              }}
              onCreateBackground={() => {
              setEditingBackground({
                id: '',
                name: '',
                skill_proficiencies: null,
                tool_proficiencies: null,
                equipment_proficiencies: null,
                languages: null,
                equipment: null,
                money: { gold: 0, silver: 0, copper: 0 },
                description: null,
                defining_events: null,
                defining_events_title: null,
                personality_traits: null,
                ideals: null,
                bonds: null,
                flaws: null
                })
                setBackgroundEditorView('editor')
              }}
              onDeleteBackground={async (backgroundId) => {
              try {
                await dbDeleteBackground(backgroundId)
                await loadBackgrounds()
                toast({
                  title: "Success",
                  description: "Background deleted successfully"
                })
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to delete background",
                  variant: "destructive"
                })
              }
            }}
                onReloadBackgrounds={loadBackgrounds}
              />
            ) : (
              editingBackground && (
                <BackgroundEditorPage
                  backgroundData={editingBackground}
                  canEdit={canEdit}
                  onSave={async (backgroundData) => {
                try {
                  const result = await dbUpsertBackground(backgroundData)
                  if (!result.success) {
                    throw new Error(result.error || 'Failed to save background')
                  }
                  const savedBackgroundId = result.id || backgroundData.id
                  if (savedBackgroundId) {
                    setLastEditedBackgroundId(savedBackgroundId)
                  }
                  // Reload backgrounds to refresh the list
                  await loadBackgrounds()
                  // Switch to list view after backgrounds are loaded
                  setBackgroundEditorView('list')
                  setEditingBackground(null)
                  toast({
                    title: "Success",
                    description: `Background "${backgroundData.name}" saved successfully`,
                  })
                } catch (error) {
                    console.error('Error saving background:', error)
                    throw error
                  }
                }}
                onCancel={() => {
                  setBackgroundEditorView('list')
                  setEditingBackground(null)
                }}
                onDelete={async (backgroundId) => {
                try {
                  await dbDeleteBackground(backgroundId)
                  await loadBackgrounds()
                  setBackgroundEditorView('list')
                  setEditingBackground(null)
                  toast({
                    title: "Success",
                    description: "Background deleted successfully",
                  })
                } catch (error) {
                  console.error('Error deleting background:', error)
                  toast({
                    title: "Error",
                    description: "Failed to delete background",
                      variant: "destructive"
                    })
                  }
                }}
              />
            )
          )}
          </div>
        )}

        {activeTab === 'feats' && (
          <div className="flex-1 min-h-0 flex flex-col gap-0">
            {featEditorView === 'list' ? (
              <FeatManagement 
                feats={feats}
                canEdit={canEdit}
                onEditFeat={async (featData) => {
              const result = await loadFeatDetails(featData.id)
              if (result.feat) {
                setEditingFeat(result.feat)
                setFeatEditorView('editor')
              } else {
                  toast({
                    title: "Error",
                    description: result.error || "Failed to load feat data",
                    variant: "destructive"
                  })
                }
              }}
              onCreateFeat={() => {
              setEditingFeat({
                id: '',
                name: '',
                description: null,
                ability_modifiers: null,
                skill_proficiencies: null,
                tool_proficiencies: null,
                equipment_proficiencies: null,
                weapon_proficiencies: null,
                languages: null,
                special_features: null
                })
                setFeatEditorView('editor')
              }}
              onDeleteFeat={async (featId) => {
              try {
                await dbDeleteFeat(featId)
                await loadFeats()
                toast({
                  title: "Success",
                  description: "Feat deleted successfully"
                })
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to delete feat",
                  variant: "destructive"
                })
              }
            }}
                onReloadFeats={loadFeats}
              />
            ) : (
              editingFeat && (
                <FeatEditorPage
                  featData={editingFeat}
                  canEdit={canEdit}
                  onSave={async (featData) => {
                try {
                  const result = await dbUpsertFeat(featData)
                  if (!result.success) {
                    throw new Error(result.error || 'Failed to save feat')
                  }
                  const savedFeatId = result.id || featData.id
                  if (savedFeatId) {
                    setLastEditedFeatId(savedFeatId)
                  }
                  // Reload feats to refresh the list
                  await loadFeats()
                  // Switch to list view after feats are loaded
                  setFeatEditorView('list')
                  setEditingFeat(null)
                  toast({
                    title: "Success",
                    description: `Feat "${featData.name}" saved successfully`,
                  })
                } catch (error) {
                    console.error('Error saving feat:', error)
                    throw error
                  }
                }}
                onCancel={() => {
                  setFeatEditorView('list')
                  setEditingFeat(null)
                }}
                onDelete={async (featId) => {
                try {
                  await dbDeleteFeat(featId)
                  await loadFeats()
                  setFeatEditorView('list')
                  setEditingFeat(null)
                  toast({
                    title: "Success",
                    description: "Feat deleted successfully",
                  })
                } catch (error) {
                  console.error('Error deleting feat:', error)
                  toast({
                    title: "Error",
                    description: "Failed to delete feat",
                      variant: "destructive"
                    })
                  }
                }}
              />
            )
          )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="flex-1 min-h-0 flex flex-col gap-0">
            <UserManagement
              users={localUsers}
              onUsersChange={setLocalUsers}
            />
          </div>
        )}
      </div>

      {/* Class Duplication Modal */}
      {showClassDuplicationModal && editingClass && (
        <ClassDuplicationModal
          sourceClass={editingClass}
          onClose={() => setShowClassDuplicationModal(false)}
          onSuccess={async (newClass: ClassData) => {
            try {
              await handleDuplicateClass(editingClass.id, newClass.name, {
                copySubclasses: true,
                copyFeatures: true,
                copyFeatureSkills: true
              })
            } catch (error) {
              console.error('Error in duplication success handler:', error)
            }
          }}
        />
      )}

      {/* Class Feature Skill Modal */}
      {showFeatureSkillModal && (
        <ClassFeatureSkillModal
          isOpen={showFeatureSkillModal}
          onClose={() => {
            setShowFeatureSkillModal(false)
            setEditingFeature(null)
          }}
          editingFeature={editingFeature}
          onSave={(feature) => {
            // Handle feature save
            setShowFeatureSkillModal(false)
            setEditingFeature(null)
          }}
        />
      )}

      {/* Campaign Creation/Edit Modal */}
      <CampaignCreationModal
        isOpen={showCampaignCreationModal}
        onClose={() => {
          setShowCampaignCreationModal(false)
          setEditingCampaign(null)
        }}
        onSave={(campaign) => {
          if (editingCampaign) {
            onUpdateCampaign(campaign)
          } else {
            onCreateCampaign(campaign)
          }
          setShowCampaignCreationModal(false)
          setEditingCampaign(null)
        }}
        editingCampaign={editingCampaign}
        characters={characters}
        users={users}
        onAssignCharacterToCampaign={onAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={onRemoveCharacterFromCampaign}
      />

      {/* Subclass Management Modal */}
      {showSubclassManagementModal && selectedBaseClass && (
        <SubclassManagementModal
          isOpen={showSubclassManagementModal}
          onClose={() => {
            setShowSubclassManagementModal(false)
            setSelectedBaseClass(null)
          }}
          baseClass={selectedBaseClass}
          allClasses={classes}
          canEdit={canEdit}
          onSave={async () => {
            // Reload classes after subclass changes
            await loadClasses()
            // Keep the modal open - don't close it
          }}
        />
      )}

      {/* Feature Management Modal */}
      {showFeatureManagementModal && selectedClassForFeatures && (
        <FeatureManagementModal
          isOpen={showFeatureManagementModal}
          onClose={() => {
            setShowFeatureManagementModal(false)
            setSelectedClassForFeatures(null)
          }}
          classData={selectedClassForFeatures}
          allClasses={classes}
          canEdit={canEdit}
          onSave={async () => {
            // Reload classes after feature changes
            await loadClasses()
            // Keep the modal open - don't close it
          }}
        />
      )}
    </div>
  )
}

// Campaign Management Component
function CampaignManagement({ 
  campaigns, 
  characters, 
  users, 
  onCreateCampaign, 
  onEditCampaign, 
  onDeleteCampaign 
}: { 
  campaigns: Campaign[]
  characters: CharacterData[]
  users: UserProfile[]
  onCreateCampaign: () => void
  onEditCampaign: (campaign: Campaign) => void
  onDeleteCampaign: (campaign: Campaign) => void
}) {
  const { userProfile } = useUser()
  const canEdit = userProfile?.permissionLevel !== 'viewer'
  
  // Split campaigns into active and inactive groups, prioritizing default campaign
  const { activeCampaigns, inactiveCampaigns } = useMemo(() => {
    const active = campaigns.filter(c => c.isActive).sort((a, b) => {
      // Default campaign always comes first
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      // Then sort alphabetically
      return a.name.localeCompare(b.name)
    })
    const inactive = campaigns.filter(c => !c.isActive).sort((a, b) => {
      // Default campaign always comes first (even if inactive)
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      // Then sort alphabetically
      return a.name.localeCompare(b.name)
    })
    return { activeCampaigns: active, inactiveCampaigns: inactive }
  }, [campaigns])
  
  const renderCampaignCard = (campaign: Campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {campaign.name}
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEditCampaign(campaign)}>
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteCampaign(campaign)}>
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{campaign.description}</p>
              
              {/* Campaign Status and DM Info */}
              <div className="mt-4 flex items-center gap-2 mb-3">
                {campaign.isActive && (
                  <Badge variant="default" className="text-xs">
                    <Icon icon="lucide:play" className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
                {campaign.dungeonMasterId && (
                  <Badge variant="secondary" className="text-xs">
                    <Icon icon="lucide:crown" className="w-3 h-3 mr-1" />
                    DM: {users.find(u => u.userId === campaign.dungeonMasterId)?.displayName || 'Unknown'}
                  </Badge>
                )}
                {campaign.levelUpModeEnabled && (
                  <Badge variant="outline" className="text-xs">
                    <Icon icon="lucide:trending-up" className="w-3 h-3 mr-1" />
                    Level Up Mode
                  </Badge>
                )}
              </div>

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Characters:</span>
                  <span className="ml-2 font-medium">{characters.filter(c => c.campaignId === campaign.id).length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-medium">{new Date(campaign.created_at).toLocaleDateString()}</span>
                </div>
                {campaign.nextSessionDate && (
                  <div>
                    <span className="text-muted-foreground">Next Session:</span>
                    <span className="ml-2 font-medium">
                      {new Date(campaign.nextSessionDate).toLocaleDateString()}
                      {campaign.nextSessionTime && ` at ${campaign.nextSessionTime}`}
                    </span>
                  </div>
                )}
                {campaign.nextSessionNumber && (
                  <div>
                    <span className="text-muted-foreground">Session #:</span>
                    <span className="ml-2 font-medium">{campaign.nextSessionNumber}</span>
                  </div>
                )}
              </div>

              {/* Discord Integration Status */}
              {campaign.discordWebhookUrl && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Icon icon="lucide:message-circle" className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Discord Connected</span>
                  {campaign.discordNotificationsEnabled && (
                    <Badge variant="outline" className="text-xs">
                      Notifications On
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
  )
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-3xl font-display font-bold">Campaigns</h2>
        {canEdit && (
          <Button onClick={onCreateCampaign}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Create Campaign
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* Active Campaigns Section */}
        {activeCampaigns.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon icon="lucide:circle" className="w-2 h-2 fill-current text-primary" />
              Active Campaigns
            </h3>
            <div className="grid gap-4">
              {activeCampaigns.map(renderCampaignCard)}
            </div>
          </div>
        )}

        {/* Inactive Campaigns Section */}
        {inactiveCampaigns.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon icon="lucide:circle" className="w-2 h-2 fill-none text-muted-foreground" />
              Inactive Campaigns
            </h3>
            <div className="grid gap-4">
              {inactiveCampaigns.map(renderCampaignCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Class Management Component
function ClassManagement({ 
  classes, 
  classListTopRef,
  classCardRefs,
  canEdit = true,
  onEditClass,
  onCreateClass,
  onDeleteClass,
  onReloadClasses,
  onManageSubclasses,
  onManageFeatures
}: {
  classes: ClassData[]
  classListTopRef: React.RefObject<HTMLDivElement>
  classCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  canEdit?: boolean
  onEditClass: (classData: ClassData) => void
  onCreateClass: () => void
  onDeleteClass: (classId: string) => void
  onReloadClasses: () => Promise<void>
  onManageSubclasses: (baseClass: ClassData) => void
  onManageFeatures: (classData: ClassData) => void
}) {
  return (
    <div className="flex flex-col gap-0 !overflow-visible">
      {/* Invisible div at the top for scrolling reference */}
      <div ref={classListTopRef} className="h-0" />

      <div className="flex flex-col gap-6 !overflow-visible">
        <div className="flex flex-row gap-4 items-start justify-between">
          <h2 className="text-3xl font-display font-bold">Class Management</h2>
          {canEdit && (
            <Button onClick={onCreateClass}>
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Create Class
            </Button>
          )}
        </div>  

        <div className="flex flex-col gap-4">
          {(() => {
            // Group classes by name and only show base classes
            const baseClasses = classes.filter(c => c.subclass === null)
            const classGroups = baseClasses.map(baseClass => {
              const subclasses = classes.filter(c => c.name === baseClass.name && c.subclass !== null)
              return {
                baseClass,
                subclasses,
                subclassCount: subclasses.length
              }
            })
            
            return classGroups.map(({ baseClass, subclasses, subclassCount }) => (
              <Card 
                className="relative"
                key={baseClass.id}
                ref={(el) => {
                  if (el) {
                    classCardRefs.current.set(baseClass.id, el)
                  } else {
                    classCardRefs.current.delete(baseClass.id)
                  }
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">{baseClass.name}</span>
                          {baseClass.is_custom && (
                            <Badge variant="secondary" className="text-xs">
                              <Icon icon="lucide:user-plus" className="w-3 h-3 mr-1" />
                              Custom
                            </Badge>
                          )}
                        </div>
                        {subclassCount > 0 && (
                          <div className="font-body flex items-center gap-1 text-xs text-muted-foreground">
                            <Icon icon="lucide:layers" className="w-3 h-3" />
                            <span>{subclassCount} subclass{subclassCount !== 1 ? 'es' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 absolute right-4 top-4">
                      {canEdit && (
                        <Button className="font-body" size="sm" variant="outline" onClick={() => onEditClass(baseClass)}>
                          <Icon icon="lucide:edit" className="w-4 h-4" />
                          Edit class
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onManageSubclasses(baseClass)}
                        title={canEdit ? "Manage Subclasses" : "View Subclasses"}
                        className="font-body h-8"
                      >
                        <Icon icon="lucide:layers" className="w-4 h-4" />
                        {canEdit ? "Edit subclasses" : "View subclasses"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onManageFeatures(baseClass)}
                        title={canEdit ? "Manage Features" : "View Features"}
                        className="font-body h-8"
                      >
                        <Icon icon="lucide:star" className="w-4 h-4" />
                        {canEdit ? "Manage features" : "View features"}
                      </Button>
                      {canEdit && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${baseClass.name}" and all its subclasses? This action cannot be undone.`)) {
                              try {
                                // Delete base class and all subclasses
                                const allClassIds = [baseClass.id, ...subclasses.map(s => s.id)]
                                await Promise.all(allClassIds.map(id => onDeleteClass(id)))
                                // Reload classes list to show updated data
                                await onReloadClasses()
                              } catch (error) {
                                console.error('Error deleting class:', error)
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Description */}
                  {baseClass.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {baseClass.description}
                    </p>
                  )}
                  
                  {/* Class Stats */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/* Hit Die */}
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:dice-6" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Hit Die:</span>
                      <Badge variant="outline" className="text-xs">
                        d{baseClass.hit_die || 8}
                      </Badge>
                    </div>
                    
                    {/* Primary Ability */}
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:zap" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Primary:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (!baseClass.primary_ability) return 'None'
                          if (Array.isArray(baseClass.primary_ability)) {
                            return baseClass.primary_ability
                              .filter(ability => ability && ability.trim())
                              .map(ability => ability.charAt(0).toUpperCase() + ability.slice(1).toLowerCase())
                              .join(', ') || 'None'
                          }
                          // Handle string case
                          const abilityStr = String(baseClass.primary_ability)
                          return abilityStr.charAt(0).toUpperCase() + abilityStr.slice(1).toLowerCase()
                        })()}
                      </Badge>
                    </div>
                    
                    {/* Source */}
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:book" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Source:</span>
                      <Badge variant="outline" className="text-xs">
                        {baseClass.source && baseClass.source !== 'custom' ? baseClass.source.toUpperCase() : 'Custom'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Subclasses List */}
                  {/* {subclassCount > 0 && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="lucide:layers" className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Subclasses:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {subclasses.map((subclass) => (
                          <Badge key={subclass.id} variant="outline" className="text-xs">
                            {subclass.subclass}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )} */}
                  
                  {/* Footer Info */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>Base Class</span>
                        {subclassCount > 0 && (
                          <span>{subclassCount} subclass{subclassCount !== 1 ? 'es' : ''} available</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:calendar" className="w-3 h-3" />
                        <span>Updated {(() => {
                          try {
                            const date = new Date(baseClass.updated_at)
                            if (isNaN(date.getTime())) return 'Unknown'
                            return date.toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })
                          } catch (error) {
                            return 'Unknown'
                          }
                        })()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}


// Race Management Component
function RaceManagement({ 
  races,
  canEdit = true,
  onEditRace,
  onCreateRace,
  onDeleteRace,
  onReloadRaces
}: {
  races: RaceData[]
  canEdit?: boolean
  onEditRace: (raceData: RaceData) => void
  onCreateRace: () => void
  onDeleteRace: (raceId: string) => void
  onReloadRaces: () => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-3xl font-display font-bold">Race Management</h2>
        {canEdit && (
          <Button onClick={onCreateRace}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Create Race
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {races.map((race) => (
          <Card key={race.id}>
            <div className="flex flex-row gap-0 h-full">
              {/* Race Image */}
              {race.image_url && (
                <div className="flex pl-4">
                  <img
                    src={race.image_url}
                    alt={race.name}
                    className="w-30 !h-full !max-h-full overflow-hidden object-cover border rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}
              
              {/* Card Content */}
              <div className="flex-1 flex flex-col gap-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{race.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => onEditRace(race)} className="h-8 font-body">
                          <Icon icon="lucide:edit" className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                      {canEdit && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${race.name}"? This action cannot be undone.`)) {
                              await onDeleteRace(race.id)
                              await onReloadRaces()
                            }
                          }}
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Description */}
                  {race.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                      {race.description.replace(/<[^>]*>/g, '').substring(0, 400)}
                      {race.description.length > 400 ? '...' : ''}
                    </p>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    {/* Race Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {/* Size */}
                      {race.size && (
                        <div className="flex items-center gap-1">
                          <Icon icon="healthicons:body-outline-24px" className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Size:</span>
                          <Badge variant="outline" className="text-xs">
                            {(() => {
                              let sizeValue = race.size
                              
                              // Try to parse if it's a JSON string
                              if (typeof sizeValue === 'string') {
                                try {
                                  const parsed = JSON.parse(sizeValue)
                                  sizeValue = parsed
                                } catch {
                                  // Not JSON, keep as string
                                }
                              }
                              
                              // Handle different size formats
                              if (Array.isArray(sizeValue)) {
                                return sizeValue.join(', ')
                              }
                              if (typeof sizeValue === 'object' && sizeValue !== null) {
                                // Handle choice object with options
                                const sizeObj = sizeValue as any
                                if (sizeObj.options && Array.isArray(sizeObj.options)) {
                                  return sizeObj.options.join(', ')
                                }
                                // Fallback to stringified object if it's an unexpected object
                                return JSON.stringify(sizeValue)
                              }
                              // Handle string case
                              return String(sizeValue)
                            })()}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Speed */}
                      {race.speed && (
                        <div className="flex items-center gap-1">
                          <Icon icon="healthicons:walking-outline-24px" className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Speed:</span>
                          <Badge variant="outline" className="text-xs">
                            {race.speed} ft.
                          </Badge>
                        </div>
                      )}

                      {/* Spellcasting Ability */}
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
                                // Handle choice object with options array
                                if (spellObj.type === 'choice' && 'options' in spellObj && Array.isArray(spellObj.options)) {
                                  return spellObj.options.map((opt: any) => 
                                    typeof opt === 'string' 
                                      ? opt
                                      : String(opt)
                                  ).join(', ')
                                }
                                // If it has a single ability property, use that
                                if ('ability' in spellObj && typeof spellObj.ability === 'string') {
                                  return spellObj.ability.charAt(0).toUpperCase() + spellObj.ability.slice(1)
                                }
                                // Fallback to stringified object if it's an unexpected object
                                return JSON.stringify(race.spellcasting_ability)
                              }
                              return String(race.spellcasting_ability)
                            })()}
                          </Badge>
                        </div>
                      )}

                      {/* Features Count */}
                      {race.features && Array.isArray(race.features) && (
                        <div className="flex items-center gap-1">
                          <Icon icon="lucide:star" className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Features:</span>
                          <Badge variant="outline" className="text-xs">
                            {race.features.length}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 border-t pt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon icon="lucide:book" className="w-3 h-3" />
                        <span className="text-muted-foreground">Source:</span>
                        <Badge variant="outline" className="text-xs">
                          {race.source && race.source !== 'custom' ? race.source : 'Custom'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon icon="lucide:calendar" className="w-3 h-3" />
                        <span>Updated {(() => {
                          try {
                            // Races table may not have updated_at, so handle gracefully
                            return 'Recently'
                          } catch (error) {
                            return 'Unknown'
                          }
                        })()}</span>
                      </div>
                    </div>
                  </div>
                    
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
        {races.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No races found. Create your first race to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// Background Management Component
function BackgroundManagement({ 
  backgrounds,
  canEdit = true,
  onEditBackground,
  onCreateBackground,
  onDeleteBackground,
  onReloadBackgrounds
}: {
  backgrounds: BackgroundData[]
  canEdit?: boolean
  onEditBackground: (backgroundData: BackgroundData) => void
  onCreateBackground: () => void
  onDeleteBackground: (backgroundId: string) => void
  onReloadBackgrounds: () => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-3xl font-display font-bold">Background Management</h2>
        {canEdit && (
          <Button onClick={onCreateBackground}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Create Background
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {backgrounds.map((background) => (
          <Card key={background.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{background.name}</span>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => onEditBackground(background)} className="h-8 font-body">
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  {canEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${background.name}"? This action cannot be undone.`)) {
                          await onDeleteBackground(background.id)
                          await onReloadBackgrounds()
                        }
                      }}
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Description */}
              {background.description && (
                <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                  {background.description.replace(/<[^>]*>/g, '').substring(0, 400)}
                  {background.description.length > 400 ? '...' : ''}
                </p>
              )}
              
              <div className="flex flex-col gap-2">
                {/* Background Stats */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Skill Proficiencies Count */}
                  {background.skill_proficiencies && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:brain" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Skills:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(background.skill_proficiencies)) {
                            return background.skill_proficiencies.length
                          }
                          if (typeof background.skill_proficiencies === 'object' && !Array.isArray(background.skill_proficiencies)) {
                            const skillsObj = background.skill_proficiencies as any
                            const fixed = skillsObj.fixed || []
                            const available = skillsObj.available || []
                            const choice = skillsObj.choice
                            
                            // Check if there are fixed skills AND choice
                            if (fixed.length > 0 && choice) {
                              // Has both fixed skills and choice
                              if (choice.from_selected) {
                                // Choice from selected skills
                                const optionCount = available.length > 0 ? available.length : 0
                                if (optionCount > 0) {
                                  return `${fixed.length} + Choose ${choice.count || 1} from ${optionCount}`
                                } else {
                                  // Legacy data - fixed array might contain available options
                                  // But we have fixed.length > 0, so assume they're actual fixed skills
                                  return `${fixed.length} + Choose ${choice.count || 1} from selected`
                                }
                              } else {
                                // Choice from all skills
                                return `${fixed.length} + Choose ${choice.count || 1}`
                              }
                            } else if (choice && choice.from_selected) {
                              // Only choice from selected (no fixed skills)
                              const optionCount = available.length > 0 ? available.length : fixed.length
                              if (optionCount > 0) {
                                return `Choose ${choice.count || 1} from ${optionCount}`
                              } else {
                                return `Choose ${choice.count || 1} from selected`
                              }
                            } else if (fixed.length > 0) {
                              // Only fixed skills
                              return fixed.length
                            } else if (choice) {
                              // Only choice from all skills
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Tool Proficiencies Count */}
                  {background.tool_proficiencies && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:wrench" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tools:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(background.tool_proficiencies)) {
                            return background.tool_proficiencies.length
                          }
                          if (typeof background.tool_proficiencies === 'object' && !Array.isArray(background.tool_proficiencies)) {
                            const toolsObj = background.tool_proficiencies as any
                            const fixed = toolsObj.fixed || []
                            const available = toolsObj.available || []
                            const choice = toolsObj.choice
                            
                            // Check if there are fixed tools AND choice
                            if (fixed.length > 0 && choice) {
                              // Has both fixed tools and choice
                              if (choice.from_selected) {
                                // Choice from selected tools
                                const optionCount = available.length > 0 ? available.length : 0
                                if (optionCount > 0) {
                                  return `${fixed.length} + Choose ${choice.count || 1} from ${optionCount}`
                                } else {
                                  return `${fixed.length} + Choose ${choice.count || 1} from selected`
                                }
                              } else {
                                // Choice from all tools
                                return `${fixed.length} + Choose ${choice.count || 1}`
                              }
                            } else if (choice && choice.from_selected) {
                              // Only choice from selected (no fixed tools)
                              const optionCount = available.length > 0 ? available.length : fixed.length
                              if (optionCount > 0) {
                                return `Choose ${choice.count || 1} from ${optionCount}`
                              } else {
                                return `Choose ${choice.count || 1} from selected`
                              }
                            } else if (fixed.length > 0) {
                              // Only fixed tools
                              return fixed.length
                            } else if (choice) {
                              // Only choice from all tools
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Languages Count */}
                  {background.languages && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:languages" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Languages:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(background.languages)) {
                            return background.languages.length
                          }
                          if (typeof background.languages === 'object' && !Array.isArray(background.languages)) {
                            const langsObj = background.languages as any
                            const fixed = langsObj.fixed || []
                            const choice = langsObj.choice
                            if (fixed.length > 0 && choice) {
                              return `${fixed.length} + Choose ${choice.count || 1}`
                            } else if (fixed.length > 0) {
                              return fixed.length
                            } else if (choice) {
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Money */}
                  {background.money && (background.money.gold > 0 || background.money.silver > 0 || background.money.copper > 0) && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:coins" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Money:</span>
                      <Badge variant="outline" className="text-xs">
                        {background.money.gold > 0 && `${background.money.gold}gp`}
                        {background.money.gold > 0 && (background.money.silver > 0 || background.money.copper > 0) && ' '}
                        {background.money.silver > 0 && `${background.money.silver}sp`}
                        {background.money.silver > 0 && background.money.copper > 0 && ' '}
                        {background.money.copper > 0 && `${background.money.copper}cp`}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon icon="lucide:calendar" className="w-3 h-3" />
                    <span>Updated {(() => {
                      try {
                        if (background.updated_at) {
                          const date = new Date(background.updated_at)
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString()
                          }
                        }
                        return 'Recently'
                      } catch (error) {
                        return 'Unknown'
                      }
                    })()}</span>
                  </div>
                </div>
              </div>
                
            </CardContent>
          </Card>
        ))}
        {backgrounds.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No backgrounds found. Create your first background to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// Feat Management Component
function FeatManagement({ 
  feats,
  canEdit = true,
  onEditFeat,
  onCreateFeat,
  onDeleteFeat,
  onReloadFeats
}: {
  feats: FeatData[]
  canEdit?: boolean
  onEditFeat: (featData: FeatData) => void
  onCreateFeat: () => void
  onDeleteFeat: (featId: string) => void
  onReloadFeats: () => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-3xl font-display font-bold">Feat Management</h2>
        {canEdit && (
          <Button onClick={onCreateFeat}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Create Feat
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {feats.map((feat) => (
          <Card key={feat.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{feat.name}</span>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => onEditFeat(feat)} className="h-8 font-body">
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  {canEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${feat.name}"? This action cannot be undone.`)) {
                          await onDeleteFeat(feat.id)
                          await onReloadFeats()
                        }
                      }}
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Description */}
              {feat.description && (
                <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                  {feat.description.replace(/<[^>]*>/g, '').substring(0, 400)}
                  {feat.description.length > 400 ? '...' : ''}
                </p>
              )}
              
              <div className="flex flex-col gap-2">
                {/* Feat Stats */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Ability Modifiers */}
                  {feat.ability_modifiers && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:trending-up" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ability Modifiers:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(feat.ability_modifiers)) {
                            return `${feat.ability_modifiers.length} modifier(s)`
                          }
                          if (feat.ability_modifiers.type === 'choice') {
                            return `Choose ${(feat.ability_modifiers as any).choices?.count || 2}`
                          }
                          if (feat.ability_modifiers.type === 'custom') {
                            return 'Custom'
                          }
                          if (feat.ability_modifiers.type === 'fixed_multi') {
                            const abilities = (feat.ability_modifiers as any).abilities || {}
                            const count = Object.values(abilities).filter((v: any) => v > 0).length
                            return `${count} fixed`
                          }
                          return 'Yes'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Skill Proficiencies Count */}
                  {feat.skill_proficiencies && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:brain" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Skills:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(feat.skill_proficiencies)) {
                            return feat.skill_proficiencies.length
                          }
                          if (typeof feat.skill_proficiencies === 'object' && !Array.isArray(feat.skill_proficiencies)) {
                            const skillsObj = feat.skill_proficiencies as any
                            const fixed = skillsObj.fixed || []
                            const available = skillsObj.available || []
                            const choice = skillsObj.choice
                            
                            if (fixed.length > 0 && choice) {
                              if (choice.from_selected) {
                                const optionCount = available.length > 0 ? available.length : 0
                                if (optionCount > 0) {
                                  return `${fixed.length} + Choose ${choice.count || 1} from ${optionCount}`
                                } else {
                                  return `${fixed.length} + Choose ${choice.count || 1} from selected`
                                }
                              } else {
                                return `${fixed.length} + Choose ${choice.count || 1}`
                              }
                            } else if (choice && choice.from_selected) {
                              const optionCount = available.length > 0 ? available.length : fixed.length
                              if (optionCount > 0) {
                                return `Choose ${choice.count || 1} from ${optionCount}`
                              } else {
                                return `Choose ${choice.count || 1} from selected`
                              }
                            } else if (fixed.length > 0) {
                              return fixed.length
                            } else if (choice) {
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Tool Proficiencies Count */}
                  {feat.tool_proficiencies && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:wrench" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tools:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(feat.tool_proficiencies)) {
                            return feat.tool_proficiencies.length
                          }
                          if (typeof feat.tool_proficiencies === 'object' && !Array.isArray(feat.tool_proficiencies)) {
                            const toolsObj = feat.tool_proficiencies as any
                            const fixed = toolsObj.fixed || []
                            const available = toolsObj.available || []
                            const choice = toolsObj.choice
                            
                            if (fixed.length > 0 && choice) {
                              if (choice.from_selected) {
                                const optionCount = available.length > 0 ? available.length : 0
                                if (optionCount > 0) {
                                  return `${fixed.length} + Choose ${choice.count || 1} from ${optionCount}`
                                } else {
                                  return `${fixed.length} + Choose ${choice.count || 1} from selected`
                                }
                              } else {
                                return `${fixed.length} + Choose ${choice.count || 1}`
                              }
                            } else if (choice && choice.from_selected) {
                              const optionCount = available.length > 0 ? available.length : fixed.length
                              if (optionCount > 0) {
                                return `Choose ${choice.count || 1} from ${optionCount}`
                              } else {
                                return `Choose ${choice.count || 1} from selected`
                              }
                            } else if (fixed.length > 0) {
                              return fixed.length
                            } else if (choice) {
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Languages Count */}
                  {feat.languages && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:languages" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Languages:</span>
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (Array.isArray(feat.languages)) {
                            return feat.languages.length
                          }
                          if (typeof feat.languages === 'object' && !Array.isArray(feat.languages)) {
                            const langsObj = feat.languages as any
                            const fixed = langsObj.fixed || []
                            const choice = langsObj.choice
                            if (fixed.length > 0 && choice) {
                              return `${fixed.length} + Choose ${choice.count || 1}`
                            } else if (fixed.length > 0) {
                              return fixed.length
                            } else if (choice) {
                              return `Choose ${choice.count || 1}`
                            }
                          }
                          return '0'
                        })()}
                      </Badge>
                    </div>
                  )}

                  {/* Special Features Count */}
                  {feat.special_features && Array.isArray(feat.special_features) && feat.special_features.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:star" className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Features:</span>
                      <Badge variant="outline" className="text-xs">
                        {feat.special_features.length}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon icon="lucide:book" className="w-3 h-3" />
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="outline" className="text-xs">
                      {feat.source && feat.source !== 'custom' ? feat.source : 'Custom'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon icon="lucide:calendar" className="w-3 h-3" />
                    <span>Updated {(() => {
                      try {
                        if (feat.updated_at) {
                          const date = new Date(feat.updated_at)
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString()
                          }
                        }
                        return 'Recently'
                      } catch (error) {
                        return 'Unknown'
                      }
                    })()}</span>
                  </div>
                </div>
              </div>
                
            </CardContent>
          </Card>
        ))}
        {feats.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No feats found. Create your first feat to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// User Management Component
function UserManagement({
  users,
  onUsersChange
}: {
  users: UserProfile[]
  onUsersChange: (users: UserProfile[]) => void
}) {
  const { isSuperadmin } = useUser()
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<Record<string, { displayName?: string; permissionLevel: PermissionLevel }>>(() => {
    const map: Record<string, { displayName?: string; permissionLevel: PermissionLevel }> = {}
    users.forEach(u => {
      map[u.userId] = { displayName: u.displayName || '', permissionLevel: u.permissionLevel }
    })
    return map
  })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState<string>("")
  const [editPermissionLevel, setEditPermissionLevel] = useState<PermissionLevel>("editor")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const next: Record<string, { displayName?: string; permissionLevel: PermissionLevel }> = {}
    users.forEach(u => {
      next[u.userId] = { displayName: u.displayName || '', permissionLevel: u.permissionLevel }
    })
    setDrafts(next)
  }, [users])

  const updateDraft = (userId: string, update: Partial<{ displayName?: string; permissionLevel: PermissionLevel }>) => {
    setDrafts(prev => ({
      ...prev,
      [userId]: { ...prev[userId], ...update }
    }))
  }

  const openEdit = (userId: string) => {
    const d = drafts[userId]
    setEditUserId(userId)
    setEditDisplayName(d?.displayName || '')
    setEditPermissionLevel(d?.permissionLevel || 'editor')
  }

  const handleSave = async (userId: string) => {
    if (!isSuperadmin) return
    const draft = { displayName: editDisplayName, permissionLevel: editPermissionLevel }
    setSavingIds(prev => new Set(prev).add(userId))
    try {
      const res = await fetch(`/api/users/update/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: draft.displayName?.trim() || undefined,
          permissionLevel: draft.permissionLevel
        })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to update user')
      }

      const nextUsers = users.map(u => u.userId === userId ? {
        ...u,
        displayName: draft.displayName,
        permissionLevel: draft.permissionLevel
      } : u)
      onUsersChange(nextUsers)
      toast({ title: 'Saved', description: 'User updated successfully.' })
      setDrafts(prev => ({ ...prev, [userId]: { displayName: draft.displayName, permissionLevel: draft.permissionLevel } }))
      setEditUserId(null)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to update user', variant: 'destructive' })
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleDelete = async (userId: string) => {
    if (!isSuperadmin) return
    if (!confirm('Are you sure you want to delete this user? This will also remove their auth and cannot be undone.')) return
    setDeletingId(userId)
    try {
      const res = await fetch(`/api/users/delete/${encodeURIComponent(userId)}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to delete user')
      }
      onUsersChange(users.filter(u => u.userId !== userId))
      toast({ title: 'Deleted', description: 'User deleted (auth + profile).' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete user', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-3xl font-display font-bold">User Management</h2>
      </div>

      <div className="overflow-x-aut flex flex-col gap-1">
        <div className="min-w-[720px] grid grid-cols-12 gap-2 px-2 py-2 text-xs text-muted-foreground">
          <div className="col-span-3">Display Name</div>
          <div className="col-span-3">User ID</div>
          <div className="col-span-2">Permission</div>
          <div className="col-span-1">Created At</div>
          <div className="col-span-1">Last Login</div>
          <div className="col-span-2"></div>
        </div>
        <div className="flex flex-col gap-0 border rounded-lg bg-card">
          {users.map((u) => {
            const draft = drafts[u.userId]
            const isSaving = savingIds.has(u.userId)
            return (
              <div key={u.userId} className="min-w-[720px] grid grid-cols-12 gap-2 items-center px-2 py-2 border-b last:border-b-0">
                <div className="col-span-3 px-2">
                  <span>{u.displayName || ''}</span>
                </div>
                <div className="col-span-3">
                  <code className="text-xs break-all">{u.userId}</code>
                </div>
                <div className="col-span-2">
                  <Badge variant="secondary" className="text-xs">{u.permissionLevel}</Badge>
                </div>
                <div className="col-span-1 text-xs text-muted-foreground">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                </div>
                <div className="col-span-1 text-xs text-muted-foreground">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                </div>
                <div className="col-span-2 text-right">
                  {isSuperadmin && (
                    <div className="flex items-center justify-end gap-2 w-full">
                      <Button size="sm" className="w-8 h-8" variant="outline" onClick={() => openEdit(u.userId)}>
                        <Icon icon="lucide:edit" className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white w-8 h-8" onClick={() => handleDelete(u.userId)} disabled={deletingId === u.userId}>
                        {deletingId === u.userId ? (
                          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={!!editUserId} onOpenChange={(open) => { if (!open) setEditUserId(null) }}>
        <DialogContent className="p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Display Name</label>
              <input
                className="w-full border rounded px-2 py-1 bg-background"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Permission</label>
              <Select
                value={editPermissionLevel}
                onValueChange={(value) => setEditPermissionLevel(value as PermissionLevel)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">viewer</SelectItem>
                  <SelectItem value="editor">editor</SelectItem>
                  <SelectItem value="superadmin">superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setEditUserId(null)}>Cancel</Button>
            <Button onClick={() => editUserId && handleSave(editUserId)} disabled={!isSuperadmin || (editUserId ? savingIds.has(editUserId) : false)}>
              {editUserId && savingIds.has(editUserId) ? (
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon icon="lucide:save" className="w-4 h-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}