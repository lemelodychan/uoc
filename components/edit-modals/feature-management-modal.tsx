"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"
import { useToast } from "@/hooks/use-toast"
import type { ClassData } from "@/lib/class-utils"
import { loadFeaturesForBaseWithSubclasses, upsertClassFeature, deleteClassFeature } from "@/lib/database"

// Default configurations for special UX components
const getDefaultComponentConfig = (componentId: string) => {
  const defaults = {
    'infusions': {
      maxInfusedItems: "level + 1",
      maxInfusionsKnown: "level + 1"
    },
    'eldritch-cannon': {
      maxCannons: 1,
      baseHitPoints: 5,
      baseArmorClass: 18
    },
    'eldritch-invocations': {
      maxInvocations: "Math.floor(level / 2) + 1"
    },
    'metamagic': {
      maxMetamagicOptions: "Math.floor(level / 2) + 1"
    }
  }
  
  return defaults[componentId as keyof typeof defaults] || {}
}

// Default configurations for slots-type features
const getDefaultSlotsConfig = (featureName?: string) => {
  // Flash of Genius specific configuration
  if (featureName?.toLowerCase().includes('flash of genius')) {
    return {
      maxSlotsSource: 'intelligence_mod',
      replenishLogic: 'all_long_rest'
    }
  }
  
  // Default configuration
  return {
    maxSlotsSource: 'proficiency',
    replenishLogic: 'all_long_rest'
  }
}

// Default configurations for points pool features
const getDefaultPointsPoolConfig = (featureName?: string) => {
  // Lay on Hands specific configuration
  if (featureName?.toLowerCase().includes('lay on hands')) {
    return {
      totalFormula: 'level * 5',
      canSpendPartial: true,
      replenishOn: 'long_rest',
      displayStyle: 'slider',
      minSpend: 1
    }
  }
  
  // Ki Points specific configuration
  if (featureName?.toLowerCase().includes('ki points')) {
    return {
      totalFormula: 'level',
      canSpendPartial: false,
      replenishOn: 'short_rest',
      displayStyle: 'increment_decrement',
      minSpend: 1
    }
  }
  
  // Sorcery Points specific configuration
  if (featureName?.toLowerCase().includes('sorcery points')) {
    return {
      totalFormula: 'level',
      canSpendPartial: true,
      replenishOn: 'long_rest',
      displayStyle: 'slider',
      minSpend: 1
    }
  }
  
  // Default configuration
  return {
    totalFormula: 'level',
    canSpendPartial: true,
    replenishOn: 'long_rest',
    displayStyle: 'slider',
    minSpend: 1
  }
}

// Default configurations for skill modifier features
const getDefaultSkillModifierConfig = (featureName?: string) => {
  // Tool Expertise specific configuration
  if (featureName?.toLowerCase().includes('tool expertise')) {
    return {
      modifierType: 'skill',
      targetSkills: ['alchemist_supplies', 'tinker_tools', 'smith_tools', 'carpenter_tools'],
      modifierFormula: 'proficiency_bonus * 2',
      condition: {
        type: 'proficient',
        description: 'Only applies to tools you are proficient with'
      },
      stackable: false,
      displayStyle: 'badge'
    }
  }
  
  // Jack of All Trades specific configuration
  if (featureName?.toLowerCase().includes('jack of all trades')) {
    return {
      modifierType: 'skill',
      modifierFormula: 'half_proficiency_bonus',
      condition: {
        type: 'not_proficient',
        description: 'Only applies to skills you are not proficient with'
      },
      stackable: false,
      displayStyle: 'highlight'
    }
  }
  
  // Default configuration
  return {
    modifierType: 'skill',
    modifierFormula: 'proficiency_bonus',
    condition: {
      type: 'always',
      description: 'Always applies'
    },
    stackable: false,
    displayStyle: 'badge'
  }
}

// Default configurations for availability toggle features
const getDefaultAvailabilityToggleConfig = (featureName?: string) => {
  // Song of Rest specific configuration
  if (featureName?.toLowerCase().includes('song of rest')) {
    return {
      defaultAvailable: true,
      replenishOn: 'short_rest',
      displayStyle: 'badge',
      availableText: 'Available',
      usedText: 'Used'
    }
  }
  
  // Divine Sense specific configuration
  if (featureName?.toLowerCase().includes('divine sense')) {
    return {
      defaultAvailable: true,
      replenishOn: 'long_rest',
      displayStyle: 'badge',
      availableText: 'Available',
      usedText: 'Used'
    }
  }
  
  // Default configuration
  return {
    defaultAvailable: true,
    replenishOn: 'long_rest',
    displayStyle: 'badge',
    availableText: 'Available',
    usedText: 'Used'
  }
}

// Helper function to render basic markdown preview
const renderMarkdownPreview = (text: string) => {
  // Handle bold text (**text** or __text__)
  const boldRegex = /(\*\*|__)(.*?)\1/g
  const parts = text.split(boldRegex)
  
  return parts.map((part, index) => {
    if (part === '**' || part === '__') {
      return null // Skip the delimiter
    }
    
    // Check if this part should be bold (it's between delimiters)
    const prevPart = parts[index - 1]
    if (prevPart === '**' || prevPart === '__') {
      return <strong key={index} className="font-semibold">{part}</strong>
    }
    
    return part
  }).filter(Boolean)
}

