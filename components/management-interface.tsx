"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icon } from "@iconify/react"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { ClassData, SubclassData } from "@/lib/class-utils"
import type { UserProfile } from "@/lib/user-profiles"
import { loadClassesWithDetails, loadFeaturesForBaseWithSubclasses, upsertClass as dbUpsertClass, deleteClass as dbDeleteClass, upsertClassFeature, deleteClassFeature, loadAllClasses, loadClassById, duplicateClass, getCustomClasses, canEditClass } from "@/lib/database"
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

  // Load classes on mount
  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const result = await loadClassesWithDetails()
      if (result.classes) {
        // Transform the database result to match ClassData interface
        const transformedClasses: ClassData[] = result.classes.map(dbClass => ({
          id: dbClass.id,
          name: dbClass.name,
          subclass: dbClass.subclass,
          description: dbClass.description || null,
          hit_die: dbClass.hit_die || 8,
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
          is_custom: false, // Default value, will be updated when we have proper data
          created_by: null,
          duplicated_from: null,
          source: 'custom',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Legacy fields
          spell_progression: dbClass.spell_progression,
          max_spell_slots: dbClass.max_spell_slots,
          class_features: dbClass.class_features
        }))
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
        <TabsList className="grid w-full grid-cols-2 p-2 gap-2 h-fit rounded-xl">
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
              onEditClass={async (classData) => {
                // Fetch fresh data from database
                const result = await loadClassById(classData.id)
                if (result.klass) {
                  setEditingClass(result.klass)
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
                setEditingClass({
                  id: '',
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
                  is_custom: false,
                  created_by: null,
                  duplicated_from: null,
                  source: 'custom',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
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
                onSave={async (classData) => {
                  try {
                    await upsertClass(classData)
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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-semibold">Campaigns</h2>
        <Button onClick={onCreateCampaign}>
          <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {campaign.name}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditCampaign(campaign)}>
                    <Icon icon="lucide:edit" className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDeleteCampaign(campaign)}>
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                </div>
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
  onEditClass,
  onCreateClass,
  onDeleteClass,
  onReloadClasses,
  onManageSubclasses,
  onManageFeatures
}: {
  classes: ClassData[]
  onEditClass: (classData: ClassData) => void
  onCreateClass: () => void
  onDeleteClass: (classId: string) => void
  onReloadClasses: () => Promise<void>
  onManageSubclasses: (baseClass: ClassData) => void
  onManageFeatures: (classData: ClassData) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-semibold">Classes</h2>
        <Button onClick={onCreateClass}>
          <Icon icon="lucide:plus" className="w-4 h-4" />
          Create Class
        </Button>
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
            <Card key={baseClass.id}>
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
                    <Button className="font-body" size="sm" variant="outline" onClick={() => onEditClass(baseClass)}>
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                      Edit class
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onManageSubclasses(baseClass)}
                      title="Manage Subclasses"
                      className="font-body"
                    >
                      <Icon icon="lucide:layers" className="w-4 h-4" />
                      Edit subclasses
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onManageFeatures(baseClass)}
                      title="Manage Features"
                      className="font-body"
                    >
                      <Icon icon="lucide:star" className="w-4 h-4" />
                      Manage features
                    </Button>
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
  )
}


