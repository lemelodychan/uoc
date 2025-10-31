"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icon } from "@iconify/react"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { ClassData, SubclassData } from "@/lib/class-utils"
import type { UserProfile, PermissionLevel } from "@/lib/user-profiles"
import { useUser } from "@/lib/user-context"
import { loadClassesWithDetails, loadFeaturesForBaseWithSubclasses, upsertClass as dbUpsertClass, deleteClass as dbDeleteClass, upsertClassFeature, deleteClassFeature, loadAllClasses, loadClassById, duplicateClass, getCustomClasses, canEditClass, updateUserProfileByAdmin, deleteUserProfileByAdmin } from "@/lib/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { SpellSlotsGrid } from "@/components/ui/spell-slots-grid"
import { ClassDuplicationModal } from "./edit-modals/class-duplication-modal"
import { ClassFeatureSkillModal } from "./edit-modals/class-feature-skill-modal"
import { CampaignCreationModal } from "./edit-modals/campaign-creation-modal"
import { ClassEditorPage } from "./class-editor-page"
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
  
  // Refs for scroll management
  const classListTopRef = useRef<HTMLDivElement>(null)
  const classCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Load classes on mount
  useEffect(() => {
    loadClasses()
  }, [])

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
          // Debug: Log the transformation for toggles
          console.log(`Transforming class ${dbClass.name}:`, {
            show_spells_known: dbClass.show_spells_known,
            show_sorcery_points: dbClass.show_sorcery_points,
            show_martial_arts: dbClass.show_martial_arts,
            show_ki_points: dbClass.show_ki_points,
            show_unarmored_movement: dbClass.show_unarmored_movement,
            show_rage: dbClass.show_rage,
            show_rage_damage: dbClass.show_rage_damage,
            is_custom: dbClass.is_custom
          })
          
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Management</h1>
        <p className="text-muted-foreground">
          Manage campaigns, classes, subclasses, and their features
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 p-2 gap-2 h-fit rounded-xl">
          <TabsTrigger value="campaigns" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:users" className="w-4 h-4" />
            Campaign Management
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:book-open" className="w-4 h-4" />
            Class Management
            <Badge 
              variant="secondary" 
              className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-2"
            >
              Beta
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:id-card" className="w-4 h-4" />
            User Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="flex-1 min-h-0 flex flex-col gap-0">
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
        </TabsContent>

        <TabsContent value="classes" className="flex-1 min-h-0 flex flex-col gap-0">
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
                  
                  console.log('Transformed class for editing:', {
                    name: transformedClass.name,
                    showSpellsKnown: transformedClass.showSpellsKnown,
                    showSorceryPoints: transformedClass.showSorceryPoints,
                    showMartialArts: transformedClass.showMartialArts,
                    showKiPoints: transformedClass.showKiPoints,
                    showUnarmoredMovement: transformedClass.showUnarmoredMovement,
                    showRage: transformedClass.showRage,
                    showRageDamage: transformedClass.showRageDamage,
                    is_custom: transformedClass.is_custom
                  })
                  
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
        </TabsContent>

        <TabsContent value="users" className="flex-1 min-h-0 flex flex-col gap-0">
          <UserManagement
            users={localUsers}
            onUsersChange={setLocalUsers}
          />
        </TabsContent>
      </Tabs>

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
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-2xl font-bold">Campaigns</h2>
        {canEdit && (
          <Button onClick={onCreateCampaign}>
            <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
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
        ))}
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
    <div className="flex flex-col gap-0">
      {/* Invisible div at the top for scrolling reference */}
      <div ref={classListTopRef} className="h-0" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4 items-start justify-between">
          <h2 className="text-2xl font-bold">Classes</h2>
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
                    <div className="flex gap-2">
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
                        className="font-body"
                      >
                        <Icon icon="lucide:layers" className="w-4 h-4" />
                        {canEdit ? "Edit subclasses" : "View subclasses"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onManageFeatures(baseClass)}
                        title={canEdit ? "Manage Features" : "View Features"}
                        className="font-body"
                      >
                        <Icon icon="lucide:star" className="w-4 h-4" />
                        {canEdit ? "Manage features" : "View features"}
                      </Button>
                      {canEdit && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-start justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
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
        <div className="flex flex-col gap-0 border rounded-lg">
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