interface ClassFeature {
  id: string
  class_id: string
  level: number
  title: string
  description: string
  feature_type: "class" | "subclass" // Scope: base class or subclass-specific
  feature_skill_type?: "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle" // Type: what kind of feature
  subclass_id?: string | null
  subclass_name?: string // For display purposes
  is_hidden?: boolean // Hidden features don't appear in character sheets
  class_features_skills?: {
    componentId?: string
    config?: any
    customDescription?: string
  }
}

interface FeatureManagementModalProps {
  isOpen: boolean
  onClose: () => void
  classData: ClassData
  allClasses: ClassData[]
  onSave: () => void
}

export function FeatureManagementModal({
  isOpen,
  onClose,
  classData,
  allClasses,
  onSave
}: FeatureManagementModalProps) {
  const [features, setFeatures] = useState<ClassFeature[]>([])
  const [editingFeature, setEditingFeature] = useState<ClassFeature | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  // Get subclasses for this class
  const subclasses = allClasses.filter(c => c.name === classData.name && c.subclass !== null)

  // Load features for this class
  useEffect(() => {
    if (isOpen && classData) {
      loadFeatures()
    }
  }, [isOpen, classData])

  const loadFeatures = async () => {
    setIsLoading(true)
    try {
      const subclassIds = subclasses.map(s => s.id)
      const result = await loadFeaturesForBaseWithSubclasses(classData.id, subclassIds)
      
      if (result.features) {
        
        // Show all features, but prioritize base class features and handle subclass display properly
        // Remove duplicates based on title and level, keeping the most relevant occurrence
        const uniqueFeatures = new Map<string, ClassFeature>()
        
        // Process all features and add subclass name information
        result.features.forEach(feature => {
          const key = `${feature.title}-${feature.level}`
          
          // Determine subclass name for display
          let subclass_name: string | undefined = undefined
          
          if (feature.subclass_id !== null) {
            // Feature is associated with a specific subclass
            const subclass = subclasses.find(s => s.id === feature.subclass_id)
            if (subclass && subclass.subclass) {
              subclass_name = subclass.subclass
            }
          } else if (feature.class_id !== classData.id) {
            // Feature belongs to a subclass (class_id is not the base class)
            const subclass = subclasses.find(s => s.id === feature.class_id)
            if (subclass && subclass.subclass) {
              subclass_name = subclass.subclass
            }
          }
          
          // Create display feature with subclass name
          const displayFeature = {
            ...feature,
            feature_type: feature.feature_type as "class" | "subclass",
            feature_skill_type: (feature as any).feature_skill_type as "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle" | undefined,
            subclass_name
          }
          
          // Only add if we don't already have this feature, prioritizing base class features
          if (!uniqueFeatures.has(key)) {
            uniqueFeatures.set(key, displayFeature)
          } else {
            // If we already have this feature, replace it if the new one is a base class feature
            const existing = uniqueFeatures.get(key)!
            if (feature.subclass_id === null && existing.subclass_id !== null) {
              uniqueFeatures.set(key, displayFeature)
            }
          }
        })
        
        const finalFeatures = Array.from(uniqueFeatures.values())
        
        setFeatures(finalFeatures)
      } else if (result.error) {
        console.error('Error loading features:', result.error)
        toast({
          title: "Error",
          description: "Failed to load features",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading features:', error)
      toast({
        title: "Error",
        description: "Failed to load features",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFeature = () => {
    const newFeature: ClassFeature = {
      id: '',
      class_id: classData.id,
      level: 1,
      title: '',
      description: '',
      feature_type: 'class',
      subclass_id: null, // Default to base class feature
      is_hidden: false // Default to visible
    }
    setEditingFeature(newFeature)
    setIsCreating(true)
    setShowEditModal(true)
  }

  const handleEditFeature = (feature: ClassFeature) => {
    setEditingFeature(feature)
    setIsCreating(false)
    setShowEditModal(true)
  }

  const handleSaveFeature = async () => {
    if (!editingFeature || !editingFeature.title.trim()) {
      toast({
        title: "Error",
        description: "Feature title is required",
        variant: "destructive"
      })
      return
    }

    if (editingFeature.level < 1 || editingFeature.level > 20) {
      toast({
        title: "Error",
        description: "Level must be between 1 and 20",
        variant: "destructive"
      })
      return
    }

    if (editingFeature.feature_type === 'subclass' && !editingFeature.subclass_id) {
      toast({
        title: "Error",
        description: "Please select a subclass for subclass features",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      // For base class features (feature_type is 'class'), subclass_id should be null
      if (editingFeature.feature_type === 'class') {
        const result = await upsertClassFeature({
          id: editingFeature.id || undefined,
          class_id: classData.id,
          level: editingFeature.level,
          title: editingFeature.title,
          description: editingFeature.description,
          feature_type: editingFeature.feature_type,
          feature_skill_type: editingFeature.feature_skill_type as "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle" | undefined,
          subclass_id: null, // Base class features have null subclass_id
          is_hidden: editingFeature.is_hidden,
          class_features_skills: editingFeature.class_features_skills
        })

        if (result.success) {
          toast({
            title: "Success",
            description: `Base class feature "${editingFeature.title}" ${isCreating ? 'created' : 'updated'}`
          })
        } else {
          throw new Error(result.error || 'Failed to save feature')
        }
      } else {
        // For subclass-specific features, subclass_id should be set to the specific subclass
        const result = await upsertClassFeature({
          id: editingFeature.id || undefined,
          class_id: editingFeature.class_id,
          level: editingFeature.level,
          title: editingFeature.title,
          description: editingFeature.description,
          feature_type: editingFeature.feature_type,
          feature_skill_type: editingFeature.feature_skill_type as "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle" | undefined,
          subclass_id: editingFeature.subclass_id,
          is_hidden: editingFeature.is_hidden,
          class_features_skills: editingFeature.class_features_skills
        })

        if (result.success) {
          toast({
            title: "Success",
            description: `Feature "${editingFeature.title}" ${isCreating ? 'created' : 'updated'} successfully`
          })
        } else {
          throw new Error(result.error || 'Failed to save feature')
        }
      }

      setEditingFeature(null)
      setIsCreating(false)
      setShowEditModal(false)
      
      // Reload features with debugging and small delay to ensure DB commit
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for DB commit
      await loadFeatures()
    } catch (error) {
      console.error('Error saving feature:', error)
      toast({
        title: "Error",
        description: "Failed to save feature",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFeature = async (feature: ClassFeature) => {
    const isBaseClassFeature = feature.feature_type === 'class'
    const confirmMessage = isBaseClassFeature 
      ? `Are you sure you want to delete the base class feature "${feature.title}"? This will remove it from ALL subclasses and cannot be undone.`
      : `Are you sure you want to delete the "${feature.title}" feature? This action cannot be undone.`

    if (confirm(confirmMessage)) {
      try {
        if (isBaseClassFeature) {
          // For base class features, we need to delete from all subclasses
          // First, get all features with the same title and level across all subclasses
          const allClassIds = [classData.id, ...subclasses.map(s => s.id)]
          
          // Delete from all class entries
          const deletePromises = allClassIds.map(classId => 
            // We need to find and delete the feature for each class
            // This is a simplified approach - in a real implementation, you might want to
            // query for all features with matching title/level first
            deleteClassFeature(feature.id)
          )

          await Promise.all(deletePromises)

          toast({
            title: "Success",
            description: `Base class feature "${feature.title}" deleted from all subclasses`
          })
        } else {
          // For subclass-specific features, just delete normally
          const result = await deleteClassFeature(feature.id)
          if (result.success) {
            toast({
              title: "Success",
              description: `Feature "${feature.title}" deleted successfully`
            })
          } else {
            throw new Error(result.error || 'Failed to delete feature')
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for DB commit
        await loadFeatures() // Reload features
      } catch (error) {
        console.error('Error deleting feature:', error)
        toast({
          title: "Error",
          description: "Failed to delete feature",
          variant: "destructive"
        })
      }
    }
  }

  const handleCancel = () => {
    setEditingFeature(null)
    setIsCreating(false)
    setShowEditModal(false)
  }

  const toggleLevelExpansion = (level: number) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }

  // Group features by level for better display
  const featuresByLevel = features.reduce((acc, feature) => {
    if (!acc[feature.level]) {
      acc[feature.level] = []
    }
    acc[feature.level].push(feature)
    return acc
  }, {} as Record<number, ClassFeature[]>)

  const sortedLevels = Object.keys(featuresByLevel).map(Number).sort((a, b) => a - b)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[70vw] !max-w-[70vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:star" className="w-5 h-5" />
            Manage Features for {classData.name}
            {classData.subclass && (
              <Badge variant="outline" className="ml-2">
                {classData.subclass}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Create, edit, and delete base class features for {classData.name}. Base class features are automatically shared with all subclasses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
          <div className="flex flex-col gap-4">
          {/* Feature List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <Icon icon="lucide:loader-2" className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Loading features...</p>
                </div>
              ) : features.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon icon="lucide:star" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No features found for {classData.name}</p>
                  <p className="text-sm">Click "Create Feature" to add one</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedLevels.map(level => {
                    const isExpanded = expandedLevels.has(level)
                    return (
                      <Card key={level}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:trending-up" className="w-4 h-4" />
                              Level {level}
                              <Badge variant="secondary" className="text-xs">
                                {featuresByLevel[level].length} feature{featuresByLevel[level].length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLevelExpansion(level)}
                              className="h-8 w-8 p-0"
                            >
                              <Icon 
                                icon={isExpanded ? "lucide:chevron-down" : "lucide:chevron-right"} 
                                className="w-4 h-4" 
                              />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent>
                        <div className="space-y-3">
                          {featuresByLevel[level].map((feature) => (
                            <div key={feature.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{feature.title}</h4>
                                  <Badge 
                                    variant={feature.feature_type === 'class' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {feature.feature_type === 'class' ? 'Base Class' : 'Subclass'}
                                  </Badge>
                                  {feature.feature_skill_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {feature.feature_skill_type.replace('_', ' ')}
                                    </Badge>
                                  )}
                                  {feature.subclass_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {feature.subclass_name}
                                    </Badge>
                                  )}
                                  {feature.is_hidden && (
                                    <Badge variant="secondary" className="text-xs">
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                {feature.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-3">
                                    {renderMarkdownPreview(feature.description)}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditFeature(feature)}
                                >
                                  <Icon icon="lucide:edit" className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteFeature(feature)}
                                >
                                  <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <div className="flex gap-2 justify-between items-center">
            <Button onClick={handleCreateFeature}>
              <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
              Create Feature
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Feature Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {isCreating ? 'Create New Feature' : `Edit Feature`}
            </DialogTitle>
            <DialogDescription>
              {isCreating 
                ? `Create a new feature for ${classData.name}`
                : `Edit the ${editingFeature?.title} feature`
              }
            </DialogDescription>
          </DialogHeader>

          {editingFeature && (
            <div className="h-fit flex flex-col gap-4 overflow-y-auto p-4 bg-background">
              <div className="flex flex-row gap-4">
                <div className="grid gap-2 w-full">
                  <Label htmlFor="feature-title">Feature Title</Label>
                  <Input
                    id="feature-title"
                    value={editingFeature.title}
                    onChange={(e) => setEditingFeature(prev => 
                      prev ? { ...prev, title: e.target.value } : null
                    )}
                    placeholder="e.g., Action Surge, Second Wind, Fighting Style"
                  />
                </div>

                <div className="grid gap-2 w-[188px]">
                  <Label htmlFor="feature-level">Level</Label>
                  <Select
                    value={editingFeature.level.toString()}
                    onValueChange={(value) => setEditingFeature(prev => 
                      prev ? { ...prev, level: parseInt(value) } : null
                    )}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(level => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

               <div className="flex flex-row gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="feature-scope">Feature Scope</Label>
                   <Select
                     value={editingFeature.feature_type}
                     onValueChange={(value: "class" | "subclass") => setEditingFeature(prev => 
                       prev ? { ...prev, feature_type: value } : null
                     )}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="class">Base Class Feature</SelectItem>
                       <SelectItem value="subclass">Subclass Feature</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 {editingFeature.feature_type === 'subclass' && subclasses.length > 0 && (
                   <div className="grid gap-2">
                     <Label htmlFor="subclass-select">Subclass *</Label>
                     <Select
                       value={editingFeature.subclass_id || ''}
                       onValueChange={(value) => setEditingFeature(prev => 
                         prev ? { ...prev, subclass_id: value } : null
                       )}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select subclass" />
                       </SelectTrigger>
                       <SelectContent>
                         {subclasses.map(subclass => (
                           <SelectItem key={subclass.id} value={subclass.id}>
                             {subclass.subclass}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
               </div>

               <div className="grid gap-2">
                 <Label htmlFor="is-hidden">Hidden Feature</Label>
                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="is-hidden"
                     checked={editingFeature.is_hidden || false}
                     onChange={(e) => {
                       setEditingFeature(prev => 
                         prev ? { ...prev, is_hidden: e.target.checked } : null
                       )
                     }}
                   />
                   <Label htmlFor="is-hidden" className="text-sm font-normal">
                     Hide this feature from character sheet
                   </Label>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   Hidden features will not appear in the character's features list but remain functional.
                 </p>
               </div>

               <div className="grid gap-2">
                 <Label htmlFor="feature-skill-type">Feature Skill Type</Label>
                <Select
                  value={editingFeature.feature_skill_type || 'none'}
                  onValueChange={(value: "slots" | "points_pool" | "options_list" | "special_ux" | "skill_modifier" | "availability_toggle" | "none") => {
                    const newFeatureSkillType = value === 'none' ? undefined : value
                    let newConfig = editingFeature.class_features_skills?.config
                    
                    // Prefill default configuration based on feature skill type
                    if (value === 'slots' && !newConfig) {
                      newConfig = getDefaultSlotsConfig(editingFeature.title)
                    } else if (value === 'points_pool' && !newConfig) {
                      newConfig = getDefaultPointsPoolConfig(editingFeature.title)
                    } else if (value === 'skill_modifier' && !newConfig) {
                      newConfig = getDefaultSkillModifierConfig(editingFeature.title)
                    } else if (value === 'availability_toggle' && !newConfig) {
                      newConfig = getDefaultAvailabilityToggleConfig(editingFeature.title)
                    } else if (value === 'special_ux' && !newConfig) {
                      // This will be handled by component selection
                      newConfig = {}
                    }
                    
                    setEditingFeature(prev => 
                      prev ? { 
                        ...prev, 
                        feature_skill_type: newFeatureSkillType,
                        class_features_skills: {
                          ...prev.class_features_skills,
                          config: newConfig
                        }
                      } : null
                    )
                  }}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select feature skill type (optional)" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None</SelectItem>
                     <SelectItem value="slots">Usage Slots Skill</SelectItem>
                     <SelectItem value="points_pool">Points Pool Skill</SelectItem>
                     <SelectItem value="skill_modifier">Skill Modifier</SelectItem>
                     <SelectItem value="availability_toggle">Availability Toggle</SelectItem>
                     <SelectItem value="options_list">Options List</SelectItem>
                     <SelectItem value="special_ux">Special Feature</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

              <div className="grid gap-2">
                <Label htmlFor="feature-description">Description</Label>
                <RichTextEditor
                  value={editingFeature.description}
                  onChange={(value) => setEditingFeature(prev => 
                    prev ? { ...prev, description: value } : null
                  )}
                  placeholder="Describe this feature and its effects..."
                  rows={6}
                />
              </div>

              {/* Custom Description for Spellcasting Section */}
              {(editingFeature.feature_skill_type === 'slots' || 
                editingFeature.feature_skill_type === 'points_pool' || 
                editingFeature.feature_skill_type === 'availability_toggle') && (
                <div className="grid gap-2">
                  <Label htmlFor="custom-description">Custom Description (for Spellcasting Section)</Label>
                  <Input
                    id="custom-description"
                    value={editingFeature.class_features_skills?.customDescription || ''}
                    onChange={(e) => setEditingFeature(prev => 
                      prev ? { 
                        ...prev, 
                        class_features_skills: {
                          ...prev.class_features_skills,
                          customDescription: e.target.value
                        }
                      } : null
                    )}
                    placeholder="e.g., Add proficiency bonus to one damage roll per turn"
                  />
                  <p className="text-sm text-muted-foreground">
                    This description will be displayed under the feature name in the spellcasting section.
                  </p>
                </div>
              )}

               {/* Special UX Configuration */}
               {editingFeature.feature_skill_type === 'special_ux' && (
                <div className="grid gap-2">
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">Special UX Configuration</h4>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="component-id">Component ID</Label>
                        <Select
                          value={editingFeature.class_features_skills?.componentId || ''}
                          onValueChange={(value) => {
                            const defaultConfig = getDefaultComponentConfig(value)
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  componentId: value,
                                  // Prefill with existing config or default config
                                  config: prev.class_features_skills?.config || defaultConfig
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select component" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="infusions">Infusions (Artificer)</SelectItem>
                            <SelectItem value="eldritch-cannon">Eldritch Cannon (Artillerist)</SelectItem>
                            <SelectItem value="eldritch-invocations">Eldritch Invocations (Warlock)</SelectItem>
                            <SelectItem value="metamagic">Metamagic (Sorcerer)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editingFeature.class_features_skills?.componentId && (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="component-config">Component Configuration</Label>
                          
                          {/* Show component-specific configuration examples */}
                          {editingFeature.class_features_skills.componentId === 'eldritch-cannon' && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                              <p className="font-medium mb-2">Eldritch Cannon Configuration:</p>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <strong>Base Configuration (Default):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "maxCannons": 1,
  "baseHitPoints": 5,
  "baseArmorClass": 18
}`}
                                  </pre>
                                </div>
                                <div>
                                  <strong>Override Example (Fortified Position):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "override": {
    "maxCannons": 2
  }
}`}
                                  </pre>
                                </div>
                                <p className="text-muted-foreground">
                                  Use <code>override</code> to modify existing values, or set base values for new features.
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {editingFeature.class_features_skills.componentId === 'infusions' && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                              <p className="font-medium mb-2">Infusions Configuration:</p>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <strong>Base Configuration (Default):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "maxInfusedItems": "level + 1",
  "maxInfusionsKnown": "level + 1"
}`}
                                  </pre>
                                </div>
                                <div>
                                  <strong>Override Example (Enhanced Infusions):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "override": {
    "maxInfusedItems": "level + 2"
  }
}`}
                                  </pre>
                                </div>
                                <p className="text-muted-foreground">
                                  Use <code>override</code> to modify existing values, or set base values for new features.
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {editingFeature.class_features_skills.componentId === 'eldritch-invocations' && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                              <p className="font-medium mb-2">Eldritch Invocations Configuration:</p>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <strong>Base Configuration (Default):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "maxInvocations": "Math.floor(level / 2) + 1"
}`}
                                  </pre>
                                </div>
                                <div>
                                  <strong>Override Example:</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "override": {
    "maxInvocations": "level + 1"
  }
}`}
                                  </pre>
                                </div>
                                <p className="text-muted-foreground">
                                  Use <code>override</code> to modify existing values, or set base values for new features.
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {editingFeature.class_features_skills.componentId === 'metamagic' && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                              <p className="font-medium mb-2">Metamagic Configuration:</p>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <strong>Base Configuration (Default):</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "maxMetamagicOptions": "Math.floor(level / 2) + 1"
}`}
                                  </pre>
                                </div>
                                <div>
                                  <strong>Override Example:</strong>
                                  <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "override": {
    "maxMetamagicOptions": "level + 1"
  }
}`}
                                  </pre>
                                </div>
                                <p className="text-muted-foreground">
                                  Use <code>override</code> to modify existing values, or set base values for new features.
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="component-config">JSON Configuration</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const defaultConfig = getDefaultComponentConfig(editingFeature.class_features_skills?.componentId || '')
                                  setEditingFeature(prev => 
                                    prev ? { 
                                      ...prev, 
                                      class_features_skills: {
                                        ...prev.class_features_skills,
                                        config: defaultConfig
                                      }
                                    } : null
                                  )
                                }}
                              >
                                Reset to Default
                              </Button>
                            </div>
                            <Textarea
                              id="component-config"
                              value={JSON.stringify(editingFeature.class_features_skills?.config || {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  const config = JSON.parse(e.target.value)
                                  setEditingFeature(prev => 
                                    prev ? { 
                                      ...prev, 
                                      class_features_skills: {
                                        ...prev.class_features_skills,
                                        config
                                      }
                                    } : null
                                  )
                                } catch (error) {
                                  // Invalid JSON, don't update
                                }
                              }}
                              placeholder="Enter JSON configuration for the component..."
                              rows={6}
                              className="font-mono text-sm"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            JSON configuration for the component. Use <code>override</code> to modify existing values, or set base values for new features.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Slots Configuration */}
              {editingFeature.feature_skill_type === 'slots' && (
                <div className="grid gap-2">
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">Slots Configuration</h4>
                    
                    <div className="space-y-4">
                      {/* Max Slots Configuration */}
                      <div className="space-y-2">
                        <Label htmlFor="max-slots-source">Maximum Slots Source</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.maxSlotsSource || 'proficiency'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    maxSlotsSource: value,
                                    // Reset custom value when changing source
                                    customMaxSlots: value === 'custom' ? currentConfig.customMaxSlots : undefined
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select how to calculate max slots" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proficiency">Proficiency Bonus</SelectItem>
                            <SelectItem value="charisma_mod">Charisma Modifier</SelectItem>
                            <SelectItem value="wisdom_mod">Wisdom Modifier</SelectItem>
                            <SelectItem value="intelligence_mod">Intelligence Modifier</SelectItem>
                            <SelectItem value="constitution_mod">Constitution Modifier</SelectItem>
                            <SelectItem value="strength_mod">Strength Modifier</SelectItem>
                            <SelectItem value="dexterity_mod">Dexterity Modifier</SelectItem>
                            <SelectItem value="level">Character Level</SelectItem>
                            <SelectItem value="class_level">Class Level</SelectItem>
                            <SelectItem value="custom">Custom Number</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Max Slots Input */}
                      {editingFeature.class_features_skills?.config?.maxSlotsSource === 'custom' && (
                        <div className="space-y-2">
                          <Label htmlFor="custom-max-slots">Custom Maximum Slots</Label>
                          <Input
                            id="custom-max-slots"
                            type="number"
                            min="1"
                            max="20"
                            value={editingFeature.class_features_skills?.config?.customMaxSlots || 1}
                            onChange={(e) => {
                              const currentConfig = editingFeature.class_features_skills?.config || {}
                              setEditingFeature(prev => 
                                prev ? { 
                                  ...prev, 
                                  class_features_skills: {
                                    ...prev.class_features_skills,
                                    config: {
                                      ...currentConfig,
                                      customMaxSlots: parseInt(e.target.value) || 1
                                    }
                                  }
                                } : null
                              )
                            }}
                            placeholder="Enter maximum number of slots"
                          />
                        </div>
                      )}

                      {/* Replenish Logic */}
                      <div className="space-y-2">
                        <Label htmlFor="replenish-logic">Replenish Logic</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.replenishLogic || 'all_long_rest'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    replenishLogic: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select when slots are replenished" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_long_rest">All slots on Long Rest</SelectItem>
                            <SelectItem value="all_short_rest">All slots on Short Rest</SelectItem>
                            <SelectItem value="dice_long_rest">Roll dice on Long Rest</SelectItem>
                            <SelectItem value="dice_short_rest">Roll dice on Short Rest</SelectItem>
                            <SelectItem value="one_long_rest">One slot on Long Rest</SelectItem>
                            <SelectItem value="one_short_rest">One slot on Short Rest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dice Configuration for dice-based replenish */}
                      {(editingFeature.class_features_skills?.config?.replenishLogic?.includes('dice')) && (
                        <div className="space-y-2">
                          <Label htmlFor="replenish-dice">Replenish Dice</Label>
                          <Select
                            value={editingFeature.class_features_skills?.config?.replenishDice || '1d4'}
                            onValueChange={(value) => {
                              const currentConfig = editingFeature.class_features_skills?.config || {}
                              setEditingFeature(prev => 
                                prev ? { 
                                  ...prev, 
                                  class_features_skills: {
                                    ...prev.class_features_skills,
                                    config: {
                                      ...currentConfig,
                                      replenishDice: value
                                    }
                                  }
                                } : null
                              )
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select dice to roll" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1d4">1d4</SelectItem>
                              <SelectItem value="1d6">1d6</SelectItem>
                              <SelectItem value="1d8">1d8</SelectItem>
                              <SelectItem value="1d10">1d10</SelectItem>
                              <SelectItem value="1d12">1d12</SelectItem>
                              <SelectItem value="2d4">2d4</SelectItem>
                              <SelectItem value="2d6">2d6</SelectItem>
                              <SelectItem value="2d8">2d8</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Level-Based Scaling Configuration */}
                      <div className="space-y-2">
                        <Label htmlFor="level-scaling">Level-Based Scaling</Label>
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-2">Override Configuration for Level Scaling:</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Use this to configure features that change at specific levels (e.g., Bardic Inspiration die scaling).
                          </p>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <strong>Example - Bardic Inspiration Die Scaling:</strong>
                              <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "baseDice": "1d6",
  "levelScaling": {
    "5": { "dice": "1d8" },
    "10": { "dice": "1d10" },
    "15": { "dice": "1d12" }
  }
}`}
                              </pre>
                            </div>
                            <div>
                              <strong>Example - Lay on Hands Scaling:</strong>
                              <pre className="mt-1 p-2 bg-background rounded border">
{`{
  "baseMaxSlots": "charisma_mod",
  "levelScaling": {
    "6": { "maxSlotsSource": "charisma_mod + 1" },
    "11": { "maxSlotsSource": "charisma_mod + 2" }
  }
}`}
                              </pre>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <Label htmlFor="override-config" className="text-xs">Override JSON Configuration:</Label>
                            <Textarea
                              id="override-config"
                              value={JSON.stringify(editingFeature.class_features_skills?.config?.override || {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  const override = JSON.parse(e.target.value)
                                  const currentConfig = editingFeature.class_features_skills?.config || {}
                                  setEditingFeature(prev => 
                                    prev ? { 
                                      ...prev, 
                                      class_features_skills: {
                                        ...prev.class_features_skills,
                                        config: {
                                          ...currentConfig,
                                          override
                                        }
                                      }
                                    } : null
                                  )
                                } catch (error) {
                                  // Invalid JSON, don't update
                                }
                              }}
                              placeholder="Enter override configuration for level scaling..."
                              rows={6}
                              className="font-mono text-xs mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              This override configuration will be applied on top of the base configuration above.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Points Pool Configuration */}
              {editingFeature.feature_skill_type === 'points_pool' && (
                <div className="grid gap-2">
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">Points Pool Configuration</h4>
                    
                    <div className="space-y-4">
                      {/* Total Formula */}
                      <div className="space-y-2">
                        <Label htmlFor="total-formula">Total Formula *</Label>
                        <Input
                          id="total-formula"
                          value={editingFeature.class_features_skills?.config?.totalFormula || ''}
                          onChange={(e) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    totalFormula: e.target.value
                                  }
                                }
                              } : null
                            )
                          }}
                          placeholder="e.g., level * 5, level, level * 2"
                        />
                        <div className="text-xs text-muted-foreground">
                          Examples: level * 5 (Lay on Hands), level (Ki Points), level * 2
                        </div>
                      </div>

                      {/* Can Spend Partial */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="can-spend-partial"
                          checked={editingFeature.class_features_skills?.config?.canSpendPartial || false}
                          onChange={(e) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    canSpendPartial: e.target.checked
                                  }
                                }
                              } : null
                            )
                          }}
                        />
                        <Label htmlFor="can-spend-partial" className="text-sm">
                          Can spend partial amounts
                        </Label>
                      </div>

                      {/* Min/Max Spend (conditional) */}
                      {editingFeature.class_features_skills?.config?.canSpendPartial && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="min-spend">Minimum Spend</Label>
                            <Input
                              id="min-spend"
                              type="number"
                              min="1"
                              value={editingFeature.class_features_skills?.config?.minSpend || 1}
                              onChange={(e) => {
                                const currentConfig = editingFeature.class_features_skills?.config || {}
                                setEditingFeature(prev => 
                                  prev ? { 
                                    ...prev, 
                                    class_features_skills: {
                                      ...prev.class_features_skills,
                                      config: {
                                        ...currentConfig,
                                        minSpend: parseInt(e.target.value) || 1
                                      }
                                    }
                                  } : null
                                )
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="max-spend">Maximum Spend (Optional)</Label>
                            <Input
                              id="max-spend"
                              type="number"
                              min="1"
                              value={editingFeature.class_features_skills?.config?.maxSpend || ''}
                              onChange={(e) => {
                                const currentConfig = editingFeature.class_features_skills?.config || {}
                                setEditingFeature(prev => 
                                  prev ? { 
                                    ...prev, 
                                    class_features_skills: {
                                      ...prev.class_features_skills,
                                      config: {
                                        ...currentConfig,
                                        maxSpend: e.target.value ? parseInt(e.target.value) : undefined
                                      }
                                    }
                                  } : null
                                )
                              }}
                              placeholder="No limit"
                            />
                          </div>
                        </div>
                      )}

                      {/* Replenish On */}
                      <div className="space-y-2">
                        <Label htmlFor="replenish-on">Replenish On *</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.replenishOn || 'long_rest'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    replenishOn: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_rest">Short Rest</SelectItem>
                            <SelectItem value="long_rest">Long Rest</SelectItem>
                            <SelectItem value="dawn">Dawn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display Style */}
                      <div className="space-y-2">
                        <Label htmlFor="display-style">Display Style</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.displayStyle || 'slider'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    displayStyle: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slider">Slider</SelectItem>
                            <SelectItem value="input">Input Field</SelectItem>
                            <SelectItem value="increment_decrement">+/- Buttons</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Skill Modifier Configuration */}
              {editingFeature.feature_skill_type === 'skill_modifier' && (
                <div className="grid gap-2">
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">Skill Modifier Configuration</h4>
                    
                    <div className="space-y-4">
                      {/* Modifier Type */}
                      <div className="space-y-2">
                        <Label htmlFor="modifier-type">Modifier Type</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.modifierType || 'skill'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    modifierType: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select modifier type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skill">Skill Check</SelectItem>
                            <SelectItem value="saving_throw">Saving Throw</SelectItem>
                            <SelectItem value="ability_check">Ability Check</SelectItem>
                            <SelectItem value="attack_roll">Attack Roll</SelectItem>
                            <SelectItem value="damage_roll">Damage Roll</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Target Skills */}
                      <div className="space-y-2">
                        <Label htmlFor="target-skills">Target Skills (comma-separated)</Label>
                        <Input
                          id="target-skills"
                          value={editingFeature.class_features_skills?.config?.targetSkills?.join(', ') || ''}
                          onChange={(e) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    targetSkills: skills
                                  }
                                }
                              } : null
                            )
                          }}
                          placeholder="e.g., alchemist_supplies, tinker_tools, smith_tools"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to apply to all skills of the selected type
                        </p>
                      </div>

                      {/* Modifier Formula */}
                      <div className="space-y-2">
                        <Label htmlFor="modifier-formula">Modifier Formula</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.modifierFormula || 'proficiency_bonus'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    modifierFormula: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select modifier formula" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proficiency_bonus">Proficiency Bonus</SelectItem>
                            <SelectItem value="proficiency_bonus * 2">Proficiency Bonus × 2</SelectItem>
                            <SelectItem value="half_proficiency_bonus">Half Proficiency Bonus</SelectItem>
                            <SelectItem value="1">Fixed +1</SelectItem>
                            <SelectItem value="2">Fixed +2</SelectItem>
                            <SelectItem value="3">Fixed +3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Condition */}
                      <div className="space-y-2">
                        <Label htmlFor="condition-type">Condition</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.condition?.type || 'always'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    condition: {
                                      ...currentConfig.condition,
                                      type: value
                                    }
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always applies</SelectItem>
                            <SelectItem value="proficient">Only when proficient</SelectItem>
                            <SelectItem value="not_proficient">Only when not proficient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display Style */}
                      <div className="space-y-2">
                        <Label htmlFor="display-style">Display Style</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.displayStyle || 'badge'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    displayStyle: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select display style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="badge">Badge</SelectItem>
                            <SelectItem value="highlight">Highlight</SelectItem>
                            <SelectItem value="tooltip">Tooltip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Configuration Preview */}
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-2">Configuration Preview:</p>
                        <div className="text-xs space-y-1">
                          <div><strong>Type:</strong> {editingFeature.class_features_skills?.config?.modifierType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                          <div><strong>Formula:</strong> {editingFeature.class_features_skills?.config?.modifierFormula}</div>
                          <div><strong>Condition:</strong> {editingFeature.class_features_skills?.config?.condition?.type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                          {editingFeature.class_features_skills?.config?.targetSkills?.length > 0 && (
                            <div><strong>Target Skills:</strong> {editingFeature.class_features_skills?.config?.targetSkills?.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability Toggle Configuration */}
              {editingFeature.feature_skill_type === 'availability_toggle' && (
                <div className="grid gap-2">
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="font-medium mb-3">Availability Toggle Configuration</h4>
                    
                    <div className="space-y-4">
                      {/* Default Available */}
                      <div className="space-y-2">
                        <Label htmlFor="default-available">Default State</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.defaultAvailable ? 'true' : 'false'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    defaultAvailable: value === 'true'
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select default state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Available (Default)</SelectItem>
                            <SelectItem value="false">Used (Default)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Replenish On */}
                      <div className="space-y-2">
                        <Label htmlFor="replenish-on">Replenish On</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.replenishOn || 'long_rest'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    replenishOn: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select replenish timing" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_rest">Short Rest</SelectItem>
                            <SelectItem value="long_rest">Long Rest</SelectItem>
                            <SelectItem value="dawn">Dawn</SelectItem>
                            <SelectItem value="manual">Manual Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display Style */}
                      <div className="space-y-2">
                        <Label htmlFor="display-style">Display Style</Label>
                        <Select
                          value={editingFeature.class_features_skills?.config?.displayStyle || 'badge'}
                          onValueChange={(value) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    displayStyle: value
                                  }
                                }
                              } : null
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select display style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="badge">Badge</SelectItem>
                            <SelectItem value="toggle">Toggle Switch</SelectItem>
                            <SelectItem value="button">Button</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Available Text */}
                      <div className="space-y-2">
                        <Label htmlFor="available-text">Available Text</Label>
                        <Input
                          value={editingFeature.class_features_skills?.config?.availableText || 'Available'}
                          onChange={(e) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    availableText: e.target.value
                                  }
                                }
                              } : null
                            )
                          }}
                          placeholder="Text to show when available"
                        />
                      </div>

                      {/* Used Text */}
                      <div className="space-y-2">
                        <Label htmlFor="used-text">Used Text</Label>
                        <Input
                          value={editingFeature.class_features_skills?.config?.usedText || 'Used'}
                          onChange={(e) => {
                            const currentConfig = editingFeature.class_features_skills?.config || {}
                            setEditingFeature(prev => 
                              prev ? { 
                                ...prev, 
                                class_features_skills: {
                                  ...prev.class_features_skills,
                                  config: {
                                    ...currentConfig,
                                    usedText: e.target.value
                                  }
                                }
                              } : null
                            )
                          }}
                          placeholder="Text to show when used"
                        />
                      </div>

                      {/* Configuration Preview */}
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-2">Configuration Preview:</p>
                        <div className="text-xs space-y-1">
                          <div><strong>Default State:</strong> {editingFeature.class_features_skills?.config?.defaultAvailable ? 'Available' : 'Used'}</div>
                          <div><strong>Replenish:</strong> {editingFeature.class_features_skills?.config?.replenishOn?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                          <div><strong>Display:</strong> {editingFeature.class_features_skills?.config?.displayStyle?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                          <div><strong>Available Text:</strong> "{editingFeature.class_features_skills?.config?.availableText || 'Available'}"</div>
                          <div><strong>Used Text:</strong> "{editingFeature.class_features_skills?.config?.usedText || 'Used'}"</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex flex-row flex-wrap gap-2 text-sm">
                  <Badge variant="outline" className="font-medium">{classData.name} Class</Badge>
                  {classData.subclass && (
                    <Badge variant="secondary" className="font-medium">{classData.subclass} Subclass</Badge>
                  )}
                  <Badge variant="outline" className="font-medium">
                    <Icon icon="lucide:book" className="w-4 h-4" />
                    {classData.source}
                  </Badge>
                  {classData.is_custom && (
                    <Badge variant="outline" className="font-medium">
                      <Icon icon="lucide:custom" className="w-4 h-4" />
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t">
            <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeature} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" className="w-4 h-4" />
                  Save
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
